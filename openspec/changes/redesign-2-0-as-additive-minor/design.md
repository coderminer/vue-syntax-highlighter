## Context

See `proposal.md` for motivation and `specs/` for the behavioral contracts. This repository is at `1.1.1` with a Vue 3 + TypeScript, ESM-only component library. The relevant current architecture is:

- `src/index.ts` and `src/full.ts` install built-in engine loaders; `src/core-entry.ts` re-exports the same API without installing any loader.
- `src/core/context.ts` creates a shallow-reactive provider context. `providesScope` is currently a boolean: providers pass `true`, plugin/default contexts pass `false`.
- `SyntaxHighlighterProvider` always renders `props.scopeTag || 'div'` with `class="vsh-scope"`, theme variables, and theme attributes.
- `SyntaxHighlighter` emits theme variables and attributes on `.vsh` only when it owns the scope: `localThemeOverride || !hasProviderScope`.
- `src/styles/base.css` uses `min-height: 1.5em` for non-virtual rows. Virtual rows inline `height`, `min-height: 0`, and `line-height` from the numeric `lineHeight` (default `20`).
- `controller.highlight()` uses `normalizeDisplaySource`, which removes one terminal newline. The rendered `code` prop uses the same display normalization.
- `requestCacheKey()` prefers `engine.cacheKey()` and otherwise builds a key from `engine.id`, language, code, and options. Theme is excluded.
- `scripts/copy-assets.mjs` generates `dist/styles.css` from `base.css` and copies `dist/styles/fallback.css`.
- Provider cache, engine registry, and theme registry options are creation-time; later changes warn once.

The redesign adds only opt-in surface. No default, DOM shape, export, or cache-key format changes for an upgrading `1.1.x` consumer.

## Goals / Non-Goals

**Goals:**

- Make each former `2.0.0` benefit available through an explicit opt-in in `1.2.0`.
- Freeze every existing default with executable regression tests.
- Keep the implementation additive in types, props, context, build output, and docs.
- Adopt and enforce an additive-only policy so no future release needs a migration.
- Keep SSR deterministic and avoid browser measurement for any new rendering mode.

**Non-Goals:**

- Shrinking the default entry. That would require changing which engines it loads, which is breaking; `core` is the supported opt-out.
- Making the provider renderless by default, moving theme variables by default, merging the fallback into `styles.css` by default, or changing the default line height.
- Deprecating or removing `scopeTag`, `styles/fallback.css`, the default entry, `full`, or any existing prop.
- A new major-version migration guide, beta channel, or `next` tag.
- Runtime style injection, shadow DOM, or measured line heights.

## Decisions

### 1. Additive-only release governance

The project will treat additions and opt-ins as the only forward-compatible path:

- A new behavior is introduced under a new prop, option, entry, or subpath with a default that preserves the old behavior.
- When a cleaner API replaces an awkward one, both stay available. The old path may receive a deprecation warning but keeps working.
- Defaults are never flipped. A future release may add a preset or a helper that makes an opt-in easier, but it may not make the opt-in implicit.
- Removal is not scheduled. If a path must eventually be retired, that requires a separate, explicitly approved breaking-change proposal; this roadmap does not authorize one.

Enforcement:

- A compatibility test suite asserts the default entry, provider DOM, theme location, line heights, `highlight()` newline behavior, and default cache key.
- The docs and roadmap state the policy. The roadmap no longer contains a `2.0.0` section, migration examples, or a beta sequence.
- Release notes classify changes as `Added`, `Fixed`, or `Changed`; a `Changed` entry that alters a default is rejected in review.

**Alternatives considered:** keeping `2.0.0` as a distant major (rejected: forces migration planning and leaves users without benefits); adding opt-ins but preserving a future default flip (rejected: the user explicitly wants to avoid future breaking updates); making all opt-ins permanent forks (rejected: unnecessary duplication if a single opt-in path is well designed).

### 2. Engine entries: keep three contracts, add no entry

No runtime entry change is needed:

- `vue-syntax-highlighter` and `vue-syntax-highlighter/full` continue to call `installBuiltinEngines()`.
- `vue-syntax-highlighter/core` continues to export `api.ts` without installing a loader.
- `selectEngine()` keeps its `'shiki'` fallback. In `core`, the missing loader produces the existing actionable warning and plain-text fallback.

The additive work is documentation and regression coverage, not a new entry. A `lite` alias for `core` was considered and rejected: it adds surface without a new capability and creates a second name for the same contract.

**Compatibility trap:** a consumer who wants no built-in engine imports must import `core`. That is already true in `1.1.x`; the redesign makes it the documented recommendation instead of a future default flip.

