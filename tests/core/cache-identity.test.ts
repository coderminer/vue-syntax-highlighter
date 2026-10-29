import { describe, expect, it, vi } from 'vitest'
import { buildCacheKey, ResultCache } from '@/core/cache'
import { createHighlighterContext } from '@/core/context'
import { createHighlightController } from '@/core/controller'
import { engineIdentityFor, requestCacheKey } from '@/core/engine'
import { createPlainResult } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'

function engine(id = 'shared-id'): HighlightEngine {
  return {
    id,
    capabilities: { sync: true },
    highlight: (request) => createPlainResult(request.code, request.language),
  }
}

function typedResult(type: 'keyword' | 'string'): HighlightResult {
  return {
    lines: [{ tokens: [{ text: 'x', type }] }],
    language: 'js',
  }
}

describe('engine identity cache keys', () => {
  it('leaves the default key format unchanged', () => {
    const key = buildCacheKey({ engineId: 'fake', language: 'js', code: 'x' })
    expect(key).toBe('v1:["fake","js","x",{}]')
    expect(
      buildCacheKey({ engineId: 'fake', language: 'js', code: 'x', engineIdentity: 1 }),
    ).not.toBe(key)
  })

  it('shares same-id engines by default and partitions them in identity mode', () => {
    const first = engine()
    const second = engine()
    const request = { code: 'x', language: 'js' }
    expect(requestCacheKey(first, request)).toBe(requestCacheKey(second, request))
    expect(
      requestCacheKey(first, request, undefined, engineIdentityFor(first)),
    ).not.toBe(requestCacheKey(second, request, undefined, engineIdentityFor(second)))
  })

  it('keeps a stable token for the same engine object', () => {
    const value = engine()
    const request = { code: 'x', language: 'js' }
    const identity = engineIdentityFor(value)
    expect(engineIdentityFor(value)).toBe(identity)
    expect(requestCacheKey(value, request, undefined, identity)).toBe(
      requestCacheKey(value, request, undefined, identity),
    )
  })

  it('keeps a custom cacheKey override authoritative in identity mode', () => {
    const custom = engine()
    custom.cacheKey = () => 'custom-key'
    expect(
      requestCacheKey(custom, { code: 'x', language: 'js' }, undefined, engineIdentityFor(custom)),
    ).toBe('custom-key')

    custom.cacheKey = () => ''
    expect(
      requestCacheKey(custom, { code: 'x', language: 'js' }, undefined, engineIdentityFor(custom)),
    ).toContain('shared-id')
  })
})

describe('identity mode through the controller', () => {
  it('stores same-id engine results separately', async () => {
    const first = engine()
    const second = engine()
    const context = createHighlighterContext({ cacheEngineIdentity: true, cache: new ResultCache() })
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'x', language: 'js', engine: first }),
    })
    first.highlight = vi.fn(() => typedResult('keyword'))
    second.highlight = vi.fn(() => typedResult('string'))

    const a = await controller.highlight({ code: 'x' })
    const b = await controller.highlight({ code: 'x', language: 'js' })
    expect(a.lines[0]?.tokens[0]?.type).toBe('keyword')
    expect(b.lines[0]?.tokens[0]?.type).toBe('keyword')
    expect(first.highlight).toHaveBeenCalledTimes(1)

    const other = createHighlightController({
      context,
      getInput: () => ({ code: 'x', language: 'js', engine: second }),
    })
    const c = await other.highlight({ code: 'x' })
    expect(c.lines[0]?.tokens[0]?.type).toBe('string')
    expect(second.highlight).toHaveBeenCalledTimes(1)
  })

  it('deduplicates identical keys and separates different identities', async () => {
    const pending: ((result: HighlightResult) => void)[] = []
    const asyncEngine = (id: string, type: 'keyword' | 'string'): HighlightEngine => ({
      id,
      capabilities: { sync: false },
      highlight: () =>
        new Promise<HighlightResult>((resolve) => {
          pending.push(() => resolve(typedResult(type)))
        }),
    })
    const firstAsync = asyncEngine('shared-id', 'keyword')
    const secondAsync = asyncEngine('shared-id', 'string')
    const context = createHighlighterContext({ cacheEngineIdentity: true })
    const controllerFor = (value: HighlightEngine) =>
      createHighlightController({
        context,
        getInput: () => ({ code: 'x', language: 'js', engine: value }),
      })

    const a = controllerFor(firstAsync).highlight({ code: 'x' })
    const b = controllerFor(firstAsync).highlight({ code: 'x' })
    const c = controllerFor(secondAsync).highlight({ code: 'x' })
    await vi.waitFor(() => expect(pending).toHaveLength(2))
    pending[0]?.(typedResult('keyword'))
    pending[1]?.(typedResult('string'))
    const [ra, rb, rc] = await Promise.all([a, b, c])
    expect(ra.lines[0]?.tokens[0]?.type).toBe('keyword')
    expect(rb.lines[0]?.tokens[0]?.type).toBe('keyword')
    expect(rc.lines[0]?.tokens[0]?.type).toBe('string')
  })

  it('keeps cache budgets and clearing behavior', () => {
    const cache = new ResultCache({ capacity: 2, maxChars: 10_000 })
    cache.set('a', createPlainResult('a', 'js'))
    cache.set('b', createPlainResult('b', 'js'))
    cache.set('c', createPlainResult('c', 'js'))
    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBeUndefined()
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.characterSize).toBe(0)
  })

  it('does not include identity when the option is disabled', async () => {
    const value = engine()
    const context = createHighlighterContext({ engine: value })
    const api = createHighlightController({
      context,
      getInput: () => ({ code: 'x', language: 'js' }),
    })
    await api.highlight({ code: 'x' })
    expect(context.cacheEngineIdentity).toBe(false)
    expect(requestCacheKey(value, { code: 'x', language: 'js' })).toBe(
      buildCacheKey({ engineId: value.id, language: 'js', code: 'x' }),
    )
  })
})
