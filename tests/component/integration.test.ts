import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
} from 'vue'
import { Light, LightAsync, PrismLight, PrismAsync } from '@/aliases'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { useSyntaxHighlighter } from '@/composables/useSyntaxHighlighter'
import { createHighlighterContext, selectTheme } from '@/core/context'
import { splitSource } from '@/core/source'
import { globalWarningSet } from '@/core/warn'
import VueSyntaxHighlighter from '@/plugin'
import type { HighlightEngine, HighlightResult } from '@/types'
import { vshDark } from '@/themes/vsh-dark'
import { vshPaper } from '@/themes/vsh-paper'

function result(code: string, language = 'js'): HighlightResult {
  return {
    lines: splitSource(code).map((line) => ({
      tokens: line ? [{ text: line, type: 'plain' as const }] : [],
    })),
    language,
  }
}

let engineCounter = 0
function engine(
  highlight: HighlightEngine['highlight'] = vi.fn((request) =>
    result(request.code, request.language),
  ),
  capabilities: { sync?: boolean } = { sync: true },
): HighlightEngine & { highlight: Mock<HighlightEngine['highlight']> } {
  return {
    id: `integration-engine-${++engineCounter}`,
    capabilities,
    highlight: highlight as Mock<HighlightEngine['highlight']>,
    dispose: vi.fn(),
  }
}

beforeEach(() => {
  globalWarningSet.clear()
})

describe('provider configuration', () => {
  it('inherits unspecified values in nested providers', () => {
    const outerEngine = engine()
    const wrapper = mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { engine: outerEngine, theme: vshDark }, () => [
            h(SyntaxHighlighter, { code: 'outer' }),
            h(
              SyntaxHighlighterProvider,
              { theme: vshPaper },
              () => h(SyntaxHighlighter, { code: 'inner' }),
            ),
          ]),
      },
      { attachTo: document.body },
    )
    expect(outerEngine.highlight).toHaveBeenCalledTimes(2)
    const scopes = wrapper.findAll('.vsh-scope')
    expect(scopes[0]?.attributes('data-vsh-theme')).toBe('vsh-dark')
    expect(scopes[1]?.attributes('data-vsh-theme')).toBe('vsh-paper')
  })

  it('does not dispose a shared engine when a single block unmounts', async () => {
    const shared = engine()
    const dispose = vi.spyOn(shared, 'dispose')
    const show = ref(true)
    const wrapper = mount(
      {
        setup: () => () =>
          h(
            SyntaxHighlighterProvider,
            { engine: 'custom', engines: { custom: () => shared } },
            () => [
              ...(show.value ? [h(SyntaxHighlighter, { code: 'a' })] : []),
              h(SyntaxHighlighter, { code: 'b' }),
            ],
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(shared.highlight).toHaveBeenCalled()
    show.value = false
    await nextTick()
    expect(dispose).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes loader-owned engines when the provider unmounts', async () => {
    const owned = engine()
    const dispose = vi.spyOn(owned, 'dispose')
    const wrapper = mount(SyntaxHighlighterProvider, {
      props: { engine: 'custom', engines: { custom: () => owned } },
      slots: { default: () => h(SyntaxHighlighter, { code: 'x' }) },
      attachTo: document.body,
    })
    await flushPromises()
    wrapper.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('exposes provider theme and engine selection to context consumers', () => {
    const context = createHighlighterContext({ theme: vshDark }, undefined, true)
    const child = createHighlighterContext({}, context, false)
    const selected = selectTheme(child, {})
    expect(selected.theme).toBe(vshDark)
  })
})

describe('plugin', () => {
  it('registers the component and isolates applications', () => {
    const first = engine()
    const second = engine()
    const appA = createApp({ render: () => h(SyntaxHighlighter, { code: 'a' }) })
    const appB = createApp({ render: () => h(SyntaxHighlighter, { code: 'b' }) })
    appA.use(VueSyntaxHighlighter, { engine: first })
    appB.use(VueSyntaxHighlighter, { engine: second })
    expect(appA.component('SyntaxHighlighter')).toBe(SyntaxHighlighter)
    const nodeA = document.createElement('div')
    const nodeB = document.createElement('div')
    document.body.append(nodeA, nodeB)
    appA.mount(nodeA)
    appB.mount(nodeB)
    expect(first.highlight).toHaveBeenCalledTimes(1)
    expect(second.highlight).toHaveBeenCalledTimes(1)
    appA.unmount()
    appB.unmount()
    nodeA.remove()
    nodeB.remove()
  })

  it('warns about invalid options without preventing startup', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const app = createApp({ render: () => null })
    expect(() =>
      app.use(VueSyntaxHighlighter, {
        engines: { broken: 1 as never },
      }),
    ).not.toThrow()
    expect(app.component('SyntaxHighlighter')).toBe(SyntaxHighlighter)
    expect(spy.mock.calls.some((call) => String(call[0]).includes('Invalid engine registration'))).toBe(
      true,
    )
  })

  it('warns once per alias and maps deprecated props', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fake = engine()
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { engines: { highlightjs: () => fake } },
            () => [
              h(Light, { code: 'a', showLineNumbers: true }),
              h(LightAsync, { code: 'b', showLineNumbers: true }),
            ],
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(fake.highlight).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.vsh-gutter')).toHaveLength(2)
    const messages = spy.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((message) => message.includes('showLineNumbers'))).toHaveLength(1)
    expect(messages.filter((message) => message.includes('"Light" component alias'))).toHaveLength(1)
    expect(messages.filter((message) => message.includes('"LightAsync" component alias'))).toHaveLength(
      1,
    )
  })

  it.each([
    [PrismLight, 'prism'],
    [PrismAsync, 'prism'],
  ] as const)('selects the Prism adapter for %s aliases', async (component, adapter) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fake = engine()
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { engines: { [adapter]: () => fake } },
            () => h(component, { code: 'x' }),
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(fake.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.vsh').exists()).toBe(true)
  })
})

