import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

const src = fileURLToPath(new URL('../../src', import.meta.url))
const repository = process.env.GITHUB_REPOSITORY

export default defineConfig({
  title: 'Vue Syntax Highlighter',
  description:
    'A Vue 3 syntax highlighter with pluggable engines, semantic themes, and SSR-first performance.',
  // The Pages workflow sets this to /<repository>/ for project pages. A
  // user/org <owner>.github.io page builds with the default root path.
  base: process.env.DOCS_BASE || '/',
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
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Basic Usage', link: '/guide/basic-usage' },
          { text: 'Advanced Usage', link: '/guide/advanced-usage' },
          { text: 'Engines', link: '/guide/engines' },
          { text: 'Themes', link: '/guide/themes' },
          { text: 'Performance', link: '/guide/performance' },
          { text: 'Server Rendering', link: '/guide/ssr' },
          { text: 'Limitations', link: '/guide/limitations' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/api' },
          { text: 'API Examples', link: '/guide/api-examples' },
          { text: 'Live Demo', link: '/demo' },
        ],
      },
      {
        text: 'Project',
        items: [{ text: 'Roadmap', link: '/guide/roadmap' }],
      },
    ],
    socialLinks: repository
      ? [{ icon: 'github', link: `https://github.com/${repository}` }]
      : [],
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
