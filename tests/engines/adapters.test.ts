import { afterEach, describe, expect, it } from 'vitest'
import { createShikiEngine, type ShikiEngine } from '@/engines/shiki'
import { createHighlightjsEngine, type HighlightjsEngine } from '@/engines/highlightjs'
import { createLowlightEngine } from '@/engines/lowlight'
import { createPrismEngine, type PrismEngine } from '@/engines/prism'
import { createMissingEngineError } from '@/core/engine'
import { normalizeSource, resultToSource, splitSource } from '@/core/source'
import type { HighlightResult } from '@/types'

const CODE = 'const value = 1\n// comment\nconsole.log("hi")\n'

async function text(result: HighlightResult | Promise<HighlightResult>): Promise<string> {
  return resultToSource(await result)
}

const dispose: (() => void)[] = []
afterEach(() => {
  for (const fn of dispose.splice(0)) fn()
})

describe('Shiki adapter', () => {
  it('returns synchronous results after preload', async () => {
    const engine = await createShikiEngine({ preload: ['javascript'] })
    dispose.push(() => engine.dispose?.())
    const result = engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(result).not.toBeInstanceOf(Promise)
    expect(resultToSource(await result)).toBe('const x = 1')
  })

  it('loads a language lazily and then returns synchronously', async () => {
    const engine = await createShikiEngine()
    dispose.push(() => engine.dispose?.())
    expect(engine.hasLanguage('javascript')).toBe(false)
    const pending = engine.highlight({ code: CODE, language: 'javascript' })
    expect(pending).toBeInstanceOf(Promise)
    const result = await pending
    expect(result.lines).toHaveLength(4)
    expect(await text(result)).toBe(normalizeSource(CODE))
    expect(engine.hasLanguage('js')).toBe(true)
    const sync = engine.highlight({ code: CODE, language: 'js' })
    expect(sync).not.toBeInstanceOf(Promise)
    expect(await text(sync)).toBe(normalizeSource(CODE))
  })

  it('reports unavailable languages actionably', async () => {
    const engine = await createShikiEngine()
    dispose.push(() => engine.dispose?.())
    await expect(
      engine.highlight({ code: 'x', language: 'not-a-real-language' }),
    ).rejects.toThrow(/not available in the Shiki adapter/)
  })

  it('accepts manually registered languages', async () => {
    const engine = await createShikiEngine()
    dispose.push(() => engine.dispose?.())
    const module = await import('shiki/langs/javascript.mjs')
    const registration = {
      ...((module.default as unknown as Record<string, unknown>[])[0] ?? {}),
      name: 'my-shiki-js',
    }
    engine.registerLanguage('my-shiki-js', registration)
    await engine.loadLanguage('my-shiki-js')
    const result = engine.highlight({ code: 'const a = 1', language: 'my-shiki-js' })
    expect(resultToSource(await result)).toBe('const a = 1')
  })

  it('ignores work and rejects after disposal', async () => {
    const engine = await createShikiEngine()
    await engine.loadLanguage('javascript')
    engine.dispose?.()
    await expect(engine.highlight({ code: 'x', language: 'javascript' })).rejects.toThrow(
      /disposed/,
    )
  })

  it('passes raw TextMate scopes only when tokenScopes is enabled', async () => {
    const engine = await createShikiEngine({ preload: ['javascript'] })
    dispose.push(() => engine.dispose?.())

    const plain = await engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(
      plain.lines.flatMap((line) => line.tokens).every((token) => token.scopes === undefined),
    ).toBe(true)

    const scoped = await engine.highlight(
      { code: 'const x = 1', language: 'javascript' },
      { tokenScopes: true },
    )
    const tokens = scoped.lines.flatMap((line) => line.tokens)
    expect(
      tokens.every(
        (token) =>
          token.scopes === undefined || token.scopes.every((scope) => typeof scope === 'string'),
      ),
    ).toBe(true)
    expect(tokens.some((token) => token.scopes?.includes('source.js'))).toBe(true)
    expect(
      tokens.some((token) => token.scopes?.some((scope) => scope.startsWith('storage'))),
    ).toBe(true)
  })
})

