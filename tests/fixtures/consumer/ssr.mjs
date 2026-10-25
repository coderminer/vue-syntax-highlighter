import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'

const engine = await createShikiEngine({ preload: ['javascript'] })
const html = await renderToString(
  createSSRApp({
    render: () =>
      h(SyntaxHighlighter, {
        code: 'const packed = true',
        language: 'javascript',
        engine,
        lineNumbers: true,
      }),
  }),
)

if (!html.includes('vsh-token-keyword')) {
  throw new Error('consumer SSR did not render highlighted tokens')
}
if (!html.includes('language-javascript')) {
  throw new Error('consumer SSR did not expose the language class')
}
if (!html.includes('data-vsh-theme="vsh-light"')) {
  throw new Error('consumer SSR did not render the theme scope')
}
console.log('consumer SSR ok')
