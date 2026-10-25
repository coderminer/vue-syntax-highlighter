import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { h, nextTick } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { normalizeSource, splitSource } from '@/core/source'
import { vshDark } from '@/themes/vsh-dark'
import { vshLight } from '@/themes/vsh-light'
import { vshPaper } from '@/themes/vsh-paper'
import type { HighlightEngine, HighlightResult } from '@/types'

function makeResult(code: string, language = 'js'): HighlightResult {
  return {
    lines: splitSource(normalizeSource(code)).map((line) => ({
      tokens: line ? [{ text: line, type: 'keyword' as const }] : [],
    })),
    language,
  }
}

let engineCounter = 0

function makeEngine(
  highlight: HighlightEngine['highlight'] = vi.fn((request) =>
    makeResult(request.code, request.language),
  ),
  capabilities: { sync?: boolean } = { sync: true },
): HighlightEngine & { highlight: Mock<HighlightEngine['highlight']> } {
  return {
    id: `test-engine-${++engineCounter}`,
    capabilities,
    highlight: highlight as Mock<HighlightEngine['highlight']>,
  }
}

function mountWith(
  props: Record<string, unknown>,
  options: Record<string, unknown> = {},
) {
  return mount(SyntaxHighlighter, {
    props: { code: 'const x = 1', language: 'js', ...props },
    ...options,
  })
}

describe('SyntaxHighlighter rendering', () => {
  it('renders the documented wrapper, pre, code, language class, and tokens', () => {
    const engine = makeEngine()
    const wrapper = mountWith({ engine })
    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.classes()).toContain('vsh')
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').classes()).toContain('language-js')
    expect(wrapper.findAll('.vsh-token-keyword')).toHaveLength(1)
    expect(wrapper.find('.vsh-line').text()).toBe('const x = 1')
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('highlighted')?.[0]?.[1]).toMatchObject({
      language: 'js',
      theme: 'vsh-light',
      colorScheme: 'light',
    })
  })

  it('preserves multi-line source and empty lines', () => {
    const code = 'a\n\nb\n'
    const engine = makeEngine()
    const wrapper = mountWith({ code, engine })
    const lines = wrapper.findAll('.vsh-line')
    expect(lines).toHaveLength(4)
    expect(lines.map((line) => line.text())).toEqual(['a', '', 'b', ''])
  })

  it('renders empty code without errors or warnings', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine = makeEngine()
    const wrapper = mountWith({ code: '', engine })
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').text()).toBe('')
    expect(spy).not.toHaveBeenCalled()
  })

  it('renders HTML-like source as literal text', () => {
    const code = '<img src=x onerror="alert(1)">'
    const wrapper = mountWith({ code, engine: makeEngine() })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('code').text()).toBe(code)
  })

  it('supports custom preTag and codeTag', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      preTag: 'section',
      codeTag: 'div',
    })
    expect(wrapper.find('section.vsh-pre').exists()).toBe(true)
    expect(wrapper.find('div.vsh-code').exists()).toBe(true)
    expect(wrapper.find('div.vsh-code').classes()).toContain('language-js')
  })
})

