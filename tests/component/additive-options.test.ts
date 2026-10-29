import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { createHighlighterContext, selectScopeMode } from '@/core/context'
import { splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'
import { vshDark } from '@/themes/vsh-dark'
import { vshLight } from '@/themes/vsh-light'
import { vshPaper } from '@/themes/vsh-paper'

let counter = 0
function makeEngine(): HighlightEngine & { highlight: ReturnType<typeof vi.fn> } {
  return {
    id: `additive-${++counter}`,
    capabilities: { sync: true },
    highlight: vi.fn((request: { code: string; language: string }): HighlightResult => ({
      lines: splitSource(request.code).map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language: request.language,
    })),
  }
}

function mountProvider(
  providerProps: Record<string, unknown>,
  blockProps: Record<string, unknown> = {},
) {
  return mount(
    {
      render: () =>
        h(SyntaxHighlighterProvider, providerProps, () =>
          h(SyntaxHighlighter, {
            code: 'x',
            engine: makeEngine(),
            ...blockProps,
          }),
        ),
    },
    { attachTo: document.body },
  )
}

describe('provider scope mode', () => {
  it('derives providesScope from the explicit scope mode', () => {
    const wrapper = createHighlighterContext({}, undefined, true, 'wrapper')
    const renderless = createHighlighterContext({}, undefined, false, 'renderless')
    const none = createHighlighterContext({})
    expect(wrapper.providesScope).toBe(true)
    expect(wrapper.scopeMode).toBe('wrapper')
    expect(renderless.providesScope).toBe(false)
    expect(renderless.scopeMode).toBe('renderless')
    expect(none.scopeMode).toBe('none')
    expect(selectScopeMode(wrapper)).toBe('wrapper')
    expect(selectScopeMode(renderless)).toBe('renderless')
    expect(selectScopeMode(none)).toBe('none')
  })

  it('skips plugin contexts and finds the nearest provider mode', () => {
    const outer = createHighlighterContext({}, undefined, false, 'wrapper')
    const plugin = createHighlighterContext({}, outer, false, 'none')
    const inner = createHighlighterContext({}, plugin, false, 'renderless')
    expect(selectScopeMode(inner)).toBe('renderless')
  })

  it('keeps the default wrapper and removes it only when renderless', () => {
    const normal = mountProvider({ theme: vshLight })
    expect(normal.find('div.vsh-scope').exists()).toBe(true)

    const renderless = mountProvider({ theme: vshLight, renderless: true })
    expect(renderless.find('.vsh-scope').exists()).toBe(false)
    expect(renderless.find('.vsh').exists()).toBe(true)
    expect(renderless.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-light')

    normal.unmount()
    renderless.unmount()
  })

  it('still applies provider configuration in renderless mode', async () => {
    const engine = makeEngine()
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { renderless: true, engine, theme: vshDark }, () =>
            h(SyntaxHighlighter, { code: 'a\nb' }),
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.vsh-line')).toHaveLength(2)
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-dark')
    wrapper.unmount()
  })

  it('warns once when renderless ignores a custom scopeTag', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const tag = ref('section')
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { renderless: true, scopeTag: tag.value, theme: vshLight },
            () => h(SyntaxHighlighter, { code: 'x', engine: makeEngine() }),
          ),
      },
      { attachTo: document.body },
    )
    tag.value = 'article'
    await nextTick()
    const messages = spy.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((message) => message.includes('scopeTag'))).toHaveLength(1)
    expect(wrapper.find('.vsh-scope').exists()).toBe(false)
    wrapper.unmount()
    spy.mockRestore()
  })

  it('warns when renderless receives the explicit default scopeTag', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { renderless: true, scopeTag: 'div', theme: vshLight },
            () => h(SyntaxHighlighter, { code: 'x', engine: makeEngine() }),
          ),
      },
      { attachTo: document.body },
    )
    const messages = spy.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((message) => message.includes('scopeTag'))).toHaveLength(1)
    expect(wrapper.find('.vsh-scope').exists()).toBe(false)
    wrapper.unmount()
    spy.mockRestore()
  })

  it('composes renderless and wrapper providers in both nesting orders', () => {
    const outerWrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { theme: vshDark }, () => [
            h(SyntaxHighlighter, { code: 'outer', engine: makeEngine() }),
            h(SyntaxHighlighterProvider, { renderless: true, theme: vshPaper }, () =>
              h(SyntaxHighlighter, { code: 'inner', engine: makeEngine() }),
            ),
          ]),
      },
      { attachTo: document.body },
    )
    const blocks = outerWrapper.findAll('.vsh')
    expect(outerWrapper.findAll('.vsh-scope')).toHaveLength(1)
    expect(blocks[0]?.attributes('data-vsh-theme')).toBeUndefined()
    expect(blocks[1]?.attributes('data-vsh-theme')).toBe('vsh-paper')
    outerWrapper.unmount()

    const outerRenderless = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { renderless: true, theme: vshDark }, () => [
            h(SyntaxHighlighter, { code: 'outer', engine: makeEngine() }),
            h(SyntaxHighlighterProvider, { theme: vshPaper }, () =>
              h(SyntaxHighlighter, { code: 'inner', engine: makeEngine() }),
            ),
          ]),
      },
      { attachTo: document.body },
    )
    const innerBlocks = outerRenderless.findAll('.vsh')
    expect(outerRenderless.findAll('.vsh-scope')).toHaveLength(1)
    expect(innerBlocks[0]?.attributes('data-vsh-theme')).toBe('vsh-dark')
    expect(innerBlocks[1]?.attributes('data-vsh-theme')).toBeUndefined()
    outerRenderless.unmount()
  })

  it('disposes a renderless provider scope on unmount', async () => {
    const engine: HighlightEngine = {
      ...makeEngine(),
      dispose: vi.fn(),
    }
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { renderless: true, engine: 'custom', engines: { custom: () => engine } },
            () => h(SyntaxHighlighter, { code: 'x' }),
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    wrapper.unmount()
    expect(engine.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('theme scope', () => {
  it('keeps provider ownership by default', () => {
    const wrapper = mountProvider({ theme: vshLight })
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits root theme payload with themeScope=self and keeps the wrapper', () => {
    const wrapper = mountProvider({ theme: vshLight }, { themeScope: 'self' })
    const block = wrapper.find('.vsh')
    expect(wrapper.find('.vsh-scope').exists()).toBe(true)
    expect(block.attributes('data-vsh-theme')).toBe('vsh-light')
    expect(block.attributes('data-vsh-scheme')).toBe('light')
    expect(block.attributes('data-vsh-theme-light')).toBe('vsh-light')
    expect(block.attributes('data-vsh-theme-dark')).toBe('vsh-light')
    expect(block.attributes('style')).toContain('--vsh-light-bg')
    wrapper.unmount()
  })

  it('keeps the local theme override winning in self mode', () => {
    const wrapper = mountProvider({ theme: vshLight }, { themeScope: 'self', theme: vshDark })
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-dark')
    expect(wrapper.find('.vsh-scope').exists()).toBe(true)
    wrapper.unmount()
  })

  it('makes renderless descendants own the provider theme', () => {
    const wrapper = mountProvider({ theme: vshPaper, renderless: true })
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-paper')
    expect(wrapper.find('.vsh').attributes('style')).toContain('--vsh-light-bg')
    wrapper.unmount()
  })

  it('warns for an unknown themeScope and falls back to inherit', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mountProvider({ theme: vshLight }, { themeScope: 'global' as never })
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBeUndefined()
    expect(spy.mock.calls.some((call) => String(call[0]).includes('themeScope'))).toBe(true)
    wrapper.unmount()
    spy.mockRestore()
  })
})

describe('line-height modes', () => {
  it('keeps visual mode free of inline row metrics', () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a\nb', engine: makeEngine(), lineHeight: 21 },
    })
    expect(wrapper.find('.vsh-line').attributes('style')).toBeUndefined()
    wrapper.unmount()
  })

  it('applies fixed metrics at 20 and 21 pixels', () => {
    for (const lineHeight of [20, 21]) {
      const wrapper = mount(SyntaxHighlighter, {
        props: {
          code: 'a\nb',
          engine: makeEngine(),
          lineHeight,
          lineHeightMode: 'fixed',
        },
      })
      for (const line of wrapper.findAll('.vsh-line')) {
        expect(line.attributes('style')).toContain(`min-height: ${lineHeight}px`)
        expect(line.attributes('style')).toContain(`line-height: ${lineHeight}px`)
        expect(line.attributes('style')).not.toMatch(/(?:^|[;\s])height:/)
      }
      wrapper.unmount()
    }
  })

  it('keeps virtual and non-virtual rows on the same numeric metric', () => {
    const code = Array.from({ length: 3000 }, (_, index) => `line ${index}`).join('\n')
    const wrapper = mount(SyntaxHighlighter, {
      props: {
        code,
        engine: makeEngine(),
        virtualized: true,
        height: 400,
        lineHeight: 21,
        lineHeightMode: 'fixed',
      },
    })
    const rows = wrapper.findAll('.vsh-line')
    expect(rows[0]?.attributes('style')).toContain('height: 21px')
    const spacers = wrapper.findAll('.vsh-spacer')
    const top = Number(/height: (\d+)px/.exec(spacers[0]?.attributes('style') ?? '')?.[1] ?? 0)
    const bottom = Number(/height: (\d+)px/.exec(spacers[1]?.attributes('style') ?? '')?.[1] ?? 0)
    expect(top + bottom + rows.length * 21).toBe(3000 * 21)
    wrapper.unmount()
  })

  it('falls back to 20 pixels for an invalid fixed metric', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(SyntaxHighlighter, {
      props: {
        code: 'a',
        engine: makeEngine(),
        lineHeight: 0,
        lineHeightMode: 'fixed',
      },
    })
    expect(wrapper.find('.vsh-line').attributes('style')).toContain('min-height: 20px')
    expect(spy.mock.calls.some((call) => String(call[0]).includes('fixed'))).toBe(true)
    wrapper.unmount()
    spy.mockRestore()
  })

  it('falls back to visual mode for an unknown mode', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(SyntaxHighlighter, {
      props: {
        code: 'a',
        engine: makeEngine(),
        lineHeight: 21,
        lineHeightMode: 'pixel' as never,
      },
    })
    expect(wrapper.find('.vsh-line').attributes('style')).toBeUndefined()
    expect(spy.mock.calls.some((call) => String(call[0]).includes('lineHeightMode'))).toBe(true)
    wrapper.unmount()
    spy.mockRestore()
  })
})

describe('cache engine identity option', () => {
  it('inherits the creation-time option through providers', () => {
    const parent = createHighlighterContext({ cacheEngineIdentity: true })
    const child = createHighlighterContext({}, parent, false, 'renderless')
    expect(parent.cacheEngineIdentity).toBe(true)
    expect(child.cacheEngineIdentity).toBe(true)
  })

  it('warns once when the option changes after creation', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const enabled = ref(false)
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { cacheEngineIdentity: enabled.value }, () => h('div')),
      },
      { attachTo: document.body },
    )
    enabled.value = true
    await nextTick()
    expect(
      spy.mock.calls.some((call) => String(call[0]).includes('cacheEngineIdentity')),
    ).toBe(true)
    wrapper.unmount()
    spy.mockRestore()
  })
})
