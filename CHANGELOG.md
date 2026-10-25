# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

## [0.1.0] - 2026-10-25

### Added

- Vue 3 `SyntaxHighlighter` component with line numbers, highlighted ranges, wrapping, tag overrides, scoped slots, events, and exposed `refresh`, `highlight`, `copy`, and `getCopyPayload` operations.
- `SyntaxHighlighterProvider`, the `VueSyntaxHighlighter` plugin, and `useSyntaxHighlighter` composable with scoped defaults, preloaded languages, and lifecycle cleanup.
- Engine adapter contract and separate lazy entries for Shiki, highlight.js through lowlight, a lowlight entry, and Prism through refractor.
- Semantic 19-type token model, source normalization, result validation, and frozen results.
- Four built-in themes (`vsh-light`, `vsh-dark`, `vsh-paper`, `vsh-midnight`) as individual data entries, matched light/dark pairs, `defineTheme`, and CSS custom-property theme scopes.
- Provider-scoped LRU cache with character budget, in-flight request deduplication, theme-independent cache keys, microtask scheduling, and stale-result rejection.
- Offscreen deferral with `IntersectionObserver` and virtualized rendering for long documents with bounded DOM and full-source copying.
- Deterministic SSR and hydration behavior for synchronous, preloaded, and asynchronous engines without runtime style injection.
- Migration aliases `Light`, `LightAsync`, `PrismLight`, and `PrismAsync`, plus deprecated prop mapping with one-time warnings.
- Strict ESM package exports, TypeScript declarations, size budgets, static graph assertions, publint/attw validation, packed-consumer browser and SSR fixtures.
- VitePress documentation, live demo, 50,000-line stress demo, migration guide, API reference, and Playwright/axe coverage.
