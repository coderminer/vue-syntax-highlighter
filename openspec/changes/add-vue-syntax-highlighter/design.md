## Context

This repository is greenfield: it contains only `README.md`, `LICENSE`, and OpenSpec scaffolding. There is no `package.json`, source, test suite, or CI. The change therefore defines the package, its architecture, and its verification strategy from scratch.

See `proposal.md` for motivation and `specs/` for the behavioral contract. Key constraints shaping this design:

- Vue 3.4+ and TypeScript only; ESM; modern evergreen browsers and Node-based SSR.
- The component must not be coupled to a specific highlighter. Shiki is the default; highlight.js (via lowlight) and Prism (via refractor) are optional adapters.
- Performance, bundle size, extensibility, and SSR are first-class, not later optimizations.
- Deliverables include a publishable package, a documentation/demo site, and automated tests.
- Versions verified at planning time: Shiki 4.5, lowlight 3.3, refractor 5.0, Vue 3.5.4x, VitePress 1.6.x.

## Goals / Non-Goals

**Goals:**

- One core component with a Vue-idiomatic API (props, scoped slots, events, exposed methods), plus a plugin, a provider, and composables.
- Engine-independent, theme-independent tokenization so themes and engines can change independently.
- Lazy loading of engines, languages, and syntax grammars; no engine or grammar in the initial core graph.
- Deterministic SSR and hydration behavior for both synchronous and asynchronous engines.
- Bounded caching, request deduplication, deferred offscreen work, and windowed rendering for very long code.
- A small, validated package surface with strict types and enforced size budgets.
- Documentation, a live demo, a stress demo, and a migration guide for `react-syntax-highlighter` users.

**Non-Goals:**

- Vue 2 support, a Nuxt module, or a Vite plugin.
- Re-implementing TextMate/Prism grammars or shipping a full theme catalog.
- Exact per-scope TextMate color fidelity in v1.0 (see Decisions and Open Questions).
- Web Worker offload, editor/autocomplete features, or a copy-button UI component.
- CommonJS output or legacy browser support.
- Runtime style injection or a shadow-DOM mode.

## Decisions

### 1. Theme-independent semantic token model

The public normalized model is:

```ts
type TokenType =
  | 'plain' | 'keyword' | 'string' | 'regexp' | 'comment' | 'number'
  | 'constant' | 'function' | 'class' | 'type' | 'variable' | 'property'
  | 'operator' | 'punctuation' | 'tag' | 'attribute' | 'decorator'
  | 'meta' | 'invalid'

interface HighlightToken { readonly text: string; readonly type: TokenType }
interface HighlightLine { readonly tokens: readonly HighlightToken[] }
interface HighlightResult {
  readonly lines: readonly HighlightLine[]
  readonly language: string
  readonly meta?: Readonly<Record<string, unknown>>
}
```

- Source is normalized to LF and split on `\n`, keeping a trailing empty line. Joining line text with `\n` reproduces the source exactly.
- Tokens carry text and a semantic type only. They do not carry colors, inline styles, or HTML.
- Rendering maps each type to a stable class (`vsh-token-<type>`) and CSS custom property. Theme changes swap custom properties; they never touch tokens.
- Token boundaries may differ by adapter; concatenated line text must not.

**Why:** Tokenization becomes independent of theme, so the cache does not include the theme, theme switching is O(1) in engine work, SSR markup contains no per-token styles, all engines share one theme system, and cross-engine output is consistent.

**Alternatives considered:**

- *Engine-native inline styles* (closest to `react-syntax-highlighter`): preserves exact theme colors but requires re-highlighting on theme changes, enlarges cached data and SSR markup, and makes themes adapter-specific. Rejected for v1.0.
- *Shiki dual-theme CSS variables*: free light/dark switching for Shiki only, but requires per-token inline variables, does not generalize to lowlight/refractor or arbitrary themes, and still re-highlights when moving outside the pair. Rejected as the primary model.
- *Hybrid semantic plus exact styles*: best fidelity but a larger contract and two rendering paths. Deferred to a possible `style` extension.

**Trade-off:** Built-in themes are category palettes rather than exact TextMate themes. The design accepts slightly coarser coloring in exchange for performance, portability, and a much smaller engine contract. This is called out in the docs.