describe('line features', () => {
  it('renders a hidden gutter with custom start lines', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      code: 'a\nb\nc',
      lineNumbers: true,
      startLine: 10,
    })
    const gutters = wrapper.findAll('.vsh-gutter')
    expect(gutters.map((gutter) => gutter.text())).toEqual(['10', '11', '12'])
    expect(gutters[0]?.attributes('aria-hidden')).toBe('true')
  })

  it('disables line numbers by default and maps the deprecated alias', () => {
    expect(mountWith({ engine: makeEngine() }).find('.vsh-gutter').exists()).toBe(false)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const aliased = mountWith({ engine: makeEngine(), showLineNumbers: true })
    expect(aliased.findAll('.vsh-gutter')).toHaveLength(1)
  })

  it('highlights individual lines and ranges by source number', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      code: 'a\nb\nc\nd\ne',
      lineNumbers: true,
      startLine: 10,
      highlightLines: [11, [12, 13], 99],
    })
    expect(wrapper.findAll('.vsh-line-highlighted')).toHaveLength(3)
    expect(wrapper.find('[data-line="11"]').classes()).toContain('vsh-line-highlighted')
    expect(wrapper.find('[data-line="10"]').classes()).not.toContain('vsh-line-highlighted')
  })

  it('toggles wrapping', () => {
    expect(mountWith({ engine: makeEngine() }).classes()).not.toContain('vsh-wrap')
    expect(mountWith({ engine: makeEngine(), wrap: true }).classes()).toContain('vsh-wrap')
  })

  it('applies lineProps and tokenProps while merging classes', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      lineProps: (info: { lineNumber: number }) => ({
        class: info.lineNumber === 1 ? 'first-line' : 'other-line',
        'data-custom': 'yes',
      }),
      tokenProps: () => ({ class: 'custom-token', 'data-token': 'yes' }),
    })
    expect(wrapper.find('[data-line="1"]').classes()).toContain('first-line')
    expect(wrapper.find('[data-line="1"]').attributes('data-custom')).toBe('yes')
    const token = wrapper.find('.vsh-token')
    expect(token.classes()).toContain('custom-token')
    expect(token.classes()).toContain('vsh-token-keyword')
    expect(token.attributes('data-token')).toBe('yes')
  })
})

describe('slots', () => {
  it('composes header, footer, line, line-number, and token slots', () => {
    const wrapper = mountWith(
      { engine: makeEngine(), code: 'a\nb', lineNumbers: true },
      {
        slots: {
          header: ({ language }: { language: string }) => h('header', { class: 'head' }, language),
          footer: () => h('footer', { class: 'foot' }, 'footer'),
          'line-number': ({ lineNumber }: { lineNumber: number }) =>
            h('span', { class: 'custom-number' }, `#${lineNumber}`),
          line: ({ renderTokens }: { renderTokens: () => unknown }) =>
            h('span', { class: 'custom-line' }, renderTokens() as never),
          token: ({ token }: { token: { text: string } }) => h('mark', { class: 'custom-token' }, token.text),
        },
      },
    )
    expect(wrapper.find('header.head').text()).toBe('js')
    expect(wrapper.find('footer.foot').text()).toBe('footer')
    expect(wrapper.findAll('.custom-number').map((node) => node.text())).toEqual(['#1', '#2'])
    expect(wrapper.findAll('.vsh-line')).toHaveLength(2)
    expect(wrapper.findAll('.vsh-line-content .custom-line')).toHaveLength(2)
    expect(wrapper.findAll('mark.custom-token')).toHaveLength(2)
    // Gutter alignment and line markers are preserved around the line slot.
    expect(wrapper.findAll('.vsh-gutter')).toHaveLength(2)
  })
})