### 3. Provider renderless mode and scope-mode state

New public prop:

```ts
renderless?: boolean // default false
```

Implementation approach:

- Extend `HighlighterOptions` and `HighlighterContext` with an optional `scopeMode?: 'wrapper' | 'renderless' | 'none'`.
  - Default/plugin contexts use `'none'`.
  - A normal provider uses `'wrapper'`.
  - A renderless provider uses `'renderless'`.
- Keep `providesScope` for compatibility and derive it as `scopeMode === 'wrapper'`.
- `SyntaxHighlighterProvider` watches `renderless` and updates `context.scopeMode` / `context.providesScope` reactively. The render function returns `slots.default?.()` when renderless, otherwise the existing wrapper VNode.
- A renderless provider still calls `provide()`, creates/disposes the same context, preloads languages, and owns the same cache/engine lifecycle. The wrapper is the only difference.
- `scopeTag` remains a string prop with default `'div'`. When `renderless` is true and `scopeTag` is not `'div'`, emit one warning that `scopeTag` is ignored. An explicit `scopeTag="div"` is harmless and should not warn.
- Nested behavior is driven by the nearest provider's `scopeMode`, not by "any ancestor has a wrapper". This is the key change needed for `theme-scoping`.

**Alternatives considered:**

- `scopeTag={false}` to mean renderless. Rejected: it overloads a string prop, makes the type union awkward, and hides intent.
- A separate `ProviderRenderless` component. Rejected: duplicate component and context logic.
- Removing the wrapper only in CSS (`display: contents`). Rejected: the DOM node still exists; the benefit is no wrapper node.

**Risk:** a renderless provider with multiple slot roots produces a Vue fragment. Vue 3 supports this, but consumers must not rely on a single provider root for layout. Document it. SSR fragments are deterministic.

### 4. Theme ownership: nearest scope mode plus explicit `self`

New public prop:

```ts
themeScope?: 'inherit' | 'self' // default 'inherit'
```

Ownership rule in the component:

```
ownsScope =
  localThemeOverride ||
  themeScope === 'self' ||
  nearestProviderScopeMode is 'renderless' or 'none'
```

- `nearestProviderScopeMode` walks the context chain and returns the first provider-scope mode, skipping `'none'` contexts until a provider is found. If none exists, it returns `'none'`.
- This replaces the current `hasProviderScope` walk. For all existing default cases it produces the same result: a wrapper provider suppresses root scope; standalone/default/plugin contexts own the scope.
- When `ownsScope` is true, the root keeps its current variables and attributes. When false, the root keeps only gutter/custom/user styles, exactly as today.
- A renderless provider therefore makes descendant blocks own the theme without requiring `themeScope="self"`. A wrapper provider still owns the theme by default.
- `themeScope="self"` inside a wrapper keeps the wrapper in the DOM but adds variables and attributes to `.vsh`. The existing base and fallback CSS already target `.vsh[data-vsh-scheme]`, so no new selector path is required.

**Alternatives considered:**

- Always emit theme variables on every block. Rejected: increases HTML size and changes the default DOM.
- Remove the provider wrapper when `themeScope="self"` is used. Rejected: the two opt-ins should be independent.
- Use a boolean `selfContainedTheme`. Rejected: a string union is more descriptive and leaves room for a future `'auto'` without breaking the type.

**Risk:** localThemeOverride already forced root ownership in `1.1.x`. Keep that rule to avoid changing nested-provider behavior. `themeScope="inherit"` must not override a local theme prop.

### 5. Complete stylesheet as a generated artifact

New package subpath:

```
vue-syntax-highlighter/styles/complete.css
```

Implementation:

- `scripts/copy-assets.mjs` remains the single generator. It writes:
  - `dist/styles.css` = minified `base.css` (unchanged).
  - `dist/styles/fallback.css` = `fallback.css` (unchanged).
  - `dist/styles/complete.css` = minified `base.css` followed by `fallback.css`.
- No `@import` is used in the published complete file. This avoids relative-path resolution problems and guarantees base-before-fallback order.
- Add `./styles/complete.css` to the `exports` map and to package validation.
- Add a size-limit entry for the complete file after measuring the generated output, with headroom; the exact budget is set during implementation.
- Keep `styles.css` and `styles/fallback.css` behavior byte-compatible in effect. Do not add the fallback to `styles.css`, do not turn the fallback into a no-op, and do not remove either export.

**Alternatives considered:**

