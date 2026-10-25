# Server Rendering

## The rules

- The package is importable without `window`, `document`, or `navigator`.
- Sync or preloaded engines render fully highlighted markup during SSR.
- Async engines render a deterministic plain-text shell with `aria-busy="true"`.
- Async work starts only after hydration. The first client render matches the server.
- Theme variables are inline custom properties on the scope. No `<style>` is injected, so hydration cannot duplicate styles.
- Viewport observation starts on mount, never during module evaluation or SSR.

## Sync or preloaded engines

Pass an engine object that is already ready. This is the recommended path when SEO or no-flash styling matters:

```ts
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['javascript', 'typescript'] })
```

```vue
<SyntaxHighlighter :code="code" language="typescript" :engine="engine" />
```

A custom synchronous engine also renders during setup:

```ts
const engine = {
  id: 'my-sync-engine',
  capabilities: { sync: true },
  highlight: ({ code, language }) => ({
    lines: code.split('\n').map((line) => ({
      tokens: line ? [{ text: line, type: 'plain' as const }] : [],
    })),
    language,
  }),
}
```

## Async engines

The default `engine="shiki"` string resolves through a dynamic import. On the server it is not started, so the markup is plain text marked busy. After hydration the adapter loads, the language loads, and the result replaces the shell.

This is intentional: starting async work during SSR can resolve before hydration and produce a mismatch. If you need highlighted server HTML, preload the engine object as shown above.

## Theme markup

Every scope carries:

- `data-vsh-scheme="auto|light|dark"`
- `data-vsh-theme="<name>"` (or `"light/dark"` for a pair)
- `data-vsh-theme-light` / `data-vsh-theme-dark`
- `--vsh-light-*` / `--vsh-dark-*` custom properties

The base stylesheet is required. It is a normal CSS import, not a runtime style injection:

```ts
import 'vue-syntax-highlighter/styles.css'
```

## SSR example

```ts
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const app = createSSRApp({
  render: () => h(SyntaxHighlighter, { code, language: 'ts', engine }),
})

const html = await renderToString(app)
```

## Hydration guarantees

- Sync output: server tokens and the first client render are identical.
- Async output: server plain/busy and the first client render are identical; highlighting begins after mount.
- Local theme props are deterministic from the start; invalid themes fall back before rendering.
- No browser globals are touched at module evaluation.
- No `IntersectionObserver` is created unless `defer` is active and the component is mounted.

## CSP

Theme values use inline `style` attributes. If your CSP forbids inline styles, either allow style attributes for the code region or override colors through a stylesheet that targets `.vsh` CSS variables. A class-only CSP theme mode is an open design question; see [Limitations](/guide/limitations).
