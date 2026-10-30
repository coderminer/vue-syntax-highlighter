## 1. Exposed method

- [x] 1.1 Add `scrollToLine(line, options?)` to `SyntaxHighlighterExposed` with a documented `boolean` result and `ScrollBehavior` option; verify `pnpm typecheck` passes.
- [x] 1.2 Implement the virtualized offset from `(line - startLine) * lineHeight` with clamping; verify component tests cover `startLine`, clamping, and the exact offset.
- [x] 1.3 Implement the non-virtualized offset by measuring the rendered `[data-line]` row and excluding the scroll element's top border; verify a visual-mode test proves the offset comes from the row, not from a line-height estimate.
- [x] 1.4 Return `false` for non-integer or out-of-range input, an unmounted instance, and missing rows without throwing; verify each case.
- [x] 1.5 Forward `options.behavior` to `scrollTo`, defaulting to `auto`, and fall back to `scrollTop` when the scroll API is unavailable; verify both paths.

## 2. Documentation

- [x] 2.1 Document the method, its return value, `startLine` semantics, and smooth behavior in `docs/api.md`; verify `pnpm check:docs` passes.
- [x] 2.2 Add a copy-paste example to `docs/guide/api-examples.md` and a jump example to the virtualization section of `docs/guide/performance.md`.

## 3. Regression and release checks

- [x] 3.1 Verify `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- [x] 3.2 Verify `pnpm check:api` still reports the same runtime export surface; the method adds no new root export.
- [x] 3.3 Verify SSR output and the default rendered markup are byte-identical to the previous release.
