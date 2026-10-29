import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { buildCacheKey } from '@/core/cache'
import { highlighterProps, normalizeProps } from '@/core/props'
import { resultToSource, splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'
import { vshLight } from '@/themes/vsh-light'

let counter = 0

function makeEngine(): HighlightEngine {
  return {
    id: `frozen-default-${++counter}`,
    capabilities: { sync: true },
    highlight: (request): HighlightResult => ({
      lines: splitSource(request.code).map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language: request.language,
    }),
  }
}

describe('frozen defaults', () => {
  it('keeps the documented default prop values', () => {
    expect(highlighterProps.lineHeight.default).toBe(20)
    expect(highlighterProps.lineHeightMode.default).toBe('visual')
    expect(highlighterProps.themeScope.default).toBe('inherit')

    const props = normalizeProps({}, new Set())
    expect(props.lineHeight).toBe(20)
    expect(props.lineHeightMode).toBe('visual')
    expect(props.themeScope).toBe('inherit')
  })

  it('keeps provider-owned theme scope and one wrapper by default', () => {
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { theme: vshLight }, () =>
            h(SyntaxHighlighter, { code: 'x', engine: makeEngine() }),
          ),
      },
      { attachTo: document.body },
    )

    const scopes = wrapper.findAll('.vsh-scope')
    expect(scopes).toHaveLength(1)
    expect(scopes[0]?.element.tagName).toBe('DIV')
    expect(scopes[0]?.attributes('data-vsh-theme')).toBe('vsh-light')

    const block = wrapper.find('.vsh')
    expect(block.attributes('data-vsh-theme')).toBeUndefined()
    expect(block.attributes('data-vsh-scheme')).toBeUndefined()
    const style = block.attributes('style')
    expect(style ?? '').not.toContain('--vsh-light-bg')

    wrapper.unmount()
  })

  it('keeps non-virtual rows font-relative by default', () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a\nb', engine: makeEngine() },
    })
    const line = wrapper.find('.vsh-line')
    expect(line.attributes('style')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps the default highlight() terminal-newline behavior', async () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a', engine: makeEngine() },
    })
    const api = wrapper.vm as unknown as {
      highlight: (input: { code: string }) => Promise<HighlightResult>
    }
    const result = await api.highlight({ code: 'a\n' })
    expect(resultToSource(result)).toBe('a')
    expect(result.lines).toHaveLength(1)
    wrapper.unmount()
  })

  it('keeps the default cache key byte-identical', () => {
    expect(buildCacheKey({ engineId: 'fake', language: 'js', code: 'x' })).toBe(
      'v1:["fake","js","x",{}]',
    )
    expect(
      buildCacheKey({
        engineId: 'fake',
        language: 'js',
        code: 'x',
        options: { a: 1 },
      }),
    ).toBe('v1:["fake","js","x",{"a":1}]')
  })

  it('does not warn for the default configuration', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { theme: vshLight }, () =>
            h(SyntaxHighlighter, { code: 'const x = 1', engine: makeEngine() }),
          ),
      },
      { attachTo: document.body },
    )
    expect(spy).not.toHaveBeenCalled()
    wrapper.unmount()
    spy.mockRestore()
  })
})
