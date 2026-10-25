import type { Component, VNode } from 'vue'

export const TOKEN_TYPES = [
  'plain',
  'keyword',
  'string',
  'regexp',
  'comment',
  'number',
  'constant',
  'function',
  'class',
  'type',
  'variable',
  'property',
  'operator',
  'punctuation',
  'tag',
  'attribute',
  'decorator',
  'meta',
  'invalid',
] as const

export type TokenType = (typeof TOKEN_TYPES)[number]

export interface HighlightToken {
  readonly text: string
  readonly type: TokenType
}

export interface HighlightLine {
  readonly tokens: readonly HighlightToken[]
}

export interface HighlightResult {
  readonly lines: readonly HighlightLine[]
  readonly language: string
  readonly meta?: Readonly<Record<string, unknown>>
}

export interface HighlightRequest {
  code: string
  language: string
  signal?: AbortSignal
}

export type EngineOptions = Record<string, unknown>

export interface HighlightEngine {
  readonly id: string
  readonly capabilities?: { sync?: boolean }
  hasLanguage?(language: string): boolean
  loadLanguage?(language: string): Promise<void>
  highlight(
    request: HighlightRequest,
    options?: EngineOptions,
  ): HighlightResult | Promise<HighlightResult>
  cacheKey?(request: HighlightRequest, options?: EngineOptions): string
  dispose?(): void
}

export interface TokenStyle {
  color?: string
  fontStyle?: string
  fontWeight?: string
  textDecoration?: string
}

export interface ThemeColorsInput {
  background: string
  foreground: string
  gutter?: string
  lineHighlight?: string
  selection?: string
  fontFamily?: string
}

export interface ThemeInput {
  name: string
  colorScheme: 'light' | 'dark'
  colors: ThemeColorsInput
  tokens?: Partial<Record<TokenType, TokenStyle>>
}

export interface ThemeDefinition {
  name: string
  colorScheme: 'light' | 'dark'
  colors: {
    background: string
    foreground: string
    gutter: string
    lineHighlight: string
    selection: string
    fontFamily?: string
  }
  tokens: Partial<Record<TokenType, TokenStyle>>
}

export interface ThemePair {
  light: ThemeDefinition | string
  dark: ThemeDefinition | string
}

export type ColorScheme = 'auto' | 'light' | 'dark'

export interface HighlightCacheLike {
  readonly size: number
  get(key: string): HighlightResult | undefined
  set(key: string, result: HighlightResult): void
  delete(key: string): void
  clear(): void
  request(
    key: string,
    factory: () => HighlightResult | Promise<HighlightResult>,
  ): HighlightResult | Promise<HighlightResult>
}

export interface HighlighterOptions {
  engine?: string | HighlightEngine
  engines?: Record<string, HighlightEngine | (() => HighlightEngine | Promise<HighlightEngine>)>
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  themeRegistry?: Record<string, ThemeDefinition>
  languages?: string[]
  cache?: HighlightCacheLike
  cacheCapacity?: number
  cacheMaxChars?: number
  defer?: boolean
  rootMargin?: string
  virtualized?: boolean | 'auto'
  virtualizeAfter?: number
}

export interface SyntaxHighlighterProps {
  code: string
  language?: string
  engine?: string | HighlightEngine
  engineOptions?: EngineOptions
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  lineNumbers?: boolean
  startLine?: number
  highlightLines?: readonly (number | readonly [number, number])[]
  wrap?: boolean
  virtualized?: boolean | 'auto'
  virtualizeAfter?: number
  height?: string | number
  maxHeight?: string | number
  lineHeight?: number
  overscan?: number
  defer?: boolean
  rootMargin?: string
  preTag?: string | Component
  codeTag?: string | Component
  lineProps?: (info: LineRenderInfo) => Record<string, unknown> | undefined
  tokenProps?: (info: TokenRenderInfo) => Record<string, unknown> | undefined
  tabindex?: number | string | false
  showLineNumbers?: boolean
  wrapLines?: boolean
  customStyle?: string | Record<string, unknown>
  codeTagProps?: Record<string, unknown>
}

export interface LineRenderInfo {
  line: HighlightLine
  lineNumber: number
  index: number
  highlighted: boolean
}

export interface TokenRenderInfo {
  token: HighlightToken
  index: number
  line: HighlightLine
  lineNumber: number
  tokenIndex: number
}

export interface LineSlotProps extends LineRenderInfo {
  tokens: readonly HighlightToken[]
  renderTokens: () => VNode[]
}

export interface HighlightedEventContext {
  language: string
  theme: string
  colorScheme: ColorScheme
}

export interface TokenSlotProps extends TokenRenderInfo {
  renderToken: () => VNode
}

export interface SyntaxHighlighterEmits {
  (event: 'highlighted', result: HighlightResult, context: HighlightedEventContext): void
  (event: 'error', error: Error): void
}

export interface SyntaxHighlighterExposed {
  refresh: () => Promise<HighlightResult | undefined>
  highlight: (input: { code: string; language?: string }) => Promise<HighlightResult>
  copy: () => Promise<boolean>
  getCopyPayload: () => string
}
