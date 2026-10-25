---
layout: home
hero:
  name: Vue Syntax Highlighter
  text: Vue 3 code highlighting that stays fast
  tagline: Pluggable engines, semantic themes, deterministic SSR, and a simple API for everyday code blocks.
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: Live demo
      link: /demo
features:
  - title: Works out of the box
    details: Install the component and Shiki. One import gives you a themed, highlighted block with no plugin required.
  - title: Engine-independent tokens
    details: Shiki, highlight.js through lowlight, and Prism through refractor all produce the same semantic token model.
  - title: Theme changes are free
    details: Theme data is CSS custom properties. Switching light, dark, or an arbitrary theme never invokes the engine.
  - title: Built for SSR
    details: Sync/preloaded engines render highlighted HTML on the server. Async engines render a deterministic busy shell and upgrade after hydration.
---

<script setup>
import LiveDemo from './components/LiveDemo.vue'
</script>

## Install

::: code-group

```bash [npm]
npm install vue-syntax-highlighter shiki
```

```bash [pnpm]
pnpm add vue-syntax-highlighter shiki
```

```bash [yarn]
yarn add vue-syntax-highlighter shiki
```

```bash [bun]
bun add vue-syntax-highlighter shiki
```

:::

Import the stylesheet once:

```ts
import 'vue-syntax-highlighter/styles.css'
```

Then render:

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const code = 'const answer = 42'
</script>

<template>
  <SyntaxHighlighter :code="code" language="javascript" />
</template>
```

That is the whole zero-configuration path: Shiki is the default engine, `vsh-light` is the default theme, and no provider or plugin is required.

[Read the Quick Start](/guide/quick-start) · [Basic Usage](/guide/basic-usage) · [Advanced Usage](/guide/advanced-usage)

## Try it

<ClientOnly>
  <LiveDemo />
</ClientOnly>

## Semantic tokens, not engine-native styles

Coupling themes to engine output makes theme switches expensive and makes server rendering unpredictable. This library keeps tokenization independent from appearance:

```ts
// Engine output: text + semantic type only.
{ text: 'const', type: 'keyword' }

// Appearance: CSS custom properties selected by scheme.
// --vsh-light-token-keyword-color / --vsh-dark-token-keyword-color
```

That one decision makes the cache theme-independent, keeps SSR markup small, and lets every adapter share the same theme system.
