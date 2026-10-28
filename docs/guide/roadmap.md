# Roadmap

This page tracks the planned `1.1.x` and `2.0.0` work. It describes intended changes, not shipped behavior. The repository source is `1.1.1`; the latest npm release is `1.0.3` until the manual publish.

The plan has one hard rule:

> `1.1.x` must keep the default behavior of `1.0.3`. Anything that changes defaults, public contracts, or the rendered DOM structure waits for `2.0.0`.

## Version policy

| Version        | Scope                                        | Upgrade expectation                             |
| -------------- | -------------------------------------------- | ----------------------------------------------- |
| `1.1.0`        | Non-breaking fixes and additive entry points | `^1.0.3` users can upgrade without code changes |
| `1.1.x`        | Regression fixes for `1.1.0`                 | Patch-only; no behavior changes                 |
| `2.0.0`        | Default-behavior and architecture changes    | Read the migration guide before upgrading       |
| `2.0.0-beta.x` | Pre-release validation on the `next` tag     | Opt-in only; not installed by `latest`          |

## 1.1.0: non-breaking fixes

### Correctness fixes

| Area            | Change                                                             | Notes                                                                                          |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Diagnostics     | Restore development warnings in published builds                   | Remove the build-time `__VSH_DEV__` constant so `process.env.NODE_ENV` is evaluated at runtime |
| Themes          | Removing `theme` falls back to the provider/default theme          | Previously the previous theme stayed active                                                    |
| Themes          | A single dark theme emits `data-vsh-scheme="dark"`                 | Derive the mode from `theme.colorScheme` when no explicit scheme is set                        |
| Themes          | Register all four built-in themes by default                       | `theme="vsh-dark"`, `vsh-paper`, and `vsh-midnight` work without a separate registration step  |
| Styles          | Correct dark defaults in `styles/fallback.css`                     | The fallback currently uses light colors for dark schemes                                      |
| Engines         | Do not dispose caller-owned engine objects                         | Only engines created by the manager are disposed                                               |
| Deferral        | React to `defer` and `rootMargin` changes after mount              | Turning `defer` off starts highlighting immediately                                            |
| Accessibility   | Keep `aria-label` / `aria-labelledby` on the scrollable `pre` only | Avoid duplicating the accessible name on the root element                                      |
| Clipboard       | Clean up the temporary textarea in `finally`                       | Also retry the legacy path when the Clipboard API rejects                                      |
| API consistency | Normalize explicit `language` input in `highlight()`               | Match the component prop behavior                                                              |
| Documentation   | Fix slot examples and document per-engine language coverage        | Clarify that `renderTokens()` and `renderToken()` are functions                                |

### Additive capabilities

These are new APIs or entries. They do not change existing defaults.

