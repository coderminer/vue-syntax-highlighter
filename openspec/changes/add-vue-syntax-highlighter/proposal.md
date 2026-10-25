## Why

Vue teams lack a first-class, actively maintained equivalent of `react-syntax-highlighter`. The React package is built around React rendering primitives, eagerly couples the component to heavyweight highlight engines, and its callback-prop API does not map onto Vue's component model. This project creates a Vue 3 + TypeScript library that keeps the useful mental model (a component plus importable themes) while exploiting Vue reactivity, slots, provide/inject, and SSR to deliver better performance and a cleaner extension surface.

## What Changes

- Add a publishable, ESM-first Vue 3 library (`vue-syntax-highlighter`) with a single core component, `<SyntaxHighlighter>`, and full TypeScript declarations.
- Define a normalized, engine-independent token model where each token carries exact text and a semantic type from a documented set. Rendering is theme-independent, so changing themes never re-tokenizes code, and tokens are rendered through Vue's render functions; engines return structured tokens only and the component never injects raw HTML.
- Ship a pluggable `HighlightEngine` adapter contract with three optional built-in adapters, each in its own entry point: Shiki (default), highlight.js via lowlight, and Prism via refractor. Unknown languages, missing peers, and adapter failures degrade to safe plain-text rendering with a development warning instead of breaking the render.
- Add a theme system where themes are data plus CSS custom properties. Support curated built-in themes, custom themes via `defineTheme`, light/dark pairs whose switch is CSS-only, and SSR style emission that avoids a flash of unstyled code. Theme changes never re-run highlighting.
- Add Vue-idiomatic extension points: scoped slots (`line`, `line-number`, `token`, `loading`, `error`, `header`, `footer`), `preTag`/`codeTag` overrides, line-level props, a plugin, a provider component, and composables.
- Add performance behavior: bounded LRU result cache, in-flight deduplication, stale async result rejection, coalesced updates, offscreen deferral via `IntersectionObserver`, and optional/automatic virtualization for long documents.
- Add SSR and hydration behavior: deterministic server markup for sync/preloaded engines; async engines render a plain-text shell during SSR and upgrade after hydration without mismatch.
- Provide migration-friendly aliases for `Light`, `LightAsync`, `PrismLight`, and `PrismAsync`, plus deprecated prop aliases (`showLineNumbers`, `wrapLines`, `customStyle`, `codeTagProps`). Native Vue props remain the documented API.
- Add a VitePress documentation and demo site, unit/component/SSR tests, an end-to-end performance smoke test, bundle-size budgets, and package validation.
- Out of scope for this change: Vue 2 support, re-implementing grammars or themes, editor/autocomplete features, a Nuxt module, and Web Worker offload (the adapter contract leaves room for a future worker-backed engine).

## Capabilities

### New Capabilities

- `syntax-highlighting`: Core component behavior, normalized token rendering, line numbers/highlighting/wrapping, scoped slots, accessibility, and safe loading/error/fallback states.
- `highlight-engines`: Engine adapter contract, engine resolution and registration, built-in Shiki/highlight.js/Prism adapters, lazy language and theme loading, and failure handling.
- `theming`: Theme data model, built-in and custom themes, CSS custom properties, light/dark switching without re-highlighting, and SSR style emission.
- `performance`: Result caching and deduplication, stale-result rejection, offscreen deferral, virtualization, update coalescing, and measured bundle/size budgets.
- `vue-integration`: Plugin installation, provider-level configuration, composables, reactivity, events/exposed methods, SSR and hydration guarantees, and migration aliases.
- `distribution`: Package entry points and subpath exports, optional peer dependencies, tree-shaking and side-effect rules, ESM/types layout, browser targets, and publish validation.

### Modified Capabilities

None. This is a greenfield repository with no existing specs.

## Impact

- New source layout: `src/core` (component, renderer, cache, virtualization, theming), `src/engines/{shiki,highlightjs,prism}`, `src/styles`, `docs/`, `tests/`, and build/CI configuration.
- New npm package surface with optional peer dependencies on `shiki`, `lowlight`, and `refractor`; `vue >= 3.4` is the only required peer.
- New documentation site and examples, including a migration guide from `react-syntax-highlighter`.
- Adds CI checks for type safety, unit/component/SSR tests, bundle-size budgets, and package exports; no existing application code or behavior is affected.
