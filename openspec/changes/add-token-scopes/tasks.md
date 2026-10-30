## 1. Token model

- [x] 1.1 Add optional `readonly scopes?: readonly string[]` to `HighlightToken`; verify `pnpm typecheck` passes.
- [x] 1.2 Preserve and freeze `scopes` in `freezeResult`; verify a source test proves the array is frozen.
- [x] 1.3 Accept absent or string-array scopes in `isHighlightResult` and reject other shapes; verify malformed results throw.
- [x] 1.4 Include scope names in `countResultChars`; verify scoped results cannot bypass the cache character budget.

## 2. Engines

- [x] 2.1 Read `tokenScopes` from `EngineOptions` in the Shiki adapter and attach the TextMate scope stack; verify the scope list includes the grammar root scope.
- [x] 2.2 Read `tokenScopes` in the highlight.js adapter and attach normalized class names; verify `keyword` is present without `hljs-`.
- [x] 2.3 Read `tokenScopes` in the Prism adapter and attach normalized class names; verify `keyword` is present without `token`.
- [x] 2.4 Leave plain-text and fallback results scopeless; verify default adapter results have no `scopes`.

## 3. Rendering and docs

- [x] 3.1 Render `data-vsh-scope` only for non-empty scopes and keep it absent by default; verify component markup tests for both cases.
- [x] 3.2 Pass scopes through the `token` slot; verify the slot payload includes the same array.
- [x] 3.3 Document the option, adapter sources, markup, and cache partitioning in `docs/api.md` and `docs/guide/api-examples.md`; verify `pnpm check:docs` passes.

## 4. Regression checks

- [x] 4.1 Verify `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- [x] 4.2 Verify `pnpm check:api` reports the same export surface; `scopes` is a token field, not a new export.
- [x] 4.3 Verify `pnpm check:docs`, `pnpm check:core-size`, `pnpm check:entries`, `pnpm check:package`, and `pnpm check:consumer` pass.