### 2. Engine adapter contract and lazy built-ins

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
  cacheKey?(request: Request, options?: Record<string, unknown>): string
  dispose?(): void
}
```

- The component validates results and falls back to plain text on failure. `.vsh-token-plain` covers unclassified tokens.
- Engine resolution: component prop → nearest provider → plugin options → built-in `'shiki'`. String identifiers resolve through a registry; built-ins are available as `'shiki'`, `'highlightjs'`, and `'prism'`. Custom strings can be registered through plugin/provider `engines`.
- Built-in adapters are separate entry points. The core resolves built-in strings with literal dynamic imports (`import('../engines/shiki/index.js')`), so engines are emitted as on-demand chunks, not static root imports. A custom engine object bypasses engine chunks at runtime; bundlers may still emit the chunks because the string branches exist. Size tests measure the root static graph, and docs explain the chunk behavior.
- Adapters are synchronous once their language is registered. `highlight` returns a value when ready and a promise while loading. This gives sync SSR after preload and async client behavior without two APIs.
- Shiki: `createHighlighterCore` with the JavaScript RegExp engine, a minimal internal neutral theme, `includeExplanation: 'scopeName'`, and a generated map of curated languages using `@shikijs/langs/<lang>`. Scope names are mapped to token types with ordered prefix rules.
- highlight.js: lowlight with an empty instance; languages are imported from `highlight.js/lib/languages/<lang>` and registered. CSS classes (`hljs-*`) map to token types.
- refractor: core instance; languages imported from `refractor/lang/<lang>.js` and registered. Token classes map to token types.
- A generated language registry per adapter covers a curated, documented set (roughly the common web/server languages); `registerLanguage`/custom loaders cover the rest. Build scripts regenerate these maps to avoid hand-maintained drift.
- Optional peers: `shiki ^4`, `lowlight ^3` plus `highlight.js ^11`, `refractor ^5`. Missing peers fail only when the adapter is selected and produce an actionable error plus plain-text fallback.

**Alternatives considered:** a single lowlight-only engine (smaller scope, lower fidelity and no engine extensibility); shipping all languages with Shiki's full bundle (much larger bundles); worker-backed engines (deferred, but the contract is compatible).

### 3. Vue component implementation

- The core is a TypeScript render-function component (`defineComponent` + `setup` returning a render function), not an SFC. This avoids a runtime template compiler, gives precise control over VNodes, and keeps the component tree-shakeable. Docs/demo may use SFCs.
- Public API:
  - Props: `code`, `language`, `engine`, `engineOptions`, `theme`, `themes`, `colorScheme`, `lineNumbers`, `startLine`, `highlightLines`, `wrap`, `virtualized`, `virtualizeAfter`, `height`, `maxHeight`, `lineHeight`, `overscan`, `defer`, `rootMargin`, `preTag`, `codeTag`, `lineProps`, `tokenProps`, `tabindex`, `aria-label`.
  - Slots: `header`, `footer`, `loading`, `error`, `line`, `line-number`, `token` (scoped).
  - Emits: `highlighted`, `error`.
  - Exposed: `refresh()`, `highlight(input)`, `copy()`.
- Internals are a controller composable that owns `shallowRef` result/error/busy state, a generation counter, the resolved engine, and disposal. Token arrays are frozen and never made deeply reactive.
- Initial highlighting runs during `setup` only when the resolved engine can return synchronously and no deferral is active. Otherwise, work starts in `onMounted`. This is what makes SSR and hydration deterministic: an async engine renders the same plain-text shell on the server and during the first client render, then upgrades after mount.
- Prop watchers coalesce changes with a microtask scheduler, compare the effective cache key, and ignore results from superseded generations. `AbortSignal` is passed to adapters that support cancellation; generation checks are authoritative regardless.
- Rendering structure:

```
<div class="vsh" data-vsh-scheme data-vsh-theme ...attrs>
  [header slot]
  <pre class="vsh-pre" tabindex="0" aria-busy>
    <code class="vsh-code language-x">
      <span class="vsh-line"> <span class="vsh-gutter" aria-hidden>N</span> tokens... </span>
    </code>
  </pre>
  [footer slot]
