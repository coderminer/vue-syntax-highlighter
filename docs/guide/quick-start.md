# Quick Start

Get from an empty Vue component to a highlighted block without a plugin or global configuration.

## 1. Install

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

- `vue` is provided by your existing Vue application; it is not installed by this command.
- `shiki` is optional at the package level, but it is the default engine used by this page.
- If you choose another engine, install its peers instead and set the `engine` prop.

## 2. Add the CSS once

In `src/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import 'vue-syntax-highlighter/styles.css'

createApp(App).mount('#app')
```

For browsers without `light-dark()`, add the optional fallback too:

```ts
import 'vue-syntax-highlighter/styles/fallback.css'
```

It is wrapped in `@supports not`, so it is safe to import unconditionally.

## 3. Render a block

Replace `src/App.vue` with:

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const code = `import { computed, ref } from 'vue'

export function useCounter(start = 0) {
  const count = ref(start)
  const doubled = computed(() => count.value * 2)

  function increment(step = 1) {
    count.value += step
  }

  return { count, doubled, increment }
}`
</script>

<template>
  <main class="page">
    <h1>My first highlighted block</h1>
    <SyntaxHighlighter
      :code="code"
      language="typescript"
      line-numbers
      wrap
      aria-label="Counter utility source code"
    />
  </main>
</template>

<style scoped>
.page {
  max-width: 52rem;
  margin: 3rem auto;
  padding: 0 1rem;
}
</style>
```

That is the complete zero-configuration setup. You should see a light `vsh-light` block with Shiki highlighting, a line-number gutter, and wrapped long lines.

## What happens on first paint

Shiki is loaded as a lazy adapter. On first render the component shows plain source text with `aria-busy="true"`; after the adapter and language load, the tokenized result replaces it. This keeps the core bundle free of engines and grammars.

If you need highlighted server HTML, preload an engine object. See [Server Rendering](/guide/ssr).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Unstyled block | Import `vue-syntax-highlighter/styles.css` once in the app. |
| “Shiki engine is unavailable” | Install `shiki`, or set `engine` to an installed adapter. |
| Plain text only | Check the peer install, browser console, and the requested language. |
| Theme colors look wrong | Include both `styles.css` and, for older browsers, `styles/fallback.css`, or use `styles/complete.css` instead. |
| Line numbers cannot be selected? | The gutter is deliberately `aria-hidden` and excluded from copy output. |

## Next

- [Basic Usage](/guide/basic-usage) — control line numbers, ranges, themes, slots, and copying.
- [Advanced Usage](/guide/advanced-usage) — provider defaults, plugin, composables, engines, SSR, deferral, virtualization.
- [API](/api) — full props, slots, events, types, and exports.
