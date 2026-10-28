# Advanced Usage

This page covers application-level patterns. Detailed engine and theme contracts live on their dedicated pages.

## Provider defaults

Use a provider when several blocks share an engine, theme pair, preload list, cache, or deferral policy:

```vue
<script setup lang="ts">
import { SyntaxHighlighter, SyntaxHighlighterProvider } from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'

const themes = { light: vshLight, dark: vshDark }
</script>

<template>
  <SyntaxHighlighterProvider
    engine="shiki"
    :themes="themes"
    color-scheme="auto"
    :languages="['javascript', 'typescript', 'vue']"
    :cache-capacity="100"
    defer
    root-margin="200px 0px"
  >
    <SyntaxHighlighter :code="one" language="ts" />
    <SyntaxHighlighter :code="two" language="vue" />
  </SyntaxHighlighterProvider>
</template>
```

A provider renders one `display: contents` theme scope for its subtree. Descendants inherit unspecified values. Nested providers override only their subtree. Loader-owned engines and caches are disposed on provider unmount.

Use `scopeTag` when the provider must sit inside a specific content model, while keeping the default `div.vsh-scope` markup otherwise:

```vue
<SyntaxHighlighterProvider scope-tag="section" theme="vsh-dark">
  <SyntaxHighlighter :code="code" language="ts" />
</SyntaxHighlighterProvider>
```

`engines`, `themeRegistry`, `cache`, `cacheCapacity`, and `cacheMaxChars` are creation-time provider options. Changing them after mount is ignored with one development warning; recreate the provider scope to apply them. `defer`, `rootMargin`, themes, scheme, engine, and languages remain reactive. Turning `defer` off after mount starts highlighting immediately.

## Minimal build entry

The default entry keeps built-in engines available through lazy chunks. For a build that must not resolve optional engine peers, import `core` and pass an explicit engine object:

```ts
import { SyntaxHighlighter } from 'vue-syntax-highlighter/core'
import { createHighlightjsEngine } from 'vue-syntax-highlighter/engines/highlightjs'

const engine = await createHighlightjsEngine({ preload: ['typescript'] })
```

```vue
<SyntaxHighlighter :code="code" language="ts" :engine="engine" />
```

`vue-syntax-highlighter/full` is equivalent to the default entry in `1.1.x`.

## Plugin installation

Use the plugin for app-wide defaults and global component registration:

```ts
import { createApp } from 'vue'
import VueSyntaxHighlighter from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'

createApp(App)
  .use(VueSyntaxHighlighter, {
    engine: 'shiki',
    theme: vshDark,
    languages: ['javascript', 'typescript'],
    cacheCapacity: 100,
  })
  .mount('#app')
```

Each Vue application receives an isolated context. Do not install the plugin twice on the same app with different defaults.

## Composable

Highlight outside the default component while respecting the nearest provider or plugin:

```ts
import { ref } from 'vue'
import { useSyntaxHighlighter } from 'vue-syntax-highlighter'

const code = ref('const value = 1')
const { result, lines, loading, error, refresh } = useSyntaxHighlighter({
  code,
  language: 'javascript',
  engineOptions: { flavor: 'neutral' },
})
```

The returned refs update with the source. `refresh()` re-runs the current highlight. The composable never accesses the DOM and should be called during component setup.

## Built-in engine loading

Built-in engine strings are loaded as lazy chunks:

```vue
<SyntaxHighlighter :code="code" language="python" engine="highlightjs" />
<SyntaxHighlighter :code="code" language="python" engine="lowlight" />
<SyntaxHighlighter :code="code" language="python" engine="prism" />
```

Install only the peer required by the adapter you use. `lowlight` is the implementation behind the highlight.js adapter; `engine="lowlight"` is an addressable alias for it.

## Preloading and synchronous SSR

Create and preload an engine object when you need tokens in the first server render:

```ts
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({
  preload: ['javascript', 'typescript'],
})
```