</div>
```

  `preTag`/`codeTag` replace the elements. The gutter is `aria-hidden` and `user-select: none`, so copying the code selection excludes numbers. `lineProps`/`tokenProps` are attribute-returning function props for cases where a full slot is overkill.
- Slots receive stable payloads (`line`, `lineNumber`, `tokens`, `highlighted`, plus a `renderTokens()` helper) so a custom line can compose default token rendering without re-implementing it.
- Errors never throw out of render: the controller catches, warns once per failure signature, emits `error`, and keeps the last valid result or plain text.
- Deprecated aliases are normalized in a small props adapter. A per-application warning set lives in the injected context; without a plugin/provider a module-level set is used. Native props win over aliases.

### 4. Theme model and CSS custom properties

```ts
interface ThemeDefinition {
  name: string
  colorScheme: 'light' | 'dark'
  colors: { background: string; foreground: string; gutter: string; lineHighlight: string; selection: string; fontFamily?: string }
  tokens: Partial<Record<TokenType, { color?: string; fontStyle?: string; fontWeight?: string; textDecoration?: string }>>
}
```

- Themes are immutable data. `defineTheme` validates required fields, freezes the result, and returns it.
- Built-in themes are individual TS data modules (four initially: two light/dark pairs). The default theme is included in core so a zero-config block is styled and is also available through its own data entry. Every built-in theme can be passed as an object or registered by name in plugin/provider `themes`. No aggregate import is required, and no per-theme stylesheet is shipped.
- The theme scope computes two variable sets on a container: `--vsh-light-*` and `--vsh-dark-*` for base colors and every token type. The base stylesheet maps `--vsh-bg`/`--vsh-token-<type>-color` to the light set by default, the dark set under `[data-vsh-scheme="dark"]`, and the dark set under `[data-vsh-scheme="auto"]` inside `prefers-color-scheme: dark`.
- A provider renders a `display: contents` theme scope once per subtree; without a provider, each component acts as its own scope. This keeps SSR payloads small on pages with many blocks and lets one theme switch update all descendants.
- Theme switches only update the scope's style/attributes, so arbitrary theme changes are CSS-only. Invalid themes are caught during resolution, warned about, and ignored in favor of the last valid theme.
- No runtime `<style>` elements are created. Inline custom properties on the scope make SSR styled before JavaScript, avoid duplicate styles during hydration, and work with CSP style attributes. A CSP mode that avoids inline styles is an open question.
- The base stylesheet (`styles.css`) is required for layout and token mapping; it is not engine-specific and has no theme data. It is small and cached across apps.

**Alternatives considered:** per-theme CSS files and class-based theming (better CSP, but more build artifacts and a registry/discovery problem); runtime style injection (SSR duplication and CSP issues); inline token styles (larger markup, theme re-highlight).

### 5. Performance behavior

- **Cache:** provider/app-scoped LRU keyed by `engine.id`, engine options, language, and code. Theme is intentionally excluded. Default capacity 100 entries and a character budget (8 MiB) to avoid retaining huge snippets; entries larger than the budget are not cached. Cache ownership follows the provider/app and is dropped on disposal.
- **Deduplication:** a provider-scoped in-flight map shares identical requests; entries are removed on settle and failures are not cached.
- **Scheduling:** watchers coalesce into one microtask, compare cache keys, and apply only the latest generation. Previous output stays visible during refresh.
- **Deferral:** opt-in `defer` uses `IntersectionObserver` with a configurable root margin, starts work once, and disconnects. Without observer support or during SSR it is inert.
- **Virtualization:** `virtualized` is `false` by default, `true` or `'auto'` when enabled. Auto activates above 2000 lines. It requires a bounded `height`/`maxHeight` and `wrap=false`; otherwise it warns and disables. A ResizeObserver measures the viewport, scroll events are throttled with `requestAnimationFrame`, and top/bottom spacers keep a window of visible lines plus overscan (default 10) in the DOM. A numeric `lineHeight` (default 20px) makes the math deterministic. `copy()` always uses the full source, not the rendered window.
- **Rendering memoization:** token arrays are stable and frozen, so parent re-renders do not re-highlight. Per-line `v-memo` is considered only if profiling shows diff cost; it is not part of the initial contract.
- **Budgets:** size-limit enforces the spec budgets; a Rollup/esbuild graph assertion verifies the root entry has no static engine, grammar, or theme data. Deterministic tests assert engine invocation counts for cache hits, theme switches, parent re-renders, deferral, and scroll, rather than relying on wall-clock thresholds.

**Alternatives considered:** unbounded/global cache (leaks across SSR requests and apps); Content-Visibility instead of virtualization (does not bound DOM size); virtualizing wrapped lines (variable heights make windowing unreliable); rendering all lines for SSR and virtualizing only on the client (duplicate work and hydration complexity).

### 6. Build, package, docs, and tests

- Tooling: pnpm, Node >= 20.19, Vite library mode with multiple entries and `vite-plugin-dts`, Vitest + `@vue/test-utils`, `@vue/server-renderer`, Playwright, ESLint + typescript-eslint + eslint-plugin-vue, Prettier, size-limit, publint, and `@arethetypeswrong/cli`.
- Source layout:

```
src/
  index.ts                      # component, plugin, provider, composables, types, aliases
  core/                         # engine resolution, cache, scheduler, theme, virtualization, SSR
  component/                    # SyntaxHighlighter, SyntaxHighlighterProvider
  composables/                  # useSyntaxHighlighter
  engines/{shiki,highlightjs,prism}/
  themes/                       # default + built-in theme data
  styles/base.css
