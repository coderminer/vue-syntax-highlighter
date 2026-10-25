## 1. Project Scaffold and Tooling

- [x] 1.1 Initialize `package.json` for `vue-syntax-highlighter` 0.1.0 with `"type": "module"`, Node >= 20.19, package scripts, `vue ^3.4` as the required peer, optional peers for `shiki ^4`, `lowlight ^3`, `highlight.js ^11`, and `refractor ^5`, `peerDependenciesMeta`, and `sideEffects` limited to CSS. Verify: `pnpm install` succeeds and `npm pkg get name version type peerDependencies sideEffects` reports the intended manifest.
- [x] 1.2 Add strict TypeScript configuration for the library, tests, docs, and type fixtures, including bundler and Node16 resolution fixtures. Verify: `pnpm typecheck` passes on an empty source tree and the fixtures are included in the project references.
- [x] 1.3 Configure ESLint (Vue + TypeScript), Prettier, Vitest, and Playwright with coverage and DOM/SSR environments. Verify: `pnpm lint` passes, `pnpm test --run` executes a smoke test, and `pnpm exec playwright --version` works.
- [x] 1.4 Configure Vite library mode with multiple entries, CSS handling, declaration emission, and stable output paths for core, adapters, themes, and styles. Verify: `pnpm build` produces the planned `dist` entries and declaration files for a placeholder entry.
- [x] 1.5 Add a GitHub Actions workflow running lint, typecheck, tests, build, size checks, package checks, docs build, and Playwright on Node 20 and 22. Verify: every workflow command exists as a local script and `actionlint` (or an equivalent YAML check) reports no errors.

## 2. Token Model, Cache, and Core Utilities

- [x] 2.1 Implement the public `TokenType`, `HighlightToken`, `HighlightLine`, and `HighlightResult` types plus source normalization (CRLF to LF, trailing newline as an empty line) and result validation. Verify: unit tests prove source round-trip, empty input, trailing-newline handling, and rejection of malformed results.
- [x] 2.2 Implement the ordered scope/class-to-token-type mapping used by all adapters, with a documented fallback to `plain`. Verify: table-driven unit tests cover Shiki scopes, `hljs-*` classes, Prism token classes, whitespace, and unknown input.
- [x] 2.3 Implement a stable cache-key builder using engine identity, serializable engine options, language, and code, with explicit handling for non-serializable options and theme exclusion. Verify: unit tests produce identical keys for reordered option objects and different keys for language/options changes, and confirm the theme never affects the key.
- [x] 2.4 Implement the provider-scoped LRU result cache with entry and character budgets plus an in-flight request map that deduplicates identical work. Verify: unit tests cover hit/miss, LRU eviction, character-budget eviction, oversized-entry bypass, shared promises, failure removal, and cache clearing.
- [x] 2.5 Implement the dev-warning helper with namespaced messages and once-per-signature behavior, plus the alias warning set used by plugin/provider contexts. Verify: unit tests assert one warning per signature and no warnings in production mode.

## 3. Theme System

- [x] 3.1 Implement `ThemeDefinition` and `defineTheme` with validation for name, scheme, required base colors, and optional token styles; freeze valid definitions. Verify: unit tests accept a valid theme, reject missing colors with an actionable error, and confirm immutability.
- [x] 3.2 Author four built-in themes as two matched light/dark pairs, include the default theme in core, and expose every theme through an individual data entry plus an optional aggregate entry. Verify: import tests resolve one theme without loading the others, and every palette satisfies the theme contract.
- [x] 3.3 Implement CSS custom-property generation for base colors and every token type, emitting light and dark variable sets plus scheme/theme attributes. Verify: unit tests compare generated variables and attributes for single themes, pairs, explicit schemes, and automatic schemes.
- [x] 3.4 Write the base stylesheet for layout, gutter, wrapping, focus, selection, token classes, scheme switching, and reduced content reflow. Verify: CSS builds into the package, class/variable names match the generator tests, and a visual fixture shows correct light/dark application.
- [x] 3.5 Implement the provider theme scope using `display: contents`, including inheritance, nesting, and cleanup. Verify: component tests show descendants inherit outer values, nested scopes override only their subtree, and unmount removes the scope.
- [x] 3.6 Add server-rendering coverage for theme scopes: inline custom properties, scheme attributes, no runtime `<style>` insertion, and no duplicate styles after hydration. Verify: SSR tests assert the serialized scope, a single style source, and no hydration warnings.

## 4. Highlight Engines

