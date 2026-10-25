---
layout: home
hero:
  name: Vue Syntax Highlighter
  text: Vue 3 code highlighting that stays fast
  tagline: Pluggable engines, semantic themes, deterministic SSR, and a bounded DOM for very long files.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Live demo
      link: /demo
features:
  - title: Engine-independent tokens
    details: Shiki, highlight.js through lowlight, and Prism through refractor all produce the same semantic token model.
  - title: Theme changes are free
    details: Theme data is CSS custom properties. Switching light, dark, or an arbitrary theme never invokes the engine.
  - title: Built for SSR
    details: Sync/preloaded engines render highlighted HTML on the server. Async engines render a deterministic busy shell and upgrade after hydration.
  - title: Long files stay bounded
    details: Virtualization keeps a 50,000-line block under 100 rendered line elements while copy() still returns the full source.
---

<script setup>
import LiveDemo from './components/LiveDemo.vue'
</script>

## Try it

<ClientOnly>
  <LiveDemo />
</ClientOnly>

## Why another highlighter?

`react-syntax-highlighter` established a useful API, but coupling themes to engine output makes theme switches expensive and makes server rendering unpredictable. This library keeps tokenization independent from appearance:

```ts
// Engine output: text + semantic type only.
{ text: 'const', type: 'keyword' }

// Appearance: CSS custom properties selected by scheme.
// --vsh-light-token-keyword-color / --vsh-dark-token-keyword-color
```

That one decision makes the cache theme-independent, keeps SSR markup small, and lets every adapter share the same theme system.
