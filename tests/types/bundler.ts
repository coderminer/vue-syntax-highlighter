import {
  DEFAULT_THEME,
  Light,
  LightAsync,
  PrismAsync,
  PrismLight,
  SyntaxHighlighter,
  SyntaxHighlighterProvider,
  VueSyntaxHighlighter,
  defineTheme,
  type ColorScheme,
  type EngineOptions,
  type HighlightEngine,
  type HighlightRequest,
  type HighlightResult,
  type LineSlotProps,
  type SyntaxHighlighterEmits,
  type SyntaxHighlighterExposed,
  type SyntaxHighlighterProps,
  type ThemeDefinition,
  type ThemeInput,
  type ThemePair,
  type TokenSlotProps,
  type TokenType,
  useSyntaxHighlighter,
} from 'vue-syntax-highlighter'
import { createShikiEngine, type ShikiEngine } from 'vue-syntax-highlighter/engines/shiki'
import { createHighlightjsEngine } from 'vue-syntax-highlighter/engines/highlightjs'
import { createLowlightEngine } from 'vue-syntax-highlighter/engines/lowlight'
import { createPrismEngine } from 'vue-syntax-highlighter/engines/prism'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
import { vshMidnight } from 'vue-syntax-highlighter/themes/vsh-midnight'
import { vshPaper } from 'vue-syntax-highlighter/themes/vsh-paper'
import { vshLight as defaultTheme } from 'vue-syntax-highlighter/themes/default'

const token: TokenType = 'keyword'
const themeInput: ThemeInput = {
  name: 'consumer',
  colorScheme: 'light',
  colors: { background: '#fff', foreground: '#111' },
  tokens: { keyword: { color: '#c00', fontWeight: '600' } },
}
const customTheme: ThemeDefinition = defineTheme(themeInput)
const pair: ThemePair = { light: vshLight, dark: vshDark }
const scheme: ColorScheme = 'auto'

const result: HighlightResult = {
  lines: [
    {
      tokens: [
        { text: 'const', type: token },
        { text: ' x', type: 'plain' },
      ],
    },
  ],
  language: 'js',
  meta: { engine: 'custom' },
}

const engine: HighlightEngine = {
  id: 'custom',
  capabilities: { sync: true },
  hasLanguage: (language: string) => language === 'js',
  loadLanguage: async () => undefined,
  highlight: (request: HighlightRequest, options?: EngineOptions) => ({
    ...result,
    language: request.language,
    meta: { options: options ?? {} },
  }),
}

const props: SyntaxHighlighterProps = {
  code: 'const x = 1',
  language: 'js',
  engine,
  engineOptions: { flavor: 'neutral' },
  theme: customTheme,
  themes: pair,
  colorScheme: scheme,
  lineNumbers: true,
  startLine: 1,
  highlightLines: [1, [2, 3]],
  wrap: false,
  virtualized: 'auto',
  virtualizeAfter: 2000,
  height: 400,
  maxHeight: '50vh',
  lineHeight: 20,
  overscan: 10,
  defer: false,
  rootMargin: '100px',
  preTag: 'pre',
  codeTag: 'code',
  lineProps: ({ lineNumber }) => ({ 'data-line-number': lineNumber }),
  tokenProps: ({ token: current }) => ({ 'data-token': current.type }),
  tabindex: 0,
  showLineNumbers: false,
  wrapLines: false,
  customStyle: { borderRadius: '8px' },
  codeTagProps: { 'data-code': true },
}

const lineSlot = ({ tokens, renderTokens, lineNumber }: LineSlotProps): unknown => ({
  tokens,
  rendered: renderTokens(),
  lineNumber,
})
const tokenSlot = ({ renderToken }: TokenSlotProps): unknown => renderToken()

const emit: SyntaxHighlighterEmits = (event, payload) => {
  if (event === 'error') {
    const error = payload as Error
    void error.message
  } else {
    const value = payload as HighlightResult
    void value.language
  }
}

function useExposed(exposed: SyntaxHighlighterExposed): Promise<boolean> {
  void exposed.refresh()
  void exposed.highlight({ code: 'x', language: 'js' })
  return exposed.copy()
}

const components = [
  SyntaxHighlighter,
  SyntaxHighlighterProvider,
  Light,
  LightAsync,
  PrismLight,
  PrismAsync,
] as const
const themes = [DEFAULT_THEME, vshLight, vshDark, vshPaper, vshMidnight, defaultTheme] as const

void [
  customTheme,
  result,
  engine,
  props,
  lineSlot,
  tokenSlot,
  emit,
  useExposed,
  components,
  themes,
  VueSyntaxHighlighter,
  useSyntaxHighlighter,
  createShikiEngine,
  createHighlightjsEngine,
  createLowlightEngine,
  createPrismEngine,
]
void (null as unknown as ShikiEngine)