- [x] 4.1 Implement the public engine contract, result validation, built-in string resolution, precedence (component, provider, plugin, default Shiki), custom engine registries, and actionable unknown-engine errors. Verify: unit tests with fake engines cover precedence, unknown identifiers, invalid output, and plain-text fallback.
- [x] 4.2 Add scripts that generate curated language maps for Shiki, highlight.js, and refractor from the installed peer packages, including custom-language registration hooks. Verify: regenerating produces deterministic files that typecheck, and tests confirm an unlisted language can be registered manually.
- [x] 4.3 Implement the Shiki adapter with a cached core highlighter, minimal neutral theme, JavaScript RegExp engine, lazy per-language imports, alias handling, scoped-token explanation, and disposal. Verify: integration tests with real Shiki return correct lines/types after lazy load, synchronous results after preload, and clean disposal.
- [x] 4.4 Implement the highlight.js/lowlight adapter with lazy language imports, registration, class-to-type mapping, and sync-after-load behavior. Verify: integration tests cover a set of common languages, missing-language fallback, and disposal.
- [x] 4.5 Implement the Prism/refractor adapter with lazy language imports, registration, class-to-type mapping, and sync-after-load behavior. Verify: integration tests cover a set of common languages, missing-language fallback, and disposal.
- [x] 4.6 Add cross-adapter contract tests asserting identical line counts and concatenated line text for shared fixtures, plus missing-peer and thrown-adapter failure tests. Verify: the parity matrix passes for the documented language set and every failure path renders plain text with one actionable error.
- [x] 4.7 Implement shared-engine lifecycle behavior: provider/app ownership, disposal on owner unmount, no disposal on individual block unmount, and ignoring results after disposal. Verify: unit tests spy on `dispose` and assert the ownership rules and post-disposal behavior.

## 5. Component, Composable, and Integration API

- [x] 5.1 Implement prop normalization for the native API, including `code`, `language`, `engine`, `engineOptions`, theme props, line options, deferral/virtualization options, tag overrides, and `lineProps`/`tokenProps`. Verify: unit tests cover defaults, invalid values, and forwarding of unknown attributes.
- [x] 5.2 Implement the base render structure: wrapper, `pre > code`, language class, token spans, deterministic markup, `preTag`/`codeTag`, and empty-code behavior. Verify: component tests assert structure, text fidelity, class fallthrough, custom tags, and no warnings for empty input.
- [x] 5.3 Implement line numbering with start line and decorative gutter, highlighted lines/ranges, wrapping, and source-line reference semantics. Verify: component tests cover numbering, gutter accessibility, highlight ranges, out-of-range entries, wrapping, and copy text excluding the gutter.
- [x] 5.4 Implement scoped slots for header, footer, loading, error, line, line number, and token, including the `renderTokens()` helper and slot precedence. Verify: component tests exercise each slot, composition of default tokens, and unchanged line markers/gutter alignment.
- [x] 5.5 Implement loading, refresh, error, and fallback state handling with `aria-busy`, plain-text initial fallback, previous-result retention during refresh, and `highlighted`/`error` events. Verify: component tests simulate pending, resolved, rejected, and invalid results and assert emitted events and visible output.
- [x] 5.6 Implement accessibility behavior: focusable scrolling region, configurable tabindex/label, busy state, language exposure, and decorative gutter. Verify: component tests plus an axe scan report no violations for default, numbered, and wrapped variants.
- [x] 5.7 Implement the plugin (global registration and defaults), the provider (subtree overrides), the public `useSyntaxHighlighter` composable, reactivity, and exposed `refresh`, `highlight`, and `copy` methods. Verify: integration tests cover app isolation, nested providers, composable state updates, in-place prop changes, and non-throwing clipboard failure.
- [x] 5.8 Implement compatibility component aliases `Light`, `LightAsync`, `PrismLight`, and `PrismAsync`, plus deprecated prop aliases with one-time warnings and native-prop precedence. Verify: tests assert adapter selection, prop mapping, warning counts, and native precedence.
- [x] 5.9 Implement SSR and hydration behavior for sync/preloaded engines and async engines, including deterministic shells, post-mount upgrades, no browser globals at import, and no premature observers. Verify: `renderToString` and hydration tests cover both engine modes with zero mismatch warnings.
- [x] 5.10 Integrate the scheduler with the component: microtask coalescing, cache-key comparison, generation-based stale-result rejection, and previous-output retention. Verify: tests change inputs rapidly and assert one engine call with the latest values and no superseded output.

## 6. Performance Behavior

