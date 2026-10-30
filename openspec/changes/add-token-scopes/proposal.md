## Why

Token output is intentionally coarse: `type` is one of nineteen stable categories, which is enough for themes but discards the engine's own classification. Consumers that build documentation search, semantic indexes, or grammar-aware tooling cannot distinguish `keyword.control` from `keyword.operator`, or recover the highlight.js/Prism class that produced a token without re-running the engine themselves.

Exposing the raw scopes is additive: the field is opt-in, absent by default, and never changes the rendered markup unless requested.

## What Changes

- Add optional `scopes` to `HighlightToken`.
- Add an opt-in `tokenScopes` engine option. It is passed through the existing `engineOptions` channel on the component, composable, provider, plugin, and `createHighlighter()`, so the existing cache key includes it automatically.
- Shiki returns its TextMate scope stack. highlight.js and Prism return their normalized class names without the `hljs-` / `token` prefix, using the same normalization as type mapping.
- The default token span renders `data-vsh-scope="a b"` only when scopes exist. Plain tokens, plain-text languages, and consumers that do not opt in emit no attribute.
- Validation accepts an absent `scopes` field or an array of strings and rejects anything else. Frozen results freeze the scope array.
- Cache character accounting includes scope names, so scoped results cannot silently exceed the character budget.

## Capabilities

### New Capabilities

- `token-scopes`: The opt-in scope field, per-adapter scope sources, rendering, validation, freezing, and the unchanged default markup.

### Modified Capabilities

None. `tokenScopes` defaults to `false`; existing results, markup, and cache keys are unchanged.