describe('highlight.js adapter', () => {
  it('returns synchronous results after preload', async () => {
    const engine = await createHighlightjsEngine({ preload: ['javascript'] })
    dispose.push(() => engine.dispose?.())
    const result = engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(result).not.toBeInstanceOf(Promise)
    expect(resultToSource(await result)).toBe('const x = 1')
  })

  it('loads a language lazily and then returns synchronously', async () => {
    const engine = await createHighlightjsEngine()
    dispose.push(() => engine.dispose?.())
    expect(engine.hasLanguage('javascript')).toBe(false)
    const pending = engine.highlight({ code: CODE, language: 'javascript' })
    expect(pending).toBeInstanceOf(Promise)
    const result = await pending
    expect(result.lines).toHaveLength(4)
    expect(await text(result)).toBe(normalizeSource(CODE))
    const sync = engine.highlight({ code: CODE, language: 'js' })
    expect(sync).not.toBeInstanceOf(Promise)
    expect(splitSource(await text(sync))).toHaveLength(4)
  })

  it('reports unavailable languages and disposes safely', async () => {
    const engine = await createHighlightjsEngine()
    await expect(engine.highlight({ code: 'x', language: 'nope' })).rejects.toThrow(
      /not available in the highlight.js adapter/,
    )
    engine.dispose?.()
    await expect(engine.highlight({ code: 'x', language: 'javascript' })).rejects.toThrow(
      /disposed/,
    )
  })

  it('accepts manually registered grammars', async () => {
    const engine = await createHighlightjsEngine()
    dispose.push(() => engine.dispose?.())
    const module = await import('highlight.js/lib/languages/javascript')
    engine.registerLanguage('my-hljs', module.default)
    const result = engine.highlight({ code: 'const a = 1', language: 'my-hljs' })
    expect(resultToSource(await result)).toBe('const a = 1')
  })

  it('passes normalized class scopes only when tokenScopes is enabled', async () => {
    const engine = await createHighlightjsEngine({ preload: ['javascript'] })
    dispose.push(() => engine.dispose?.())

    const plain = await engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(
      plain.lines.flatMap((line) => line.tokens).every((token) => token.scopes === undefined),
    ).toBe(true)

    const scoped = await engine.highlight(
      { code: 'const x = 1', language: 'javascript' },
      { tokenScopes: true },
    )
    const keyword = scoped.lines
      .flatMap((line) => line.tokens)
      .find((token) => token.text === 'const')
    expect(keyword?.scopes).toContain('keyword')
    expect(keyword?.scopes?.some((scope) => scope.startsWith('hljs-'))).toBe(false)
  })
})

describe('lowlight entry', () => {
  it('exposes the lowlight-backed implementation under its own name', async () => {
    const engine = await createLowlightEngine()
    dispose.push(() => engine.dispose?.())
    const result = await engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(resultToSource(result)).toBe('const x = 1')
    expect(engine.id).toBe('highlightjs')
  })
})

