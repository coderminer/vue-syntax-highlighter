import { createApp, h } from 'vue'
import { SyntaxHighlighter } from 'vue-syntax-highlighter/core'
import type { HighlightEngine } from 'vue-syntax-highlighter/core'
import 'vue-syntax-highlighter/styles.css'

const code = 'const core = true'

const engine: HighlightEngine = {
  id: 'fixture-core',
  capabilities: { sync: true },
  highlight: (request) => ({
    lines: request.code.split('\n').map((line) => ({
      tokens: line ? [{ text: line, type: 'plain' as const }] : [],
    })),
    language: request.language,
  }),
}

createApp({
  render: () =>
    h(SyntaxHighlighter, {
      code,
      language: 'text',
      engine,
      'aria-label': 'Core fixture block',
      'data-testid': 'core-block',
    }),
}).mount('#app')
