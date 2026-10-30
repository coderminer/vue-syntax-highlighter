import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { splitSource } from '@/core/source'
import type { EngineOptions, HighlightEngine, HighlightRequest, HighlightToken } from '@/types'

function makeEngine(): HighlightEngine & { highlight: ReturnType<typeof vi.fn> } {
  return {
    id: 'token-scopes-engine',
    capabilities: { sync: true },
    highlight: vi.fn((request: HighlightRequest, options?: EngineOptions) => ({
      lines: splitSource(request.code).map((line) => ({
        tokens: line
          ? [
              {
                text: line,
                type: 'keyword' as const,
                ...(options?.tokenScopes === true
                  ? { scopes: ['source.ts', 'keyword.control.ts'] }
                  : {}),
              },
            ]
          : [],
      })),
      language: request.language,
    })),
  }
}

describe('SyntaxHighlighter token scopes', () => {
  it('does not render a scope attribute by default', () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'const value = 1', language: 'ts', engine: makeEngine() },
    })

    expect(wrapper.find('[data-vsh-scope]').exists()).toBe(false)
  })

  it('renders scopes returned by the engine when tokenScopes is enabled', () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: {
        code: 'const value = 1',
        language: 'ts',
        engine: makeEngine(),
        engineOptions: { tokenScopes: true },
      },
    })

    const span = wrapper.find('[data-vsh-scope]')
    expect(span.exists()).toBe(true)
    expect(span.attributes('data-vsh-scope')).toBe('source.ts keyword.control.ts')
    expect(span.text()).toBe('const value = 1')
  })

  it('exposes scopes to the token slot', () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: {
        code: 'const value = 1',
        language: 'ts',
        engine: makeEngine(),
        engineOptions: { tokenScopes: true },
      },
      slots: {
        token: ({ token }: { token: HighlightToken }) =>
          h('i', { 'data-scopes': token.scopes?.join(',') }, token.text),
      },
    })

    expect(wrapper.find('[data-scopes]').attributes('data-scopes')).toBe(
      'source.ts,keyword.control.ts',
    )
  })

  it('forwards tokenScopes as part of engine options', () => {
    const engine = makeEngine()
    mount(SyntaxHighlighter, {
      props: {
        code: 'const value = 1',
        language: 'ts',
        engine,
        engineOptions: { tokenScopes: true },
      },
    })

    expect(engine.highlight).toHaveBeenCalledWith(expect.anything(), { tokenScopes: true })
  })
})