```

- Exports:

```
"."                          core
"./engines/shiki"            Shiki adapter
"./engines/highlightjs"      lowlight adapter
"./engines/prism"            refractor adapter
"./themes"                   optional aggregate theme data
"./themes/*"                 individual theme data
"./styles.css"               base stylesheet
"./package.json"
```

  Every JS entry has `types`/`import`/`default`. Deep imports into `dist/` internals are blocked. `sideEffects` is limited to CSS. `vue ^3.4` is the only required peer; engine peers are optional.
- Base CSS is copied into the package; Vite emits JS and declarations per entry. Built-in language maps are generated by scripts from the installed peer packages, so the repo does not hand-maintain hundreds of imports.
- Docs: VitePress with Getting Started, Engines, Themes, Performance, SSR, Migration, and API pages. The live demo uses a textarea (not a heavy editor), controls for engine/language/theme/line numbers/wrap, and a generated 50k-line stress page. The migration page maps React props/imports to native Vue props and notes that compatibility aliases are deprecated.
- Tests:
  - Unit: token model invariants, scope/class mapping, theme validation and variable generation, cache LRU and key behavior, scheduler/generation logic, alias normalization, virtualization math.
  - Component: props, slots, line numbers/highlighting/wrap, fallback/error, attrs/a11y, copy, provider inheritance.
  - SSR: sync engine output, async plain shell, hydration without mismatch or style duplication, no browser globals at import.
  - E2E (Playwright): docs demo, virtualization DOM bound and scrolling, clipboard without gutter, theme switching, axe accessibility checks.
  - Types/package: `vue-tsc`, type fixtures with bundler and Node16 resolution, size-limit, publint, attw, and a packed-tarball consumer fixture that builds an app and server-renders a block.
- CI runs the matrix on Node 20/22 with pnpm: lint, typecheck, unit/component/SSR tests, build, size/package checks, docs build, and Playwright.

## Risks / Trade-offs

- **Coarser colors than exact TextMate themes** → Document the semantic theme model; keep `TokenType` extensible; consider an exact-style mode later without changing the parser contract.
- **Dynamic default-engine chunks are emitted even for custom engines** → Keep them out of the static root graph, measure only initial entry size, document the behavior, and allow custom engines to avoid loading the chunks at runtime.
- **Shiki startup and grammar cost** → Fine-grained language imports, JavaScript RegExp engine, lazy load per language, plain-text shell while loading, preload guidance for SSR/SEO, and provider-level preloading.
- **Virtualization complexity and accessibility** → Constrain to fixed-height, non-wrapped lines; keep native scrolling and focus; assert DOM bounds and scroll correctness; provide full-source `copy()`; disable with a warning on unsupported configurations.
- **Inline custom properties and strict CSP** → Support style attributes first; document the constraint; evaluate a generated class-based theme mode as a follow-up.
- **Cache memory with large snippets** → Entry and character budgets, provider scoping, no global cross-request cache, and cache bypass for oversized or non-serializable inputs.
- **Adapter tokenization differences** → Contract tests assert line counts and concatenated text parity for a shared fixture matrix; semantic types may differ and are documented as adapter-dependent.
- **Hydration drift for async engines** → Start async work only on mount, render a deterministic plain shell on the server and first client pass, and test with `createSSRApp` hydration.
- **ESM-only distribution** → Clear engines/peer declarations and docs; modern Vite/Nuxt/Node SSR are the supported paths.
- **Compatibility aliases drifting from native behavior** → Keep the alias surface narrow, centralize mapping, warn once, and cover it with tests.

## Migration Plan

This is a greenfield package; there is no existing behavior or persisted data to migrate.

1. Scaffold the package, TypeScript, Vite build, lint, and test harness.
2. Implement and test the token model, cache/scheduler, theme system, and core component.
3. Implement adapters and generated language registries; verify text parity and fallback behavior.
4. Add SSR, virtualization, provider/composables, and compatibility aliases.
5. Build the docs/demo and migration guide; run accessibility and performance checks.
6. Validate the packed artifact in clean browser and SSR fixtures, then publish `1.0.0` (initially under a pre-release tag) and pin the verified version.

Rollback is version-based: republish/pin the last known-good version; there is no schema or data migration. The OpenSpec change can be archived once implemented and verified.

## Open Questions

- Should a future mode preserve exact engine theme colors per token while keeping theme-independent caching (for example by storing a theme/style key rather than inline colors)? This is deferred and does not affect the current token contract or tasks.
- Is a class-based/CSP-safe theme output needed in v1.0, or can inline custom properties remain the documented constraint?
- Should a worker-backed engine be provided as the first extension of the adapter contract, and what serialization format should it use?
- Should a Nuxt module be added after the core package proves its SSR path, or is a documented plugin enough?
