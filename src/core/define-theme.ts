import {
  TOKEN_TYPES,
  type ThemeDefinition,
  type ThemeInput,
  type TokenStyle,
  type TokenType,
} from '../types.js'

const TOKEN_TYPE_SET = new Set<string>(TOKEN_TYPES)
const STYLE_KEYS = ['color', 'fontStyle', 'fontWeight', 'textDecoration'] as const

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(
      `[vue-syntax-highlighter] Invalid theme: "${path}" must be a non-empty string.`,
    )
  }
  return value
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, path)
}

function freezeTokens(
  tokens: ThemeInput['tokens'],
): Partial<Record<TokenType, TokenStyle>> {
  if (tokens === undefined) return Object.freeze({})
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) {
    throw new TypeError('[vue-syntax-highlighter] Invalid theme: "tokens" must be an object.')
  }

  const result: Partial<Record<TokenType, TokenStyle>> = {}
  for (const [key, value] of Object.entries(tokens)) {
    if (!TOKEN_TYPE_SET.has(key)) {
      throw new TypeError(
        `[vue-syntax-highlighter] Invalid theme: unknown token type "${key}". ` +
          `Expected one of ${TOKEN_TYPES.join(', ')}.`,
      )
    }
    if (value === undefined) continue
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(
        `[vue-syntax-highlighter] Invalid theme: tokens.${key} must be an object.`,
      )
    }
    const style: TokenStyle = {}
    for (const styleKey of STYLE_KEYS) {
      const styleValue = (value as Record<string, unknown>)[styleKey]
      if (styleValue === undefined) continue
      style[styleKey] = requiredString(styleValue, `tokens.${key}.${styleKey}`)
    }
    result[key as TokenType] = Object.freeze(style)
  }
  return Object.freeze(result)
}

/**
 * Validates and freezes a theme definition. Invalid input throws an actionable
 * error; callers that resolve themes during rendering catch it and keep the
 * previous valid theme instead.
 */
export function defineTheme(input: ThemeInput): ThemeDefinition {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('[vue-syntax-highlighter] Invalid theme: expected an object.')
  }

  const name = requiredString(input.name, 'name')
  if (input.colorScheme !== 'light' && input.colorScheme !== 'dark') {
    throw new TypeError(
      '[vue-syntax-highlighter] Invalid theme: "colorScheme" must be "light" or "dark".',
    )
  }
  if (!input.colors || typeof input.colors !== 'object' || Array.isArray(input.colors)) {
    throw new TypeError(
      '[vue-syntax-highlighter] Invalid theme: "colors" must include background and foreground.',
    )
  }

  const background = requiredString(input.colors.background, 'colors.background')
  const foreground = requiredString(input.colors.foreground, 'colors.foreground')
  const gutter = optionalString(input.colors.gutter, 'colors.gutter') ?? foreground
  const lineHighlight =
    optionalString(input.colors.lineHighlight, 'colors.lineHighlight') ?? 'transparent'
  const selection =
    optionalString(input.colors.selection, 'colors.selection') ?? 'rgba(127, 127, 127, 0.28)'
  const fontFamily = optionalString(input.colors.fontFamily, 'colors.fontFamily')

  const colors = Object.freeze({
    background,
    foreground,
    gutter,
    lineHighlight,
    selection,
    ...(fontFamily ? { fontFamily } : {}),
  })

  return Object.freeze({
    name,
    colorScheme: input.colorScheme,
    colors,
    tokens: freezeTokens(input.tokens),
  })
}

export function isThemeDefinition(value: unknown): value is ThemeDefinition {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ThemeDefinition>
  return (
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    (candidate.colorScheme === 'light' || candidate.colorScheme === 'dark') &&
    Boolean(candidate.colors) &&
    typeof candidate.colors?.background === 'string' &&
    typeof candidate.colors?.foreground === 'string' &&
    typeof candidate.colors?.gutter === 'string' &&
    typeof candidate.colors?.lineHighlight === 'string' &&
    typeof candidate.colors?.selection === 'string' &&
    Boolean(candidate.tokens) &&
    typeof candidate.tokens === 'object'
  )
}
