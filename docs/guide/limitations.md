# Limitations and trade-offs

## Semantic colors, not exact TextMate fidelity

Tokens carry one of 19 semantic types. Two different TextMate scopes that an engine theme might color differently can share a type and therefore a color. This is the deliberate cost of theme-independent caching, cross-engine themes, and CSS-only theme switching. Exact per-scope styles are a possible future extension; they are not part of v1.1.

## Adapter token boundaries differ

Adapters must agree on line count and concatenated line text, not on token segmentation. Shiki may split a line differently from Prism or lowlight. Semantic types can also differ for ambiguous constructs. Do not depend on a particular token count across engines.

## ESM-only

There is no CommonJS build. Consumers must use an ESM bundler or Node-based SSR with ESM. Vue is the only required peer; engines are optional peers and must be installed for the adapter you select.

## Development warnings

Warnings are runtime diagnostics, not a build-time guarantee. Vite folds `globalThis.process?.env?.NODE_ENV` for production builds; bundlers that only replace `process.env.NODE_ENV` may keep warnings enabled in production. The failure direction is safe: warnings never suppress highlighting or change rendered output.

## Browser support

The runtime targets modern ESM browsers with CSS custom properties. IE11 is not supported.

Themes use `light-dark()` to switch schemes without re-highlighting. Browsers that support custom properties and `@supports` but not `light-dark()` — for example Safari before 17.5, Firefox before 120, or Chrome before 123 — can import the optional fallback after the base stylesheet:

```ts
import 'vue-syntax-highlighter/styles.css'
import 'vue-syntax-highlighter/styles/fallback.css'
```

`fallback.css` is wrapped in `@supports not (color: light-dark(...))`, so it is a no-op in modern browsers and safe to import unconditionally. Explicit `color-scheme="light"` or `color-scheme="dark"` does not depend on `light-dark()`.

If you prefer one stylesheet request, import `vue-syntax-highlighter/styles/complete.css` instead. It contains the minified base followed by the minified fallback in the same `@supports` guard. It is larger than `styles.css`; do not import it together with the other two stylesheets.

Deferral needs `IntersectionObserver`, and virtualization measurement uses `ResizeObserver` when available. Both features degrade gracefully when the API is absent.

## Async first paint

Built-in string engines are lazy. Without a preloaded engine object, the first render on the server and during hydration is plain text marked busy. If highlighted server HTML is required for SEO or a no-flash first paint, preload an engine object as documented in [Server Rendering](/guide/ssr).

## Virtualization constraints

Virtualization requires:

- a bounded `height` or `maxHeight`
- `wrap=false`
- a fixed numeric `lineHeight` for deterministic math

Wrapped, variable-height lines are not virtualized. Unsupported combinations disable virtualization with a development warning. Line numbers, highlighted-line markers, and scroll behavior remain correct in virtualized mode.

## Offscreen deferral

Deferral uses `IntersectionObserver`. When it is unavailable, the component starts immediately after mount. Deferral is inert during SSR. It renders plain text until the block approaches the viewport.

## Prism language registry

`refractor` uses a process-global grammar registry. Prism engine instances share custom language registrations, including across SSR requests in the same process. The grammar data is stateless, so output is not corrupted, but registrations are not isolated per app/request and are not removed on `dispose()`. Use Shiki or highlight.js/lowlight if strict isolation is required.

## Planned fixes

Known correctness issues and the additive-only release plan are tracked in the [Roadmap](/guide/roadmap). The roadmap describes intended changes; it is not a statement that a fix is already available in the current release.


