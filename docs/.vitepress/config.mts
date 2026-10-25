import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

const src = fileURLToPath(new URL('../../src', import.meta.url))

export default defineConfig({
  title: 'Vue Syntax Highlighter',
  description:
    'A Vue 3 syntax highlighter with pluggable engines, semantic themes, and SSR-first performance.',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Demo', link: '/demo' },
      { text: 'API', link: '/api' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Engines', link: '/guide/engines' },
          { text: 'Themes', link: '/guide/themes' },
          { text: 'Performance', link: '/guide/performance' },
          { text: 'Server Rendering', link: '/guide/ssr' },
          { text: 'Migration', link: '/guide/migration' },
          { text: 'Limitations', link: '/guide/limitations' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/api' },
          { text: 'Live Demo', link: '/demo' },
          { text: '50k-line Stress Demo', link: '/stress' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/' }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 vue-syntax-highlighter contributors',
    },
  },
  vite: {
    resolve: {
      alias: [
        { find: 'vue-syntax-highlighter/styles.css', replacement: `${src}/styles/base.css` },
        {
          find: /^vue-syntax-highlighter\/engines\/(.+)$/,
          replacement: `${src}/engines/$1.ts`,
        },
        {
          find: /^vue-syntax-highlighter\/themes\/(.+)$/,
          replacement: `${src}/themes/$1.ts`,
        },
        { find: 'vue-syntax-highlighter/themes', replacement: `${src}/themes.ts` },
        { find: 'vue-syntax-highlighter', replacement: `${src}/index.ts` },
      ],
    },
  },
})
