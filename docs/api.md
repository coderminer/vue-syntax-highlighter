# API

Every runtime export and public type has a runnable example in [API Examples](/guide/api-examples).

## Package exports

| Entry | Public values |
| --- | --- |
| `vue-syntax-highlighter` | `SyntaxHighlighter`, `SyntaxHighlighterProvider`, `VueSyntaxHighlighter` (default and named), `useSyntaxHighlighter`, `Light`, `LightAsync`, `PrismLight`, `PrismAsync`, `defineTheme`, `DEFAULT_THEME`, `DEFAULT_THEME_NAME`, `BUILTIN_THEME_REGISTRY`, `isColorScheme`, `ResultCache`, `buildCacheKey`, `stableStringify`, `createHighlighterContext`, `HIGHLIGHTER_CONTEXT`, `HighlighterContext`, `EngineManager`, `isHighlightEngine`, `BUILTIN_ENGINE_IDS` |
| `vue-syntax-highlighter/core` | The same runtime API without a built-in engine loader. Pass an explicit engine object; no optional engine peer is referenced at build time. |
| `vue-syntax-highlighter/full` | The same API as the default entry, including all built-in engine loaders. In `1.1.x` it is equivalent to the default entry. |
| `vue-syntax-highlighter/engines/shiki` | `createShikiEngine`, `ShikiEngine`, `ShikiEngineOptions`, `ShikiLanguageRegistration`, `ShikiLanguageLoader`, `languageLoaders`, `languageAliases`, `supportedLanguages` |
| `vue-syntax-highlighter/engines/highlightjs` | `createHighlightjsEngine`, `HighlightjsEngine`, `HighlightjsEngineOptions`, `HighlightjsLanguageRegistration`, `HighlightjsLanguageLoader`, `supportedLanguages` |
| `vue-syntax-highlighter/engines/lowlight` | `createLowlightEngine`, `LowlightEngine`, `LowlightEngineOptions`, `LowlightLanguageRegistration`, `LowlightLanguageLoader`, `supportedLanguages`, plus `createHighlightjsEngine` |
| `vue-syntax-highlighter/engines/prism` | `createPrismEngine`, `PrismEngine`, `PrismEngineOptions`, `PrismLanguageRegistration`, `PrismLanguageLoader`, `supportedLanguages` |
| `vue-syntax-highlighter/themes` | `vshLight`, `vshDark`, `vshPaper`, `vshMidnight` |
| `vue-syntax-highlighter/themes/default` | `default`, `vshLight` |
| `vue-syntax-highlighter/themes/vsh-light` | `default`, `vshLight` |
| `vue-syntax-highlighter/themes/vsh-dark` | `default`, `vshDark` |
| `vue-syntax-highlighter/themes/vsh-paper` | `default`, `vshPaper` |
| `vue-syntax-highlighter/themes/vsh-midnight` | `default`, `vshMidnight` |
| `vue-syntax-highlighter/styles.css` | Base layout and token stylesheet |
| `vue-syntax-highlighter/styles/fallback.css` | Optional pre-`light-dark()` scheme fallback |
| `vue-syntax-highlighter/styles/complete.css` | Base plus fallback rules in one stylesheet; opt-in and larger than `styles.css` |
| `vue-syntax-highlighter/package.json` | Package metadata |

Public types: `ColorScheme`, `EngineOptions`, `HighlightCacheLike`, `HighlightEngine`, `HighlightInput`, `HighlightLine`, `HighlightRequest`, `HighlightResult`, `HighlightToken`, `HighlighterOptions`, `HighlighterScopeMode`, `LineHeightMode`, `LineRenderInfo`, `LineSlotProps`, `SyntaxHighlighterEmits`, `SyntaxHighlighterExposed`, `SyntaxHighlighterProps`, `ThemeColorsInput`, `ThemeDefinition`, `ThemeInput`, `ThemePair`, `ThemeScope`, `TokenSlotProps`, `TokenStyle`, `TokenType`, `CacheKeyInput`, `ResultCacheOptions`, `HighlightedEventContext`, `HighlighterContext`, `EngineChoice`, `EngineLoader`, `EngineRegistry`, `BuiltinEngineId`, `VueSyntaxHighlighterOptions`, `VueSyntaxHighlighterPlugin`, `UseSyntaxHighlighterOptions`, `UseSyntaxHighlighterReturn`.

Deep imports into `dist/` are blocked by the exports map.

