## 1. Public entry point

- [x] 1.1 Add `src/core/highlighter.ts` with `createHighlighter`, `Highlighter`, and `CreateHighlighterOptions`; verify `pnpm typecheck` passes.
- [x] 1.2 Create an owned context per call and reuse `createHighlightController` for highlighting; verify no path reads the module-level default context.
- [x] 1.3 Pass `engineOptions` to both the engine call and the cache key; verify a unit test covers the option reaching the engine.
- [x] 1.4 Implement `preload()` through the existing language preloading path and `dispose()` as an idempotent abort/cache/engine cleanup that also rejects pending or later `preload()` calls; verify both with unit tests.

## 2. Public surface and docs

- [x] 2.1 Export `createHighlighter` plus its types from `src/api.ts`; verify `pnpm build` and `pnpm check:api` with an updated snapshot note.
- [x] 2.2 Document the entry point, ownership model, SSR use, and disposal in `docs/api.md` and `docs/guide/api-examples.md`; verify `pnpm check:docs` passes.
- [x] 2.3 Add a per-request SSR example to `docs/guide/ssr.md`.

## 3. Tests and regression checks

- [x] 3.1 Cover sync and async engines, cache reuse, instance isolation, `engineOptions`, `preserveTrailingNewline`, and post-disposal rejection; verify `pnpm test:run` passes.
- [x] 3.2 Verify `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm check:api`, and `pnpm check:docs` pass.
- [x] 3.3 Verify component SSR markup and the existing export list are unchanged apart from the new additive export.
