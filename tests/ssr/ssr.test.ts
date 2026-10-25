import { flushPromises } from '@vue/test-utils'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { createSSRApp, h } from 'vue'
import { SyntaxHighlighter } from '@/component/SyntaxHighlighter'
import { SyntaxHighlighterProvider } from '@/component/SyntaxHighlighterProvider'
import { splitSource } from '@/core/source'
import { vshDark } from '@/themes/vsh-dark'
import type { HighlightEngine, HighlightResult } from '@/types'

function makeResult(code: string, language = 'js'): HighlightResult {
  return {
    lines: splitSource(code).map((line) => ({
      tokens: line ? [{ text: line, type: 'keyword' as const }] : [],
    })),
    language,
  }
}

let counter = 0
function makeEngine(
  highlight: HighlightEngine['highlight'] = vi.fn((request) =>
    makeResult(request.code, request.language),
  ),
  capabilities: { sync?: boolean } = { sync: true },
): HighlightEngine & { highlight: Mock<HighlightEngine['highlight']> } {
  return {
    id: `ssr-engine-${++counter}`,
    capabilities,
    highlight: highlight as Mock<HighlightEngine['highlight']>,
  }
}

function captureWarnings(): { messages: string[]; restore: () => void } {
  const messages: string[] = []
  const warn = vi.spyOn(console, 'warn').mockImplementation((message?: unknown) => {
    messages.push(String(message))
  })
  const error = vi.spyOn(console, 'error').mockImplementation((message?: unknown) => {
    messages.push(String(message))
  })
  return {
    messages,
    restore: () => {
      warn.mockRestore()
      error.mockRestore()
    },
  }
}

describe('server rendering', () => {
  it('renders fully highlighted sync output with inline theme variables', async () => {
    const engine = makeEngine()
    const html = await renderToString(
      createSSRApp({
        render: () => h(SyntaxHighlighter, { code: 'const x = 1', language: 'js', engine }),
      }),
    )
    expect(html).toContain('vsh-token-keyword')
    expect(html).toContain('data-vsh-theme="vsh-light"')
    expect(html).toContain('--vsh-light-bg')
    expect(html).toContain('--vsh-dark-bg')
    expect(html).not.toContain('<style')
    expect(engine.highlight).toHaveBeenCalledTimes(1)
  })

  it('renders a deterministic plain busy shell for async engines without invoking them', async () => {
    const engine = makeEngine(vi.fn(), { sync: false })
    const app = createSSRApp({
      render: () =>
        h(SyntaxHighlighter, {
          code: 'line one\nline two',
          language: 'js',
          engine,
          theme: vshDark,
        }),
    })
    const html = await renderToString(app)
    expect(html).toContain('line one')
    expect(html).toContain('line two')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('vsh-token-keyword')
    expect(html).toContain('data-vsh-theme="vsh-dark"')
    expect(engine.highlight).not.toHaveBeenCalled()
  })

  it('does not start deferred engines during SSR', async () => {
    const engine = makeEngine()
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(SyntaxHighlighter, {
            code: 'deferred',
            language: 'js',
            engine,
            defer: true,
          }),
      }),
    )
    expect(html).toContain('deferred')
    expect(html).toContain('aria-busy="true"')
    expect(engine.highlight).not.toHaveBeenCalled()
  })

  it('isolates the default cache between application instances', async () => {
    const engine = makeEngine()
    const render = () => h(SyntaxHighlighter, { code: 'same source', language: 'js', engine })
    await renderToString(createSSRApp({ render }))
    await renderToString(createSSRApp({ render }))
    expect(engine.highlight).toHaveBeenCalledTimes(2)
  })

  it('shares the default cache within one application instance', async () => {
    const engine = makeEngine()
    const html = await renderToString(
      createSSRApp({
        render: () => [
          h(SyntaxHighlighter, { code: 'same source', language: 'js', engine }),
          h(SyntaxHighlighter, { code: 'same source', language: 'js', engine }),
        ],
      }),
    )
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(html).toContain('vsh-token-keyword')
  })

  it('emits one provider scope with theme variables for a subtree', async () => {
    const engine = makeEngine()
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(SyntaxHighlighterProvider, { theme: vshDark }, () => [
            h(SyntaxHighlighter, { code: 'a', engine }),
            h(SyntaxHighlighter, { code: 'b', engine }),
          ]),
      }),
    )
    const scopeMatches = html.match(/class="vsh-scope"/g) ?? []
    expect(scopeMatches).toHaveLength(1)
    expect(html).toContain('data-vsh-theme="vsh-dark"')
    expect(html).toContain('--vsh-dark-bg')
    expect(html).not.toContain('<style')
  })
})

describe('hydration', () => {
  it('hydrates sync output without mismatch warnings or duplicate styles', async () => {
    const engine = makeEngine()
    const render = () =>
      h(SyntaxHighlighter, { code: 'const x = 1', language: 'js', engine, lineNumbers: true })
    const html = await renderToString(createSSRApp({ render }))
    const warnings = captureWarnings()
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const app = createSSRApp({ render })
    app.mount(container)
    await flushPromises()
    expect(warnings.messages.filter((message) => /mismatch/i.test(message))).toHaveLength(0)
    expect(container.querySelectorAll('style')).toHaveLength(0)
    expect(container.querySelector('.vsh-token-keyword')).not.toBeNull()
    expect(container.querySelectorAll('.vsh-gutter')).toHaveLength(1)
    warnings.restore()
    app.unmount()
    container.remove()
  })

  it('hydrates an async shell and upgrades after mount', async () => {
    let resolve!: (value: HighlightResult) => void
    const engine = makeEngine(
      vi.fn(
        () =>
          new Promise<HighlightResult>((done) => {
            resolve = done
          }),
      ),
      { sync: false },
    )
    const render = () => h(SyntaxHighlighter, { code: 'async', language: 'js', engine })
    const html = await renderToString(createSSRApp({ render }))
    expect(html).toContain('async')
    const warnings = captureWarnings()
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const app = createSSRApp({ render })
    app.mount(container)
    await flushPromises()
    expect(warnings.messages.filter((message) => /mismatch/i.test(message))).toHaveLength(0)
    expect(container.querySelector('.vsh-token-keyword')).toBeNull()
    resolve(makeResult('async'))
    await flushPromises()
    expect(container.querySelector('.vsh-token-keyword')).not.toBeNull()
    expect(container.querySelectorAll('style')).toHaveLength(0)
    warnings.restore()
    app.unmount()
    container.remove()
  })
})
