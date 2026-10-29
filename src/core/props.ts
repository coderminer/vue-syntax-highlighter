import type { Component, PropType } from 'vue'
import type {
  ColorScheme,
  EngineOptions,
  HighlightEngine,
  ThemeDefinition,
  ThemePair,
} from '../types.js'
import type { EngineChoice } from './engine.js'
import type { HighlighterBehavior } from './context.js'
import { normalizeDisplaySource } from './source.js'
import { warnOnce, type WarningSet } from './warn.js'

export interface RawHighlighterProps {
  code?: string
  language?: string
  engine?: EngineChoice
  engineOptions?: EngineOptions
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  lineNumbers?: boolean | null
  showLineNumbers?: boolean | null
  startLine?: number
  highlightLines?: readonly (number | readonly [number, number])[]
  wrap?: boolean | null
  wrapLines?: boolean | null
  virtualized?: boolean | 'auto' | null
  virtualizeAfter?: number | null
  height?: string | number
  maxHeight?: string | number
  lineHeight?: number
  overscan?: number
  defer?: boolean | null
  rootMargin?: string | null
  preTag?: string | Component
  codeTag?: string | Component
  lineProps?: (info: unknown) => Record<string, unknown> | undefined
  tokenProps?: (info: unknown) => Record<string, unknown> | undefined
  tabindex?: number | string | boolean | null
  customStyle?: string | Record<string, unknown>
  codeTagProps?: Record<string, unknown>
}

export interface NormalizedProps {
  code: string
  language: string
  languageClass: string
  engine: EngineChoice | undefined
  engineOptions: EngineOptions
  theme: ThemeDefinition | string | undefined
  themes: ThemePair | undefined
  colorScheme: ColorScheme | undefined
  lineNumbers: boolean
  startLine: number
  highlightLines: readonly (number | readonly [number, number])[]
  wrap: boolean
  virtualized: boolean | 'auto'
  virtualizeAfter: number
  height: string | number | undefined
  maxHeight: string | number | undefined
  lineHeight: number
  overscan: number
  defer: boolean
  rootMargin: string
  preTag: string | Component
  codeTag: string | Component
  lineProps: ((info: unknown) => Record<string, unknown> | undefined) | undefined
  tokenProps: ((info: unknown) => Record<string, unknown> | undefined) | undefined
  tabindex: number | string | false | null | undefined
  customStyle: string | Record<string, unknown> | undefined
  codeTagProps: Record<string, unknown> | undefined
}

export const highlighterProps = {
  code: { type: String, default: '' },
  language: { type: String, default: 'text' },
  engine: { type: [String, Object] as PropType<EngineChoice>, default: undefined },
  engineOptions: { type: Object as PropType<EngineOptions>, default: undefined },
  theme: { type: [String, Object] as PropType<ThemeDefinition | string>, default: undefined },
  themes: { type: Object as PropType<ThemePair>, default: undefined },
  colorScheme: { type: String as PropType<ColorScheme>, default: undefined },
  lineNumbers: { type: Boolean, default: null },
  showLineNumbers: { type: Boolean, default: null },
  startLine: { type: Number, default: 1 },
  highlightLines: {
    type: Array as PropType<readonly (number | readonly [number, number])[]>,
    default: () => [],
  },
  wrap: { type: Boolean, default: null },
  wrapLines: { type: Boolean, default: null },
  virtualized: { type: [Boolean, String] as PropType<boolean | 'auto'>, default: null },
  virtualizeAfter: { type: Number, default: null },
  height: { type: [String, Number] as PropType<string | number>, default: undefined },
  maxHeight: { type: [String, Number] as PropType<string | number>, default: undefined },
  lineHeight: { type: Number, default: 20 },
  overscan: { type: Number, default: 10 },
  defer: { type: Boolean, default: null },
  rootMargin: { type: String, default: null },
  preTag: { type: [String, Object, Function] as PropType<string | Component>, default: 'pre' },
  codeTag: { type: [String, Object, Function] as PropType<string | Component>, default: 'code' },
  lineProps: {
    type: Function as PropType<(info: unknown) => Record<string, unknown> | undefined>,
    default: undefined,
  },
  tokenProps: {
    type: Function as PropType<(info: unknown) => Record<string, unknown> | undefined>,
    default: undefined,
  },
  tabindex: {
    type: [Number, String, Boolean] as PropType<number | string | boolean | null>,
    default: 0,
  },
  customStyle: {
    type: [String, Object] as PropType<string | Record<string, unknown>>,
    default: undefined,
  },
  codeTagProps: { type: Object as PropType<Record<string, unknown>>, default: undefined },
} as const

export const DEPRECATED_PROP_WARNINGS = {
  showLineNumbers:
    'The "showLineNumbers" prop is deprecated. Use "lineNumbers" instead; native props take precedence.',
  wrapLines: 'The "wrapLines" prop is deprecated. Use "wrap" instead; native props take precedence.',
  customStyle:
    'The "customStyle" prop is deprecated. Use the native "style" attribute instead; it takes precedence.',
  codeTagProps:
    'The "codeTagProps" prop is deprecated. Use "codeTag" together with native attributes instead.',
} as const

