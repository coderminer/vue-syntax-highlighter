# Traceability

Every scenario in `specs/` maps to an automated test or a documented manual check. Automated paths are relative to the repository root.

## syntax-highlighting

| Requirement / scenario | Coverage |
| --- | --- |
| Code block structure and content fidelity — multi-line | `tests/component/SyntaxHighlighter.test.ts` → “renders the documented wrapper…”, “preserves multi-line source…” |
| Code block structure — empty source | `tests/component/SyntaxHighlighter.test.ts` → “renders empty code without errors or warnings”; `tests/core/source.test.ts` |
| Token rendering and output safety — HTML-like source | `tests/component/SyntaxHighlighter.test.ts` → “renders HTML-like source as literal text” |
| Line numbering — custom start, hidden gutter, copy | `tests/component/SyntaxHighlighter.test.ts` → “renders a hidden gutter…”, “copies the full source…” |
| Line numbering — disabled by default | `tests/component/SyntaxHighlighter.test.ts` → “disables line numbers by default…” |
| Line highlighting and wrapping | `tests/component/SyntaxHighlighter.test.ts` → “highlights individual lines and ranges…”, “toggles wrapping” |
| Slot and tag customization | `tests/component/SyntaxHighlighter.test.ts` → “composes header, footer, line…”, “supports custom preTag and codeTag” |
| Loading and fallback — pending plain busy shell | `tests/component/SyntaxHighlighter.test.ts` → “renders a plain busy shell…” |
| Loading and fallback — engine failure | `tests/component/SyntaxHighlighter.test.ts` → “emits highlighted and error events…” |
| Accessibility and attribute fallthrough | `tests/component/SyntaxHighlighter.test.ts` → “merges caller classes…”, “honors tabindex=false…”; `tests/e2e/demo.spec.ts` axe scans |

## theming

| Requirement / scenario | Coverage |
| --- | --- |
| Theme model and resolution — provider theme | `tests/component/SyntaxHighlighter.test.ts` → “inherits provider themes…”; `tests/component/integration.test.ts` |
| Theme model — unknown theme fallback | `tests/component/SyntaxHighlighter.test.ts` → “keeps the previous theme for an invalid replacement” |
| Built-in themes — individual import | `tests/core/theme.test.ts`; `scripts/check-graph.mjs`; `scripts/check-package.mjs` |
| Built-in themes — light/dark inventory | `tests/core/theme.test.ts` → “ships two light and two dark themes…” |
| CSS custom properties — override without re-highlighting | `tests/component/SyntaxHighlighter.test.ts` → “changes theme without invoking the engine” |
| CSS custom properties — styles stay scoped | `src/styles/base.css` selectors; `tests/core/theme.test.ts` variable assertions |
| Custom themes — valid | `tests/core/theme.test.ts` → “validates, fills defaults…” |
| Custom themes — invalid rejected | `tests/core/theme.test.ts` → “rejects missing base colors…”; invalid replacement test |
| Dual light/dark — paired switch is free | `tests/component/SyntaxHighlighter.test.ts` theme test; `tests/core/theme.test.ts` pair variables |
| Dual light/dark — automatic CSS selection | `src/styles/base.css` `prefers-color-scheme`; `tests/core/theme.test.ts` attributes |
| Theme switching reuses output | `tests/component/SyntaxHighlighter.test.ts` → “changes theme without invoking the engine” |
| Server-rendered theme styles | `tests/ssr/ssr.test.ts` → inline variables, no `<style>` |
| Hydration does not duplicate styles | `tests/ssr/ssr.test.ts` → “hydrates sync output…”, “hydrates an async shell…” |

## highlight-engines

| Requirement / scenario | Coverage |
| --- | --- |
| Custom adapter accepted | `tests/core/controller.test.ts`; `tests/component/SyntaxHighlighter.test.ts` fake engines |
| Invalid adapter output | `tests/core/source.test.ts`; `tests/core/controller.test.ts` → “reports invalid output…” |
| Engine precedence — component wins | `tests/core/engine.test.ts` → “prefers local, then provider…” |
| Unknown engine identifier | `tests/core/engine.test.ts`; `tests/core/controller.test.ts` → “reports unknown engines…” |
| Built-in adapters agree on text | `tests/engines/adapters.test.ts` → “agrees on line count and concatenated text…” |
| Core works without adapters | `tests/engines/adapters.test.ts` custom-engine path; `scripts/check-graph.mjs` no static engines |
| Lazy language loading — only requested | `tests/engines/adapters.test.ts` lazy loading cases |
| Concurrent language requests deduplicated | `tests/core/cache.test.ts`; adapter `loading` maps |
| Missing language degrades gracefully | `tests/engines/adapters.test.ts` unavailable-language cases; component error test |
| Synchronous engine renders immediately | `tests/core/controller.test.ts`; `tests/ssr/ssr.test.ts` |
| Asynchronous engine resolves later | `tests/component/SyntaxHighlighter.test.ts`; `tests/ssr/ssr.test.ts` |
| Missing peer actionable | `tests/engines/adapters.test.ts` diagnostics; `tests/core/engine.test.ts` loader failure |
| Engine lifecycle — shared survives | `tests/component/integration.test.ts` → “does not dispose a shared engine…” |
| Engine lifecycle — pending after disposal | `tests/core/controller.test.ts` → “ignores results after disposal” |

