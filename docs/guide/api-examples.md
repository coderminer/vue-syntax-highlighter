# API Examples

Every public runtime export and public type has an example here. The reference tables live in [API](/api).

## Component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import type {
  LineRenderInfo,
  LineSlotProps,
  SyntaxHighlighterExposed,
  SyntaxHighlighterProps,
  TokenSlotProps,
} from 'vue-syntax-highlighter'

const block = ref<SyntaxHighlighterExposed>()
const code = 'const answer = 42'

const props: SyntaxHighlighterProps = {
  code,
  language: 'typescript',
  lineNumbers: true,
  startLine: 1,
  highlightLines: [[1, 2]],
  wrap: false,
}

const lineProps = (info: LineRenderInfo) => ({ 'data-source-line': info.lineNumber })
const linePayload = (payload: LineSlotProps) => payload.renderTokens()
const tokenPayload = (payload: TokenSlotProps) => payload.renderToken()
</script>

<template>
  <button type="button" @click="block?.copy()">Copy</button>
  <SyntaxHighlighter ref="block" v-bind="props" :line-props="lineProps">
    <template #line="{ lineNumber, highlighted, renderTokens }">
      <span :data-source-line="lineNumber" :class="{ highlighted }">
        <component :is="renderTokens" />
      </span>
    </template>
    <template #token="{ token, renderToken }">
      <span :data-token-type="token.type">
        <component :is="renderToken" />
      </span>
    </template>
  </SyntaxHighlighter>
</template>
```

```ts
// Slot helper types
import type { LineSlotProps, TokenSlotProps } from 'vue-syntax-highlighter'
const inspectLine = (payload: LineSlotProps) => payload.tokens
const inspectToken = (payload: TokenSlotProps) => payload.token.type

void inspectLine
void inspectToken
```

### Events

```ts
import type {
  HighlightedEventContext,
  HighlightResult,
  SyntaxHighlighterEmits,
} from 'vue-syntax-highlighter'

const emit = ((
  event: 'highlighted' | 'error',
  payload: HighlightResult | Error,
  context?: HighlightedEventContext,
) => {
  if (event === 'highlighted') {
    console.log(payload as HighlightResult, context)
  } else {
    console.warn((payload as Error).message)
  }
}) as SyntaxHighlighterEmits
```

In a template, the callback signature is `(result, context)`:

```vue
<SyntaxHighlighter
  :code="code"
  language="ts"
  @highlighted="(result, context: HighlightedEventContext) => console.log(result, context)"
  @error="(error) => console.warn(error.message)"
/>
```

## Provider

```vue
<script setup lang="ts">
import { SyntaxHighlighter, SyntaxHighlighterProvider } from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'

const themes = { light: vshLight, dark: vshDark }
</script>

<template>
  <SyntaxHighlighterProvider
    engine="shiki"
    :themes="themes"
    color-scheme="auto"
    :languages="['javascript', 'typescript']"
    :cache-capacity="100"
    defer
  >
    <SyntaxHighlighter :code="one" language="ts" />
    <SyntaxHighlighter :code="two" language="ts" />
  </SyntaxHighlighterProvider>
</template>
```

## Plugin

```ts
import { createApp } from 'vue'
import VueSyntaxHighlighter from 'vue-syntax-highlighter'
import type {
  HighlighterOptions,
  VueSyntaxHighlighterOptions,
  VueSyntaxHighlighterPlugin,
} from 'vue-syntax-highlighter'

const options: VueSyntaxHighlighterOptions = {
  engine: 'shiki',
  languages: ['javascript', 'typescript'],
}
const baseOptions: HighlighterOptions = options
const plugin: VueSyntaxHighlighterPlugin = VueSyntaxHighlighter

createApp(App).use(plugin, baseOptions).mount('#app')
```

## Composable

```ts
import { ref } from 'vue'
import { useSyntaxHighlighter } from 'vue-syntax-highlighter'
import type {
  UseSyntaxHighlighterOptions,
  UseSyntaxHighlighterReturn,
} from 'vue-syntax-highlighter'

const code = ref('const value = 1')
const options: UseSyntaxHighlighterOptions = {
  code,
  language: 'typescript',
}
const state: UseSyntaxHighlighterReturn = useSyntaxHighlighter(options)

state.lines.value
state.loading.value
state.error.value
state.getCopyPayload()
await state.copy()
await state.refresh()
```

## Compatibility aliases

The aliases remain public for existing consumers. They render the same component with a preset engine:

```ts
import { Light, LightAsync, PrismLight, PrismAsync } from 'vue-syntax-highlighter'

const aliases = [Light, LightAsync, PrismLight, PrismAsync]
const prism = PrismLight
```

Prefer the native component:

```vue
<SyntaxHighlighter :code="code" language="ts" engine="prism" />
```

## Theme helpers

```ts
import {
  BUILTIN_THEME_REGISTRY,
  DEFAULT_THEME,
  DEFAULT_THEME_NAME,
  defineTheme,
  isColorScheme,
} from 'vue-syntax-highlighter'
import type {
  ColorScheme,
  ThemeColorsInput,
  ThemeDefinition,
  ThemeInput,
  ThemePair,
  TokenStyle,
  TokenType,
} from 'vue-syntax-highlighter'