describe('Prism adapter', () => {
  it('returns synchronous results after preload', async () => {
    const engine = await createPrismEngine({ preload: ['ocaml'] })
    dispose.push(() => engine.dispose?.())
    const result = engine.highlight({ code: 'const x = 1', language: 'ocaml' })
    expect(result).not.toBeInstanceOf(Promise)
    expect(resultToSource(await result)).toBe('const x = 1')
  })

  it('loads a language lazily and then returns synchronously', async () => {
    const engine = await createPrismEngine()
    dispose.push(() => engine.dispose?.())
    expect(engine.hasLanguage('julia')).toBe(false)
    const pending = engine.highlight({ code: CODE, language: 'julia' })
    expect(pending).toBeInstanceOf(Promise)
    const result = await pending
    expect(result.lines).toHaveLength(4)
    expect(await text(result)).toBe(normalizeSource(CODE))
    const sync = engine.highlight({ code: CODE, language: 'julia' })
    expect(sync).not.toBeInstanceOf(Promise)
    expect(await text(sync)).toBe(normalizeSource(CODE))
  })

  it('reports unavailable languages and disposes safely', async () => {
    const engine = await createPrismEngine()
    await expect(engine.highlight({ code: 'x', language: 'nope' })).rejects.toThrow(
      /not available in the Prism adapter/,
    )
    engine.dispose?.()
    expect(() => engine.highlight({ code: 'x', language: 'rust' })).toThrow(/disposed/)
  })

  it('accepts manually registered grammars', async () => {
    const engine = await createPrismEngine()
    dispose.push(() => engine.dispose?.())
    const module = await import('refractor/ruby')
    engine.registerLanguage('my-prism', module.default)
    const result = engine.highlight({ code: 'puts "hi"', language: 'my-prism' })
    expect(resultToSource(await result)).toBe('puts "hi"')
  })

  it('passes normalized class scopes only when tokenScopes is enabled', async () => {
    const engine = await createPrismEngine({ preload: ['javascript'] })
    dispose.push(() => engine.dispose?.())

    const plain = await engine.highlight({ code: 'const x = 1', language: 'javascript' })
    expect(
      plain.lines.flatMap((line) => line.tokens).every((token) => token.scopes === undefined),
    ).toBe(true)

    const scoped = await engine.highlight(
      { code: 'const x = 1', language: 'javascript' },
      { tokenScopes: true },
    )
    const keyword = scoped.lines
      .flatMap((line) => line.tokens)
      .find((token) => token.text === 'const')
    expect(keyword?.scopes).toContain('keyword')
    expect(keyword?.scopes).not.toContain('token')
  })
})

describe('cross-adapter contract', () => {
  const sharedLanguages = [
    'javascript',
    'typescript',
    'python',
    'go',
    'rust',
    'shellscript',
    'json',
    'css',
    'sql',
    'yaml',
    'markdown',
    'cpp',
  ]

  it('agrees on line count and concatenated text for shared fixtures', async () => {
    const shiki: ShikiEngine = await createShikiEngine()
    const highlightjs: HighlightjsEngine = await createHighlightjsEngine()
    const prism: PrismEngine = await createPrismEngine()
    dispose.push(() => shiki.dispose?.(), () => highlightjs.dispose?.(), () => prism.dispose?.())

    for (const language of sharedLanguages) {
      try {
        await shiki.loadLanguage(language)
        await highlightjs.loadLanguage(language)
        await prism.loadLanguage(language)
      } catch (error) {
        throw new Error(`Loading ${language}: ${String(error)}`)
      }
      const [a, b, c] = await Promise.all([
        Promise.resolve(shiki.highlight({ code: CODE, language })).catch((error: unknown) => {
          throw new Error(`Shiki ${language}: ${String(error)}`)
        }),
        Promise.resolve(highlightjs.highlight({ code: CODE, language })).catch((error: unknown) => {
          throw new Error(`highlight.js ${language}: ${String(error)}`)
        }),
        Promise.resolve(prism.highlight({ code: CODE, language })).catch((error: unknown) => {
          throw new Error(`Prism ${language}: ${String(error)}`)
        }),
      ])
      expect(a.lines).toHaveLength(b.lines.length)
      expect(a.lines).toHaveLength(c.lines.length)
      expect(await text(a)).toBe(normalizeSource(CODE))
      expect(await text(b)).toBe(normalizeSource(CODE))
      expect(await text(c)).toBe(normalizeSource(CODE))
    }
  }, 60_000)
})

describe('engine diagnostics', () => {
  it('names the missing peer and install command', () => {
    expect(createMissingEngineError('shiki').message).toContain('npm install shiki')
    expect(createMissingEngineError('highlightjs').message).toContain('lowlight highlight.js')
    expect(createMissingEngineError('prism').message).toContain('refractor')
  })
})
