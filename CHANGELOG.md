# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

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
- npm metadata with repository/homepage/bugs links, `publishConfig.access`, a tag-checked release workflow with provenance, and a `prepublishOnly` build/package gate.
- VitePress documentation with onboarding, basic and advanced usage guides, API reference, examples for every public export, live demo, and a GitHub Pages deployment workflow.
- Playwright and axe coverage for the demo, deferral, nested schemes, and accessibility.
