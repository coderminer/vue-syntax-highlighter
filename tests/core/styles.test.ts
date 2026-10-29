import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildBaseStyles, buildCompleteStyles } from '../../scripts/css.mjs'

const base = readFileSync('src/styles/base.css', 'utf8')
const fallback = readFileSync('src/styles/fallback.css', 'utf8')
const minifiedFallbackMarker = '@supports not (color:light-dark('

describe('fallback stylesheet', () => {
  it('uses dark defaults for the dark scheme', () => {
    expect(fallback).toContain('--vsh-bg: var(--vsh-dark-bg, #0d1117);')
    expect(fallback).toContain('--vsh-fg: var(--vsh-dark-fg, #e6edf3);')
    expect(fallback).toContain('--vsh-gutter: var(--vsh-dark-gutter, #7d8590);')
    expect(fallback).toContain('--vsh-selection: var(--vsh-dark-selection, #264f78);')
  })
})

describe('complete stylesheet', () => {
  it('keeps base-only output free of fallback rules', () => {
    const css = buildBaseStyles(base)
    expect(css).toContain('.vsh-line')
    expect(css).not.toContain(minifiedFallbackMarker)
    expect(css).not.toContain('--vsh-bg: var(--vsh-light-bg')
  })

  it('concatenates base before fallback without an import', () => {
    const css = buildCompleteStyles(base, fallback)
    const baseIndex = css.indexOf('.vsh-line{')
    const fallbackIndex = css.indexOf(minifiedFallbackMarker)
    expect(baseIndex).toBeGreaterThan(-1)
    expect(fallbackIndex).toBeGreaterThan(baseIndex)
    expect(css).not.toContain('@import')
  })

  it('provides the light, dark, and automatic fallback branches', () => {
    const css = buildCompleteStyles(base, fallback)
    expect(css).toContain(".vsh[data-vsh-scheme='light'],.vsh-scope[data-vsh-scheme='light']")
    expect(css).toContain(".vsh[data-vsh-scheme='dark'],.vsh-scope[data-vsh-scheme='dark']")
    expect(css).toContain(".vsh[data-vsh-scheme='auto'],.vsh-scope[data-vsh-scheme='auto']")
    expect(css).toContain(minifiedFallbackMarker)
  })
})
