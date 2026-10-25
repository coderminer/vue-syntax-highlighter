import { describe, expect, it, vi } from 'vitest'
import {
  DEPRECATED_PROP_WARNINGS,
  highlighterProps,
  languageClassName,
  normalizeLanguage,
  normalizeProps,
} from '@/core/props'

describe('prop normalization', () => {
  it('provides documented defaults', () => {
    const props = normalizeProps({}, new Set())
    expect(props.code).toBe('')
    expect(props.language).toBe('text')
    expect(props.languageClass).toBe('language-text')
    expect(props.lineNumbers).toBe(false)
    expect(props.startLine).toBe(1)
    expect(props.wrap).toBe(false)
    expect(props.virtualized).toBe(false)
    expect(props.virtualizeAfter).toBe(2000)
    expect(props.lineHeight).toBe(20)
    expect(props.overscan).toBe(10)
    expect(props.defer).toBe(false)
    expect(props.preTag).toBe('pre')
    expect(props.codeTag).toBe('code')
    expect(props.tabindex).toBe(0)
  })

  it('normalizes invalid numbers to safe defaults', () => {
    const props = normalizeProps(
      {
        startLine: Number.NaN,
        lineHeight: -4,
        overscan: -10,
        virtualizeAfter: 0,
        rootMargin: '   ',
      },
      new Set(),
    )
    expect(props.startLine).toBe(1)
    expect(props.lineHeight).toBe(1)
    expect(props.overscan).toBe(0)
    expect(props.virtualizeAfter).toBe(1)
    expect(props.rootMargin).toBe('200px 0px')
  })

  it('maps deprecated aliases and warns once', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const warnings = new Set<string>()
    const props = normalizeProps(
      {
        showLineNumbers: true,
        wrapLines: true,
        customStyle: { color: 'red' },
        codeTagProps: { id: 'code' },
      },
      warnings,
    )
    expect(props.lineNumbers).toBe(true)
    expect(props.wrap).toBe(true)
    expect(props.customStyle).toEqual({ color: 'red' })
    normalizeProps({ showLineNumbers: true }, warnings)
    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[0]?.[0]).toContain(DEPRECATED_PROP_WARNINGS.showLineNumbers)
  })

  it('gives native props precedence over aliases', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const props = normalizeProps(
      { lineNumbers: false, showLineNumbers: true, wrap: false, wrapLines: true },
      new Set(),
    )
    expect(props.lineNumbers).toBe(false)
    expect(props.wrap).toBe(false)
    expect(spy).toHaveBeenCalled()
  })

  it('keeps tabindex=false and normalizes language classes', () => {
    expect(normalizeProps({ tabindex: false }, new Set()).tabindex).toBe(false)
    expect(normalizeLanguage('  Language-JS ')).toBe('js')
    expect(normalizeLanguage('')).toBe('text')
    expect(languageClassName('c++')).toBe('language-c')
    expect(languageClassName('objective-c')).toBe('language-objective-c')
  })

  it('freezes highlight line arrays and ignores invalid entries', () => {
    const props = normalizeProps(
      { highlightLines: [1, [2, 3], Number.NaN, [4] as never] },
      new Set(),
    )
    expect(props.highlightLines).toEqual([1, [2, 3]])
    expect(Object.isFrozen(props.highlightLines)).toBe(true)
  })

  it('declares the expected prop surface', () => {
    for (const name of [
      'code',
      'language',
      'engine',
      'engineOptions',
      'theme',
      'themes',
      'colorScheme',
      'lineNumbers',
      'startLine',
      'highlightLines',
      'wrap',
      'virtualized',
      'defer',
      'preTag',
      'codeTag',
      'lineProps',
      'tokenProps',
      'tabindex',
    ]) {
      expect(highlighterProps).toHaveProperty(name)
    }
  })
})
