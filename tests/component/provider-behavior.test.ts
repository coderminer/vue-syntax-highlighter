import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'

let counter = 0
function result(code: string, language = 'js'): HighlightResult {
  return {
    lines: splitSource(code).map((line) => ({
      tokens: line ? [{ text: line, type: 'plain' as const }] : [],
    })),
    language,
  }
}
function engine(): HighlightEngine & { highlight: ReturnType<typeof vi.fn> } {
  return {
    id: `provider-behavior-${++counter}`,
    capabilities: { sync: true },
    highlight: vi.fn((request: { code: string; language: string }) =>
      result(request.code, request.language),
    ),
    dispose: vi.fn(),
  }
}

function mockIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = []
  const options: IntersectionObserverInit[] = []
  class Observer {
    constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
      callbacks.push(callback)
      options.push(init ?? {})
    }
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
    takeRecords = () => []
    root = null
    rootMargin = ''
    thresholds = []
  }
  vi.stubGlobal('IntersectionObserver', Observer)
  return { callbacks, options }
}

describe('provider behavior defaults', () => {
  it('applies defer and rootMargin to descendants', async () => {
    const observer = mockIntersectionObserver()
    const fake = engine()
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { defer: true, rootMargin: '50px' },
            () => h(SyntaxHighlighter, { code: 'deferred', engine: fake }),
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(fake.highlight).not.toHaveBeenCalled()
    expect(observer.options[0]?.rootMargin).toBe('50px')

    observer.callbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    await flushPromises()
    expect(fake.highlight).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.vsh-token').exists()).toBe(true)
    wrapper.unmount()
  })

  it('applies virtualization to descendants with a bounded height', async () => {
    const code = Array.from({ length: 3000 }, (_, index) => `line ${index}`).join('\n')
    const fake = engine()
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { virtualized: true },
            () =>
              h(SyntaxHighlighter, {
                code,
                engine: fake,
                height: 400,
                lineHeight: 20,
                overscan: 10,
              }),
          ),
      },
      { attachTo: document.body },
    )
    await nextTick()
    await flushPromises()
    expect(wrapper.findAll('.vsh-line').length).toBeLessThanOrEqual(100)
    wrapper.unmount()
  })

  it('re-highlights when the provider engine changes', async () => {
    const first = engine()
    const second = engine()
    const current = ref<HighlightEngine>(first)
    const wrapper = mount(
      {
        render: () =>
          h(
            SyntaxHighlighterProvider,
            { engine: current.value },
            () => h(SyntaxHighlighter, { code: 'const x = 1', engine: undefined }),
          ),
      },
      { attachTo: document.body },
    )
    await flushPromises()
    expect(first.highlight).toHaveBeenCalledTimes(1)
    expect(second.highlight).not.toHaveBeenCalled()

    current.value = second
    await nextTick()
    await flushPromises()
    expect(second.highlight).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