describe('composable', () => {
  it('exposes reactive state and respects provider configuration', async () => {
    const fake = engine()
    const code = ref('first')
    let api!: ReturnType<typeof useSyntaxHighlighter>
    const Child = defineComponent({
      setup() {
        api = useSyntaxHighlighter({ code, language: 'js' })
        return () => h('div')
      },
    })
    mount(
      {
        render: () =>
          h(SyntaxHighlighterProvider, { engine: fake }, () => h(Child)),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(api.result.value?.lines[0]?.tokens[0]?.text).toBe('first')
    expect(api.loading.value).toBe(false)
    expect(api.lines.value[0]?.tokens[0]?.text).toBe('first')

    code.value = 'second'
    await flushPromises()
    await nextTick()
    expect(api.result.value?.lines[0]?.tokens[0]?.text).toBe('second')
    expect(fake.highlight).toHaveBeenCalledTimes(2)
  })

  it('reports errors and can be refreshed', async () => {
    let fail = true
    const fake = engine(
      vi.fn(() => {
        if (fail) throw new Error('nope')
        return result('x')
      }),
    )
    let api!: ReturnType<typeof useSyntaxHighlighter>
    const Child = defineComponent({
      setup() {
        api = useSyntaxHighlighter({ code: 'x', engine: fake, language: 'js' })
        return () => h('div')
      },
    })
    mount(Child)
    await flushPromises()
    expect(api.error.value?.message).toContain('nope')
    fail = false
    await api.refresh()
    expect(api.error.value).toBeUndefined()
    expect(api.result.value?.lines[0]?.tokens[0]?.text).toBe('x')
  })

  it('copies source from the composable API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    let api!: ReturnType<typeof useSyntaxHighlighter>
    const Child = defineComponent({
      setup() {
        api = useSyntaxHighlighter({ code: 'a\nb', language: 'js' })
        return () => h('div')
      },
    })
    mount(Child)
    await flushPromises()
    expect(api.getCopyPayload()).toBe('a\nb')
    await expect(api.copy()).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('a\nb')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  })

  it('treats null code as empty in the composable copy payload', () => {
    let api!: ReturnType<typeof useSyntaxHighlighter>
    const Child = defineComponent({
      setup() {
        api = useSyntaxHighlighter({ code: null as never, language: 'js' })
        return () => h('div')
      },
    })
    mount(Child)
    expect(() => api.getCopyPayload()).not.toThrow()
    expect(api.getCopyPayload()).toBe('')
  })

  it('supports async engines and reports loading', async () => {
    let resolve!: (value: HighlightResult) => void
    const fake = engine(
      vi.fn(
        () =>
          new Promise<HighlightResult>((done) => {
            resolve = done
          }),
      ),
      { sync: false },
    )
    let api!: ReturnType<typeof useSyntaxHighlighter>
    const Child = defineComponent({
      setup() {
        api = useSyntaxHighlighter({ code: 'x', engine: fake, language: 'js' })
        return () => h('div')
      },
    })
    mount(Child)
    await flushPromises()
    expect(api.loading.value).toBe(true)
    resolve(result('x'))
    await flushPromises()
    expect(api.loading.value).toBe(false)
    expect(api.result.value?.lines[0]?.tokens[0]?.text).toBe('x')
  })
})

describe('type surface smoke tests', () => {
  it('accepts prop-typed callbacks', () => {
    const props = {
      lineProps: (_: { lineNumber: number }) => ({ class: 'x' }),
      tokenProps: (_: { token: { text: string } }) => ({ 'data-x': '1' }),
      preTag: 'pre' as const,
      codeTag: 'code' as const,
    } satisfies Record<string, unknown>
    expect(props.lineProps({ lineNumber: 1 })).toEqual({ class: 'x' })
  })
})
