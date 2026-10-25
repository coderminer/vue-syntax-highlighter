# vue-syntax-highlighter

[![npm version](https://img.shields.io/npm/v/vue-syntax-highlighter.svg)](https://www.npmjs.com/package/vue-syntax-highlighter)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/coderminer/vue-syntax-highlighter/blob/main/LICENSE)
[![Vue 3](https://img.shields.io/badge/vue-3.x-42b883.svg)](https://vuejs.org)
[![ESM only](https://img.shields.io/badge/module-ESM--only-blue.svg)](#install)
[![Documentation](https://img.shields.io/badge/docs-vue--syntax--highlighter-brightgreen.svg)](https://coderminer.github.io/vue-syntax-highlighter/)

A Vue 3 syntax highlighter with pluggable engines, semantic themes, and SSR-first performance.

[Documentation](https://coderminer.github.io/vue-syntax-highlighter/) · [API](https://coderminer.github.io/vue-syntax-highlighter/api) · [API Examples](https://coderminer.github.io/vue-syntax-highlighter/guide/api-examples)

- **Vue-idiomatic API** — component props, scoped slots, events, exposed methods, a plugin, a provider, and composables.
- **Pluggable engines** — Shiki by default; highlight.js through lowlight, a lowlight entry, and Prism through refractor as optional adapters.
- **Theme-independent tokens** — engines return text plus semantic token types only. Changing a theme never invokes the engine.
- **Deterministic SSR** — synchronous or preloaded engines render highlighted HTML; async engines render a plain busy shell and upgrade after hydration.
- **Bounded performance** — provider-scoped LRU cache, request deduplication, theme-free cache keys, offscreen deferral, and virtualization for very long files.

## Install

```bash
# npm
npm install vue-syntax-highlighter

# pnpm
pnpm add vue-syntax-highlighter

# yarn
yarn add vue-syntax-highlighter

# bun
bun add vue-syntax-highlighter
```

Install the engine you plan to use:

```bash
npm install shiki                        # default
npm install lowlight highlight.js        # highlight.js / lowlight adapters
npm install refractor                    # Prism adapter
```

Vue `>=3.4` is the only required peer and is provided by your existing Vue application, so the install commands above intentionally omit it. Engine peers are optional. The package is ESM-only and targets Node `>=20.19` for SSR/build tooling. Browsers without `light-dark()` can import the optional fallback stylesheet after the base stylesheet.

```ts
import 'vue-syntax-highlighter/styles.css'
```

## Quick start

```vue
<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const code = `const answer = 42
console.log(answer)`
</script>

<template>
  <SyntaxHighlighter :code="code" language="javascript" line-numbers />
</template>
```

## Engines

```vue
<SyntaxHighlighter :code="code" language="python" engine="shiki" />
<SyntaxHighlighter :code="code" language="python" engine="highlightjs" />
<SyntaxHighlighter :code="code" language="python" engine="lowlight" />
<SyntaxHighlighter :code="code" language="python" engine="prism" />
```

Adapters are separate subpaths and lazy chunks. The core entry contains no static engine, grammar, or non-default theme data.

```ts
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'
import { createLowlightEngine } from 'vue-syntax-highlighter/engines/lowlight'
import { createHighlightjsEngine } from 'vue-syntax-highlighter/engines/highlightjs'
import { createPrismEngine } from 'vue-syntax-highlighter/engines/prism'
```

Preload a language to get synchronous highlighting (including SSR):

```ts
const engine = await createShikiEngine({ preload: ['typescript'] })
```

## Themes

```vue
<script setup lang="ts">
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
const themes = { light: vshLight, dark: vshDark }
</script>

<template>
  <SyntaxHighlighter :code="code" language="ts" :themes="themes" color-scheme="auto" />
</template>
```

Four built-in themes ship as individual data entries: `vsh-light` (default), `vsh-dark`, `vsh-paper`, and `vsh-midnight`. They form two matched light/dark pairs. `defineTheme` creates validated, frozen custom themes.

Theme switching updates CSS custom properties and the scheme attribute only. The token output and engine invocation count do not change.

## Performance

- Provider/application-scoped LRU cache (100 entries, 8 MiB character budget by default).
- Cache keys cover engine, options, language, and code, but never the theme.
- Concurrent identical requests share one engine call.
- `defer` waits for `IntersectionObserver` before loading.
- `virtualized` with `height`, fixed `lineHeight`, and `wrap=false` keeps only the visible window plus overscan in the DOM for long documents.
- `copy()` returns the complete source, not the virtualized window or gutter.

Run `pnpm bench` for cold highlight and initial SSR render timings on 1k/10k-line inputs.

## Exports

```
vue-syntax-highlighter
vue-syntax-highlighter/engines/shiki
vue-syntax-highlighter/engines/highlightjs
vue-syntax-highlighter/engines/lowlight
vue-syntax-highlighter/engines/prism
vue-syntax-highlighter/themes
vue-syntax-highlighter/themes/default
vue-syntax-highlighter/themes/vsh-light
vue-syntax-highlighter/themes/vsh-dark
vue-syntax-highlighter/themes/vsh-paper
vue-syntax-highlighter/themes/vsh-midnight
vue-syntax-highlighter/styles.css
vue-syntax-highlighter/styles/fallback.css
vue-syntax-highlighter/package.json
```

Deep imports into `dist/` are blocked.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test:run
pnpm lint
pnpm size
pnpm check:package
pnpm docs:build
pnpm test:e2e
```

See the full gate with `pnpm verify`.

### Publishing

Releases are published to npm by [`.github/workflows/release.yml`](https://github.com/coderminer/vue-syntax-highlighter/blob/main/.github/workflows/release.yml) when a `v*` tag is pushed. See [RELEASING.md](https://github.com/coderminer/vue-syntax-highlighter/blob/main/RELEASING.md) for the one-time npm and GitHub setup, the version/changelog checklist, provenance, and rollback steps.

### Deploying the docs

The VitePress site builds to `docs/.vitepress/dist`. A GitHub Actions workflow in `.github/workflows/docs.yml` publishes it to GitHub Pages on pushes to `main`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. Project pages use `/<repository>/` automatically; user/organization pages use `/`.

## Documentation

- [Getting Started](https://coderminer.github.io/vue-syntax-highlighter/guide/getting-started)
- [Quick Start](https://coderminer.github.io/vue-syntax-highlighter/guide/quick-start)
- [Basic Usage](https://coderminer.github.io/vue-syntax-highlighter/guide/basic-usage)
- [Advanced Usage](https://coderminer.github.io/vue-syntax-highlighter/guide/advanced-usage)
- [Engines](https://coderminer.github.io/vue-syntax-highlighter/guide/engines)
- [Themes](https://coderminer.github.io/vue-syntax-highlighter/guide/themes)
- [Performance](https://coderminer.github.io/vue-syntax-highlighter/guide/performance)
- [Server Rendering](https://coderminer.github.io/vue-syntax-highlighter/guide/ssr)
- [API](https://coderminer.github.io/vue-syntax-highlighter/api)
- [API Examples](https://coderminer.github.io/vue-syntax-highlighter/guide/api-examples)
- [Limitations](https://coderminer.github.io/vue-syntax-highlighter/guide/limitations)

## Attribution

The semantic token vocabulary is informed by common TextMate, Prism, and highlight.js scope categories. All four built-in palettes are authored for this library, not copied from third-party theme files. Runtime highlighting is provided by the optional peer packages Shiki, highlight.js/lowlight, and refractor, each under its own license. No grammar or theme assets are redistributed by this package.

## License

MIT
