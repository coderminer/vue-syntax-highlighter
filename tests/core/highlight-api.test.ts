import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { useSyntaxHighlighter } from '@/composables/useSyntaxHighlighter'
import { createHighlighterContext } from '@/core/context'
import { createHighlightController } from '@/core/controller'
import { resultToSource, splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'

let counter = 0
function makeEngine(): HighlightEngine & { highlight: ReturnType<typeof vi.fn> } {
  return {
    id: `highlight-api-${++counter}`,
    capabilities: { sync: true },
    highlight: vi.fn((request: { code: string; language: string }): HighlightResult => ({
      lines: splitSource(request.code).map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language: request.language,
    })),
  }
}

function controller(engine: HighlightEngine) {
  return createHighlightController({
    context: createHighlighterContext({ engine }),
    getInput: () => ({ code: 'seed', language: 'js' }),
  })
}

describe('highlight terminal newline option', () => {
  it('strips one terminal newline by default', async () => {
    const api = controller(makeEngine())
    const result = await api.highlight({ code: 'a\n' })
    expect(result.lines).toHaveLength(1)
    expect(resultToSource(result)).toBe('a')

    const two = await api.highlight({ code: 'a\n\n' })
    expect(two.lines).toHaveLength(2)
    expect(resultToSource(two)).toBe('a\n')
  })

  it('preserves one or more terminal newlines when asked', async () => {
    const api = controller(makeEngine())
    const one = await api.highlight({ code: 'a\n', preserveTrailingNewline: true })
    expect(one.lines).toHaveLength(2)
    expect(resultToSource(one)).toBe('a\n')

    const two = await api.highlight({ code: 'a\n\n', preserveTrailingNewline: true })
    expect(two.lines).toHaveLength(3)
    expect(resultToSource(two)).toBe('a\n\n')
  })

  it('normalizes CRLF in both modes', async () => {
    const api = controller(makeEngine())
    const stripped = await api.highlight({ code: 'a\r\nb\r\n' })
    expect(resultToSource(stripped)).toBe('a\nb')
    const preserved = await api.highlight({
      code: 'a\r\nb\r\n',
      preserveTrailingNewline: true,
    })
    expect(resultToSource(preserved)).toBe('a\nb\n')
  })

  it('does not mix preserved and stripped cache entries', async () => {
    const engine = makeEngine()
    const api = controller(engine)
    await api.highlight({ code: 'a\n' })
    await api.highlight({ code: 'a\n', preserveTrailingNewline: true })
    expect(engine.highlight).toHaveBeenCalledTimes(2)

    await api.highlight({ code: 'a\n' })
    await api.highlight({ code: 'a\n', preserveTrailingNewline: true })
    expect(engine.highlight).toHaveBeenCalledTimes(2)
  })

  it('still validates preserved engine output', async () => {
    const engine: HighlightEngine = {
      id: `invalid-${++counter}`,
      capabilities: { sync: true },
      highlight: () => ({
        lines: [{ tokens: [{ text: 'wrong', type: 'plain' }] }],
        language: 'js',
      }),
    }
    const api = controller(engine)
    await expect(
      api.highlight({ code: 'a\n', preserveTrailingNewline: true }),
    ).rejects.toThrow(/do not reproduce the source text/)
  })
})

describe('component and composable option plumbing', () => {
  it('forwards preserveTrailingNewline from the exposed method', async () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a', engine: makeEngine() },
    })
    const api = wrapper.vm as unknown as {
      highlight: (input: {
        code: string
        preserveTrailingNewline?: boolean
      }) => Promise<HighlightResult>
      getCopyPayload: () => string
    }
    const result = await api.highlight({ code: 'a\n', preserveTrailingNewline: true })
    expect(resultToSource(result)).toBe('a\n')
    expect(wrapper.findAll('.vsh-line')).toHaveLength(1)
    expect(api.getCopyPayload()).toBe('a')
    wrapper.unmount()
  })

  it('applies the composable default and a per-call override', async () => {
    const api = useSyntaxHighlighter({
      code: 'seed',
      language: 'js',
      engine: makeEngine(),
      preserveTrailingNewline: true,
    })
    const defaulted = await api.highlight({ code: 'a\n' })
    expect(resultToSource(defaulted)).toBe('a\n')

    const overridden = await api.highlight({
      code: 'a\n',
      preserveTrailingNewline: false,
    })
    expect(resultToSource(overridden)).toBe('a')
    api.controller.dispose()
  })

  it('leaves rendering and copy output independent of the option', async () => {
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a\n', engine: makeEngine(), lineNumbers: true },
    })
    expect(wrapper.findAll('.vsh-line')).toHaveLength(1)
    expect(wrapper.find('.vsh-gutter').text()).toBe('1')
    expect(
      (wrapper.vm as unknown as { getCopyPayload: () => string }).getCopyPayload(),
    ).toBe('a\n')
    wrapper.unmount()
  })

  it('does not trigger a highlight from the exposed option alone', async () => {
    const engine = makeEngine()
    const wrapper = mount(SyntaxHighlighter, {
      props: { code: 'a', engine },
    })
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    await (wrapper.vm as unknown as {
      highlight: (input: { code: string; preserveTrailingNewline: boolean }) => Promise<unknown>
    }).highlight({ code: 'a\n', preserveTrailingNewline: true })
    expect(wrapper.findAll('.vsh-line')).toHaveLength(1)
    wrapper.unmount()
  })
})
