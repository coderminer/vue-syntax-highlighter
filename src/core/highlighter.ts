import type {
  EngineOptions,
  HighlightInput,
  HighlightResult,
  HighlighterOptions,
} from '../types.js'
import { createHighlighterContext, disposeContext, preloadLanguages } from './context.js'
import { createHighlightController } from './controller.js'

export interface CreateHighlighterOptions extends HighlighterOptions {
  /** Options forwarded to every engine call and included in the cache key. */
  engineOptions?: EngineOptions
}

export interface Highlighter {
  /** Highlight explicit input without a component or app instance. */
  highlight: (input: HighlightInput) => Promise<HighlightResult>
  /**
   * Load every language passed to `languages` through the selected engine.
   * Rejects with the disposed-scope error while disposal is pending or after
   * the instance has been disposed.
   */
  preload: () => Promise<void>
  /** Reject pending calls, abort the signal, clear the owned cache, and dispose loader-created engines. */
  dispose: () => void
}

/**
 * Component-free highlighting with an instance-owned context and cache.
 * Use this for build scripts and per-request SSR instead of the module-level
 * default context that `useSyntaxHighlighter` falls back to outside setup.
 */
export function createHighlighter(options: CreateHighlighterOptions = {}): Highlighter {
  const { engineOptions, ...contextOptions } = options
  const context = createHighlighterContext(contextOptions, undefined, false)
  const controller = createHighlightController({
    context,
    getInput: () => ({
      code: '',
      language: 'text',
      engine: contextOptions.engine,
      engineOptions,
    }),
  })
  let disposed = false
  let rejectDisposed: ((error: Error) => void) | undefined
  const disposal = new Promise<never>((_, reject) => {
    rejectDisposed = reject
  })
  // The disposal promise is shared with zero or more pending highlights. Mark
  // it handled so disposing an idle instance cannot raise an unhandled rejection.
  void disposal.catch(() => undefined)

  function disposedError(): Error {
    return new Error('[vue-syntax-highlighter] This highlighter scope has been disposed.')
  }

  return {
    highlight: (input) => {
      if (disposed) return Promise.reject(disposedError())
      return Promise.race([controller.highlight(input), disposal])
    },
    preload: () => {
      if (disposed) return Promise.reject(disposedError())
      return Promise.race([preloadLanguages(context), disposal])
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      rejectDisposed?.(disposedError())
      controller.dispose()
      disposeContext(context)
    },
  }
}