describe('states and events', () => {
  it('renders a plain busy shell while an async engine is pending', async () => {
    let resolve!: (value: HighlightResult) => void
    const engine = makeEngine(
      vi.fn(
        () =>
          new Promise<HighlightResult>((done) => {
            resolve = done
          }),
      ),
      { sync: false },
    )
    const wrapper = mountWith({ engine })
    expect(wrapper.text()).toContain('const x = 1')
    expect(wrapper.find('.vsh-token-keyword').exists()).toBe(false)
    expect(wrapper.find('pre').attributes('aria-busy')).toBe('true')
    await flushPromises()

    resolve(makeResult('const x = 1'))
    await flushPromises()
    expect(wrapper.find('.vsh-token-keyword').exists()).toBe(true)
    expect(wrapper.find('pre').attributes('aria-busy')).toBeUndefined()
  })

  it('emits highlighted and error events and exposes loading/error slots', async () => {
    let reject!: (error: Error) => void
    const engine = makeEngine(
      vi.fn(
        () =>
          new Promise<HighlightResult>((_resolve, fail) => {
            reject = fail
          }),
      ),
      { sync: false },
    )
    const wrapper = mountWith(
      { engine },
      {
        slots: {
          loading: () => h('div', { class: 'loading' }, 'loading'),
          error: ({ error }: { error: Error }) => h('div', { class: 'failure' }, error.message),
        },
      },
    )
    await flushPromises()
    expect(wrapper.find('.loading').exists()).toBe(true)
    reject(new Error('boom'))
    await flushPromises()
    expect(wrapper.find('.loading').exists()).toBe(false)
    expect(wrapper.find('.failure').text()).toContain('boom')
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('retains the previous result while refreshing', async () => {
    const pending: ((value: HighlightResult) => void)[] = []
    const engine = makeEngine(
      vi.fn(
        () =>
          new Promise<HighlightResult>((resolve) => {
            pending.push(resolve)
          }),
      ),
      { sync: false },
    )
    const wrapper = mountWith({ code: 'first', engine })
    await flushPromises()
    pending[0]!(makeResult('first'))
    await flushPromises()
    expect(wrapper.text()).toContain('first')

    await wrapper.setProps({ code: 'second' })
    await flushPromises()
    expect(wrapper.text()).toContain('first')
    pending[1]!(makeResult('second'))
    await flushPromises()
    expect(wrapper.text()).toContain('second')
  })
})

describe('accessibility and attributes', () => {
  it('merges caller classes and exposes language, label, focus, and busy state', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      class: 'my-code',
      'aria-label': 'Example',
    })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['vsh', 'my-code']))
    expect(wrapper.attributes('aria-label')).toBe('Example')
    expect(wrapper.attributes('data-language')).toBe('js')
    expect(wrapper.find('pre').attributes('tabindex')).toBe('0')
    expect(wrapper.find('pre').attributes('role')).toBe('region')
  })

  it('honors tabindex=false and forwards data attributes', () => {
    const wrapper = mountWith({
      engine: makeEngine(),
      tabindex: false,
      'data-testid': 'block',
    })
    expect(wrapper.find('pre').attributes('tabindex')).toBeUndefined()
    expect(wrapper.attributes('data-testid')).toBe('block')
  })
})

describe('theme and reactivity', () => {
  it('changes theme without invoking the engine', async () => {
    const engine = makeEngine()
    const wrapper = mountWith({ engine, theme: vshLight })
    const calls = engine.highlight.mock.calls.length
    const tokens = wrapper.html()
    await wrapper.setProps({ theme: vshDark })
    expect(engine.highlight).toHaveBeenCalledTimes(calls)
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-dark')
    expect(wrapper.find('.vsh-token-keyword').text()).toBe('const x = 1')
    expect(wrapper.html()).not.toBe(tokens)
  })

  it('keeps the previous theme for an invalid replacement', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine = makeEngine()
    const wrapper = mountWith({ engine, theme: vshPaper })
    await wrapper.setProps({ theme: 'missing-theme' })
    expect(wrapper.find('.vsh').attributes('data-vsh-theme')).toBe('vsh-paper')
    expect(spy.mock.calls.some((call) => String(call[0]).includes('Unknown theme'))).toBe(true)
  })

  it('does not retry a failed highlight when only the theme changes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine = makeEngine(
      vi.fn(() => {
        throw new Error('unsupported')
      }),
    )
    const wrapper = mountWith({ engine })
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ theme: vshDark })
    await nextTick()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
  })

  it('does not re-highlight on unrelated prop changes', async () => {
    const engine = makeEngine()
    const wrapper = mountWith({ engine })
    await wrapper.setProps({ 'aria-label': 'Updated label' } as never)
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.vsh-token').text()).toBe('const x = 1')
  })

  it('inherits provider themes and supports nested overrides', () => {
    const engine = makeEngine()
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { theme: vshDark }, () => [
            h(SyntaxHighlighter, { code: 'outer', engine }),
            h(
              SyntaxHighlighterProvider,
              { theme: vshPaper },
              () => h(SyntaxHighlighter, { code: 'inner', engine }),
            ),
            h(SyntaxHighlighter, { code: 'outer-2', engine }),
          ]),
      },
      { attachTo: document.body },
    )
    const blocks = wrapper.findAll('.vsh')
    expect(blocks).toHaveLength(3)
    expect(blocks.every((block) => block.attributes('data-vsh-theme') === undefined)).toBe(true)
    const scopes = wrapper.findAll('.vsh-scope')
    expect(scopes).toHaveLength(2)
    expect(scopes[0]?.attributes('style')).toContain('--vsh-dark-bg')
    expect(scopes[1]?.attributes('style')).toContain(`--vsh-light-bg: ${vshPaper.colors.background}`)
    expect(scopes[1]?.attributes('data-vsh-theme')).toBe('vsh-paper')
  })
})

