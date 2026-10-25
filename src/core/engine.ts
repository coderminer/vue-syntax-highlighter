import type { EngineOptions, HighlightEngine, HighlightRequest } from '../types.js'
import { buildCacheKey } from './cache.js'
import { warnOnce, type WarningSet } from './warn.js'

export type EngineChoice = string | HighlightEngine
export type EngineLoader = () => HighlightEngine | Promise<HighlightEngine>
export type EngineRegistry = Record<string, HighlightEngine | EngineLoader>

export const BUILTIN_ENGINE_IDS = ['shiki', 'highlightjs', 'lowlight', 'prism'] as const
export type BuiltinEngineId = (typeof BUILTIN_ENGINE_IDS)[number]

const ENGINE_INSTALL_HINTS: Record<string, string> = {
  shiki: 'shiki',
  highlightjs: 'lowlight highlight.js',
  lowlight: 'lowlight highlight.js',
  prism: 'refractor',
}

export function isBuiltinEngineId(value: string): value is BuiltinEngineId {
  return (BUILTIN_ENGINE_IDS as readonly string[]).includes(value)
}

export function createMissingEngineError(id: string, cause?: unknown): Error {
  const missing = ENGINE_INSTALL_HINTS[id] ?? id
  const detail = cause instanceof Error ? ` ${cause.message}` : ''
  return new Error(
    `[vue-syntax-highlighter] The "${id}" engine is unavailable. ` +
      `Install it with \`npm install ${missing}\` and import its adapter before use.${detail}`,
  )
}

export function isHighlightEngine(value: unknown): value is HighlightEngine {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<HighlightEngine>
  return typeof candidate.id === 'string' && candidate.id.length > 0 && typeof candidate.highlight === 'function'
}

export function assertHighlightEngine(value: unknown, label = 'engine'): asserts value is HighlightEngine {
  if (!isHighlightEngine(value)) {
    throw new TypeError(
      `[vue-syntax-highlighter] Invalid ${label}: expected an object with a non-empty "id" and a "highlight" function.`,
    )
  }
}

async function loadBuiltinEngine(id: BuiltinEngineId): Promise<HighlightEngine> {
  try {
    switch (id) {
      case 'shiki': {
        const module = await import('../engines/shiki.js')
        return await module.createShikiEngine()
      }
      case 'highlightjs': {
        const module = await import('../engines/highlightjs.js')
        return await module.createHighlightjsEngine()
      }
      case 'lowlight': {
        const module = await import('../engines/lowlight.js')
        return await module.createLowlightEngine()
      }
      case 'prism': {
        const module = await import('../engines/prism.js')
        return await module.createPrismEngine()
      }
    }
  } catch (error) {
    throw createMissingEngineError(id, error)
  }
}

/**
 * Loads and owns engines for one provider/application. User-supplied engine
 * objects are never disposed here; only instances this manager created are.
 */
export class EngineManager {
  private readonly registry: EngineRegistry
  private readonly warningSet: WarningSet
  private readonly instances = new Map<string, HighlightEngine>()
  private readonly loads = new Map<string, Promise<HighlightEngine>>()
  private disposed = false

  constructor(registry: EngineRegistry = {}, warningSet?: WarningSet) {
    this.registry = registry
    this.warningSet = warningSet ?? new Set()
  }

  resolve(choice?: EngineChoice): HighlightEngine | Promise<HighlightEngine> {
    if (this.disposed) {
      throw new Error('[vue-syntax-highlighter] This engine scope has been disposed.')
    }

    const selected = choice ?? 'shiki'
    if (typeof selected !== 'string') {
      assertHighlightEngine(selected)
      return selected
    }

    const cached = this.instances.get(selected)
    if (cached) return cached

    const pending = this.loads.get(selected)
    if (pending) return pending

    const registered = this.registry[selected]
    if (registered && typeof registered !== 'function') {
      assertHighlightEngine(registered, `engine "${selected}"`)
      this.instances.set(selected, registered)
      return registered
    }
    if (!registered && !isBuiltinEngineId(selected)) {
      throw new Error(
        `[vue-syntax-highlighter] Unknown engine "${selected}". ` +
          `Use one of ${BUILTIN_ENGINE_IDS.join(', ')} or register a custom engine in the plugin/provider "engines" option.`,
      )
    }

    const loading = this.load(selected, registered as EngineLoader | undefined)
    this.loads.set(selected, loading)
    return loading
  }

  has(choice: string): boolean {
    return this.instances.has(choice) || this.loads.has(choice)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const engine of this.instances.values()) {
      try {
        engine.dispose?.()
      } catch (error) {
        warnOnce(
          'engine-dispose',
          `Engine "${engine.id}" threw while disposing: ${
            error instanceof Error ? error.message : String(error)
          }`,
          this.warningSet,
        )
      }
    }
    this.instances.clear()
    this.loads.clear()
  }

  private async load(id: string, loader: EngineLoader | undefined): Promise<HighlightEngine> {
    try {
      const created = loader
        ? await loader()
        : await loadBuiltinEngine(id as BuiltinEngineId)
      assertHighlightEngine(created, `engine "${id}"`)
      if (this.disposed) {
        created.dispose?.()
        throw new Error('[vue-syntax-highlighter] This engine scope has been disposed.')
      }
      this.instances.set(id, created)
      return created
    } catch (error) {
      this.loads.delete(id)
      if (error instanceof Error && error.message.includes('vue-syntax-highlighter')) throw error
      throw createMissingEngineError(id, error)
    } finally {
      this.loads.delete(id)
    }
  }
}

export function requestCacheKey(
  engine: HighlightEngine,
  request: HighlightRequest,
  options?: EngineOptions,
): string {
  if (engine.cacheKey) {
    try {
      const custom = engine.cacheKey(request, options)
      if (typeof custom === 'string' && custom.length > 0) return custom
    } catch {
      // A broken cacheKey hook must not break highlighting; use the stable key.
    }
  }
  return buildCacheKey({
    engineId: engine.id,
    language: request.language,
    code: request.code,
    options,
  })
}
