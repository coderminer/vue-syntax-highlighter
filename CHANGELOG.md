# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

## [1.2.1] - 2026-10-29

### Fixed

- The published tarball no longer includes `.map` files. Source maps are still generated in `dist` for local debugging, but `npm pack` and `npm publish` exclude them.

## [1.2.0] - 2026-10-29

### Added

- `renderless` on `SyntaxHighlighterProvider`, defaulting to `false`, to remove the wrapper while keeping provider configuration. The default `div.vsh-scope` wrapper is unchanged.
- `themeScope` on `SyntaxHighlighter`, defaulting to `inherit`, with `self` to emit theme variables and scheme attributes on the `.vsh` root inside a wrapper provider.
- `lineHeightMode` on `SyntaxHighlighter`, defaulting to `visual`, with `fixed` to emit numeric `min-height` and `line-height` on non-virtual rows. The default line height remains `20`; opt into `21` with `line-height-mode="fixed"`.
- `preserveTrailingNewline` on the exposed `highlight()` input and as a `useSyntaxHighlighter` default with per-call override. The default false behavior still strips one terminal newline.
- `cacheEngineIdentity` on the provider and plugin, defaulting to `false`, to partition cached results for distinct engine objects that share an `id`. The default cache key remains byte-identical.
- `vue-syntax-highlighter/styles/complete.css`, an opt-in concatenation of the minified base stylesheet and fallback rules. `styles.css` and `styles/fallback.css` are unchanged.
- Public types `ThemeScope`, `LineHeightMode`, `HighlighterScopeMode`, and `HighlightInput`.
- Frozen-default regression tests for the wrapper, provider-owned theme variables, line height, terminal-newline handling, and cache-key format.

### Changed

- `SyntaxHighlighterProvider`'s `scopeTag` prop now defaults to `undefined` instead of `div`. Rendered markup is unchanged because the provider still falls back to `div`, but the prop default is observable. This lets renderless mode warn whenever `scopeTag` is explicitly set, including `scope-tag="div"`.
- The release policy is additive-only. Former breaking changes are delivered as opt-ins, and no future breaking release or default change is scheduled.

### Documentation

- Rewrote the roadmap around the additive-only policy and the `1.2.0` opt-in table.
- Documented every new prop, option, type, and stylesheet, including defaults and opt-in examples.

## [1.1.1] - 2026-10-28

### Fixed

- Removing a theme while `colorScheme` remains now resolves the default theme instead of retaining the previous pair.
- Preloading languages in the `core` entry no longer resolves the implicit Shiki default when no engine is configured, avoiding a misleading warning on provider mount.
- The deferred observer is no longer recreated for unrelated prop updates; only `defer` and `rootMargin` changes reconnect it.
- Virtualized rows now pin `min-height` to the numeric `lineHeight`, so the rendered row height matches the spacer math and scrolling no longer drifts.
- Virtualization spacers are `span` elements with `display: block`, keeping `pre > code` valid phrasing content.
- `tabindex` boolean `true` normalizes to `0` instead of emitting the invalid `tabindex="true"`.
- Changing an outer provider's engine re-highlights descendants in nested providers, and the composable reacts to inherited engine changes too.
- Changing `preTag` after mount moves the `ResizeObserver` and deferred `IntersectionObserver` to the new scroll element.

### Added

- `supportedLanguages` is exported from the highlight.js, lowlight, and Prism adapter entries.
- Isolated core-only and single-engine fixtures now install the packed tarball plus only their allowed peers in the OS temp directory.
- The isolated core fixture imports `vue-syntax-highlighter/core` in Node, so a static optional-peer import fails with `ERR_MODULE_NOT_FOUND` even when a bundler would stub it.
- Consumer builds fail when Vite emits an `__vite-optional-peer-dep_` stub.
- `check:graph` now rejects unexpected bare package imports, including static side-effect imports, on the default, core, adapter, and theme graphs.
- `check:graph` parses ESM with `es-module-lexer` instead of text patterns, so strings and comments cannot produce false results, and computed dynamic imports are rejected in the core graph.
- The graph summary only reports success when no assertion failed.
- A bundled core-entry size check measures minified gzip cost with Vue external, matching what consumers ship.

### Documentation

- Documented the runtime `NODE_ENV` folding caveat for non-Vite bundlers.
- Corrected the Prism/highlight.js language coverage imports and roadmap release tracking.
- Documented that `languages` preloading in the `core` entry requires an engine on the provider or an ancestor.
- Added type-level imports for the `core` and `full` entries and every adapter's `supportedLanguages`.

## [1.1.0] - 2026-10-28

### Added

- `vue-syntax-highlighter/core` for builds that must not resolve optional engine peers. It exposes the same API but has no built-in engine loader.
- `vue-syntax-highlighter/full` as an explicit alias for the default entry with built-in engine loaders.
- `scopeTag` on `SyntaxHighlighterProvider`, defaulting to the existing `div.vsh-scope` wrapper.
- Isolated core-only and single-engine consumer fixtures.

