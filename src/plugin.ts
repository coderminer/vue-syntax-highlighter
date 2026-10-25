import type { App, Plugin } from 'vue'
import type { HighlighterOptions } from './types.js'
import {
  createHighlighterContext,
  disposeContext,
  preloadLanguages,
  type HighlighterContext,
  HIGHLIGHTER_CONTEXT,
} from './core/context.js'
import { warnOnce } from './core/warn.js'
import { SyntaxHighlighter } from './component/SyntaxHighlighter.js'

export interface VueSyntaxHighlighterOptions extends HighlighterOptions {
  componentName?: string
}

export type VueSyntaxHighlighterPlugin = Plugin & {
  readonly name: string
  install(app: App, options?: VueSyntaxHighlighterOptions): void
}

const installedContexts = new WeakMap<App, HighlighterContext>()

export const VueSyntaxHighlighter: VueSyntaxHighlighterPlugin = {
  name: 'vue-syntax-highlighter',
  install(app, options = {}) {
    const previous = installedContexts.get(app)
    if (previous) disposeContext(previous)

    let context: HighlighterContext
    try {
      context = createHighlighterContext(options, undefined, false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Invalid plugin options should never prevent application startup.
      const fallbackWarningSet = new Set<string>()
      warnOnce('plugin-options', `${message} Falling back to defaults.`, fallbackWarningSet)
      context = createHighlighterContext({}, undefined, false)
    }

    installedContexts.set(app, context)
    app.provide(HIGHLIGHTER_CONTEXT, context)
    app.component(options.componentName ?? 'SyntaxHighlighter', SyntaxHighlighter)

    const onUnmount = (app as App & { onUnmount?: (callback: () => void) => void }).onUnmount
    if (typeof onUnmount === 'function') {
      onUnmount.call(app, () => {
        disposeContext(context)
        installedContexts.delete(app)
      })
    }

    void preloadLanguages(context)
  },
}

export default VueSyntaxHighlighter
