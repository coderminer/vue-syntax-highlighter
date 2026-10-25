# E2E Fixtures

Internal page used by Playwright to verify deferral and nested scheme scopes.

<script setup>
import { SyntaxHighlighter, SyntaxHighlighterProvider } from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'

const code = `const deferred = true
console.log('highlighted after intersection')`
const schemeCode = 'const scheme = true'
</script>

<div style="height: 1800px" aria-hidden="true"></div>

<SyntaxHighlighter
  :code="code"
  language="javascript"
  engine="shiki"
  defer
  root-margin="200px 0px"
  aria-label="Deferred code block"
  data-testid="deferred-block"
/>

<SyntaxHighlighterProvider
  :themes="{ light: vshLight, dark: vshDark }"
  color-scheme="auto"
>
  <SyntaxHighlighter
    :code="schemeCode"
    language="javascript"
    engine="shiki"
    aria-label="Automatic scheme block"
    data-testid="auto-scheme-block"
  />
  <SyntaxHighlighterProvider :theme="vshLight" color-scheme="light">
    <SyntaxHighlighter
      :code="schemeCode"
      language="javascript"
      engine="shiki"
      aria-label="Forced light scheme block"
      data-testid="light-scheme-block"
    />
  </SyntaxHighlighterProvider>
</SyntaxHighlighterProvider>
