import {
  SyntaxHighlighter,
  defineTheme,
  type HighlightEngine,
  type HighlightRequest,
  type HighlightResult,
  type SyntaxHighlighterExposed,
  type SyntaxHighlighterProps,
  type ThemeDefinition,
} from 'vue-syntax-highlighter'
import { createHighlightjsEngine } from 'vue-syntax-highlighter/engines/highlightjs'
import { createLowlightEngine } from 'vue-syntax-highlighter/engines/lowlight'
import { createPrismEngine } from 'vue-syntax-highlighter/engines/prism'
import { createShikiEngine } from 'vue-syntax-highlighter/engines/shiki'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'

const theme: ThemeDefinition = defineTheme({
  name: 'node16',
  colorScheme: 'dark',
  colors: { background: '#000', foreground: '#fff' },
  tokens: { string: { color: '#0f0' } },
})

const engine: HighlightEngine = {
  id: 'node16-engine',
  highlight: (request: HighlightRequest) => {
    const result: HighlightResult = {
      lines: [{ tokens: [{ text: request.code, type: 'plain' }] }],
      language: request.language,
    }
    return result
  },
}

const props: SyntaxHighlighterProps = {
  code: 'const value = 1',
  language: 'js',
  engine,
  theme,
  themes: { light: vshLight, dark: vshDark },
  lineNumbers: true,
  highlightLines: [[1, 2]],
}

async function main(): Promise<void> {
  const shiki = await createShikiEngine({ preload: ['javascript'] })
  const highlightjs = await createHighlightjsEngine()
  const lowlight = await createLowlightEngine()
  const prism = await createPrismEngine()
  const exposed = null as unknown as SyntaxHighlighterExposed
  await exposed.refresh()
  void props
  void SyntaxHighlighter
  void shiki
  void highlightjs
  void lowlight
  void prism
}

void main()
