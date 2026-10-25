# Basic Usage

## Code and language

`code` is a string and is never interpreted as HTML. `language` selects the engine grammar and is exposed as `language-<id>` on the `<code>` element.

```vue
<SyntaxHighlighter
  :code="source"
  language="typescript"
  engine="shiki"
/>
```

The default values are `code=""` and `language="text"`. Empty source is valid and renders an empty code block without warnings. One trailing newline, which editors often add to files, is ignored for rendering; `copy()` and `getCopyPayload()` still preserve it.

## Line numbers

Line numbers are off by default. Enable them with `lineNumbers`, and optionally choose the first source line:

```vue
<SyntaxHighlighter
  :code="source"
  language="ts"
  line-numbers
  :start-line="10"
/>
```

The gutter is decorative (`aria-hidden`) and is excluded from selection and from the copy payload. The width grows with the largest rendered line number. `startLine` accepts `0` when the source numbering really begins at zero.

## Highlight ranges

Use source line numbers, not zero-based indices:

```vue
<SyntaxHighlighter
  :code="source"
  language="ts"
  :line-numbers="true"
  :start-line="10"
  :highlight-lines="[11, [13, 15]]"
/>
```

Ranges outside the document are ignored. Highlight markers stay aligned when wrapping or virtualization is enabled.

## Wrap or horizontal scroll

```vue
<!-- Long lines remain intact and the pre scrolls horizontally. -->
<SyntaxHighlighter :code="source" language="ts" />

<!-- Long lines wrap while preserving indentation. -->
<SyntaxHighlighter :code="source" language="ts" wrap />
```

`wrap` is incompatible with virtualization because wrapped lines have variable heights.

## Themes

A single theme:

```vue
<script setup lang="ts">
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
</script>

<template>
  <SyntaxHighlighter :code="source" language="ts" :theme="vshDark" />
</template>
```

A light/dark pair that follows the system preference or an explicit mode:

```vue
<script setup lang="ts">
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'

const themes = { light: vshLight, dark: vshDark }
</script>

<template>
  <SyntaxHighlighter
    :code="source"
    language="ts"
    :themes="themes"
    color-scheme="auto"
  />
</template>
```

Changing `theme`, `themes`, or `colorScheme` never invokes the engine. See [Themes](/guide/themes) for custom themes and CSS variables.

## Slots

Slots are scoped and replace only their part of the default output.

```vue
<SyntaxHighlighter :code="source" language="ts" line-numbers>
  <template #header="{ language }">
    <div class="code-header">{{ language }}</div>
  </template>

  <template #line="{ lineNumber, highlighted, renderTokens }">
    <span :data-source-line="lineNumber" :class="{ selected: highlighted }">
      <component :is="renderTokens" />
    </span>
  </template>

  <template #line-number="{ lineNumber }">
    <strong>{{ lineNumber }}</strong>
  </template>

  <template #token="{ token, renderToken }">
    <span v-if="token.type === 'keyword'" class="my-keyword">
      <component :is="renderToken" />
    </span>
    <component :is="renderToken()" v-else />
  </template>

  <template #footer>
    <small>Rendered with semantic tokens</small>
  </template>
</SyntaxHighlighter>
```

Available content slots: `header`, `footer`, `loading`, `error`, `line`, `line-number`, `token`. The line wrapper and gutter are maintained by the component; use the `line-number` slot to customize the gutter.

## Custom tags and attributes

`preTag` and `codeTag` accept a tag name or a component:

```vue
<SyntaxHighlighter
  :code="source"
  language="ts"
  pre-tag="section"
  code-tag="div"
  class="my-code"
  data-owner="docs"
  aria-label="Example source"
/>
```

Unknown attributes fall through to the root `.vsh` element. Caller classes merge with the built-in classes.

`lineProps` and `tokenProps` return attribute objects for cases where a full slot is unnecessary:

```vue
<SyntaxHighlighter
  :code="source"
  language="ts"
  :line-props="({ lineNumber }) => ({ 'data-source-line': lineNumber })"
  :token-props="({ token }) => ({ 'data-token-type': token.type })"
/>
```

## Copying and exposed methods

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
  <button type="button" @click="copy">Copy source</button>
  <SyntaxHighlighter ref="block" :code="source" language="ts" line-numbers />
</template>
```

`copy()` and `getCopyPayload()` always use the complete source, never the rendered window or gutter. `copy()` resolves `false` when the Clipboard API is unavailable or denied.

## Events

```vue
<SyntaxHighlighter
  :code="source"
  language="ts"
  @highlighted="(result, context) => console.log(context.theme, result.language)"
  @error="(error) => console.warn(error.message)"
/>
```

`highlighted` fires after a result is applied and includes the active theme name and color scheme. `error` fires when highlighting fails; the component keeps plain text or the previous valid result.

## Next

- [Advanced Usage](/guide/advanced-usage) — provider/plugin/composable, custom engines, SSR, caching, deferral, and virtualization.
- [API](/api) — complete reference.
