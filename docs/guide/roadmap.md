# Roadmap

This page describes the additive-only release policy and the opt-in capabilities shipped in `1.2.0`. It describes intended and shipped behavior in the current minor line. The repository source is `1.2.0`; the latest npm release is `1.1.1` until the manual `1.2.0` publish.

The plan has one hard rule:

> A minor release may add opt-in APIs, but it must not change an existing default, public contract, rendered DOM structure, cache-key format, or terminal-newline behavior.

There is no scheduled major release. Ideas that would formerly have required a major release are delivered as opt-ins instead of default flips, so consumers are never forced to migrate.

## Version policy

| Version | Scope                                                              | Upgrade expectation                              |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `1.0.x` | Initial stable line                                                 | Existing users stay on their current minor        |
| `1.1.x` | Non-breaking fixes, `core`/`full` entries, and `scopeTag`           | `^1.0.3` users upgrade without code changes       |
| `1.2.0` | Opt-in APIs for provider scope, theme ownership, row metrics, newlines, engine identity, and styles | Additive only; imports and defaults stay unchanged |
| `1.x.y` | Future minors                                                       | Opt-in additions only; no breaking default flips  |

The project does not accept a future release that changes defaults under the same package name. New behavior is introduced behind an explicit prop, option, entry point, or stylesheet.

## 1.2.0: additive opt-ins

Every capability is off by default. Existing code keeps the `1.1.x` DOM, styling, cache keys, and newline handling.

| Capability | Opt-in | Default | What it enables |
| ---------- | ------ | ------- | --------------- |
| Renderless provider | `<SyntaxHighlighterProvider renderless>` | `false` | Removes the `div.vsh-scope` wrapper while keeping provider configuration |
| Block-owned theme | `themeScope="self"` | `inherit` | Emits theme variables and scheme attributes on the `.vsh` root even when a wrapper provider exists |
| Fixed row metrics | `lineHeightMode="fixed"` with `:line-height="21"` | `visual`, `20` | Sets numeric `min-height` and `line-height` on non-virtual rows without forcing `height` |
| Preserve terminal newline | `highlight({ preserveTrailingNewline: true })` or the composable default | `false` | Keeps one or more terminal line breaks in the returned result |
| Engine-identity cache | `cacheEngineIdentity` on a provider or the plugin | `false` | Partitions cached results for distinct engine objects that share an `id` |
| Complete stylesheet | `import 'vue-syntax-highlighter/styles/complete.css'` | Not imported | Ships base plus fallback rules in one file without changing `styles.css` |

The default and `full` entries still auto-load built-in engines. `core` remains the explicit-engine, peer-free entry. `styles.css`, `styles/fallback.css`, and their behavior are unchanged.

### Scope ownership

`renderless` and `themeScope="self"` compose without changing the default markup:

- A wrapper provider owns the theme scope by default.
- A renderless provider has no wrapper, so descendant blocks own the theme.
- `themeScope="self"` makes a block own the theme even inside a wrapper provider.
- A local `theme`, `themes`, or `colorScheme` prop already makes the block own the theme.

### Fixed line metrics

- `lineHeightMode="visual"` keeps the default font-relative rows and no inline row metrics.
- `lineHeightMode="fixed"` emits `min-height` and `line-height` on non-virtual rows.
- Virtual rows keep exact `height` with `min-height: 0` so spacer math and scroll position stay aligned.
- Invalid fixed metrics fall back to `20px` with one development warning; invalid modes fall back to `visual`.

### Compatibility guardrails

The `1.2.0` release keeps regression tests for all of these:

- `engine="shiki"` still works from the default and `full` entries when Shiki is installed.
- `SyntaxHighlighterProvider` still renders `div.vsh-scope` by default.
- `.vsh-scope[data-vsh-scheme]` and `.vsh[data-vsh-scheme]` CSS both still apply.
- The default `lineHeight` is still `20` with no inline row metrics.
- `styles.css` still excludes fallback rules, and `styles/fallback.css` still resolves.
- `highlight()` still strips one terminal newline by default.
- The default cache key format is byte-identical.
- Every export and subpath from `1.1.x` still resolves.

## Release sequence

```text
1.1.1    latest npm release until 1.2.0 publish
1.2.0    current source release, additive opt-ins, latest after manual publish
```

`1.2.0` release checks:

- [x] Add frozen-default regression tests for the wrapper, theme ownership, line height, newline handling, and cache key.
- [x] Add opt-in tests for every new prop, option, composable default, and stylesheet.
- [x] Add isolated consumer and single-engine build fixtures.
- [x] Run the full `pnpm verify` gate.
- [ ] Publish `1.2.0` manually after a successful tarball install; create the tag only after npm accepts the version.

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
- [x] Publish `1.1.1`
- [x] Add `renderless` without changing the default wrapper
- [x] Add `themeScope="self"` without changing provider ownership
- [x] Add `lineHeightMode="fixed"` without changing the default `20px` visual metric
- [x] Add `preserveTrailingNewline` without changing the default strip behavior
- [x] Add `cacheEngineIdentity` without changing the default cache key
- [x] Add `styles/complete.css` without changing `styles.css`
- [ ] Publish `1.2.0`