## performance

| Requirement / scenario | Coverage |
| --- | --- |
| Cache hit / bounded LRU / theme reuse / language miss | `tests/core/cache.test.ts`; `tests/core/controller.test.ts` |
| In-flight deduplication | `tests/core/cache.test.ts` → “shares in-flight promises…” |
| Memoized rendering — parent update | `tests/component/SyntaxHighlighter.test.ts` → “does not re-highlight on unrelated prop changes” |
| Stale rejection and previous output | `tests/core/controller.test.ts`; `tests/component/SyntaxHighlighter.test.ts` → “retains the previous result…” |
| Offscreen deferral — no highlight before intersection | `tests/component/SyntaxHighlighter.test.ts` → deferral tests; `tests/ssr/ssr.test.ts` deferred SSR |
| Offscreen deferral — once on approach | `tests/component/SyntaxHighlighter.test.ts` → “waits for intersection and observes only once” |
| Long document DOM bound / scroll / no re-highlight | `tests/component/SyntaxHighlighter.test.ts` → “bounds a 50,000 line document…” |
| Incompatible virtualization warning | `tests/component/SyntaxHighlighter.test.ts` → “warns and disables virtualization with wrapping” |
| Automatic threshold | `tests/core/virtual.test.ts` |
| Copy full virtualized source | `tests/component/SyntaxHighlighter.test.ts` 50k test; `tests/e2e/demo.spec.ts` clipboard test |

## vue-integration

| Requirement / scenario | Coverage |
| --- | --- |
| Plugin registers and isolates apps | `tests/component/integration.test.ts` → “registers the component and isolates applications” |
| Invalid plugin options | `tests/component/integration.test.ts` → “warns about invalid options…” |
| Provider nested overrides / inheritance | `tests/component/SyntaxHighlighter.test.ts`; `tests/component/integration.test.ts` |
| Composable reactive state | `tests/component/integration.test.ts` composable tests |
| Reactive updates in place | `tests/component/SyntaxHighlighter.test.ts` prop update tests |
| Events and exposed operations | `tests/component/SyntaxHighlighter.test.ts` exposed operations; SSR/event tests |
| SSR sync / async / import without browser globals | `tests/ssr/ssr.test.ts`; `scripts/check-package.mjs` imports the built core in Node |
| Migration aliases and deprecated props | `tests/component/integration.test.ts` alias tests; `tests/core/props.test.ts` |
| Native props win | `tests/core/props.test.ts` → “gives native props precedence…” |

## distribution

| Requirement / scenario | Coverage |
| --- | --- |
| Modern bundler consumes ESM | `scripts/check-consumer.mjs` Vite build |
| Unsupported Vue version rejected | `peerDependencies.vue: ^3.4.0`; `scripts/check-package.mjs` |
| Engine adapter resolves independently | `scripts/check-package.mjs` subpath imports; `scripts/check-graph.mjs` |
| Deep import blocked | `scripts/check-package.mjs` |
| Theme data individual export | `scripts/check-package.mjs`; `scripts/check-graph.mjs` |
| Core install without engines | `scripts/check-package.mjs` imports core in Node; graph check |
| Adapter peer missing | `tests/engines/adapters.test.ts` diagnostics; `tests/core/engine.test.ts` |
| Vue not duplicated | `scripts/check-package.mjs`; `vue` is a peer |
| Root graph excludes engines/themes | `scripts/check-graph.mjs` |
| One adapter excludes another | `scripts/check-graph.mjs` |
| Size budgets | `pnpm size` via `.size-limit.json`; temporary-reduction failure recorded in release notes |
| Types resolve in bundler and Node16 | `tests/types/bundler.ts`; `tests/types-node16/node16.ts`; `pnpm typecheck` |
| Invalid engine rejected by types | `tests/fixtures/invalid-engine` via `scripts/check-package.mjs` |
| Packed artifact installable in browser and SSR | `scripts/check-consumer.mjs` |

## Manual / release checks

| Check | Evidence |
| --- | --- |
| Node 20 and Node 22 matrix | `.github/workflows/ci.yml`; workflow validated by `scripts/check-workflow.mjs` |
| Size gate actually fails on regression | Temporary `.size-limit.json` core budget reduced below 9.8 kB (brotli) exits non-zero; restored afterward |
| Docs internal links and API export coverage | `scripts/check-docs.mjs` |
| Docs demo, clipboard, deferral, virtualization, axe | `tests/e2e/demo.spec.ts` |
| Publish dry run | `npm publish --dry-run` output reviewed during release readiness |
| Docs preview | `pnpm docs:preview` inspected locally and exercised by Playwright |