## `SyntaxHighlighter`

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `code` | `string` | `''` | Source text. Never HTML. One terminal line break is not rendered as an extra row; `copy()` still returns it. |
| `language` | `string` | `'text'` | Engine language; exposed as `language-<id>`. |
| `engine` | `string \| HighlightEngine` | inherits | Engine identifier or adapter object. |
| `engineOptions` | `EngineOptions` | `{}` | Serialized into the cache key. |
| `theme` | `ThemeDefinition \| string` | inherits | Single theme. |
| `themes` | `ThemePair` | inherits | Light/dark pair. |
| `colorScheme` | `'auto' \| 'light' \| 'dark'` | inherits | Scheme mode. |
| `lineNumbers` | `boolean` | `false` | Decorative gutter. |
| `startLine` | `number` | `1` | First displayed/source line number. `0` is allowed. |
| `highlightLines` | `(number \| [number, number])[]` | `[]` | Source line numbers/ranges. |
| `wrap` | `boolean` | `false` | Wrap long lines; disables virtualization. |
| `virtualized` | `boolean \| 'auto'` | `false` | Windowed rendering. |
| `virtualizeAfter` | `number` | `2000` | Auto threshold in lines. |
| `height` | `string \| number` | — | Bounded pre height. |
| `maxHeight` | `string \| number` | — | Bounded pre max height. |
| `lineHeight` | `number` | `20` | Row line height in px; used by virtualization and `lineHeightMode="fixed"`. |
| `lineHeightMode` | `'visual' \| 'fixed'` | `'visual'` | Opt in to numeric inline row metrics. `fixed` emits `min-height` and `line-height` without forcing `height` on non-virtual rows. |
| `themeScope` | `'inherit' \| 'self'` | `'inherit'` | Opt in to emitting theme variables and scheme attributes on the `.vsh` root even when a wrapper provider owns the scope. |
| `overscan` | `number` | `10` | Extra lines above/below. |
| `defer` | `boolean` | `false` | Wait for intersection before highlighting. |
| `rootMargin` | `string` | `'200px 0px'` | Observer root margin. |
| `preTag` | `string \| Component` | `'pre'` | Outer scroll element. |
| `codeTag` | `string \| Component` | `'code'` | Code element. |
| `lineProps` | `(info: LineRenderInfo) => attrs` | — | Per-line attributes. |
| `tokenProps` | `(info: TokenRenderInfo) => attrs` | — | Per-token attributes. |
| `tabindex` | `number \| string \| boolean` | `0` | Focusable scroll region. `true` becomes `0`; `false` omits the attribute. |
| `showLineNumbers` | `boolean` | — | Deprecated alias for `lineNumbers`. |
| `wrapLines` | `boolean` | — | Deprecated alias for `wrap`. |
| `customStyle` | `string \| object` | — | Deprecated; native `style` wins. |
| `codeTagProps` | `object` | — | Deprecated code attributes. |

Unknown attributes, including `class`, `style`, `data-*`, and `aria-*`, fall through to the root `.vsh` element. Caller classes merge with built-in classes.

At runtime, a non-string `code` value such as `null` from an API or Markdown parser is treated as an empty string for both rendering and copy helpers.

`aria-label` and `aria-labelledby` are applied to the scrollable `pre`, not duplicated on the root `.vsh` element. The `pre` becomes a named `region` only when one is present; without an accessible name it is not exposed as an unnamed landmark.

### Slots

All content slots are optional and scoped.

| Slot | Payload |
| --- | --- |
| `header` | `{ language, theme }` |
| `footer` | `{ language, theme }` |
| `loading` | `{ busy, language, error }` |
| `error` | `{ error, language }` |
| `line` | `{ line, lineNumber, index, highlighted, tokens, renderTokens }` |
| `line-number` | same line payload; gutter content |
| `token` | `{ token, index, line, lineNumber, tokenIndex, renderToken }` |

Line slots replace line content; the gutter, line wrapper, and highlighted-line class remain. `renderTokens()` composes default token rendering, including the token slot.

### Events

| Event | Payload |
| --- | --- |
| `highlighted` | `result: HighlightResult`, `context: { language, theme, colorScheme }` |
| `error` | `Error` |

Errors never throw out of render. The component keeps the last valid result or plain text and emits one development warning per distinct failure signature.

### Exposed methods

| Method | Description |
| --- | --- |
| `refresh()` | Re-run the current highlight. Returns the result or `undefined`. |
| `highlight({ code, language?, preserveTrailingNewline? })` | Highlight explicit input and return its result. Set `preserveTrailingNewline` to `true` to keep terminal line breaks; the default is `false`. |
| `copy()` | Copy the complete source without gutter text; resolves `false` on failure. |
| `getCopyPayload()` | Return the complete normalized source. |

## `SyntaxHighlighterProvider`

Props: `engine`, `engines`, `theme`, `themes`, `colorScheme`, `themeRegistry`, `languages`, `cache`, `cacheCapacity`, `cacheMaxChars`, `cacheEngineIdentity`, `renderless`, `defer`, `rootMargin`, `virtualized`, `virtualizeAfter`, `scopeTag`.