```vue
<SyntaxHighlighter :code="code" language="typescript" :engine="engine" />
```

The adapter returns synchronously once the grammar is preloaded. A provider or plugin `languages` list preloads on mount, but an engine object is the deterministic path for server rendering. See [Server Rendering](/guide/ssr).

## Custom engines

A custom engine is an object implementing the public contract:

```ts
import type { HighlightEngine } from 'vue-syntax-highlighter'

const engine: HighlightEngine = {
  id: 'plain',
  capabilities: { sync: true },
  hasLanguage: (language) => language === 'text',
  loadLanguage: async () => undefined,
  highlight({ code, language }) {
    return {
      lines: code.split('\n').map((line) => ({
        tokens: line ? [{ text: line, type: 'plain' as const }] : [],
      })),
      language,
    }
  },
}
```

Register custom string identifiers through a provider or plugin:

```vue
<SyntaxHighlighterProvider
  engine="plain"
  :engines="{ plain: () => engine }"
>
  <SyntaxHighlighter :code="code" language="text" />
</SyntaxHighlighterProvider>
```

The library validates token shape and verifies that concatenated line text reproduces the source. Invalid output falls back to plain text and emits `error`.

## Custom themes and registry

```ts
import { defineTheme } from 'vue-syntax-highlighter'

const brand = defineTheme({
  name: 'brand',
  colorScheme: 'light',
  colors: {
    background: '#fbfbfd',
    foreground: '#1f2430',
    gutter: '#7b8494',
    lineHighlight: '#eef2f8',
    selection: '#cddfff',
  },
  tokens: {
    keyword: { color: '#6d28d9', fontWeight: '600' },
    comment: { color: '#7b8494', fontStyle: 'italic' },
  },
})
```

Pass it directly, or register it by name:

```vue
<SyntaxHighlighterProvider :theme-registry="{ brand }" theme="brand">
  <SyntaxHighlighter :code="code" language="ts" />
</SyntaxHighlighterProvider>
```

A light/dark pair:

```vue
<SyntaxHighlighter
  :code="code"
  language="ts"
  :themes="{ light: vshLight, dark: brand }"
  color-scheme="auto"
/>
```

Theme changes are CSS-only. They do not invoke the engine. See [Themes](/guide/themes).

## Deferral

```vue
<SyntaxHighlighter
  :code="code"
  language="ts"
  defer
  root-margin="200px 0px"
/>
```

The first render is plain text. The engine starts once when the block approaches the viewport, then the observer disconnects. Without `IntersectionObserver`, highlighting starts immediately after mount. Deferral is inert during SSR.

## Virtualization

```vue
<SyntaxHighlighter
  :code="longSource"
  language="ts"
  :virtualized="true"
  :height="400"
  :line-height="20"
  :overscan="10"
/>
```

Virtualization requires a bounded `height` or `maxHeight`, `wrap=false`, and a fixed numeric line height. It renders only the visible window plus overscan. `virtualized="auto"` activates above `virtualizeAfter` (default 2000 lines). Incompatible configurations warn and fall back to a normal block.

`copy()` still returns the complete source, not the rendered window. See [Performance](/guide/performance).

## Caching and deduplication

```vue
<SyntaxHighlighterProvider :cache-capacity="50" :cache-max-chars="4 * 1024 * 1024">
  <SyntaxHighlighter :code="code" language="ts" />
</SyntaxHighlighterProvider>
```

- Cache keys cover engine, options, language, and source; the theme is excluded.
- Identical concurrent requests share one engine promise.
- `cacheCapacity: 0` disables caching.
- A provider/application owns its cache and releases it on unmount.

## Next

- [Engines](/guide/engines) — adapter contracts and registration.
- [Themes](/guide/themes) — semantic palettes and CSS variables.
- [Performance](/guide/performance) — cache, deferral, virtualization.
- [Server Rendering](/guide/ssr) — hydration and request isolation.
- [API](/api) — complete typed surface.
