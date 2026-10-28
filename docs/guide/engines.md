# Engines

## Entry points

| Entry | Built-in engines | Use |
| --- | --- | --- |
| `vue-syntax-highlighter` | Available through lazy chunks | Default zero-config path |
| `vue-syntax-highlighter/full` | Available through lazy chunks | Explicit alias for the default entry |
| `vue-syntax-highlighter/core` | None | Pass an engine object; optional peers are never referenced by the build |

`core` and `full` expose the same runtime API. The difference is that the `core` entry has no built-in engine loader, so a string engine such as `engine="shiki"` reports an actionable error. Use `core` with a preloaded engine object when a build must not resolve optional peers:

```ts
import { SyntaxHighlighter } from 'vue-syntax-highlighter/core'
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['typescript'] })
```

```vue
<SyntaxHighlighter :code="code" language="ts" :engine="engine" />
```

## Resolution order

The effective engine is:

1. The component `engine` prop.
2. The nearest provider `engine`.
3. Plugin defaults.
4. The built-in Shiki engine.

Built-in identifiers are `shiki`, `highlightjs`, `lowlight`, and `prism`. `lowlight` is an addressable alias for the highlight.js adapter, which is implemented with lowlight.

Built-in adapters are lazy dynamic chunks. Importing the core entry does not load any adapter, grammar, or non-default theme. If you pass a custom engine object, no built-in chunk is executed at runtime.

## Shiki (default)

```bash
pnpm add shiki
```

```vue
<SyntaxHighlighter :code="code" language="typescript" engine="shiki" />
```

Or create and preload an engine object for synchronous server rendering:

```ts
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['javascript', 'typescript'] })
```

The adapter uses Shiki's core highlighter with the JavaScript RegExp engine and a minimal neutral theme. The theme is internal only: adapters return semantic scopes and never colors. Language grammars are loaded per language from a generated curated registry.

Manually register a grammar:

```ts
const registration = await import('shiki/langs/elm.mjs')
engine.registerLanguage('elm', registration.default)
await engine.loadLanguage('elm')
```

## highlight.js through lowlight

```bash
pnpm add lowlight highlight.js
```

```vue
<SyntaxHighlighter :code="code" language="python" engine="highlightjs" />
```

The lowlight entry exposes the same implementation:

```ts
import { createLowlightEngine } from 'vue-syntax-highlighter/engines/lowlight'
const engine = await createLowlightEngine({ preload: ['python'] })
```

```vue
<SyntaxHighlighter :code="code" language="python" engine="lowlight" />
```

`hljs-*` classes are mapped to semantic token types. A grammar that has not been loaded returns a promise; after loading, highlighting is synchronous. Register a custom grammar with `engine.registerLanguage('my-lang', grammar)`.

## Prism through refractor

```bash
pnpm add refractor
```

```vue
<SyntaxHighlighter :code="code" language="rust" engine="prism" />
```

```ts
import { createPrismEngine } from 'vue-syntax-highlighter/engines/prism'
const engine = await createPrismEngine({ preload: ['rust'] })
```

Prism token classes are mapped to the same semantic model. Refractor's common grammars are available immediately; additional grammars are imported on demand.

Refractor exposes a process-global grammar registry. Custom `registerLanguage` calls are shared by all Prism engine instances in the same process, and `dispose()` does not unregister grammars. Grammar definitions are stateless, so rendered output remains correct, but strict per-application/per-request language isolation requires the Shiki or highlight.js/lowlight adapter, or a separate process/worker.

## Language coverage

Coverage differs by adapter. Use the `supportedLanguages` export from each adapter for the exact list, and `languageAliases` for short names:

```ts
import { supportedLanguages } from 'vue-syntax-highlighter/engines/shiki'
import { supportedLanguages as lowlightLanguages } from 'vue-syntax-highlighter/engines/highlightjs'
import { supportedLanguages as prismLanguages } from 'vue-syntax-highlighter/engines/prism'
```

| Language family | Shiki | highlight.js / lowlight | Prism / refractor |
| --- | --- | --- | --- |
| JavaScript, TypeScript | yes | yes | yes |
| JSX, TSX | yes | no | yes |
| Vue, Svelte, Astro, MDX | yes | no | no |
| HTML, XML, CSS, SCSS, Less | yes | yes | yes |
| Markdown, JSON, YAML, TOML | yes | partial | partial |
| Bash, SQL, Go, Rust, Python, Java, C/C++ | yes | yes | yes |
| Diff | yes | yes | yes |

Missing grammars render plain text with an `error` event and a development warning. Register a custom grammar with `engine.registerLanguage(name, grammar)` or choose an adapter with coverage for the language.

## Custom engines

The public contract is small:

```ts
import type { HighlightEngine } from 'vue-syntax-highlighter'

const engine: HighlightEngine = {
  id: 'my-engine',
  capabilities: { sync: true },
  hasLanguage: (language) => language === 'json',
  loadLanguage: async () => undefined,
  highlight({ code, language }) {
    return {
      lines: code.split('\n').map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language,
    }
  },
  dispose() {},
}
```

Requirements:

- Return ordered lines of `{ text, type }` tokens whose concatenated text reproduces the source exactly.
- Use one of the documented semantic token types.
- Never return HTML, colors, or inline styles.
- Never access the DOM during highlighting.

Register custom identifiers through a provider or plugin:

```vue
<SyntaxHighlighterProvider
  engine="json"
  :engines="{ json: () => myJsonEngine }"
>
  <SyntaxHighlighter :code="code" language="json" />
</SyntaxHighlighterProvider>
```

Unknown identifiers, invalid results, thrown adapters, and unavailable languages render plain text, emit `error`, and produce one development warning per distinct failure.

## Preloading and deduplication

Provider and plugin `languages` arrays request grammars ahead of rendering. Concurrent requests for the same grammar share one load. The component still retries if the engine or language selection changes.

```vue
<SyntaxHighlighterProvider :languages="['javascript', 'typescript', 'python']">
  ...
</SyntaxHighlighterProvider>
```

## Lifecycle

An engine owned by a provider or application is disposed when that owner unmounts. A shared engine survives an individual block unmounting. Results that resolve after disposal are ignored. Engine objects supplied directly by the caller are treated as caller-owned and are not disposed by the library.
