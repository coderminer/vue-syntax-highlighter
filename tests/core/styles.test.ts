import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('fallback stylesheet', () => {
  it('uses dark defaults for the dark scheme', () => {
    const css = readFileSync('src/styles/fallback.css', 'utf8')
    expect(css).toContain('--vsh-bg: var(--vsh-dark-bg, #0d1117);')
    expect(css).toContain('--vsh-fg: var(--vsh-dark-fg, #e6edf3);')
    expect(css).toContain('--vsh-gutter: var(--vsh-dark-gutter, #7d8590);')
    expect(css).toContain('--vsh-selection: var(--vsh-dark-selection, #264f78);')
  })
})
