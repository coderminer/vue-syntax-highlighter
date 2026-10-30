## Why

Virtualized blocks render only the visible window, so consumers cannot jump to a search hit, a permalink line, or a review comment without reaching into the DOM and reimplementing the component's scroll math. Non-virtualized blocks have the same need but a different positioning strategy. Adding an exposed method gives both cases one supported entry point without changing props, defaults, or rendered markup.

## What Changes

- Add an exposed `scrollToLine(line, options?)` method to `SyntaxHighlighter`.
- Virtualized blocks position with `(line - startLine) * lineHeight`, which is exact because virtualization already requires a numeric line height.
- Non-virtualized blocks measure the rendered row, so `lineHeightMode="visual"` and font-relative rows are exact too.
- Out-of-range input, non-integer input, an unmounted instance, and SSR return `false` and do nothing.
- `options.behavior` accepts the standard `ScrollBehavior` values (`auto`, `smooth`); the default is `auto`.
- No prop, default, DOM shape, cache key, or existing exposed method changes.

## Capabilities

### New Capabilities

- `scroll-to-line`: The exposed navigation method, its exact-positioning rules in virtualized and non-virtualized modes, `startLine` handling, smooth scrolling, and the documented no-op results.

### Modified Capabilities

None. The method is additive; existing rendering and scrolling behavior is unchanged.