The provider renders one `display: contents` theme scope, provides configuration to descendants, preloads languages on mount, and disposes loader-owned engines and caches on unmount. Preloading resolves the provider or ancestor engine; in the `core` entry there is no implicit default, so a provider that preloads `languages` must configure an `engine` itself. The default entry falls back to the built-in Shiki loader. Nested providers inherit unspecified values. `scopeTag` renders a `div` by default; set it to `section`, `li`, or another tag when the provider must sit inside a specific content model.

Set `renderless` to remove the wrapper while keeping the provider configuration. A renderless provider renders its slot children directly, so descendant blocks own the theme variables; `scopeTag` has no visible effect and emits one development warning whenever it is set, including `div`. The default remains a `div.vsh-scope` wrapper.

`cacheEngineIdentity` is a creation-time option, default `false`. When enabled, cache keys include a stable token for each engine object, so two engines with the same `id` no longer share cached results. The default cache key is byte-identical to `1.1.x`.

`engines`, `themeRegistry`, `cache`, `cacheCapacity`, `cacheMaxChars`, and `cacheEngineIdentity` are read when the provider is created. Changing them after creation is ignored and emits one development warning; recreate the provider or plugin scope to apply a new value. `defer`, `rootMargin`, `renderless`, `scopeTag`, themes, scheme, engine, and languages remain reactive.

## `useSyntaxHighlighter`

```ts
const {
  result,
  lines,
  language,
  loading,
  busy,
  error,
  refresh,
  highlight,
  copy,
  getCopyPayload,
  controller,
} = useSyntaxHighlighter({
  code,
  language,
  engine,
  engineOptions,
  preserveTrailingNewline,
})
```

`code` and the other inputs accept refs or getters. The composable respects the nearest provider/plugin, exposes reactive state, and disposes its controller on scope unmount. `copy()` and `getCopyPayload()` use the same full-source clipboard behavior as the component.

`preserveTrailingNewline` defaults to `false`. Set it on the composable to change the default for every `highlight()` call, or pass `preserveTrailingNewline` per call to override it.

## `defineTheme`

```ts
const theme = defineTheme({ name, colorScheme, colors, tokens })
```

Required: `name`, `colorScheme` (`light`/`dark`), `colors.background`, `colors.foreground`. Optional: `gutter`, `lineHighlight`, `selection`, `fontFamily`, and style overrides for any `TokenType`. Invalid input throws an actionable `TypeError`; the result is deeply frozen.

`ThemeDefinition`:

```ts
interface ThemeDefinition {
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
  tokens: Partial<Record<TokenType, {
    color?: string
    fontStyle?: string
    fontWeight?: string
    textDecoration?: string
  }>>
}
```

## Engine contract

```ts
interface HighlightEngine {
  readonly id: string
  readonly capabilities?: { sync?: boolean }
  hasLanguage?(language: string): boolean
  loadLanguage?(language: string): Promise<void>
  highlight(
    request: { code: string; language: string; signal?: AbortSignal },
    options?: Record<string, unknown>,
  ): HighlightResult | Promise<HighlightResult>
  cacheKey?(request: HighlightRequest, options?: EngineOptions): string
  dispose?(): void
}
```

`HighlightResult` contains `lines`, `language`, and optional `meta`. Each line has tokens `{ text, type }`; concatenating line text with `\n` reproduces the normalized source. Engines must not return HTML, colors, or access the DOM.

## Token types

`plain`, `keyword`, `string`, `regexp`, `comment`, `number`, `constant`, `function`, `class`, `type`, `variable`, `property`, `operator`, `punctuation`, `tag`, `attribute`, `decorator`, `meta`, `invalid`.

## Cache helpers

- `buildCacheKey({ engineId, language, code, options, engineIdentity? })` — stable, theme-independent key. `engineIdentity` is added only when engine-identity caching is enabled.
- `stableStringify(value)` — deterministic serialization; functions receive stable identities.
- `ResultCache` — LRU + character budget + in-flight deduplication; implements `HighlightCacheLike`.

## Engine helpers

- `EngineManager` — loads/caches adapters per owner; disposes only loader-created engines.
- `BUILTIN_ENGINE_IDS` — `shiki`, `highlightjs`, `lowlight`, `prism`.
- `isHighlightEngine(value)` — public contract guard.
- `createHighlighterContext(options, parent?, providesScope?, scopeModeOverride?)` — low-level context factory. `scopeModeOverride` selects `wrapper`, `renderless`, or `none`; omitted values derive from `providesScope`.
- `HIGHLIGHTER_CONTEXT` — injection key for advanced integrations.
