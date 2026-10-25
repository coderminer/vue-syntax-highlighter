# E2E Fixtures

Internal page used by Playwright to verify deferral with a block far below the viewport.

<script setup>
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const code = `const deferred = true
console.log('highlighted after intersection')`
</script>

<div style="height: 2400px" aria-hidden="true"></div>

<SyntaxHighlighter
  :code="code"
  language="javascript"
  engine="shiki"
  defer
  root-margin="200px 0px"
  aria-label="Deferred code block"
  data-testid="deferred-block"
/>