const colors: ThemeColorsInput = {
  background: '#ffffff',
  foreground: '#24292f',
  gutter: '#6e7781',
  lineHighlight: '#eef2f8',
  selection: '#b6d7ff',
}
const keyword: TokenStyle = { color: '#cf222e', fontWeight: '600' }
const key: TokenType = 'keyword'
const input: ThemeInput = {
  name: 'brand',
  colorScheme: 'light',
  colors,
  tokens: { [key]: keyword },
}
const theme: ThemeDefinition = defineTheme(input)
const pair: ThemePair = { light: theme, dark: theme }
const scheme: ColorScheme = 'auto'
const validScheme = isColorScheme(scheme)

DEFAULT_THEME
DEFAULT_THEME_NAME
BUILTIN_THEME_REGISTRY['vsh-light']
```

## Cache helpers

```ts
import {
  buildCacheKey,
  ResultCache,
  stableStringify,
} from 'vue-syntax-highlighter'
import type {
  CacheKeyInput,
  HighlightCacheLike,
  HighlightResult,
  ResultCacheOptions,
} from 'vue-syntax-highlighter'

const cacheOptions: ResultCacheOptions = { capacity: 50, maxChars: 4 * 1024 * 1024 }
const cache: HighlightCacheLike = new ResultCache(cacheOptions)
const keyInput: CacheKeyInput = {
  engineId: 'shiki',
  language: 'typescript',
  code: 'const x = 1',
}
const key = buildCacheKey(keyInput)
const serialized = stableStringify({ language: 'typescript', options: {} })
const plainResult: HighlightResult = {
  lines: [{ tokens: [{ text: 'const x = 1', type: 'plain' }] }],
  language: 'typescript',
}

cache.request(key, () => plainResult)
cache.delete(key)
cache.clear()
void serialized
```

## Engine contract

```ts
import type {
  EngineOptions,
  HighlightEngine,
  HighlightLine,
  HighlightRequest,
  HighlightResult,
  HighlightToken,
} from 'vue-syntax-highlighter'

const token: HighlightToken = { text: 'const', type: 'keyword' }
const line: HighlightLine = { tokens: [token] }
const result: HighlightResult = { lines: [line], language: 'typescript' }
const request: HighlightRequest = {
  code: 'const x = 1',
  language: 'typescript',
  signal: new AbortController().signal,
}
const options: EngineOptions = { flavor: 'neutral' }

const engine: HighlightEngine = {
  id: 'custom',
  capabilities: { sync: true },
  hasLanguage: (language) => language === 'text',
  loadLanguage: async () => undefined,
  highlight: (input, engineOptions) => ({
    lines: input.code.split('\n').map((text) => ({
      tokens: text ? [{ text, type: 'plain' as const }] : [],
    })),
    language: input.language,
    meta: { options: engineOptions },
  }),
  dispose: () => undefined,
}

void request
void options
void result
```

## Engine resolution helpers

```ts
import {
  BUILTIN_ENGINE_IDS,
  EngineManager,
  HIGHLIGHTER_CONTEXT,
  createHighlighterContext,
  isHighlightEngine,
} from 'vue-syntax-highlighter'
import type {
  BuiltinEngineId,
  EngineChoice,
  EngineLoader,
  EngineRegistry,
  HighlighterContext,
} from 'vue-syntax-highlighter'
import { inject, provide } from 'vue'

const customEngine: HighlightEngine = {
  id: 'custom',
  highlight: () => ({
    lines: [{ tokens: [{ text: 'x', type: 'plain' }] }],
    language: 'text',
  }),
}
const id: BuiltinEngineId = 'shiki'
const choice: EngineChoice = id
const loader: EngineLoader = async () => customEngine
const registry: EngineRegistry = { custom: loader }
const builtins = BUILTIN_ENGINE_IDS

const manager = new EngineManager(registry)
const loaded = await manager.resolve('custom')
const valid = isHighlightEngine(loaded)
manager.dispose()

const context: HighlighterContext = createHighlighterContext({ engine: choice })
provide(HIGHLIGHTER_CONTEXT, context)
const injected = inject(HIGHLIGHTER_CONTEXT)
```

## Shiki adapter

```ts
import {
  createShikiEngine,
  languageAliases,
  languageLoaders,
  supportedLanguages,
} from 'vue-syntax-highlighter/engines/shiki'
import type {
  ShikiEngine,
  ShikiEngineOptions,
  ShikiLanguageLoader,
  ShikiLanguageRegistration,
} from 'vue-syntax-highlighter/engines/shiki'

