import type { EngineOptions, HighlightCacheLike, HighlightResult } from '../types.js'
import { countResultChars } from './source.js'

const DEFAULT_CAPACITY = 100
const DEFAULT_MAX_CHARS = 8 * 1024 * 1024

const functionIds = new WeakMap<object, number>()
let nextIdentity = 1

function identityFor(value: object): number {
  const existing = functionIds.get(value)
  if (existing !== undefined) return existing
  const id = nextIdentity
  nextIdentity += 1
  functionIds.set(value, id)
  return id
}

/**
 * Deterministic serialization for cache keys. Functions and symbols are tagged
 * with a stable identity so an option object can still produce a repeatable key
 * without pretending that functions are serializable data.
 */
export function stableStringify(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (value === null) return 'null'
  const type = typeof value
  if (type === 'undefined') return 'undefined'
  if (type === 'string') return JSON.stringify(value)
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'number') return Number.isFinite(value as number) ? String(value) : `#number:${String(value)}`
  if (type === 'bigint') return `#bigint:${String(value)}`
  if (type === 'symbol') return `#symbol:${String((value as symbol).description ?? '')}`
  if (type === 'function') return `#function:${identityFor(value as object)}`

  const object = value as object
  if (seen.has(object)) return '#circular'
  seen.add(object)
  try {
    if (object instanceof Date) return `#date:${object.toISOString()}`
    if (object instanceof RegExp) return `#regexp:${object.source}/${object.flags}`
    if (object instanceof Map) {
      const entries = [...object.entries()]
        .map(([key, entry]) => `${stableStringify(key, seen)}=>${stableStringify(entry, seen)}`)
        .sort()
      return `#map:{${entries.join(',')}}`
    }
    if (object instanceof Set) {
      return `#set:[${[...object].map((entry) => stableStringify(entry, seen)).sort().join(',')}]`
    }
    if (Array.isArray(object)) {
      return `[${object.map((entry) => stableStringify(entry, seen)).join(',')}]`
    }

    const record = object as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key], seen)}`)
      .join(',')}}`
  } finally {
    seen.delete(object)
  }
}

export interface CacheKeyInput {
  engineId: string
  language: string
  code: string
  options?: EngineOptions
  engineIdentity?: number
}

/**
 * The active theme is intentionally not part of this key. Tokenization only
 * depends on the engine, its options, the language, and the source.
 */
export function buildCacheKey(input: CacheKeyInput): string {
  const options = input.options ?? {}
  const parts: unknown[] = [
    input.engineId,
    input.language,
    input.code,
    options,
  ]
  if (input.engineIdentity !== undefined) parts.push(input.engineIdentity)
  return `v1:${stableStringify(parts)}`
}

export interface ResultCacheOptions {
  capacity?: number
  maxChars?: number
}

interface CacheEntry {
  result: HighlightResult
  chars: number
}

export class ResultCache implements HighlightCacheLike {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly inflight = new Map<string, Promise<HighlightResult>>()
  private readonly capacity: number
  private readonly maxChars: number
  private chars = 0
  private epoch = 0

  constructor(options: ResultCacheOptions = {}) {
    this.capacity = normalizeBudget(options.capacity, DEFAULT_CAPACITY)
    this.maxChars = normalizeBudget(options.maxChars, DEFAULT_MAX_CHARS)
  }

  get size(): number {
    return this.entries.size
  }

  get characterSize(): number {
    return this.chars
  }

  get pending(): number {
    return this.inflight.size
  }

  get(key: string): HighlightResult | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    // Refresh insertion order so Map iteration is least-recently-used first.
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.result
  }

  set(key: string, result: HighlightResult): void {
    const chars = countResultChars(result)
    if (this.capacity === 0 || this.maxChars === 0 || chars > this.maxChars) {
      this.delete(key)
      return
    }
    const existing = this.entries.get(key)
    if (existing) {
      this.chars -= existing.chars
      this.entries.delete(key)
    }
    this.entries.set(key, { result, chars })
    this.chars += chars
    this.trim()
  }

  delete(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return
    this.entries.delete(key)
    this.chars -= entry.chars
  }

  clear(): void {
    this.epoch += 1
    this.entries.clear()
    this.inflight.clear()
    this.chars = 0
  }

  request(
    key: string,
    factory: () => HighlightResult | Promise<HighlightResult>,
  ): HighlightResult | Promise<HighlightResult> {
    const cached = this.get(key)
    if (cached) return cached

    const pending = this.inflight.get(key)
    if (pending) return pending

    const produced = factory()
    if (isPromiseLike(produced)) {
      const epoch = this.epoch
      const shared = produced.then(
        (result) => {
          if (epoch === this.epoch) {
            this.inflight.delete(key)
            this.set(key, result)
          }
          return result
        },
        (error: unknown) => {
          if (epoch === this.epoch) this.inflight.delete(key)
          throw error
        },
      )
      this.inflight.set(key, shared)
      return shared
    }

    this.set(key, produced)
    return produced
  }

  private trim(): void {
    while (this.entries.size > this.capacity || this.chars > this.maxChars) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.delete(oldest)
    }
  }
}

function normalizeBudget(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.floor(value))
}

function isPromiseLike(value: unknown): value is Promise<HighlightResult> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<HighlightResult>).then === 'function'
  )
}
