import { describe, expect, it, vi } from 'vitest'
import { buildCacheKey, ResultCache, stableStringify } from '@/core/cache'
import { createPlainResult } from '@/core/source'

const result = (text: string) => createPlainResult(text, 'js')

describe('cache keys', () => {
  it('is stable across reordered option objects', () => {
    const a = buildCacheKey({
      engineId: 'fake',
      language: 'js',
      code: 'const x = 1',
      options: { a: 1, b: { c: 2, d: 3 } },
    })
    const b = buildCacheKey({
      engineId: 'fake',
      language: 'js',
      code: 'const x = 1',
      options: { b: { d: 3, c: 2 }, a: 1 },
    })
    expect(a).toBe(b)
  })

  it('changes for engine, language, code, and options', () => {
    const base = { engineId: 'fake', language: 'js', code: 'x' }
    const keys = new Set([
      buildCacheKey(base),
      buildCacheKey({ ...base, engineId: 'other' }),
      buildCacheKey({ ...base, language: 'ts' }),
      buildCacheKey({ ...base, code: 'y' }),
      buildCacheKey({ ...base, options: { a: 1 } }),
    ])
    expect(keys.size).toBe(5)
  })

  it('never includes a theme', () => {
    const base = { engineId: 'fake', language: 'js', code: 'x', options: { a: 1 } }
    const withoutTheme = buildCacheKey(base)
    const withTheme = buildCacheKey({ ...base, theme: 'vsh-dark' } as typeof base)
    expect(withTheme).toBe(withoutTheme)
  })

  it('handles functions, symbols, dates, maps, sets, and cycles explicitly', () => {
    const fn = () => undefined
    expect(stableStringify(fn)).toBe(stableStringify(fn))
    expect(stableStringify(() => undefined)).not.toBe(stableStringify(fn))
    expect(stableStringify({ d: new Date(0), m: new Map([['b', 2], ['a', 1]]), s: new Set(['b', 'a']) })).toBe(
      stableStringify({ s: new Set(['a', 'b']), m: new Map([['a', 1], ['b', 2]]), d: new Date(0) }),
    )
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(stableStringify(cyclic)).toContain('#circular')
    expect(stableStringify(Symbol('x'))).toContain('#symbol')
  })
})

describe('ResultCache', () => {
  it('uses LRU eviction and configurable capacity', () => {
    const cache = new ResultCache({ capacity: 2 })
    cache.set('a', result('a'))
    cache.set('b', result('b'))
    expect(cache.get('a')).toBeDefined()
    cache.set('c', result('c'))
    expect(cache.get('a')).toBeDefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.size).toBe(2)
  })

  it('evicts by character budget and bypasses oversized entries', () => {
    const cache = new ResultCache({ capacity: 10, maxChars: 8 })
    cache.set('a', result('abcd'))
    cache.set('b', result('efgh'))
    expect(cache.size).toBe(1)
    cache.set('huge', result('x'.repeat(50)))
    expect(cache.get('huge')).toBeUndefined()
    expect(cache.characterSize).toBeLessThanOrEqual(8)
  })

  it('disables caching at capacity zero', () => {
    const cache = new ResultCache({ capacity: 0 })
    cache.set('a', result('a'))
    expect(cache.get('a')).toBeUndefined()
    expect(cache.request('a', () => result('a'))).toBeDefined()
    expect(cache.get('a')).toBeUndefined()
  })

  it('shares in-flight promises and caches the resolved value once', async () => {
    const cache = new ResultCache()
    let resolve!: (value: ReturnType<typeof result>) => void
    const factory = vi.fn(
      () =>
        new Promise<ReturnType<typeof result>>((done) => {
          resolve = done
        }),
    )
    const first = cache.request('key', factory) as Promise<ReturnType<typeof result>>
    const second = cache.request('key', factory) as Promise<ReturnType<typeof result>>
    expect(first).toBe(second)
    expect(factory).toHaveBeenCalledTimes(1)
    resolve(result('shared'))
    await expect(first).resolves.toBeDefined()
    expect(cache.get('key')).toBeDefined()
    expect(cache.pending).toBe(0)
  })

  it('does not cache failures and removes the in-flight entry', async () => {
    const cache = new ResultCache()
    const failure = cache.request('key', () => Promise.reject(new Error('nope')))
    await expect(failure).rejects.toThrow('nope')
    expect(cache.pending).toBe(0)
    expect(cache.get('key')).toBeUndefined()
  })

  it('clears entries and in-flight requests', async () => {
    const cache = new ResultCache()
    cache.set('a', result('a'))
    const pending = cache.request('b', () => Promise.resolve(result('b')))
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.pending).toBe(0)
    await pending
    expect(cache.get('b')).toBeUndefined()
  })
})
