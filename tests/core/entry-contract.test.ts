import { describe, expect, it, vi } from 'vitest'

describe('engine entry contracts', () => {
  it('keeps core peer-free while the default and full entries load built-ins', async () => {
    vi.resetModules()

    const core = await import('@/core-entry')
    expect(core.EngineManager).toBeTypeOf('function')
    expect(() => new core.EngineManager().resolve('shiki')).toThrow(
      /core entry has no built-in engine/,
    )

    const defaultEntry = await import('@/index')
    const full = await import('@/full')
    for (const entry of [defaultEntry, full]) {
      const manager = new entry.EngineManager()
      const loading = manager.resolve('shiki')
      expect(loading).toBeInstanceOf(Promise)
      manager.dispose()
      await Promise.resolve(loading).catch(() => undefined)
    }
  })

  it('exposes the same runtime surface from the core and default entries', async () => {
    vi.resetModules()
    const core = await import('@/core-entry')
    const defaultEntry = await import('@/index')
    expect(Object.keys(core).sort()).toEqual(Object.keys(defaultEntry).sort())
  })
})
