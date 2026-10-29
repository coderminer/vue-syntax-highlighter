import { createApp, h } from 'vue'
import { SyntaxHighlighter } from 'vue-syntax-highlighter/core'
import { createHighlightjsEngine } from 'vue-syntax-highlighter/engines/highlightjs'
import 'vue-syntax-highlighter/styles/complete.css'

const code = 'export const single = true'

async function start(): Promise<void> {
  const engine = await createHighlightjsEngine({ preload: ['typescript'] })
  createApp({
    render: () =>
      h(SyntaxHighlighter, {
        code,
        language: 'typescript',
        engine,
        'aria-label': 'Single engine fixture block',
        'data-testid': 'single-block',
      }),
  }).mount('#app')
}

void start()