- `@import './base.css'` inside a source complete file. Rejected: the published layout would require extra files and import resolution at consume time.
- A CSS preprocessor build. Rejected: adds a dependency for a simple ordered concatenation.
- Only documenting “import both files”. Rejected: the user explicitly wants the single-stylesheet benefit.

**Risk:** the complete file duplicates rules and is larger. It is opt-in; the base budget is unchanged. The generated file must be checked into release validation so it cannot drift from the source sheets.

### 6. Fixed line-height mode without changing defaults

New public prop:

```ts
lineHeightMode?: 'visual' | 'fixed' // default 'visual'
```

Behavior:

- `visual` keeps the current CSS `min-height: 1.5em` for non-virtual rows. Virtual rows keep the existing numeric inline box (`height`, `min-height: 0`, `line-height`) because spacer math requires exact pixels.
- `fixed` makes non-virtual rows inline `min-height: <lineHeight>px` and `line-height: <lineHeight>px`; virtual rows keep the exact `height` box. No `height` is forced on non-virtual rows, so content can grow if wrapping is enabled; the mode guarantees the minimum row metric, not clipping.
- The default numeric `lineHeight` stays `20`. To opt into the old `2.0` metric, use `line-height="21"` with `line-height-mode="fixed"`.
- Validation is scoped to the new mode: in `fixed`, a non-finite, zero, or negative `lineHeight` falls back to `20` with one warning. In `visual`, existing handling is untouched so no current caller changes behavior. An unknown mode falls back to `visual` with one warning.

Why not make `lineHeight` alone switch non-virtual rows? That would change existing users who set `lineHeight` only for virtualization. Why not default `fixed` at `21`? That is the breaking default flip the redesign rejects.

**Alternatives considered:** measuring CSS line height with `getComputedStyle` (rejected: breaks SSR determinism and adds observer work); a CSS variable on `.vsh` (workable, but inline per-row styles already exist for virtualization and avoid selector specificity issues); a `density` preset (rejected: hides the numeric value and adds a second vocabulary).

**Risk:** fixed mode plus `wrap` can produce rows taller than the numeric line height. Document that fixed mode sets the minimum and that virtualization still requires `wrap=false`.

### 7. Terminal-newline preservation at the API boundary

New option:

```ts
highlight({
  code: string
  language?: string
  preserveTrailingNewline?: boolean // default false
})
```

Implementation:

- `controller.highlight()` chooses `normalizeSource` when the flag is true, otherwise `normalizeDisplaySource`.
- The effective code is what enters `requestCacheKey`, so preserved and stripped modes cannot collide even though no extra flag is added to the key.
- The component-exposed `highlight()` forwards the input unchanged.
- `useSyntaxHighlighter()` accepts `preserveTrailingNewline?: MaybeRefOrGetter<boolean>` as a default. A per-call value overrides it.
- Rendering is untouched: the `code` prop still uses `normalizeDisplaySource`, and `copy()`/`getCopyPayload()` keep their existing newline rules.

**Alternatives considered:** changing the default to preserve (rejected: breaking); a separate `highlightRaw()` method (rejected: two methods and a new name for one boolean); adding the flag to the cache key explicitly (unnecessary because the effective code already differs).

**Risk:** callers may expect preserved mode to also affect rendering. The docs must state that the option is API-only and does not change the component's display rows.

### 8. Engine-identity cache partition

New option:

```ts
cacheEngineIdentity?: boolean // default false
```

Where it lives:

- `HighlighterOptions` and `SyntaxHighlighterProvider` props, plus plugin options. It is creation-time, consistent with `cache`, `cacheCapacity`, `cacheMaxChars`, `engines`, and `themeRegistry`.
- The context stores the resolved boolean. The controller passes an identity token to `requestCacheKey()` only when the option is true.
- `requestCacheKey()` keeps `engine.cacheKey()` precedence. If the hook returns a non-empty string, it wins in both modes; if it throws or returns an invalid value, the selected fallback is used.
- The default fallback key remains byte-identical: build the key from `[engineId, language, code, options]`. When identity mode is on, append a stable per-object token so the composed key is `[engineId, language, code, options, identity]`.
- Use a module-level `WeakMap<HighlightEngine, number>` token, not `JSON.stringify(engine)`, not a random UUID per request, and not object mutation. The token is stable for the object's lifetime and does not leak.
- Add `cacheEngineIdentity` to the provider's creation-time warning list. Changing it after creation is ignored with one warning.

**Alternatives considered:** always include object identity (rejected: changes default sharing and key format); use `engine.cacheKey` only and add no option (rejected: custom engines with the same `id` would still need to implement a hook; an option makes the behavior discoverable and testable); hash engine fields (rejected: unreliable and expensive).

