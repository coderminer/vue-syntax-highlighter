<script setup lang="ts">
import { SyntaxHighlighter } from 'vue-syntax-highlighter'

const lineCount = 50_000
const code = Array.from(
  { length: lineCount },
  (_, index) =>
    `const item${index + 1} = { id: ${index + 1}, label: 'row ${index + 1}', active: ${
      index % 2 === 0
    } }`,
).join('\n')
</script>

<template>
  <section data-testid="stress-demo">
    <p>
      {{ lineCount.toLocaleString() }} lines, rendered with virtualization. Only the visible
      window plus overscan should exist in the DOM.
    </p>
    <SyntaxHighlighter
      :code="code"
      language="javascript"
      engine="shiki"
      :virtualized="true"
      :height="400"
      :line-height="20"
      :overscan="10"
      :line-numbers="true"
      aria-label="50 thousand line virtualized code block"
      data-testid="stress-block"
    />
  </section>
</template>
