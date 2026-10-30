import { describe, expect, it, vi, type Mock } from 'vitest'
import { createHighlighter } from '@/core/highlighter'
import { resultToSource, splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'

let counter = 0

function makeEngine(
  highlight: HighlightEngine['highlight'] = vi.fn((request) =>
    makeResult(request.code, request.language),
  ),
): HighlightEngine & { highlight: Mock<HighlightEngine['highlight']> } {
  return {
    id: `headless-${++counter}`,
    capabilities: { sync: true },
    highlight: highlight as Mock<HighlightEngine['highlight']>,
  }
}

function makeResult(code: string, language = 'js'): HighlightResult {
  return {
    lines: splitSource(code).map((line) => ({
      tokens: line ? [{ text: line, type: 'plain' as const }] : [],
    })),
    language,
  }
}

describe('createHighlighter', () => {
  it('highlights without a component and normalizes the language', async () => {
    const engine = makeEngine()
    const highlighter = createHighlighter({ engine })

    const result = await highlighter.highlight({ code: 'const x = 1' })

    expect(result.lines).toHaveLength(1)
    expect(result.language).toBe('text')
    expect(engine.highlight).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'const x = 1', language: 'text' }),
      undefined,
    )
    highlighter.dispose()
  })

  it('applies the documented terminal-newline behavior', async () => {
    const highlighter = createHighlighter({ engine: makeEngine() })

    const stripped = await highlighter.highlight({ code: 'a\n' })
    const preserved = await highlighter.highlight({
      code: 'a\n',
      preserveTrailingNewline: true,
    })

    expect(resultToSource(stripped)).toBe('a')
    expect(resultToSource(preserved)).toBe('a\n')
    highlighter.dispose()
  })

  it('reuses the instance cache and partitions it by engine options', async () => {
    const engine = makeEngine()
    const highlighter = createHighlighter({ engine })

    await highlighter.highlight({ code: 'x', language: 'js' })
    await highlighter.highlight({ code: 'x', language: 'js' })
    expect(engine.highlight).toHaveBeenCalledTimes(1)

    await highlighter.highlight({ code: 'x', language: 'js' })
    highlighter.dispose()

    const withOptions = createHighlighter({ engine, engineOptions: { flavor: 'a' } })
    await withOptions.highlight({ code: 'x', language: 'js' })
    expect(engine.highlight).toHaveBeenCalledTimes(2)
    expect(engine.highlight).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'x', language: 'js' }),
      { flavor: 'a' },
    )
    withOptions.dispose()
  })

  it('does not share state between instances', async () => {
    const engine = makeEngine()
    const first = createHighlighter({ engine })
    const second = createHighlighter({ engine })

    await first.highlight({ code: 'x', language: 'js' })
    await second.highlight({ code: 'x', language: 'js' })

    expect(engine.highlight).toHaveBeenCalledTimes(2)
    first.dispose()
    second.dispose()
  })

  it('preloads configured languages', async () => {
    const loadLanguage = vi.fn(async () => undefined)
    const engine: HighlightEngine = {
      id: `preload-${++counter}`,
      capabilities: { sync: true },
      hasLanguage: () => false,
      loadLanguage,
      highlight: (request) => makeResult(request.code, request.language),
    }
    const highlighter = createHighlighter({ engine, languages: ['typescript'] })

    await highlighter.preload()

    expect(loadLanguage).toHaveBeenCalledWith('typescript')
    highlighter.dispose()
  })

  it('supports async engines', async () => {
    const engine = makeEngine(async (request) => makeResult(request.code, request.language))
    const highlighter = createHighlighter({ engine })

    const result = await highlighter.highlight({ code: 'x', language: 'js' })

    expect(resultToSource(result)).toBe('x')
    highlighter.dispose()
  })

  it('rejects pending work on dispose even if the engine ignores the signal', async () => {
    const engine: HighlightEngine = {
      id: `abort-${++counter}`,
      capabilities: { sync: false },
      highlight: () => new Promise<HighlightResult>(() => undefined),
    }
    const highlighter = createHighlighter({ engine })
    const pending = highlighter.highlight({ code: 'x', language: 'js' })

    highlighter.dispose()

    await expect(pending).rejects.toThrow(/disposed/)
  })

  it('rejects after disposal and tolerates repeated disposal', async () => {
    const highlighter = createHighlighter({ engine: makeEngine() })

    highlighter.dispose()
    highlighter.dispose()

    await expect(highlighter.highlight({ code: 'x', language: 'js' })).rejects.toThrow(/disposed/)
  })

  it('rejects preload after disposal and while preload is pending', async () => {
    const loadLanguage = vi.fn(() => new Promise<void>(() => undefined))
    const engine: HighlightEngine = {
      id: `preload-abort-${++counter}`,
      capabilities: { sync: true },
      hasLanguage: () => false,
      loadLanguage,
      highlight: (request) => makeResult(request.code, request.language),
    }
    const highlighter = createHighlighter({ engine, languages: ['typescript'] })
    const pending = highlighter.preload()

    highlighter.dispose()

    await expect(pending).rejects.toThrow(/disposed/)
    await expect(highlighter.preload()).rejects.toThrow(/disposed/)
    expect(loadLanguage).toHaveBeenCalledWith('typescript')
  })
})
