# Themes

## Semantic, not engine-native

Themes are data. They map the 19 semantic token types to a color and optional font style/weight/decoration. They never contain engine-specific scope names or generated HTML. This is intentional:

- Changing a theme does not invoke the engine.
- The cache key is theme-independent.
- One theme works across Shiki, highlight.js/lowlight, and Prism.
- SSR markup contains no per-token inline styles.

The trade-off is category-level color fidelity rather than exact TextMate theme reproduction. See [Limitations](/guide/limitations).

## Built-in themes

| Import | Scheme | Notes |
| --- | --- | --- |
| `vue-syntax-highlighter/themes/vsh-light` | light | Default theme, also included in core |
| `vue-syntax-highlighter/themes/vsh-dark` | dark | Matched counterpart to `vsh-light` |
| `vue-syntax-highlighter/themes/vsh-paper` | light | Warm paper palette |
| `vue-syntax-highlighter/themes/vsh-midnight` | dark | Matched counterpart to `vsh-paper` |

```ts
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
```

Each theme has its own data entry. Importing one theme does not include the other three. An optional aggregate entry is available:

```ts
import { vshDark, vshLight, vshMidnight, vshPaper } from 'vue-syntax-highlighter/themes'
```

`vue-syntax-highlighter/themes/default` re-exports the default theme for convenience.

## Selecting a theme

```vue
<SyntaxHighlighter :code="code" language="ts" :theme="vshDark" />
```

Themes resolve from the component prop, then the nearest provider, then the plugin, then `vsh-light`. A theme can be passed as data or as a name registered in the provider/plugin `themeRegistry`.

## Light and dark pairs

```vue
<SyntaxHighlighter
  :code="code"
  language="ts"
  :themes="{ light: vshLight, dark: vshDark }"
  color-scheme="auto"
/>
```

- `light` always uses the light theme.
- `dark` always uses the dark theme.
- `auto` follows `prefers-color-scheme` in CSS.

Both variable sets are emitted on the scope, so switching scheme is a CSS-only operation. There is no engine call and no re-tokenization.

## Custom themes

```ts
import { defineTheme } from 'vue-syntax-highlighter'

export const myTheme = defineTheme({
  name: 'my-theme',
  colorScheme: 'dark',
  colors: {
    background: '#0b1020',
    foreground: '#e8ecf8',
    gutter: '#64748b',
    lineHighlight: '#151c31',
    selection: '#334e79',
  },
  tokens: {
    keyword: { color: '#f472b6', fontWeight: '600' },
    comment: { color: '#94a3b8', fontStyle: 'italic' },
    string: { color: '#86efac' },
  },
})
```

`defineTheme` validates required fields, rejects unknown token types and empty color strings with an actionable error, normalizes optional colors, and freezes the result. Invalid replacement themes leave the previous valid theme in effect and emit one warning.

## CSS custom properties

Every scope exposes both light and dark variables for base colors and every token type:

```
--vsh-light-bg
--vsh-light-fg
--vsh-light-gutter
--vsh-light-line-highlight
--vsh-light-selection
--vsh-light-font-family
--vsh-light-token-keyword-color
--vsh-light-token-keyword-font-style
--vsh-light-token-keyword-font-weight
--vsh-light-token-keyword-text-decoration
--vsh-dark-...
```

The stylesheet resolves the light/dark sets through `light-dark()` using the nearest scope's `color-scheme`. Application CSS can override the documented `--vsh-bg`, `--vsh-fg`, `--vsh-gutter`, `--vsh-line-highlight`, `--vsh-selection`, and `--vsh-font-family` aliases, or the per-token `--vsh-light-*`/`--vsh-dark-*` variables, without changing the theme or re-highlighting:

```css
.my-code-block {
  --vsh-light-bg: #fff8e1;
  --vsh-dark-bg: #10131a;
  --vsh-light-token-keyword-color: #b3552b;
}
```

Styles are scoped to `.vsh`/`.vsh-scope`; they do not leak into unrelated page elements.

## Provider theme scopes

A provider renders one `display: contents` scope for its subtree:

```vue
<SyntaxHighlighterProvider :themes="{ light: vshLight, dark: vshDark }" color-scheme="auto">
  <SyntaxHighlighter :code="one" language="ts" />
  <SyntaxHighlighter :code="two" language="ts" />
</SyntaxHighlighterProvider>
```

The provider computes both variable sets once. Descendants inherit them and do not repeat the payload. Nested providers override only their subtree.

## Server-rendered theme styles

Theme values are inline custom properties on the scope. The server sends styled markup before JavaScript runs. No runtime `<style>` element is created, so hydration cannot duplicate styles. Strict CSP deployments must allow inline `style` attributes; see [Limitations](/guide/limitations).

## Attribution

All four built-in palettes are authored for this library. They are not copies of third-party theme files. The semantic token vocabulary is inspired by common TextMate/Prism/highlight.js scope categories, but no third-party grammar or theme assets are redistributed.
