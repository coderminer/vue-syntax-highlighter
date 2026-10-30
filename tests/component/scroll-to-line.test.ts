import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult, SyntaxHighlighterExposed } from '@/types'

let counter = 0

function makeEngine(): HighlightEngine & { highlight: ReturnType<typeof vi.fn> } {
  return {
    id: `scroll-${++counter}`,
    capabilities: { sync: true },
    highlight: vi.fn((request: { code: string; language: string }): HighlightResult => ({
      lines: splitSource(request.code).map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language: request.language,
    })),
  }
}

const longCode = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n')

function mountBlock(props: Record<string, unknown>) {
  const engine = makeEngine()
  const wrapper = mount(SyntaxHighlighter, {
    props: { code: longCode, language: 'js', engine, ...props },
  })
  const pre = wrapper.find('pre').element as HTMLElement
  const scrollTo = vi.fn()
  Object.defineProperty(pre, 'scrollTo', { value: scrollTo, configurable: true })
  const api = wrapper.vm as unknown as SyntaxHighlighterExposed
  return { wrapper, pre, scrollTo, api }
}

describe('SyntaxHighlighter.scrollToLine', () => {
  it('positions virtualized blocks with the numeric row height and startLine offset', () => {
    const { api, scrollTo } = mountBlock({
      virtualized: true,
      height: 200,
      lineHeight: 20,
      startLine: 10,
    })

    expect(api.scrollToLine(51)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 820, behavior: 'auto' })
  })

  it('clamps the virtualized offset to the scrollable range', () => {
    const { api, pre, scrollTo } = mountBlock({
      virtualized: true,
      height: 200,
      lineHeight: 20,
    })
    Object.defineProperty(pre, 'scrollHeight', { value: 500, configurable: true })
    Object.defineProperty(pre, 'clientHeight', { value: 200, configurable: true })

    expect(api.scrollToLine(51)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'auto' })
  })

  it('measures the rendered row in non-virtual visual mode', () => {
    const { api, pre, scrollTo } = mountBlock({ code: 'a\nb\nc', lineHeight: 99 })
    Object.defineProperty(pre, 'scrollTop', { value: 10, writable: true, configurable: true })
    vi.spyOn(pre, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect)
    const row = pre.querySelector('[data-line="2"]') as HTMLElement
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: 140 } as DOMRect)

    expect(api.scrollToLine(2)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'auto' })
  })

  it('excludes the scroll element border from measured rows', () => {
    const { api, pre, scrollTo } = mountBlock({ code: 'a\nb\nc', lineHeight: 99 })
    Object.defineProperty(pre, 'scrollTop', { value: 10, writable: true, configurable: true })
    Object.defineProperty(pre, 'clientTop', { value: 3, configurable: true })
    vi.spyOn(pre, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect)
    const row = pre.querySelector('[data-line="2"]') as HTMLElement
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: 140 } as DOMRect)

    expect(api.scrollToLine(2)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 47, behavior: 'auto' })
  })

  it('forwards the smooth behavior option', () => {
    const { api, scrollTo } = mountBlock({ virtualized: true, height: 200, lineHeight: 20 })

    expect(api.scrollToLine(3, { behavior: 'smooth' })).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 40, behavior: 'smooth' })
  })

  it('falls back to scrollTop when the scroll API is unavailable', () => {
    const { api, pre } = mountBlock({ virtualized: true, height: 200, lineHeight: 20 })
    Object.defineProperty(pre, 'scrollTo', { value: undefined, configurable: true })

    expect(api.scrollToLine(3)).toBe(true)
    expect(pre.scrollTop).toBe(40)
  })

  it('rejects out-of-range and non-integer lines without scrolling', () => {
    const { api, scrollTo } = mountBlock({ lineHeight: 20 })

    expect(api.scrollToLine(0)).toBe(false)
    expect(api.scrollToLine(1.5)).toBe(false)
    expect(api.scrollToLine(Number.NaN)).toBe(false)
    expect(api.scrollToLine(201)).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('returns false after unmount', () => {
    const { wrapper, api } = mountBlock({ lineHeight: 20 })

    wrapper.unmount()

    expect(api.scrollToLine(1)).toBe(false)
  })
})
