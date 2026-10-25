import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { SyntaxHighlighter } from '../dist/index.js'
import { createShikiEngine } from '../dist/engines/shiki.js'

const sizes = [1_000, 10_000]
const theme = (await import('../dist/themes/vsh-light.js')).default
const engine = await createShikiEngine({ preload: ['javascript'] })

function source(lines) {
  return Array.from(
    { length: lines },
    (_, index) => `const value${index + 1} = { id: ${index + 1}, active: ${index % 2 === 0} }`,
  ).join('\n')
}

const rows = []
for (const lines of sizes) {
  const code = source(lines)
  const started = performance.now()
  const result = await engine.highlight({ code, language: 'javascript' })
  const highlightMs = performance.now() - started

  const app = createSSRApp({
    render: () =>
      h(SyntaxHighlighter, {
        code,
        language: 'javascript',
        engine,
        theme,
        lineNumbers: true,
      }),
  })
  const renderStarted = performance.now()
  const html = await renderToString(app)
  const renderMs = performance.now() - renderStarted
  rows.push({
    lines,
    highlightMs,
    renderMs,
    outputKB: Math.round((html.length / 1024) * 10) / 10,
    tokenLines: result.lines.length,
  })
}

const header = '| Lines | Cold highlight | Initial SSR render | HTML size | Token lines |'
const divider = '| ---: | ---: | ---: | ---: | ---: |'
const body = rows
  .map(
    (row) =>
      `| ${row.lines} | ${row.highlightMs.toFixed(1)} ms | ${row.renderMs.toFixed(1)} ms | ${row.outputKB} kB | ${row.tokenLines} |`,
  )
  .join('\n')

const report = `# Benchmark report

Generated ${new Date().toISOString()} on Node ${process.version}.

This report is informational and does not gate CI. Timings vary by machine, grammar, and engine version.

${header}
${divider}
${body}

- Engine: Shiki (JavaScript RegExp engine), language preloaded.
- Theme: vsh-light.
- Rendering: one server-rendered SyntaxHighlighter with line numbers.
- Cold highlight measures a first highlight for that exact source.
`

writeFileSync('bench-report.md', report)
console.log(report)
