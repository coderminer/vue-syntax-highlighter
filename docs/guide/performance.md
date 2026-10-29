# Performance

## Bounded, provider-scoped cache

Results are cached by:

- engine identity
- serializable engine options
- language
- source text

The active theme is deliberately excluded. A second render with the same inputs is a cache hit and does not invoke the engine. The default capacity is 100 entries with an 8 MiB character budget. Oversized entries are not cached; entries larger than the remaining budget evict least-recently-used entries.

```vue
<SyntaxHighlighterProvider :cache-capacity="50" :cache-max-chars="4 * 1024 * 1024">
  ...
</SyntaxHighlighterProvider>
```

`cacheCapacity: 0` disables caching. Cache ownership follows the provider/application, so a request-scoped provider does not leak results between SSR requests.

## In-flight deduplication

Two blocks requesting the same uncached key in the same tick share one engine promise. Failures are not cached. Results are normalized and frozen before caching.

## Scheduling and stale results

Input changes coalesce into a microtask. The controller compares effective cache keys, increments a generation, and applies only the latest result. Previous output stays visible during a refresh. A result that settles after its generation or owner was disposed is ignored.

## Theme switches

Theme changes update the scope's CSS custom properties and scheme attribute. Token arrays are reused. The engine call count does not change, including switching between arbitrary themes outside a light/dark pair.

## Offscreen deferral

```vue
<SyntaxHighlighter :code="code" language="ts" defer root-margin="200px 0px" />
```

With `defer`, the first render is plain text and the engine is not invoked. An `IntersectionObserver` starts highlighting once when the block approaches the viewport, then disconnects. Without observer support or during SSR, deferral is inert: the component starts normally when mounted.

## Virtualization

```vue
<SyntaxHighlighter
  :code="veryLongCode"
  language="ts"
  :virtualized="true"
  :height="400"
  :line-height="20"
  :overscan="10"
/>
```

Virtualization keeps only the visible window plus overscan in the DOM. Requirements:

- A bounded `height` or `maxHeight`.
- `wrap` disabled. Variable-height wrapped lines cannot be windowed reliably.
- A fixed numeric `lineHeight` (default 20) for deterministic math.

Use `line-height-mode="fixed"` when you want the same numeric metric on ordinary non-virtual rows. It emits `min-height` and `line-height` without forcing `height`, so wrapped content can still grow. The default `visual` mode keeps font-relative rows and no inline metrics:

```vue
<SyntaxHighlighter
  :code="code"
  language="ts"
  :line-height="21"
  line-height-mode="fixed"
/>
```

If the configuration is incompatible, virtualization is disabled with one development warning and the block renders normally. `virtualized="auto"` activates above `virtualizeAfter` (default 2000 lines).

Scrolling updates the window using `requestAnimationFrame`; it never invokes the engine again. A `ResizeObserver` updates the measured viewport. Server rendering uses the deterministic height fallback so the same initial window is produced on both sides.

For example, a long document with a 400 px viewport, 20 px lines, and 10 overscan keeps at most 41 line elements in the DOM at once.

## Copying virtualized content

`copy()` and `getCopyPayload()` always use the complete source, never the rendered window or the gutter:

```ts
const block = ref<SyntaxHighlighterExposed>()
await block.value?.copy()
const fullSource = block.value?.getCopyPayload()
```

`copy()` resolves to `false` when the Clipboard API is unavailable or denied; it never throws.

## Rendering memoization

Token arrays and results are frozen. Parent re-renders with unchanged highlighting inputs do not invoke the engine or rebuild tokens. Per-line `v-memo` is intentionally not part of the initial contract.

## Deterministic tests and benchmarks

The regression suite uses engine spies and invocation counts, not wall-clock thresholds. `pnpm bench` reports cold highlight and initial render timings for 1k/10k-line inputs without gating CI.

```bash
pnpm bench
```
