import { defineComponent, h, inject, type Component } from 'vue'
import { getDefaultContext, HIGHLIGHTER_CONTEXT } from './core/context.js'
import { warnOnce } from './core/warn.js'
import { SyntaxHighlighter } from './component/SyntaxHighlighter.js'

function createAlias(name: string, engine: 'highlightjs' | 'prism'): Component {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const context = inject(HIGHLIGHTER_CONTEXT, null) ?? getDefaultContext()
      warnOnce(
        `alias:${name}`,
        `The "${name}" component alias is deprecated. Use SyntaxHighlighter with engine="${engine}" instead.`,
        context.warningSet,
      )
      return () => {
        const target = SyntaxHighlighter as unknown as Component
        const props: Record<string, unknown> = {
          ...(attrs as Record<string, unknown>),
          engine: (attrs as Record<string, unknown>).engine ?? engine,
        }
        return h(target, props, slots)
      }
    },
  })
}

/** Compatibility alias for react-syntax-highlighter's highlight.js light build. */
export const Light = createAlias('Light', 'highlightjs')
/** Compatibility alias for the asynchronous highlight.js build. */
export const LightAsync = createAlias('LightAsync', 'highlightjs')
/** Compatibility alias for the Prism light build. */
export const PrismLight = createAlias('PrismLight', 'prism')
/** Compatibility alias for the asynchronous Prism build. */
export const PrismAsync = createAlias('PrismAsync', 'prism')