function normalizeInteger(value: number | undefined, fallback: number, minimum = 1): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(minimum, Math.floor(value))
}

function normalizeLines(
  input: readonly (number | readonly [number, number])[] | undefined,
): readonly (number | readonly [number, number])[] {
  if (!Array.isArray(input)) return []
  const result: (number | readonly [number, number])[] = []
  for (const entry of input) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      result.push(Math.trunc(entry))
      continue
    }
    if (
      Array.isArray(entry) &&
      entry.length === 2 &&
      Number.isFinite(entry[0]) &&
      Number.isFinite(entry[1])
    ) {
      result.push(Object.freeze([Math.trunc(entry[0]), Math.trunc(entry[1])] as const))
    }
  }
  return Object.freeze(result)
}

export function normalizeLanguage(value: string | undefined): string {
  const raw = (value ?? '').trim().replace(/^language-/i, '')
  if (!raw) return 'text'
  return raw.toLowerCase()
}

export function languageClassName(language: string): string {
  const safe = language.replace(/[^a-z0-9_+#-]+/g, '-').replace(/^-+|-+$/g, '')
  return `language-${safe || 'text'}`
}

export function normalizeProps(
  raw: RawHighlighterProps,
  warningSet: WarningSet,
  behavior?: HighlighterBehavior,
): NormalizedProps {
  if (raw.showLineNumbers !== null && raw.showLineNumbers !== undefined) {
    warnOnce('prop-showLineNumbers', DEPRECATED_PROP_WARNINGS.showLineNumbers, warningSet)
  }
  if (raw.wrapLines !== null && raw.wrapLines !== undefined) {
    warnOnce('prop-wrapLines', DEPRECATED_PROP_WARNINGS.wrapLines, warningSet)
  }
  if (raw.customStyle !== undefined) {
    warnOnce('prop-customStyle', DEPRECATED_PROP_WARNINGS.customStyle, warningSet)
  }
  if (raw.codeTagProps !== undefined) {
    warnOnce('prop-codeTagProps', DEPRECATED_PROP_WARNINGS.codeTagProps, warningSet)
  }

  let colorScheme = raw.colorScheme
  if (colorScheme !== undefined && !['auto', 'light', 'dark'].includes(colorScheme)) {
    warnOnce(
      'prop-colorScheme',
      `Unknown colorScheme "${String(colorScheme)}". Expected "auto", "light", or "dark".`,
      warningSet,
    )
    colorScheme = undefined
  }

  const lineNumbers =
    raw.lineNumbers !== null && raw.lineNumbers !== undefined
      ? Boolean(raw.lineNumbers)
      : Boolean(raw.showLineNumbers)
  const wrap =
    raw.wrap !== null && raw.wrap !== undefined ? Boolean(raw.wrap) : Boolean(raw.wrapLines)

  const language = normalizeLanguage(raw.language)
  const virtualized =
    raw.virtualized === 'auto' || raw.virtualized === true
      ? raw.virtualized
      : raw.virtualized === false
        ? false
        : (behavior?.virtualized ?? false)

  return {
    code: normalizeDisplaySource(typeof raw.code === 'string' ? raw.code : ''),
    language,
    languageClass: languageClassName(language),
    engine: raw.engine ?? undefined,
    engineOptions: raw.engineOptions ?? {},
    theme: raw.theme,
    themes: raw.themes,
    colorScheme,
    lineNumbers,
    startLine: normalizeInteger(raw.startLine, 1, 0),
    highlightLines: normalizeLines(raw.highlightLines),
    wrap,
    virtualized,
    virtualizeAfter: normalizeInteger(
      raw.virtualizeAfter ?? undefined,
      behavior?.virtualizeAfter ?? 2000,
      1,
    ),
    height: raw.height,
    maxHeight: raw.maxHeight,
    lineHeight: normalizeInteger(raw.lineHeight, 20, 1),
    overscan: normalizeInteger(raw.overscan, 10, 0),
    defer: raw.defer ?? behavior?.defer ?? false,
    rootMargin: raw.rootMargin?.trim() || behavior?.rootMargin || '200px 0px',
    preTag: raw.preTag ?? 'pre',
    codeTag: raw.codeTag ?? 'code',
    lineProps: raw.lineProps,
    tokenProps: raw.tokenProps,
    tabindex:
      raw.tabindex === undefined
        ? 0
        : raw.tabindex === null
          ? undefined
          : raw.tabindex === false
            ? false
            : raw.tabindex === true
              ? 0
              : raw.tabindex,
    customStyle: raw.customStyle,
    codeTagProps: raw.codeTagProps,
  }
}

export function isEngineChoice(value: unknown): value is EngineChoice {
  return typeof value === 'string' || (typeof value === 'object' && value !== null)
}

export type { HighlightEngine }
