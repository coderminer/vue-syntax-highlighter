import { createApp, h } from 'vue'
import {
  SyntaxHighlighter,
  SyntaxHighlighterProvider,
} from 'vue-syntax-highlighter'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
import 'vue-syntax-highlighter/styles.css'

const code = `export function greet(name: string) {
  return \`hello \${name}\`
}`

const app = createApp({
  render: () =>
    h(SyntaxHighlighterProvider, { theme: vshLight, languages: ['typescript'] }, () =>
      h(SyntaxHighlighter, {
        code,
        language: 'typescript',
        lineNumbers: true,
        'aria-label': 'Consumer fixture code block',
        'data-testid': 'consumer-block',
      }),
    ),
})

app.mount('#app')