**Risk:** two copies of the library in one process have separate WeakMaps. This is acceptable because each copy has its own cache. A disposed engine object can be garbage-collected; the cache entry key remains a primitive and is evicted normally.

### 9. Documentation and roadmap rewrite

- `docs/guide/roadmap.md` becomes an additive-release page: version policy, `1.2.0` capability table, and “no breaking release scheduled”. Remove the `2.0.0` table, migration examples, beta sequence, and “switch the default entry” tracking items.
- `docs/api.md`: document `renderless`, `themeScope`, `lineHeightMode`, `cacheEngineIdentity`, and `preserveTrailingNewline` with defaults and opt-in status.
- `docs/guide/advanced-usage.md`: examples for renderless + self scoping, complete stylesheet, fixed metrics with `21`, and cache identity.
- `docs/guide/themes.md`: explain provider-owned vs root-owned scope and that existing selectors remain valid.
- `docs/guide/performance.md`: explain line-height modes and identity cache partitioning.
- `docs/guide/limitations.md`: state the additive-only policy and the no-future-breaking-change commitment.
- `README.md`, `CHANGELOG.md`: `1.2.0` entry lists additions only; no “migration required” language.

### 10. Verification strategy

Add tests before or with each implementation slice:

- Entry/peer tests: default and `full` still resolve built-in strings; `core` still imports in Node with only `vue`; core without an engine warns and renders plain.
- Provider tests: default `div.vsh-scope`; `scopeTag`; renderless has no wrapper; renderless context still applies; renderless + scopeTag warning once; nested wrapper/renderless combinations; unmount disposal; SSR output.
- Theme tests: default provider-owned variables; `themeScope="self"` root variables/attributes; renderless descendant ownership; local override precedence; nested override; fallback selector compatibility; hydration.
- Stylesheet tests: package contains all three files; export resolution; complete file order; base-only still lacks fallback; complete applies in both support modes.
- Line-metric tests: default 20/1.5em; fixed inline styles; virtual/non-virtual parity at 20 and 21; invalid fixed values warn and fall back; visual mode unchanged; spacer math.
- Highlight API tests: default stripping; preserved one and multiple newlines; composable default and per-call override; cache separation; validation; rendering/copy unchanged.
- Cache tests: default same-id sharing; identity partition; stable same-object key; `cacheKey` precedence and failure fallback; dedupe; budgets; late-change warning.
- Docs/package checks: check-docs sees new documented props/exports; check-package sees `styles/complete.css`; size-limit covers it; full `pnpm verify` passes.

## Risks / Trade-offs

- **New prop names can consume attributes that previously fell through.** For example, a user passing `theme-scope="self"` as an unknown attribute would now get the new behavior. Mitigation: use specific names, document them, and treat them as additive API, not generic attributes. This is an accepted, conventional Vue trade-off.
- **Renderless providers remove a node some CSS may target.** Mitigation: opt-in only, documented; default wrapper unchanged.
- **Root theme scope duplicates custom properties and increases HTML size.** Mitigation: opt-in only; provider default unchanged; performance docs explain the trade-off.
- **Fixed line height can disagree with wrapped content.** Mitigation: fixed mode sets a minimum, virtualization still rejects `wrap=true`, and docs explain the limitation.
- **Complete stylesheet is larger and duplicates rules.** Mitigation: opt-in, generated from the same sources, package/size checks prevent drift.
- **Engine identity tokens are process-local.** Mitigation: cache is process/app-local; document that the mode partitions in-memory results, not persistent cache keys.
- **A future maintainer may be tempted to flip a default.** Mitigation: compatibility tests, roadmap policy, and release-review rule; this design explicitly does not schedule a breaking release.
- **Core/default confusion.** Mitigation: entry comparison table in docs and consumer fixtures that prove each contract.

## Migration Plan

There is no migration for existing consumers:

1. Ship `1.2.0` with all new behavior opt-in and all defaults frozen.
2. Adopt any opt-in voluntarily; existing imports continue to work.
3. Rollback is safe because the defaults were never changed; removing the new release restores identical behavior.
4. Remove `2.0.0`, `2.0.0-beta.x`, the `next` tag, and the beta/migration plan from the roadmap. No tag or publish is part of this planning change.
5. Future additions follow the same opt-in pattern. No future breaking release is scheduled.

## Open Questions

None. The API names, defaults, and creation-time behavior are resolved above; remaining measurement choices (for example, the exact complete-stylesheet size budget) are implementation details with no spec or task dependency.
