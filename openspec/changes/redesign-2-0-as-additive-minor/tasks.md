## 1. Freeze Current Defaults

- [x] 1.1 Add entry-contract regression tests proving the default and `full` entries resolve built-in engine strings while `core` imports without engine peers; verify with `pnpm vitest run tests/core` plus the existing consumer fixture.
- [x] 1.2 Add default-behavior regression tests for `div.vsh-scope`, provider-owned theme variables, `lineHeight` defaults, `highlight()` terminal-newline stripping, and the default cache key; verify the new tests fail if any default is changed.
- [x] 1.3 Add an SSR regression test for the default wrapper, theme payload, and line-height markup; verify server HTML and client hydration remain identical.

## 2. Add Public Types and Prop Normalization

- [x] 2.1 Add the `ThemeScope` (`inherit | self`) and `LineHeightMode` (`visual | fixed`) types plus the `HighlightInput` option shape; verify `pnpm typecheck` reports no errors.
- [x] 2.2 Add `themeScope`, `lineHeightMode`, and `renderless` to the public prop/option types with defaults `inherit`, `visual`, and `false`; verify type fixtures accept the new values and reject invalid ones.
- [x] 2.3 Extend prop normalization for `themeScope` and `lineHeightMode`, including documented fallbacks and one-time warnings for invalid values; verify unit tests cover defaults, valid values, and invalid values.

## 3. Provider Scope Mode

- [x] 3.1 Add `scopeMode` (`wrapper | renderless | none`) to highlighter options/context while keeping `providesScope` derived for compatibility; verify context unit tests cover default, plugin, wrapper, and renderless modes.
- [x] 3.2 Implement the provider `renderless` prop, reactive scope-mode updates, wrapper suppression, and the one-time `renderless`/`scopeTag` conflict warning; verify component tests cover default, custom tag, renderless, conflict, and nested combinations.
- [x] 3.3 Verify renderless provider lifecycle: context disposal, language preloading, cache ownership, and loader-owned engine disposal remain unchanged; verify existing provider lifecycle tests still pass with `renderless`.
- [x] 3.4 Add SSR tests for renderless provider output, confirming no wrapper in server HTML and no hydration mismatch.

## 4. Theme Ownership

- [x] 4.1 Replace the component's ancestor `hasProviderScope` check with nearest-provider scope-mode resolution, preserving the existing default ownership result; verify current provider/theme tests pass unchanged.
- [x] 4.2 Implement `themeScope="self"` so root variables and scheme attributes are emitted inside a wrapper provider, while the wrapper remains; verify component tests assert the root payload and unchanged provider DOM.
- [x] 4.3 Verify renderless providers make descendant blocks own the theme, including nested wrapper/renderless combinations and local theme overrides; verify component tests cover each nesting order.
- [x] 4.4 Add SSR and fallback-stylesheet tests for root-owned themes, confirming `.vsh[data-vsh-scheme]` and `.vsh-scope[data-vsh-scheme]` both work; verify `pnpm test:run` passes.

## 5. Fixed Line Metrics

- [x] 5.1 Implement fixed-mode row styles using numeric `min-height` and `line-height` without forcing height on non-virtual rows; verify component tests assert the inline styles.
- [x] 5.2 Implement fixed-mode validation for non-finite, zero, and negative line heights plus unknown-mode fallback, without changing visual-mode handling; verify unit tests cover each case and warning count.
- [x] 5.3 Verify virtual/non-virtual parity at `lineHeight=20` and the opt-in `lineHeight=21`, including spacer totals and no scroll drift; verify component tests cover both metrics.
- [x] 5.4 Add SSR tests for fixed-mode row styles, confirming deterministic markup without measurement.

## 6. Terminal-Newline Option

- [x] 6.1 Extend the controller `highlight()` input with `preserveTrailingNewline`, selecting `normalizeSource` or `normalizeDisplaySource`; verify unit tests cover one, multiple, and no trailing newlines.
- [x] 6.2 Pass the option through the component's exposed `highlight()` and add the composable default plus per-call override; verify composable and component tests cover both paths.
- [x] 6.3 Verify preserved and stripped calls do not share cache entries, invalid engine output still fails validation, and rendering/copy behavior is unchanged; verify the relevant tests pass.

## 7. Engine-Identity Cache Mode

- [x] 7.1 Add a stable per-engine identity token and an optional `engineIdentity` field to cache-key construction while keeping the default key byte-identical; verify unit tests compare default keys and identity-mode keys.
- [x] 7.2 Add the creation-time `cacheEngineIdentity` option to highlighter options, provider props, and plugin options, including the late-change warning; verify provider/plugin tests cover default off, enabled, and late changes.
- [x] 7.3 Verify identity mode partitions same-`id` engine objects while the same object stays stable; cover `cacheKey` precedence, broken-hook fallback, in-flight deduplication, and cache budgets; verify the cache test suite passes.

## 8. Complete Stylesheet

- [x] 8.1 Generate `dist/styles/complete.css` from the base and fallback sources in the existing asset-copy script, preserving base-before-fallback order; verify the generated file contains both rule sets and no `@import`.
- [x] 8.2 Add the `./styles/complete.css` export and package-file expectation while keeping the existing stylesheet exports; verify `pnpm check:package` passes.
- [x] 8.3 Add a size-limit budget for the complete stylesheet after measuring the generated gzip size; verify `pnpm size` passes with headroom.
- [x] 8.4 Add tests proving base-only still omits fallback rules and complete works in both `light-dark()` support modes; verify the stylesheet tests pass.

## 9. Documentation and Roadmap Rewrite

- [x] 9.1 Rewrite `docs/guide/roadmap.md` as an additive-only policy page with the `1.2.0` opt-in table; verify it contains no `2.0.0` table, beta sequence, migration examples, or default-flip tracking item.
- [x] 9.2 Document `renderless`, `themeScope`, `lineHeightMode`, `cacheEngineIdentity`, `preserveTrailingNewline`, and `styles/complete.css` in `docs/api.md` and the relevant guide pages; verify every new public option has a default and an opt-in statement.
- [x] 9.3 Update `README.md` and `CHANGELOG.md` with the additive `1.2.0` additions and the no-future-breaking-change policy; verify no text promises a default flip or a major migration.
- [x] 9.4 Run `pnpm check:docs` and fix any missing or stale documentation references; verify the docs check and `pnpm docs:build` pass.

## 10. Distribution and Consumer Verification

- [x] 10.1 Extend `scripts/check-entries.mjs`, `scripts/check-docs.mjs`, and `scripts/check-package.mjs` for the new types, props, and stylesheet subpath; verify all three checks pass on the packed package.
- [x] 10.2 Extend the isolated consumer fixtures to import `styles/complete.css` and exercise one opt-in without a provider; verify `pnpm check:consumer` passes.
- [x] 10.3 Run `pnpm verify` end to end, including build, typecheck, unit/component/SSR tests, size, graph, entries, docs, package, consumer, workflow, docs build, and Playwright; verify every gate passes.

## 11. Release Readiness

- [x] 11.1 Review the full diff against the compatibility spec and confirm no default, DOM node, export, cache-key format, or newline behavior changed; verify the frozen-default tests pass.
- [x] 11.2 Set the package version to `1.2.0` and finalize the changelog without adding a `2.0.0` section; verify `pnpm check:release` reports the expected version and no tag/publish step ran.
- [x] 11.3 Build and inspect the packed tarball for all new files and exports; verify the tarball installs cleanly before the manual publish, with no tag created before a successful publish.
