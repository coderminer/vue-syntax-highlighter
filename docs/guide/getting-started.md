# Getting Started

## Requirements

- Vue `>=3.4`
- Node `>=20.19` for SSR and build tooling
- An ESM bundler such as Vite, Nuxt, or a modern Node server renderer

The package is ESM-only. CommonJS `require()` is not supported.

## Install

```bash
pnpm add vue-syntax-highlighter vue
```

Install the engine you plan to use. Only the selected adapter needs its peer:

```bash
# Default engine
pnpm add shiki

# highlight.js adapter (lowlight is required by the adapter)
pnpm add lowlight highlight.js

# Prism adapter
pnpm add refractor
```

The engine peers are optional. Importing the core entry never requires them.

## Styles

Import the base stylesheet once. It contains layout rules and token class/variable wiring, not theme data.

```ts
import 'vue-syntax-highlighter/styles.css'
```

## Quick start

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import 'vue-syntax-highlighter/styles.css'

const code = `const answer = 42
console.log(answer)`
</script>

<template>
  <SyntaxHighlighter :code="code" language="javascript" />
</template>
```

The default engine is Shiki and the default theme is `vsh-light`. Without a provider each block renders its own `display: contents`-free theme scope with inline custom properties, so it is styled before JavaScript runs.

## Paired themes and scheme switching

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'

const themes = { light: vshLight, dark: vshDark }
</script>

<template>
  <SyntaxHighlighter
    :code="code"
    language="typescript"
    :themes="themes"
    color-scheme="auto"
  />
</template>
```

`auto` follows `prefers-color-scheme` in CSS. Toggling between `light`, `dark`, and `auto` never re-tokenizes the source.

## Provider for many blocks

A provider computes one theme scope for its subtree. Descendants inherit its variables and engine/cache defaults.

```vue
<script setup lang="ts">
import { SyntaxHighlighter, SyntaxHighlighterProvider } from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'

const component = { name: 'Thing' }
</script>

<template>
  <SyntaxHighlighterProvider
    engine="shiki"
    :theme="vshDark"
    :languages="['javascript', 'typescript']"
  >
    <SyntaxHighlighter :code="code" language="javascript" />
    <SyntaxHighlighter :code="code" language="typescript" />
  </SyntaxHighlighterProvider>
</template>
```

Provider defaults are scoped to the subtree; nested providers inherit unspecified values.

## Plugin

```ts
import { createApp } from 'vue'
import VueSyntaxHighlighter from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'

createApp(App)
  .use(VueSyntaxHighlighter, {
    engine: 'shiki',
    theme: vshDark,
    languages: ['javascript', 'typescript'],
  })
  .mount('#app')
```

The plugin registers `SyntaxHighlighter` globally and keeps defaults isolated per application.

## Composable

```ts
import { ref } from 'vue'
import { useSyntaxHighlighter } from 'vue-syntax-highlighter'

const code = ref('const value = 1')
const { lines, loading, error, refresh } = useSyntaxHighlighter({
  code,
  language: 'javascript',
})
```

The composable respects the nearest provider or plugin configuration and exposes reactive lines, loading/error state, and `refresh()`.

## Explicit engine imports

Built-in identifiers load their adapter lazily through the core. To preload an engine for synchronous SSR, import the adapter entry directly and pass the engine object:

```ts
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['javascript'] })
```

See [Engines](/guide/engines) and [Server Rendering](/guide/ssr) for the full behavior.
