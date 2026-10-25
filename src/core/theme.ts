import {
  TOKEN_TYPES,
  type ColorScheme,
  type ThemeDefinition,
  type ThemePair,
  type TokenType,
} from '../types.js'
import { defineTheme, isThemeDefinition } from './define-theme.js'
import { vshLight } from '../themes/vsh-light.js'

export { defineTheme, isThemeDefinition }

export const DEFAULT_THEME: ThemeDefinition = vshLight
export const DEFAULT_THEME_NAME = vshLight.name

export const BUILTIN_THEME_REGISTRY: Readonly<Record<string, ThemeDefinition>> = Object.freeze({
  [vshLight.name]: vshLight,
})

export interface ResolvedTheme {
  readonly light: ThemeDefinition
  readonly dark: ThemeDefinition
  readonly mode: ColorScheme
  readonly scopeName: string
}

export interface ThemeSelection {
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
}

export interface ThemeResolutionOptions extends ThemeSelection {
  registry?: Record<string, ThemeDefinition>
  fallback?: ResolvedTheme
}

export function resolveThemeValue(
  value: ThemeDefinition | string,
  registry: Record<string, ThemeDefinition> = {},
  label = 'theme',
): ThemeDefinition {
  if (typeof value === 'string') {
    const found = registry[value] ?? BUILTIN_THEME_REGISTRY[value]
    if (!found) {
      const known = [...new Set([...Object.keys(BUILTIN_THEME_REGISTRY), ...Object.keys(registry)])]
      throw new TypeError(
        `[vue-syntax-highlighter] Unknown ${label} "${value}". ` +
          `Import its data module or register it first. Known themes: ${known.join(', ') || 'none'}.`,
      )
    }
    return found
  }
  if (isThemeDefinition(value)) return value
  return defineTheme(value)
}

export function resolveThemes(options: ThemeResolutionOptions = {}): ResolvedTheme {
  const registry = options.registry ?? {}
  let light: ThemeDefinition
  let dark: ThemeDefinition

  if (options.themes) {
    light = resolveThemeValue(options.themes.light, registry, 'light theme')
    dark = resolveThemeValue(options.themes.dark, registry, 'dark theme')
  } else if (options.theme !== undefined) {
    const single = resolveThemeValue(options.theme, registry)
    light = single
    dark = single
  } else if (options.fallback) {
    light = options.fallback.light
    dark = options.fallback.dark
  } else {
    light = DEFAULT_THEME
    dark = DEFAULT_THEME
  }

  const mode: ColorScheme =
    options.colorScheme ?? options.fallback?.mode ?? (options.themes ? 'auto' : 'light')
  const scopeName = light.name === dark.name ? light.name : `${light.name}/${dark.name}`
  return Object.freeze({ light, dark, mode, scopeName })
}

export function isColorScheme(value: unknown): value is ColorScheme {
  return value === 'auto' || value === 'light' || value === 'dark'
}

function themeVariablesFor(
  theme: ThemeDefinition,
  scheme: 'light' | 'dark',
): Record<string, string> {
  const variables: Record<string, string> = {
    [`--vsh-${scheme}-bg`]: theme.colors.background,
    [`--vsh-${scheme}-fg`]: theme.colors.foreground,
    [`--vsh-${scheme}-gutter`]: theme.colors.gutter,
    [`--vsh-${scheme}-line-highlight`]: theme.colors.lineHighlight,
    [`--vsh-${scheme}-selection`]: theme.colors.selection,
  }
  if (theme.colors.fontFamily) {
    variables[`--vsh-${scheme}-font-family`] = theme.colors.fontFamily
  }

  for (const type of TOKEN_TYPES) {
    const style = theme.tokens[type]
    variables[`--vsh-${scheme}-token-${type}-color`] = style?.color ?? theme.colors.foreground
    if (style?.fontStyle) {
      variables[`--vsh-${scheme}-token-${type}-font-style`] = style.fontStyle
    }
    if (style?.fontWeight) {
      variables[`--vsh-${scheme}-token-${type}-font-weight`] = style.fontWeight
    }
    if (style?.textDecoration) {
      variables[`--vsh-${scheme}-token-${type}-text-decoration`] = style.textDecoration
    }
  }

  return variables
}

/**
 * Both light and dark variable sets are always emitted. CSS selects one based
 * on the scheme attribute, so switching modes requires no JavaScript token
 * work at all.
 */
export function createThemeVariables(theme: ResolvedTheme): Record<string, string> {
  return {
    ...themeVariablesFor(theme.light, 'light'),
    ...themeVariablesFor(theme.dark, 'dark'),
  }
}

export function themeScopeAttributes(theme: ResolvedTheme): Record<string, string> {
  return {
    'data-vsh-scheme': theme.mode,
    'data-vsh-theme': theme.scopeName,
    'data-vsh-theme-light': theme.light.name,
    'data-vsh-theme-dark': theme.dark.name,
  }
}

export function tokenClassName(type: TokenType): string {
  return `vsh-token vsh-token-${type}`
}