describe('exposed operations', () => {
  it('copies the full source and reports clipboard failures', async () => {
    const engine = makeEngine()
    const wrapper = mountWith({ engine, code: 'a\nb\nc', lineNumbers: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    await expect((wrapper.vm as unknown as { copy: () => Promise<boolean> }).copy()).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('a\nb\nc')
    expect(
      (wrapper.vm as unknown as { getCopyPayload: () => string }).getCopyPayload(),
    ).toBe('a\nb\nc')

    writeText.mockRejectedValueOnce(new Error('denied'))
    await expect((wrapper.vm as unknown as { copy: () => Promise<boolean> }).copy()).resolves.toBe(false)
  })

  it('refreshes and highlights explicit input', async () => {
    const engine = makeEngine()
    const wrapper = mountWith({ engine })
    await (wrapper.vm as unknown as { refresh: () => Promise<unknown> }).refresh()
    await (wrapper.vm as unknown as { highlight: (input: { code: string }) => Promise<HighlightResult> }).highlight({
      code: 'other',
    })
    expect(engine.highlight).toHaveBeenCalledTimes(3)
  })
})

describe('deferral', () => {
  it('waits for intersection and observes only once', async () => {
    const callbacks: IntersectionObserverCallback[] = []
    class MockObserver {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback)
      }
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = () => []
      root = null
      rootMargin = ''
      thresholds = []
    }
    vi.stubGlobal('IntersectionObserver', MockObserver)
    const engine = makeEngine()
    const wrapper = mountWith({ engine, defer: true })
    expect(engine.highlight).not.toHaveBeenCalled()
    callbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await flushPromises()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    callbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await flushPromises()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.vsh-token-keyword').exists()).toBe(true)
  })

  it('falls back to immediate highlighting without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const engine = makeEngine()
    mountWith({ engine, defer: true })
    await flushPromises()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
  })
})

describe('virtualization', () => {
  it('bounds a long virtualized document and reveals lines on scroll', async () => {
    const code = Array.from({ length: 3_000 }, (_, index) => `line ${index + 1}`).join('\n')
    const engine = makeEngine()
    const wrapper = mountWith({
      code,
      engine,
      virtualized: true,
      height: 400,
      lineHeight: 20,
      overscan: 10,
      lineNumbers: true,
    })
    await nextTick()
    const rendered = wrapper.findAll('.vsh-line')
    expect(rendered.length).toBeLessThanOrEqual(100)
    expect(rendered[0]?.attributes('data-line')).toBe('1')
    expect(wrapper.find('.vsh').attributes('style')).toContain('--vsh-gutter-width: 4.25ch')

    const pre = wrapper.find('pre').element as HTMLElement
    pre.scrollTop = 20_000
    pre.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 25))
    await nextTick()
    const scrolled = wrapper.findAll('.vsh-line')
    expect(scrolled.length).toBeLessThanOrEqual(100)
    expect(Number(scrolled[0]?.attributes('data-line'))).toBeGreaterThan(900)
    expect(
      (wrapper.vm as unknown as { getCopyPayload: () => string }).getCopyPayload().split('\n'),
    ).toHaveLength(3_000)
    expect(engine.highlight).toHaveBeenCalledTimes(1)
  })

  it('warns and disables virtualization with wrapping', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const code = Array.from({ length: 3000 }, (_, index) => `line ${index}`).join('\n')
    const wrapper = mountWith({
      code,
      engine: makeEngine(),
      virtualized: true,
      height: 400,
      wrap: true,
    })
    await nextTick()
    expect(wrapper.findAll('.vsh-line')).toHaveLength(3000)
    expect(spy.mock.calls.some((call) => String(call[0]).includes('Virtualization was disabled'))).toBe(true)
  })
})
