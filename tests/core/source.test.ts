import { describe, expect, it } from 'vitest'
import {
  assertHighlightResult,
  countResultChars,
  createPlainResult,
  freezeResult,
  isHighlightResult,
  normalizeDisplaySource,
  normalizeSource,
  resultLineText,
  resultToSource,
  splitSource,
} from '@/core/source'
import type { HighlightResult } from '@/types'

describe('source normalization', () => {
  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeSource('a\r\nb\rc')).toBe('a\nb\nc')
    expect(normalizeSource('a\r\n')).toBe('a\n')
  })

  it('drops one terminal line break for display', () => {
    expect(normalizeDisplaySource('a\n')).toBe('a')
    expect(normalizeDisplaySource('a\r\n')).toBe('a')
    expect(normalizeDisplaySource('a\n\n')).toBe('a\n')
    expect(normalizeDisplaySource('')).toBe('')
  })

  it('keeps raw split semantics for direct callers', () => {
    expect(splitSource('a\n')).toEqual(['a', ''])
    expect(splitSource('')).toEqual([''])
  })

  it('round-trips plain results', () => {
    const source = 'const a = 1\n\nconsole.log(a)\n'
    const result = createPlainResult(source, 'javascript')
    expect(resultToSource(result)).toBe(normalizeSource(source))
    expect(result.lines).toHaveLength(4)
    expect(result.lines[1]?.tokens).toEqual([])
  })

  it('produces valid empty output', () => {
    const result = createPlainResult('', 'text')
    expect(result.lines).toHaveLength(1)
    expect(resultToSource(result)).toBe('')
    expect(isHighlightResult(result)).toBe(true)
  })

  it('rejects malformed results', () => {
    expect(() =>
      assertHighlightResult({ lines: [{ tokens: [{ text: 1, type: 'keyword' }] }], language: 'js' }),
    ).toThrow(/invalid result/i)
    expect(() =>
      assertHighlightResult({ lines: [{ tokens: [{ text: 'x', type: 'nope' }] }], language: 'js' }),
    ).toThrow(/invalid result/i)
    expect(() => assertHighlightResult({ lines: 'x' })).toThrow(/invalid result/i)
  })

  it('freezes deeply and counts characters', () => {
    const frozen = freezeResult(createPlainResult('abc\ndef', 'js'))
    expect(Object.isFrozen(frozen)).toBe(true)
    expect(Object.isFrozen(frozen.lines)).toBe(true)
    expect(Object.isFrozen(frozen.lines[0]?.tokens[0])).toBe(true)
    expect(countResultChars(frozen)).toBeGreaterThanOrEqual('abcdef'.length)
    expect(resultLineText(frozen.lines[0]!)).toBe('abc')
  })

  it('accepts optional metadata', () => {
    const result: HighlightResult = {
      lines: [{ tokens: [{ text: 'x', type: 'plain' }] }],
      language: 'text',
      meta: { engine: 'fake' },
    }
    expect(isHighlightResult(result)).toBe(true)
    expect(freezeResult(result).meta).toEqual({ engine: 'fake' })
  })
})
