# Limitations and trade-offs

## Semantic colors, not exact TextMate fidelity

Tokens carry one of 19 semantic types. Two different TextMate scopes that an engine theme might color differently can share a type and therefore a color. This is the deliberate cost of theme-independent caching, cross-engine themes, and CSS-only theme switching. Exact per-scope styles are a possible future extension; they are not part of v0.1.

## Adapter token boundaries differ

Adapters must agree on line count and concatenated line text, not on token segmentation. Shiki may split a line differently from Prism or lowlight. Semantic types can also differ for ambiguous constructs. Do not depend on a particular token count across engines.

## ESM-only

There is no CommonJS build. Consumers must use an ESM bundler or Node-based SSR with ESM. Vue is the only required peer; engines are optional peers and must be installed for the adapter you select.

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

## Compatibility aliases

`Light` and `LightAsync` (and the Prism equivalents) are compatibility shims for migration. They select the highlight.js or Prism adapter, but both names use the same lazy language-loading implementation; there is no separate synchronous grammar-registration build.

## Browser support

IE11 is not supported. The package ships ES2020 JavaScript; consumers targeting older engines must transpile and polyfill it.

The base stylesheet uses the `light-dark()` color function and the `color-scheme` property so nested light/dark/auto scopes override their ancestors correctly. The modern color path requires Chrome/Edge 123+, Firefox 120+, or Safari 17.5+.

For browsers that support CSS custom properties and `@supports` but not `light-dark()`, import the fallback after the base stylesheet. It is a no-op in modern browsers:

```ts
import 'vue-syntax-highlighter/styles.css'
import 'vue-syntax-highlighter/styles/fallback.css'
```

The fallback uses explicit light/dark/auto scheme aliases and targets roughly Chrome 80+, Firefox 78+, and Safari 14+; there is no formal browser matrix. The relevant runtime features are:

| Feature | Requirement |
| --- | --- |
| ES2020 syntax | Chrome 80+, Firefox 74+, Safari 13.1+ (or transpile the package) |
| CSS custom properties + `@supports` | Chrome 49+, Firefox 31+, Safari 9.1+ |
| `display: contents` | Chrome 65+, Firefox 37+, Safari 11.1+ |
| `ResizeObserver` | Chrome 64+, Firefox 69+, Safari 13.1+ (optional; fallback viewport is used) |
| `IntersectionObserver` | Chrome 51+, Firefox 55+, Safari 12.1+ (optional; deferral starts immediately) |
| `AbortController` | Chrome 66+, Firefox 57+, Safari 12.1+ |
| `queueMicrotask` | Chrome 71+, Firefox 69+, Safari 12.1+; a Promise-based fallback is included |
| Clipboard API | Chrome 66+, Firefox 63+, Safari 13.1+ (optional; `copy()` resolves `false`) |
| `:focus-visible` | Chrome 86+, Firefox 85+, Safari 15.4+ (focus styling only) |

## Inline theme variables and CSP

Theme scopes use inline `style` attributes. A strict Content Security Policy must permit style attributes for this region, or you must override colors from an external stylesheet. No runtime `<style>` injection is used.

## Browser globals

Core modules are importable without browser globals. Browser APIs (`IntersectionObserver`, `ResizeObserver`, `requestAnimationFrame`, `navigator.clipboard`) are accessed only inside mounted component logic and are feature-detected. Missing APIs degrade rather than throw.

## CommonJS and legacy browsers

No CommonJS output and no legacy browser transpilation beyond ES2020. Use a modern bundler and an evergreen browser or modern Node runtime.

## Language coverage

Generated registries cover a curated set of common web and server languages. Everything else must be registered manually through an adapter's `registerLanguage` or a custom load language hook. Unsupported languages produce one actionable error and plain-text fallback, then wait for the language or engine configuration to change before retrying automatically.

## Not included

- Vue 2
- Nuxt module or Vite plugin
- Web Worker offload
- Editor, autocomplete, or copy-button UI
- Exact theme catalog compatibility with `react-syntax-highlighter`
- A class-only CSP theme mode in v0.1