### Fixed

- Development warnings now read `NODE_ENV` at runtime instead of baking `__VSH_DEV__` into the published build. Vite folds the check for production; bundlers that only define `process.env.NODE_ENV` may retain warnings.
- Removing `theme` or `themes` falls back to the provider/default theme instead of retaining the previous theme.
- A single dark theme derives `data-vsh-scheme="dark"` from its `colorScheme`.
- All four built-in themes are registered by name, so `vsh-dark`, `vsh-paper`, and `vsh-midnight` work without a separate registration step.
- `styles/fallback.css` uses dark defaults for dark schemes.
- Caller-supplied engine objects and registered engine objects are no longer disposed as if the manager owned them.
- `defer` and `rootMargin` changes after mount are applied; turning deferral off starts highlighting immediately.
- `aria-label` / `aria-labelledby` are applied only to the scrollable `pre`, avoiding duplicate names and unnamed landmarks.
- Clipboard cleanup runs in `finally`, and the legacy copy path is retried when the Clipboard API rejects.
- `highlight()` normalizes explicit language input consistently with the component prop.

### Documentation

- Corrected slot examples to call `renderTokens()` / `renderToken()` as functions.
- Documented per-engine language coverage and the core/full entry split.

## [1.0.3] - 2026-10-26

### Added

- `useSyntaxHighlighter` now exposes `copy()` and `getCopyPayload()` with the same full-source behavior as the component.
- Clipboard copies fall back to `document.execCommand('copy')` when the async Clipboard API is unavailable, including plain HTTP contexts.

### Fixed

- The scrollable `pre` is only exposed as a named `region` when `aria-label` or `aria-labelledby` is provided, avoiding an unnamed landmark.
- Provider changes to `engines`, `themeRegistry`, `cache`, `cacheCapacity`, or `cacheMaxChars` after creation now emit one development warning instead of being silently ignored.

### Changed

- GitHub Actions now only builds and deploys the documentation. npm publishing is manual, and no workflow holds an npm token or runs `npm publish`.

## [1.0.2] - 2026-10-26

### Fixed

- `getCopyPayload()` and `copy()` no longer throw when `code` is `null` or another non-string runtime value. Non-string values are treated as empty source, and `copy()` now resolves `false` instead of rejecting when clipboard access fails.
- When `code` or `language` changes while an asynchronous highlight is pending, the block renders the new source as plain text instead of continuing to display the previous result. Refreshing the same input still retains the old result until the new one arrives.
- Added regression coverage for null source copy helpers, pending source changes, and same-input refreshes.

## [1.0.1] - 2026-10-25

### Fixed

- A single terminal line break no longer renders an extra empty row or line number. Deliberate blank lines are preserved, and `copy()` / `getCopyPayload()` still return the original trailing line break.
- `startLine` now accepts `0` instead of clamping the first displayed line number to `1`.
- Added regression coverage for terminal newlines, intentional trailing blank lines, zero-based line numbers, and the raw copy payload.

## [1.0.0] - 2026-10-25

Initial stable release.

### Added

- Vue 3 `SyntaxHighlighter` component with line numbers, highlighted ranges, wrapping, tag overrides, scoped slots, events, and exposed `refresh`, `highlight`, `copy`, and `getCopyPayload` operations.
- `SyntaxHighlighterProvider`, the `VueSyntaxHighlighter` plugin, and `useSyntaxHighlighter` composable with scoped defaults, preloaded languages, and lifecycle cleanup.
- Engine adapter contract and separate lazy entries for Shiki, highlight.js through lowlight, a lowlight entry, and Prism through refractor.
- Semantic 19-type token model, source normalization, result validation, and frozen results.
- Four built-in themes (`vsh-light`, `vsh-dark`, `vsh-paper`, `vsh-midnight`) as individual data entries, matched light/dark pairs, `defineTheme`, and CSS custom-property theme scopes.
- Provider-scoped LRU cache with character budget, in-flight request deduplication, theme-independent cache keys, microtask scheduling, and stale-result rejection.
- Offscreen deferral with `IntersectionObserver` and virtualized rendering for long documents with bounded DOM and full-source copying.
- Deterministic SSR and hydration behavior for synchronous, preloaded, and asynchronous engines without runtime style injection.
- Compatibility aliases `Light`, `LightAsync`, `PrismLight`, and `PrismAsync`, plus deprecated prop mapping with one-time warnings.
- Optional `styles/fallback.css` for browsers without `light-dark()`, wrapped in `@supports not` so it is a no-op in modern browsers.
- Strict ESM package exports, TypeScript declarations, size budgets, static graph assertions, publint/attw validation, packed-consumer browser and SSR fixtures.
- npm metadata with repository/homepage/bugs links, `publishConfig.access`, manual release guidance, and a `prepublishOnly` build/package gate.
- VitePress documentation with onboarding, basic and advanced usage guides, API reference, examples for every public export, live demo, and a GitHub Pages deployment workflow.
- Playwright and axe coverage for the demo, deferral, nested schemes, and accessibility.
