# Migrating from react-syntax-highlighter

## Components

| React import | Vue usage |
| --- | --- |
| `import SyntaxHighlighter from 'react-syntax-highlighter'` | `import { SyntaxHighlighter } from 'vue-syntax-highlighter'` |
| `import { Light } from 'react-syntax-highlighter'` | `import { Light } from 'vue-syntax-highlighter'` (deprecated alias) |
| `import { LightAsync } from 'react-syntax-highlighter'` | `import { LightAsync } from 'vue-syntax-highlighter'` (deprecated alias) |
| `import { PrismLight } from 'react-syntax-highlighter'` | `import { PrismLight } from 'vue-syntax-highlighter'` (deprecated alias) |
| `import { PrismAsync } from 'react-syntax-highlighter'` | `import { PrismAsync } from 'vue-syntax-highlighter'` (deprecated alias) |

The aliases select the highlight.js or Prism adapter and warn once per alias per application. Prefer the native component:

```vue
<SyntaxHighlighter :code="code" language="ts" engine="highlightjs" />
<SyntaxHighlighter :code="code" language="ts" engine="prism" />
```

## Props

| React / legacy prop | Native Vue prop | Notes |
| --- | --- | --- |
| `children` or `code` | `code` | Text only; never HTML |
| `language` | `language` | Exposed as `language-<id>` |
| `style` (theme object) | `theme` / `themes` | Semantic theme data |
| `showLineNumbers` | `lineNumbers` | Deprecated alias; native wins |
| `wrapLines` | `wrap` | Deprecated alias; native wins |
| `lineNumberStyle` | CSS variables or `line-number` slot | Gutter is decorative |
| `lineProps` | `lineProps` | Attribute-returning function |
| `renderer` | `line` / `token` slots | Scoped slots with helpers |
| `customStyle` | `style` attribute | Deprecated alias; native wins |
| `codeTagProps` | `codeTag` + attributes | Deprecated alias |
| `PreTag` / `CodeTag` | `preTag` / `codeTag` | Tag or component |
| `useInlineStyles` | — | Themes are always CSS custom properties |
| `startingLineNumber` | `startLine` | Highlight ranges use source line numbers |
| `highlight` | `highlightLines` | Numbers or `[start, end]` tuples |

## Theme imports

React themes contain inline style objects per token. Here themes are semantic palettes:

```ts
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
```

```vue
<SyntaxHighlighter :code="code" language="ts" :theme="vshDark" />
```

Use `defineTheme` for custom palettes. The visual result is category-level, not exact TextMate reproduction.

## Render props to slots

React:

```tsx
<SyntaxHighlighter
  renderer={({ rows, stylesheet, useInlineStyles }) => ...}
/>
```

Vue:

```vue
<SyntaxHighlighter :code="code" language="ts">
  <template #line="{ lineNumber, highlighted, renderTokens }">
    <span :data-source-line="lineNumber">
      <span v-if="highlighted" class="my-marker">*</span>
      <component :is="renderTokens()" />
    </span>
  </template>
</SyntaxHighlighter>
```

Line wrappers, gutters, and accessibility markers are preserved around line slots.

## Events and refs

React callbacks become Vue events and exposed methods:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { SyntaxHighlighterExposed } from 'vue-syntax-highlighter'

const block = ref<SyntaxHighlighterExposed>()

async function copy(): Promise<void> {
  const ok = await block.value?.copy()
  console.log(ok ? 'copied' : 'clipboard unavailable')
}
</script>

<template>
  <SyntaxHighlighter
    ref="block"
    :code="code"
    language="ts"
    @highlighted="(result) => console.log(result.language)"
    @error="(error) => console.warn(error.message)"
  />
</template>
```

`refresh()`, `highlight({ code, language })`, `copy()`, and `getCopyPayload()` are exposed. `copy()` resolves `false` instead of throwing when clipboard access is denied.

## Behavioral differences

- Theme switching is CSS-only and never re-highlights.
- The cache key excludes the theme.
- Async engines render plain text until loaded; preload an engine object for sync SSR.
- Virtualization requires a bounded height and `wrap=false`.
- The package is ESM-only and requires Vue 3.4+.
- No exact engine-native theme styles or inline token styling mode is provided in v0.1.
