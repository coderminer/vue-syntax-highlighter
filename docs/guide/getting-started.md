# Getting Started

`vue-syntax-highlighter` renders code as accessible text with semantic tokens. Engines tokenize; themes are CSS; themes never trigger re-highlighting.

If you want the shortest path, jump to [Quick Start](/guide/quick-start). This page covers installation and the choices behind it.

## Requirements

- Vue `>=3.4`
- Node `>=20.19` for SSR and build tooling
- An ESM bundler such as Vite, Nuxt, or a modern Node server renderer
- A modern browser. IE11 is not supported. See [Browser support](/guide/limitations#browser-support) for the fallback stylesheet and API requirements.

The package is ESM-only. CommonJS `require()` is not supported.

## Install

### Core package

::: code-group

```bash [npm]
npm install vue-syntax-highlighter
```

```bash [pnpm]
pnpm add vue-syntax-highlighter
```

```bash [yarn]
yarn add vue-syntax-highlighter
```

```bash [bun]
bun add vue-syntax-highlighter
```

:::

Vue is provided by your existing Vue application; do not install a second copy of Vue here.

### Install an engine

Shiki is the default. Install it for the zero-configuration path:

::: code-group

```bash [npm]
npm install shiki
```

```bash [pnpm]
pnpm add shiki
```

```bash [yarn]
yarn add shiki
```

```bash [bun]
bun add shiki
```

:::

Only the adapter you select needs its peers:

| Engine | Install |
| --- | --- |
| Shiki (default) | `shiki` |
| highlight.js / lowlight | `lowlight highlight.js` |
| Prism / refractor | `refractor` |

Engine peers are optional. Importing the core entry never requires them. Custom engine objects need no peer at all.

### Add the stylesheet

Import the base stylesheet once in your app entry or root component:

```ts
import 'vue-syntax-highlighter/styles.css'
```

The base stylesheet contains layout and token wiring, not theme data. For browsers that support CSS custom properties and `@supports` but not `light-dark()`, also import the no-op-in-modern-browsers fallback:

```ts
import 'vue-syntax-highlighter/styles.css'
import 'vue-syntax-highlighter/styles/fallback.css'
```

To load the base and fallback rules in one request, opt in to the prebuilt complete stylesheet instead:

```ts
import 'vue-syntax-highlighter/styles/complete.css'
```

`styles/complete.css` is larger than `styles.css`, so use it instead of the other two stylesheets, not in addition to them.

## Zero-configuration example

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const code = `const answer = 42
console.log(answer)`
</script>

<template>
  <SyntaxHighlighter :code="code" language="javascript" />
</template>
```

The default engine is Shiki, the default theme is `vsh-light`, and each block creates its own theme scope. No plugin or provider is required.

## Packages and imports

| Import | Purpose |
| --- | --- |
| `vue-syntax-highlighter` | Component, provider, plugin, composable, aliases, helpers |
| `vue-syntax-highlighter/engines/shiki` | Shiki adapter |
| `vue-syntax-highlighter/engines/highlightjs` | highlight.js/lowlight adapter |
| `vue-syntax-highlighter/engines/lowlight` | lowlight entry alias |
| `vue-syntax-highlighter/engines/prism` | Prism/refractor adapter |
| `vue-syntax-highlighter/themes` | All built-in themes |
| `vue-syntax-highlighter/themes/vsh-*` | One built-in theme's data |
| `vue-syntax-highlighter/styles.css` | Base stylesheet |
| `vue-syntax-highlighter/styles/fallback.css` | Pre-`light-dark()` fallback |
| `vue-syntax-highlighter/styles/complete.css` | Base and fallback rules in one opt-in stylesheet |

## Next steps

- [Quick Start](/guide/quick-start) — install to rendered block in one page.
- [Basic Usage](/guide/basic-usage) — line numbers, ranges, wrapping, themes, slots, copy.
- [Advanced Usage](/guide/advanced-usage) — provider, plugin, composables, engines, SSR, deferral, virtualization.
- [Engines](/guide/engines) and [Themes](/guide/themes) — detailed reference.
