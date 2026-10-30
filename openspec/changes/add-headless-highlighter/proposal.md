## Why

Highlighting is currently reachable without a template only through `useSyntaxHighlighter`, which calls `inject()` and `getCurrentInstance()`. Outside a component setup it falls back to the module-level default context, so build-time scripts and per-request SSR pipelines either share state across requests or must mount a throwaway component just to call the exposed `highlight()` method.

A first-class headless entry point gives those consumers an owned context and cache, without exposing the internal controller.

## What Changes

- Add `createHighlighter(options?)`, returning `{ highlight, preload, dispose }`.
- Every instance creates its own context, cache, and abort signal, so browser apps, build scripts, and SSR requests cannot leak state into each other.
- Accept the existing `HighlighterOptions` plus `engineOptions`, so custom engines receive the same per-request options as the component.
- `highlight()` reuses the existing controller pipeline: language normalization, cache key construction, in-flight deduplication, result validation, and `preserveTrailingNewline`.
- `preload()` loads the `languages` passed at creation through the selected engine.
- `dispose()` is idempotent, aborts in-flight work, clears the owned cache, and disposes loader-created engines.
- Do not export `HighlightController`; keep scheduling and lifecycle internal.
- Do not add a separate one-shot `highlightCode()` helper; `createHighlighter().highlight()` covers it.

## Capabilities

### New Capabilities

- `headless-highlighter`: Instance creation, owned context/cache isolation, engine and language resolution, preloading, disposal, and the guarantee that the component and composable behavior is unchanged.

### Modified Capabilities

None. This is a new entry point; no existing export, default, or DOM changes.