- [x] 6.1 Verify theme changes across built-in and custom themes never invoke the engine and update appearance in one render; include light/dark pair switching and invalid replacement themes. Verify: component tests assert unchanged engine call counts and preserved token output.
- [x] 6.2 Implement opt-in offscreen deferral with configurable root margin, one-shot observation, cleanup, SSR inertness, and missing-IntersectionObserver fallback. Verify: tests with a mocked observer confirm no engine call before intersection, one call after, and no repeat calls.
- [x] 6.3 Implement virtualization with explicit/automatic modes, bounded height requirement, fixed line height, overscan, ResizeObserver, rAF scroll handling, and wrap/incompatible-configuration warnings. Verify: unit tests cover window math and component tests assert correct line subsets while scrolling.
- [x] 6.4 Enforce the long-document DOM bound and full-source copy behavior for virtualized blocks. Verify: a 50,000-line fixture renders at most 100 line elements at once, scrolls to correct lines, and `copy()` returns all lines without gutter text.
- [x] 6.5 Add the deterministic performance regression suite covering cache hits, deduplication, parent re-renders, theme switches, deferral, and scrolling, using engine spies rather than wall-clock thresholds. Verify: the suite runs in CI and fails if any path adds an unexpected engine invocation.
- [x] 6.6 Add an optional benchmark command reporting cold highlight and initial render timings for 1k/10k-line inputs without gating CI. Verify: `pnpm bench` completes and writes a readable report.

## 7. Distribution and Package Validation

- [x] 7.1 Finalize the exports map for core, three adapters, theme data, individual themes, base styles, and `package.json`, with `types`/`import`/`default` targets and blocked deep imports. Verify: `pnpm build` plus a resolution test for every subpath succeeds and undeclared deep imports fail.
- [x] 7.2 Add size-limit budgets: core <= 12 kB gzip excluding Vue, each adapter <= 5 kB gzip excluding peers, base CSS <= 2 kB gzip, each theme data entry <= 2 kB gzip. Verify: `pnpm size` passes and a temporary budget reduction fails as expected.
- [x] 7.3 Add a static-graph assertion that the core entry contains no engine, grammar, theme data, or browser global, that one adapter does not include another, and that one theme does not include the others. Verify: the graph test passes and reports the expected module lists.
- [x] 7.4 Add publint, `@arethetypeswrong/cli`, and pack-content validation, including LICENSE/README presence and no unintended source or test files. Verify: `pnpm check:package` passes on the packed tarball.
- [x] 7.5 Build a clean consumer fixture that installs the packed tarball, renders a highlighted block in a Vite app, and server-renders a block with a preloaded engine. Verify: browser build and SSR script both pass without missing exports or peers.
- [x] 7.6 Add type-resolution fixtures for bundler and Node16 resolution that exercise props, slots, events, exposed methods, engine contracts, and theme definitions. Verify: `pnpm typecheck` reports no errors in either fixture and an intentionally invalid engine fails.

## 8. Documentation and Demo

- [x] 8.1 Scaffold the VitePress site with the base stylesheet, a landing page, and a live demo importing the local package. Verify: `pnpm docs:build` succeeds and the landing page renders a highlighted block.
- [x] 8.2 Write Getting Started, Engines, Themes, Performance, SSR, API, and Limitations pages, including installation for each adapter, preload guidance, semantic theme trade-offs, virtualization constraints, and CSP notes. Verify: the docs build has no broken internal links and every public export appears in the API page.
- [x] 8.3 Build the interactive demo with engine, language, theme pair, line-number, wrap, and defer controls plus a copy action. Verify: Playwright changes each control and observes the expected DOM/output changes.
- [x] 8.4 Build the 50k-line stress demo with virtualization and scrolling, and document the measured DOM bound. Verify: Playwright asserts the line-element bound and correct reveal after scrolling.
- [x] 8.5 Write the `react-syntax-highlighter` migration guide mapping component imports, theme usage, line props, render props, and aliases to the native Vue API. Verify: every mapping example is type-correct or covered by a docs test.
- [x] 8.6 Add Playwright coverage for the docs demo: clipboard without line numbers, theme switching, virtualization, deferral, and axe accessibility scans. Verify: `pnpm test:e2e` passes on the built docs.
- [x] 8.7 Update `README.md` with purpose, install, quick start, engine/theme imports, performance notes, compatibility aliases, and links to the docs; add theme/grammar attribution. Verify: README commands work from a clean checkout and attribution covers every third-party asset.

## 9. Final Verification and Release Readiness

- [x] 9.1 Run the full local gate: install, lint, typecheck, unit/component/SSR tests, build, size, package checks, docs build, and Playwright. Verify: all commands pass on Node 20 and Node 22.
- [x] 9.2 Review every scenario in `specs/` against the test suite and record any uncovered scenario as a blocking gap. Verify: a traceability list maps each requirement/scenario to a test or documented manual check, with no gaps.
- [x] 9.3 Perform a release dry run: bump/confirm 0.1.0, generate the changelog entry, pack the tarball, install it in the consumer fixture, and verify the docs deploy preview. Verify: `npm publish --dry-run` shows only intended files and the fixture renders in browser and SSR modes.
