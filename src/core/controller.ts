import { shallowRef, type ShallowRef } from 'vue'
import type {
  EngineOptions,
  HighlightEngine,
  HighlightLine,
  HighlightRequest,
  HighlightResult,
} from '../types.js'
import { type EngineChoice, requestCacheKey } from './engine.js'
import { selectEngine, type HighlighterContext } from './context.js'
import {
  assertHighlightResult,
  freezeResult,
  normalizeDisplaySource,
  normalizeSource,
  resultToSource,
} from './source.js'
import { warnOnce } from './warn.js'

export interface ControllerInput {
  code: string
  language: string
  engine?: EngineChoice
  engineOptions?: EngineOptions
}

export interface ControllerOptions {
  context: HighlighterContext
  getInput: () => ControllerInput
  isDeferred?: () => boolean
  onResult?: (result: HighlightResult) => void
  onError?: (error: Error) => void
}

export interface HighlightController {
  readonly result: ShallowRef<HighlightResult | undefined>
  readonly lines: ShallowRef<readonly HighlightLine[] | undefined>
  readonly error: ShallowRef<Error | undefined>
  readonly busy: ShallowRef<boolean>
  readonly started: () => boolean
  attemptInitialSync: () => boolean
  start: () => Promise<HighlightResult | undefined>
  refresh: () => Promise<HighlightResult | undefined>
  highlight: (input: { code: string; language?: string }) => Promise<HighlightResult>
  schedule: () => void
  dispose: () => void
  readonly disposed: () => boolean
}

