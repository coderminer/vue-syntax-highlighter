export { SyntaxHighlighter } from './component/SyntaxHighlighter.js'
export { SyntaxHighlighterProvider } from './component/SyntaxHighlighterProvider.js'
export {
  VueSyntaxHighlighter,
  VueSyntaxHighlighter as default,
  type VueSyntaxHighlighterOptions,
  type VueSyntaxHighlighterPlugin,
} from './plugin.js'
export { useSyntaxHighlighter } from './composables/useSyntaxHighlighter.js'
export type {
  UseSyntaxHighlighterOptions,
  UseSyntaxHighlighterReturn,
} from './composables/useSyntaxHighlighter.js'
export { createHighlighter } from './core/highlighter.js'
export type { CreateHighlighterOptions, Highlighter } from './core/highlighter.js'
export { Light, LightAsync, PrismLight, PrismAsync } from './aliases.js'
export {
  defineTheme,
  DEFAULT_THEME,
  DEFAULT_THEME_NAME,
  BUILTIN_THEME_REGISTRY,
  isColorScheme,
} from './core/theme.js'
export { ResultCache, buildCacheKey, stableStringify } from './core/cache.js'
export type { CacheKeyInput, ResultCacheOptions } from './core/cache.js'
export { createHighlighterContext, HIGHLIGHTER_CONTEXT } from './core/context.js'
export type { HighlighterContext } from './core/context.js'
export { EngineManager, isHighlightEngine, BUILTIN_ENGINE_IDS } from './core/engine.js'
export type {
  EngineChoice,
  EngineLoader,
  EngineRegistry,
  BuiltinEngineId,
} from './core/engine.js'
export type {
  ColorScheme,
  EngineOptions,
  HighlightCacheLike,
  HighlightEngine,
  HighlightInput,
  HighlightLine,
  HighlightRequest,
  HighlightResult,
  HighlightToken,
  HighlightedEventContext,
  HighlighterOptions,
  HighlighterScopeMode,
  LineHeightMode,
  LineRenderInfo,
  LineSlotProps,
  SyntaxHighlighterEmits,
  SyntaxHighlighterExposed,
  SyntaxHighlighterProps,
  ThemeColorsInput,
  ThemeDefinition,
  ThemeInput,
  ThemePair,
  ThemeScope,
  TokenSlotProps,
  TokenStyle,
  TokenType,
} from './types.js'
