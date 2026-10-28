import { describe, expect, it, vi } from 'vitest'
import { EngineManager, requestCacheKey } from '@/core/engine'
import {
  createHighlighterContext,
  preloadLanguages,
  selectEngine,
} from '@/core/context'
import { createPlainResult } from '@/core/source'
import type { HighlightEngine } from '@/types'

function fakeEngine(id = 'fake'): HighlightEngine {
  return {
    id,
    highlight: () => createPlainResult('x', 'text'),
    dispose: vi.fn(),
  }
}

describe('EngineManager', () => {
  it('caches loaded engine instances and disposes them', async () => {
    const engine = fakeEngine()
    const dispose = vi.spyOn(engine, 'dispose')
    const loader = vi.fn(() => engine)
    const manager = new EngineManager({ custom: loader })
    const first = await manager.resolve('custom')
    const second = await manager.resolve('custom')
    expect(first).toBe(engine)
    expect(second).toBe(engine)
    expect(loader).toHaveBeenCalledTimes(1)
    manager.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('never disposes user-supplied engine objects', () => {
    const engine = fakeEngine()
    const dispose = vi.spyOn(engine, 'dispose')
    const manager = new EngineManager()
    expect(manager.resolve(engine)).toBe(engine)
    manager.dispose()
    expect(dispose).not.toHaveBeenCalled()
  })

  it('never disposes caller-owned registered engine objects', () => {
    const engine = fakeEngine()
    const dispose = vi.spyOn(engine, 'dispose')
    const manager = new EngineManager({ registered: engine })
    expect(manager.resolve('registered')).toBe(engine)
    manager.dispose()
    expect(dispose).not.toHaveBeenCalled()
  })

  it('reports unknown identifiers with an actionable message', () => {
    const manager = new EngineManager()
    expect(() => manager.resolve('missing')).toThrow(/Unknown engine "missing"/)
  })

  it('keeps custom loader failures free of install guidance', async () => {
    const manager = new EngineManager({
      broken: () => Promise.reject(new Error('cannot load')),
    })
    await expect(manager.resolve('broken')).rejects.toThrow(
      /Custom engine "broken" failed to load: cannot load/,
    )
    await expect(manager.resolve('broken')).rejects.not.toThrow(/Install it with/)
  })

  it('warns once when a preload language fails', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine: HighlightEngine = {
      id: 'preload-engine',
      hasLanguage: () => false,
      loadLanguage: async (language: string) => {
        throw new Error(`missing ${language}`)
      },
      highlight: () => createPlainResult('x', 'text'),
    }
    const context = createHighlighterContext({
      engine,
      languages: ['bad-language'],
    })
    await preloadLanguages(context)
    expect(
      spy.mock.calls.some((call) =>
        String(call[0]).includes('Unable to preload language "bad-language"'),
      ),
    ).toBe(true)
  })

  it('rejects disposed scopes', () => {
    const manager = new EngineManager()
    manager.dispose()
    expect(() => manager.resolve(fakeEngine())).toThrow(/disposed/)
  })
})

describe('engine selection precedence', () => {
  it('prefers local, then provider, then default Shiki', () => {
    const custom = fakeEngine('custom')
    const provider = createHighlighterContext({ engine: custom }, undefined, true)
    const child = createHighlighterContext({}, provider, false)

    expect(selectEngine(child).choice).toBe(custom)
    expect(selectEngine(child, 'prism').choice).toBe('prism')
    expect(selectEngine(createHighlighterContext({})).choice).toBe('shiki')
  })

  it('uses the manager of the context that owns the engine', () => {
    const provider = createHighlighterContext({ engine: 'highlightjs' }, undefined, true)
    const child = createHighlighterContext({}, provider, false)
    expect(selectEngine(child).manager).toBe(provider.engineManager)
    expect(selectEngine(child, 'prism').manager).toBe(child.engineManager)
  })
})

describe('requestCacheKey', () => {
  it('uses the engine identity and excludes visual data', () => {
    const engine = fakeEngine('engine-a')
    const key = requestCacheKey(engine, { code: 'x', language: 'js' }, { option: 1 })
    expect(key).toContain('engine-a')
    expect(key).not.toContain('theme')
    expect(requestCacheKey(engine, { code: 'x', language: 'js' }, { option: 1 })).toBe(key)
    expect(requestCacheKey(engine, { code: 'x', language: 'ts' }, { option: 1 })).not.toBe(key)
  })

  it('supports a custom cacheKey hook and ignores broken hooks', () => {
    const engine = fakeEngine('engine-b')
    engine.cacheKey = () => 'custom-key'
    expect(requestCacheKey(engine, { code: 'x', language: 'js' })).toBe('custom-key')
    engine.cacheKey = () => {
      throw new Error('broken')
    }
    expect(requestCacheKey(engine, { code: 'x', language: 'js' })).toContain('engine-b')
  })
})