export function createHighlightController(options: ControllerOptions): HighlightController {
  const result = shallowRef<HighlightResult | undefined>(undefined)
  const lines = shallowRef<readonly HighlightLine[] | undefined>(undefined)
  const error = shallowRef<Error | undefined>(undefined)
  // Async engines render a plain shell until their first result arrives. Keeping
  // busy true initially also makes the server-rendered shell announce itself as
  // busy without starting work during SSR.
  const busy = shallowRef(true)

  let generation = 0
  let disposed = false
  let hasStarted = false
  let lastAppliedKey: string | undefined
  let scheduled = false

  const { context } = options

  function getInput(): ControllerInput {
    const input = options.getInput()
    return { ...input, code: normalizeSource(input.code) }
  }

  function apply(next: HighlightResult, key: string): HighlightResult {
    result.value = next
    lines.value = next.lines
    error.value = undefined
    busy.value = false
    lastAppliedKey = key
    options.onResult?.(next)
    return next
  }

  function discardResult(): void {
    result.value = undefined
    lines.value = undefined
  }

  function fail(cause: unknown, expectedGeneration: number): void {
    if (disposed || expectedGeneration !== generation) return
    const normalized = toError(cause)
    error.value = normalized
    busy.value = false
    warnOnce(
      `highlight:${normalized.name}:${normalized.message}`,
      normalized.message,
      context.warningSet,
    )
    options.onError?.(normalized)
  }

  function validate(value: HighlightResult, expectedCode: string): HighlightResult {
    assertHighlightResult(value)
    const frozen = freezeResult(value)
    if (resultToSource(frozen) !== expectedCode) {
      throw new TypeError(
        '[vue-syntax-highlighter] Highlight engine returned tokens that do not reproduce the source text.',
      )
    }
    return frozen
  }

  async function execute(
    engine: HighlightEngine,
    input: ControllerInput,
    expectedGeneration: number,
    force: boolean,
  ): Promise<HighlightResult | undefined> {
    if (disposed || expectedGeneration !== generation) return undefined

    const key = requestCacheKey(
      engine,
      { code: input.code, language: input.language },
      input.engineOptions,
    )
    if (!force && key === lastAppliedKey && result.value) {
      busy.value = false
      return result.value
    }
    if (key !== lastAppliedKey) discardResult()

    const request: HighlightRequest = {
      code: input.code,
      language: input.language,
      signal: context.abortSignal,
    }

    try {
      if (force) context.cache.delete(key)
      const produced = context.cache.request(key, () => {
        const value = engine.highlight(request, input.engineOptions)
        return isPromiseLike(value)
          ? value.then((result) => validate(result, input.code))
          : validate(value, input.code)
      })

      if (isPromiseLike(produced)) {
        const next = await produced
        if (disposed || expectedGeneration !== generation) return undefined
        return apply(next, key)
      }
      if (disposed || expectedGeneration !== generation) return undefined
      return apply(produced, key)
    } catch (cause) {
      fail(cause, expectedGeneration)
      return undefined
    }
  }

  function isEngineSynchronous(engine: HighlightEngine, language: string): boolean {
    if (engine.capabilities?.sync === false) return false
    if (engine.hasLanguage && !engine.hasLanguage(language)) return false
    return true
  }

  function attemptInitialSync(): boolean {
    if (disposed || hasStarted || options.isDeferred?.()) return false
    const input = getInput()
    const selection = selectEngine(context, input.engine)
    let engine: HighlightEngine | Promise<HighlightEngine>
    try {
      engine = selection.manager.resolve(selection.choice)
    } catch (cause) {
      hasStarted = true
      generation += 1
      fail(cause, generation)
      return true
    }
    if (isPromiseLike(engine)) return false
    if (!isEngineSynchronous(engine, input.language)) return false

    hasStarted = true
    generation += 1
    const expectedGeneration = generation
    busy.value = false
    error.value = undefined

    const request: HighlightRequest = {
      code: input.code,
      language: input.language,
      signal: context.abortSignal,
    }
    const key = requestCacheKey(engine, request, input.engineOptions)
    if (key === lastAppliedKey && result.value) return true

    try {
      const produced = context.cache.request(key, () => {
        const value = engine.highlight(request, input.engineOptions)
        return isPromiseLike(value)
          ? value.then((result) => validate(result, input.code))
          : validate(value, input.code)
      })
      if (isPromiseLike(produced)) {
        busy.value = true
        produced.then(
          (next) => {
            if (!disposed && expectedGeneration === generation) apply(next, key)
          },
          (cause: unknown) => fail(cause, expectedGeneration),
        )
        return false
      }
      apply(produced, key)
      return true
    } catch (cause) {
      fail(cause, expectedGeneration)
      return true
    }
  }

  async function runAsync(force: boolean): Promise<HighlightResult | undefined> {
    if (disposed) return undefined
    const expectedGeneration = ++generation
    busy.value = true
    error.value = undefined

    const input = getInput()
    const current = result.value
    if (
      current &&
      (current.language !== input.language || resultToSource(current) !== input.code)
    ) {
      // Do not keep showing the previous document while a new language or
      // source is loading. The plain fallback already reflects the new props;
      // the pending result will replace it when it arrives.
      discardResult()
    }
    const selection = selectEngine(context, input.engine)
    let engine: HighlightEngine
    try {
      engine = await selection.manager.resolve(selection.choice)
    } catch (cause) {
      fail(cause, expectedGeneration)
      return undefined
    }
    if (disposed || expectedGeneration !== generation) return undefined
    return execute(engine, input, expectedGeneration, force)
  }

  function start(): Promise<HighlightResult | undefined> {
    if (hasStarted || disposed) return Promise.resolve(result.value)
    hasStarted = true
    return runAsync(false)
  }

  function refresh(): Promise<HighlightResult | undefined> {
    if (disposed) return Promise.resolve(undefined)
    hasStarted = true
    return runAsync(true)
  }

  async function highlight(input: { code: string; language?: string }): Promise<HighlightResult> {
    if (disposed) {
      throw new Error('[vue-syntax-highlighter] This highlighter scope has been disposed.')
    }
    const current = getInput()
    const code = normalizeDisplaySource(input.code)
    const language = input.language ?? current.language
    const selection = selectEngine(context, current.engine)
    const engine = await selection.manager.resolve(selection.choice)
    const key = requestCacheKey(
      engine,
      { code, language },
      current.engineOptions,
    )
    const produced = context.cache.request(key, () => {
      const value = engine.highlight(
        { code, language, signal: context.abortSignal },
        current.engineOptions,
      )
      return isPromiseLike(value)
        ? value.then((result) => validate(result, code))
        : validate(value, code)
    })
    return produced
  }

  function schedule(): void {
    if (scheduled || disposed || !hasStarted) return
    scheduled = true
    const defer =
      typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (callback: () => void) => {
            void Promise.resolve().then(callback)
          }
    defer(() => {
      scheduled = false
      if (!disposed && hasStarted) void runAsync(false)
    })
  }

  function dispose(): void {
    disposed = true
    scheduled = false
    generation += 1
    busy.value = false
  }

  return {
    result,
    lines,
    error,
    busy,
    started: () => hasStarted,
    attemptInitialSync,
    start,
    refresh,
    highlight,
    schedule,
    dispose,
    disposed: () => disposed,
  }
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<T>).then === 'function'
  )
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause
  return new Error(
    `[vue-syntax-highlighter] Highlighting failed: ${typeof cause === 'string' ? cause : String(cause)}`,
  )
}
