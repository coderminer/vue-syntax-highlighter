import { describe, expect, it } from 'vitest'
import { defineTheme } from '@/core/define-theme'
import {
  createThemeVariables,
  DEFAULT_THEME,
  resolveThemes,
  resolveThemeValue,
  themeScopeAttributes,
} from '@/core/theme'
import { TOKEN_TYPES } from '@/types'
import { vshDark } from '@/themes/vsh-dark'
import { vshLight } from '@/themes/vsh-light'
import { vshMidnight } from '@/themes/vsh-midnight'
import { vshPaper } from '@/themes/vsh-paper'

const palette = {
  name: 'custom',
  colorScheme: 'light' as const,
  colors: {
    background: '#fff',
    foreground: '#111',
    gutter: '#999',
    lineHighlight: '#eee',
    selection: '#ccf',
  },
  tokens: {
    keyword: { color: '#c00', fontWeight: '700' },
    comment: { color: '#777', fontStyle: 'italic' },
  },
}

describe('defineTheme', () => {
  it('validates, fills defaults, and freezes the definition', () => {
    const theme = defineTheme(palette)
    expect(theme.name).toBe('custom')
    expect(Object.isFrozen(theme)).toBe(true)
    expect(Object.isFrozen(theme.colors)).toBe(true)
    expect(Object.isFrozen(theme.tokens)).toBe(true)
    expect(Object.isFrozen(theme.tokens.keyword)).toBe(true)

    const minimal = defineTheme({
      name: 'minimal',
      colorScheme: 'dark',
      colors: { background: '#000', foreground: '#fff' },
    })
    expect(minimal.colors.gutter).toBe('#fff')
    expect(minimal.colors.lineHighlight).toBe('transparent')
  })

  it('rejects missing base colors and unknown token types', () => {
    expect(() =>
      defineTheme({ name: 'bad', colorScheme: 'light', colors: { foreground: '#000' } } as never),
    ).toThrow(/background/)
    expect(() =>
      defineTheme({ name: 'bad', colorScheme: 'light', colors: { background: '#fff' } } as never),
    ).toThrow(/foreground/)
    expect(() =>
      defineTheme({ ...palette, name: '' }),
    ).toThrow(/name/)
    expect(() =>
      defineTheme({ ...palette, colorScheme: 'sepia' } as never),
    ).toThrow(/colorScheme/)
    expect(() =>
      defineTheme({ ...palette, tokens: { nope: { color: '#000' } } } as never),
    ).toThrow(/unknown token type/)
  })
})

describe('built-in themes', () => {
  it('ships two light and two dark themes with matched palettes', () => {
    const themes = [vshLight, vshDark, vshPaper, vshMidnight]
    expect(themes.filter((theme) => theme.colorScheme === 'light')).toHaveLength(2)
    expect(themes.filter((theme) => theme.colorScheme === 'dark')).toHaveLength(2)
    expect(vshLight.name).not.toBe(vshDark.name)
    expect(vshPaper.name).not.toBe(vshMidnight.name)
    for (const theme of themes) {
      expect(theme.colors.background).toBeTruthy()
      expect(theme.colors.foreground).toBeTruthy()
      for (const type of TOKEN_TYPES) {
        expect(theme.tokens[type]?.color ?? theme.colors.foreground).toBeTruthy()
      }
    }
    expect(DEFAULT_THEME).toBe(vshLight)
  })

  it('resolves themes by name and rejects unknown names', () => {
    expect(resolveThemeValue('vsh-light')).toBe(vshLight)
    expect(() => resolveThemeValue('missing')).toThrow(/Unknown theme/)
    expect(
      resolveThemeValue('paper', { paper: vshPaper }),
    ).toBe(vshPaper)
  })
})

describe('CSS custom properties', () => {
  it('emits light and dark sets and scheme attributes for a pair', () => {
    const resolved = resolveThemes({
      themes: { light: 'vsh-light', dark: 'vsh-dark' },
      registry: { 'vsh-dark': vshDark },
    })
    expect(resolved.mode).toBe('auto')
    const variables = createThemeVariables(resolved)
    expect(variables['--vsh-light-bg']).toBe(vshLight.colors.background)
    expect(variables['--vsh-dark-bg']).toBe(vshDark.colors.background)
    for (const type of TOKEN_TYPES) {
      expect(variables[`--vsh-light-token-${type}-color`]).toBeTruthy()
      expect(variables[`--vsh-dark-token-${type}-color`]).toBeTruthy()
    }
    expect(themeScopeAttributes(resolved)).toMatchObject({
      'data-vsh-scheme': 'auto',
      'data-vsh-theme': 'vsh-light/vsh-dark',
      'data-vsh-theme-light': 'vsh-light',
      'data-vsh-theme-dark': 'vsh-dark',
    })
  })

  it('uses one theme for both sets when only a single theme is provided', () => {
    const resolved = resolveThemes({ theme: vshPaper, colorScheme: 'light' })
    expect(resolved.light).toBe(vshPaper)
    expect(resolved.dark).toBe(vshPaper)
    expect(resolved.mode).toBe('light')
    const variables = createThemeVariables(resolved)
    expect(variables['--vsh-light-bg']).toBe(vshPaper.colors.background)
    expect(variables['--vsh-dark-bg']).toBe(vshPaper.colors.background)
  })

  it('falls back to the previous theme for invalid replacement input', () => {
    const previous = resolveThemes({ theme: vshLight })
    expect(() =>
      resolveThemes({ theme: 'nope', fallback: previous }),
    ).toThrow()
  })
})