| Addition                                  | Purpose                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue-syntax-highlighter/core`             | Core entry with no built-in engine imports. Use it with an explicit engine object when you do not want optional peers resolved at build time. |
| `vue-syntax-highlighter/full`             | Entry that keeps the current "all built-in engines available" behavior. In `1.1.0` it is equivalent to the default entry.                     |
| `scopeTag` on `SyntaxHighlighterProvider` | Opt in to a specific wrapper tag such as `div`, `li`, or `section`. When omitted, the provider keeps rendering the existing `div.vsh-scope`.  |

### Compatibility guardrails

The `1.1.0` release should add regression tests for all of these:

- `engine="shiki"` still works from the default entry when Shiki is installed.
- `SyntaxHighlighterProvider` still renders `div.vsh-scope` by default.
- `.vsh-scope[data-vsh-scheme]` CSS still applies.
- The default `lineHeight` is still `20`.
- `styles/fallback.css` can still be imported.
- `highlight()` keeps its current terminal-newline behavior.
- Every export and subpath from `1.0.3` still resolves.

## 2.0.0: breaking foundation

`2.0.0` contains only changes that cannot be made safely in a minor release.

| Change                                                       | Why it is breaking                                                       | Migration                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| The default entry no longer auto-loads built-in engines      | Existing `engine="shiki"` usage would fail without an adapter import     | Import `vue-syntax-highlighter/full`, or import an adapter and pass an engine object |
| The core entry has no default engine                         | A component without `engine` renders plain text and warns in development | Pass an engine, or use `full`                                                        |
| `SyntaxHighlighterProvider` is renderless by default         | The default DOM no longer contains `div.vsh-scope`                       | Set `scope-tag="div"` to restore the wrapper                                         |
| Theme variables are applied by each `SyntaxHighlighter` root | CSS that targeted the provider wrapper must move to `.vsh`               | Update selectors, or keep an explicit `scopeTag`                                     |
| `styles.css` includes the pre-`light-dark()` fallback        | The single stylesheet becomes larger                                     | Import only `styles.css`; `styles/fallback.css` becomes a compatibility no-op        |
| Default `lineHeight` becomes `21`                            | Visual metric change; virtualized and non-virtualized rendering align    | Pass `:line-height="20"` to keep the old value                                       |
| `highlight()` preserves a terminal newline                   | The returned line structure changes for callers that pass one            | Strip the final newline yourself if needed                                           |
| Cache keys include engine identity                           | Custom engines with the same `id` no longer share cached results         | Keep engine objects stable or implement `cacheKey`                                   |

### Migration examples

#### Engines

The quickest migration is the `full` entry:

```diff
- import { SyntaxHighlighter } from 'vue-syntax-highlighter'
+ import { SyntaxHighlighter } from 'vue-syntax-highlighter/full'
```

For a single-engine build, import the adapter explicitly:

```ts
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['typescript'] })
```

```vue
<SyntaxHighlighter :code="code" language="ts" :engine="engine" />
```

#### Provider scope

```diff
- <SyntaxHighlighterProvider theme="vsh-dark">
+ <SyntaxHighlighterProvider theme="vsh-dark" scope-tag="div">
```

#### Stylesheets

```diff
  import 'vue-syntax-highlighter/styles.css'
- import 'vue-syntax-highlighter/styles/fallback.css'
```

#### Line height

```diff
- <SyntaxHighlighter :code="code" language="ts" />
+ <SyntaxHighlighter :code="code" language="ts" :line-height="20" />
```

## Release sequence

```text
1.0.3        latest npm release until publish
1.1.0        previous source tag
1.1.1        current source release, latest after publish
1.1.x        regression fixes only
2.0.0-beta.1 next tag, migration testing
2.0.0        latest
```

1.1.1 release checks (completed):

- [x] Add regression tests for the fixes above.
- [x] Add an isolated consumer fixture that installs only `vue` and verifies the `core` entry does not resolve any engine peer.
- [x] Add a single-engine fixture that installs only `highlight.js` and `lowlight`.
- [x] Run the full `pnpm verify` gate.

Before `2.0.0` is published:

1. Branch from `1.1.1`.
2. Publish `2.0.0-beta.1` on the `next` tag.
3. Verify a Vite app, an SSR render, and a single-engine build against the packed tarball.
4. Publish `2.0.0` only after the migration guide and compatibility notes are in place.

## Tracking

- [x] Restore development warnings
- [x] Fix theme removal and single-theme scheme resolution
- [x] Register all built-in themes
- [x] Fix fallback dark defaults
- [x] Fix engine disposal ownership
- [x] Make `defer` and `rootMargin` reactive
- [x] Remove duplicate ARIA labels
- [x] Harden clipboard cleanup and fallback
- [x] Normalize `highlight()` language input
- [x] Add `core`, `full`, and `scopeTag` as additive APIs
- [x] Add isolated consumer and single-engine build fixtures
- [ ] Publish `1.1.1`
- [ ] Switch the default entry to `core`
- [ ] Make the provider renderless by default
- [ ] Align the default line height
- [ ] Merge the fallback stylesheet
- [ ] Publish `2.0.0`