const options: ShikiEngineOptions = { preload: ['typescript'] }
const engine: ShikiEngine = await createShikiEngine(options)
const registration: ShikiLanguageRegistration = {
  name: 'custom',
  scopeName: 'source.custom',
  patterns: [{ match: '.+', name: 'keyword' }],
}
const loader: ShikiLanguageLoader = async () => registration
engine.registerLanguage('custom', loader)
await engine.loadLanguage('custom')

languageLoaders.javascript
languageAliases.js
supportedLanguages.includes('typescript')
```

## highlight.js adapter

```ts
import {
  createHighlightjsEngine,
} from 'vue-syntax-highlighter/engines/highlightjs'
import type {
  HighlightjsEngine,
  HighlightjsEngineOptions,
  HighlightjsLanguageLoader,
  HighlightjsLanguageRegistration,
} from 'vue-syntax-highlighter/engines/highlightjs'

const options: HighlightjsEngineOptions = { preload: ['javascript'] }
const engine: HighlightjsEngine = await createHighlightjsEngine(options)
const grammar: HighlightjsLanguageRegistration = (hljs) => ({
  name: 'custom',
  keywords: 'const let',
  contains: [hljs.C_LINE_COMMENT_MODE],
})
const loader: HighlightjsLanguageLoader = async () => grammar
engine.registerLanguage('custom', loader)
```

## lowlight entry

```ts
import {
  createHighlightjsEngine,
  createLowlightEngine,
} from 'vue-syntax-highlighter/engines/lowlight'
import type {
  LowlightEngine,
  LowlightEngineOptions,
  LowlightLanguageLoader,
  LowlightLanguageRegistration,
} from 'vue-syntax-highlighter/engines/lowlight'

const options: LowlightEngineOptions = { preload: ['javascript'] }
const engine: LowlightEngine = await createLowlightEngine(options)
const grammar: LowlightLanguageRegistration = (hljs) => ({
  name: 'custom',
  contains: [hljs.C_LINE_COMMENT_MODE],
})
const loader: LowlightLanguageLoader = async () => grammar
engine.registerLanguage('custom', loader)

const equivalent = await createHighlightjsEngine(options)
```

## Prism adapter

```ts
import { createPrismEngine } from 'vue-syntax-highlighter/engines/prism'
import type {
  PrismEngine,
  PrismEngineOptions,
  PrismLanguageLoader,
  PrismLanguageRegistration,
} from 'vue-syntax-highlighter/engines/prism'

const options: PrismEngineOptions = { preload: ['rust'] }
const engine: PrismEngine = await createPrismEngine(options)
const grammar: PrismLanguageRegistration = {
  name: 'custom',
  displayName: 'custom',
  patterns: [],
}
const loader: PrismLanguageLoader = async () => grammar
engine.registerLanguage('custom', loader)
```

Refractor uses a process-global grammar registry; custom registrations are shared across Prism engine instances and are not removed by `dispose()`. See [Engines](/guide/engines#prism-through-refractor).

## Theme data entries

```ts
import vshLightDefault, { vshLight } from 'vue-syntax-highlighter/themes/default'
import { vshDark, vshMidnight, vshPaper } from 'vue-syntax-highlighter/themes'
import { vshLight as lightEntry } from 'vue-syntax-highlighter/themes/vsh-light'
import { vshDark as darkEntry } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshPaper as paperEntry } from 'vue-syntax-highlighter/themes/vsh-paper'
import { vshMidnight as midnightEntry } from 'vue-syntax-highlighter/themes/vsh-midnight'

void [
  vshLightDefault,
  vshLight,
  vshDark,
  vshMidnight,
  vshPaper,
  lightEntry,
  darkEntry,
  paperEntry,
  midnightEntry,
]
```

## Styles

```ts
import 'vue-syntax-highlighter/styles.css'
import 'vue-syntax-highlighter/styles/fallback.css'
```

`fallback.css` is optional and is a no-op in browsers with `light-dark()`.

## Package metadata

```ts
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('vue-syntax-highlighter/package.json')
console.log(pkg.version)
```

## Theme aliases and slots

- `Light`, `LightAsync`, `PrismLight`, and `PrismAsync` are shown in [Compatibility aliases](#compatibility-aliases).
- `LineRenderInfo`, `LineSlotProps`, and `TokenSlotProps` are shown in [Component](#component).
- `SyntaxHighlighterEmits`, `SyntaxHighlighterExposed`, and `HighlightedEventContext` are shown in [Component](#component).
- `HighlightCacheLike` and cache option types are shown in [Cache helpers](#cache-helpers).
- `EngineChoice`, `EngineLoader`, `EngineRegistry`, `BuiltinEngineId`, and `HighlighterContext` are shown in [Engine resolution helpers](#engine-resolution-helpers).
- `ThemeColorsInput`, `ThemeDefinition`, `ThemeInput`, `ThemePair`, `TokenStyle`, `TokenType`, and `ColorScheme` are shown in [Theme helpers](#theme-helpers).
