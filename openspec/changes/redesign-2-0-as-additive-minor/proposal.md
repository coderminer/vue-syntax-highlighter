## Why

The current roadmap puts eight valuable capabilities behind a `2.0.0` breaking release: smaller engine-free entry points, renderless provider scopes, root-level theme variables, a single stylesheet, aligned line metrics, terminal-newline preservation, and engine-specific cache identity. Users cannot adopt most of these benefits without waiting for a major version, and the project must maintain a migration guide, beta channel, and dual behavior for a release that may not be necessary.

Redesign the roadmap so every benefit is available as an opt-in addition in `1.2.0`. The defaults, rendered DOM, public contracts, and upgrade expectations of `1.1.x` remain unchanged. `2.0.0` is cancelled and the project adopts an additive-only version policy: no future release is planned around a default flip, so no user is ever forced to migrate.

## What Changes

- **Cancel `2.0.0`** and replace the breaking roadmap with an additive `1.2.0` capability set. No item in this change may change a default, remove an export, alter existing DOM, or invalidate an existing call site.
- **Adopt an additive-only version policy for future work.** New capabilities ship behind opt-in names; the previous behavior remains available. A future release may add a replacement API or a compatibility alias, but it may not remove the old path, flip a default, or require a migration. Deprecation notices may recommend an opt-in replacement without disabling the original behavior.
- **Engine entries:** keep the default and `full` entries auto-loading built-in engines, and keep `core` as the explicit-engine, built-in-free entry. Document `core` as the supported opt-out and add regression tests that freeze all three contracts. No entry behavior changes.
- **Core without an engine:** keep the existing graceful path where a block without a resolvable engine renders plain text and warns in development. Document it as a supported choice rather than a future default.
- **Renderless provider:** add an opt-in `renderless` prop to `SyntaxHighlighterProvider` (default `false`). When enabled, the provider supplies context without emitting `div.vsh-scope`; descendant blocks become theme-scope owners. The default wrapper is unchanged.
- **Self-contained theme scope:** add an opt-in `themeScope="self"` prop to `SyntaxHighlighter` (default `"inherit"`) so a block can emit theme variables and scheme attributes on its own `.vsh` root even inside a wrapper provider. The default provider-owned scope is unchanged.
- **Single stylesheet:** add `vue-syntax-highlighter/styles/complete.css`, which combines the base sheet and the pre-`light-dark()` fallback. Keep `styles.css` and `styles/fallback.css` byte-compatible in behavior so existing imports continue to work. `styles/fallback.css` is not deprecated or converted to a no-op.
- **Aligned line metrics:** add an opt-in fixed line-height mode (default remains the current visual `1.5em` behavior). Users can align virtualized and non-virtualized rows at a numeric height, including the `21` px value from the old roadmap, without changing the `20` px default or the default rendered height.
- **Terminal newline:** add an opt-in `preserveTrailingNewline` input to `highlight()` and the composable (default `false`). Existing callers keep the current display-normalized result.
- **Cache identity:** add an opt-in engine-identity cache mode (default off) and continue to honor the existing `HighlightEngine.cacheKey` hook. Custom engines that share an `id` can stop sharing cached results without changing the default key format.
- **Roadmap and docs:** rewrite the roadmap around additive releases, remove the `2.0.0` migration/beta plan, and document every opt-in with its default and compatibility guarantee.

## Capabilities

### New Capabilities

- `engine-entry-strategy`: Default, `full`, and `core` entry behavior; built-in engine auto-loading; explicit-engine operation; missing-engine fallback; and the guarantee that no entry default changes in `1.2.0`.
- `provider-scope`: Provider wrapper ownership, the opt-in `renderless` mode, nested-provider inheritance, cleanup, and the guarantee that the default `div.vsh-scope` DOM stays unchanged.
- `theme-scoping`: Provider-owned versus root-owned theme variables and scheme attributes, the opt-in `themeScope="self"` mode, nested override behavior, and SSR determinism.
- `stylesheet-packaging`: The existing base and fallback stylesheets, the new combined `styles/complete.css` entry, import order, package exports, and compatibility guarantees.
- `line-metrics`: The `20` px virtual default, the visual `1.5em` non-virtual default, the opt-in fixed alignment mode, the `21` px opt-in, warning behavior, and virtual/non-virtual parity.
- `highlight-api`: `highlight()` input normalization, terminal-newline behavior, the opt-in `preserveTrailingNewline` flag, component exposure, composable parity, and cache interaction.
- `result-cache`: The default engine-`id` cache key, the opt-in engine-identity mode, `HighlightEngine.cacheKey` precedence, in-flight deduplication, and unchanged cache budgets.

### Modified Capabilities

None. No existing OpenSpec capability specs are present in this repository; the change adds behavioral contracts for the redesigned surface.

## Impact

- Source: `src/component/SyntaxHighlighterProvider.ts`, `src/component/SyntaxHighlighter.ts`, `src/composables/useSyntaxHighlighter.ts`, `src/core/props.ts`, `src/core/context.ts`, `src/core/controller.ts`, `src/core/cache.ts`, `src/core/engine.ts`, `src/styles/`, and `src/types.ts`.
- Package: new CSS subpath export and declaration/type updates; no new runtime dependencies or optional peers; no version-major migration.
- Tests: component, composable, cache, entry, SSR, package, and consumer coverage for every opt-in plus regression coverage proving defaults are unchanged.
- Documentation: `docs/api.md`, `docs/guide/advanced-usage.md`, `docs/guide/themes.md`, `docs/guide/performance.md`, `docs/guide/limitations.md`, `docs/guide/roadmap.md`, `README.md`, and `CHANGELOG.md`.
- Release: `1.2.0` only. `2.0.0`, `2.0.0-beta.x`, the `next` tag, and the migration/beta plan are removed from the roadmap.
