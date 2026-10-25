import { describe, expect, it, vi } from 'vitest'
import {
  createWarningSet,
  hasWarned,
  isDevelopment,
  warn,
  warnOnce,
} from '@/core/warn'

describe('development warnings', () => {
  it('emits one warning per signature and namespace prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const set = createWarningSet()
    warnOnce('sig', 'first', set)
    warnOnce('sig', 'second', set)
    warnOnce('other', 'third', set)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0]?.[0]).toContain('[vue-syntax-highlighter]')
    expect(hasWarned('sig', set)).toBe(true)
  })

  it('inherits warnings from a parent set', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const parent = createWarningSet()
    warnOnce('shared', 'message', parent)
    const child = createWarningSet(parent)
    warnOnce('shared', 'message', child)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('suppresses warnings in production', () => {
    vi.stubGlobal('__VSH_DEV_OVERRIDE__', false)
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(isDevelopment()).toBe(false)
    warn('message')
    warnOnce('sig', 'message')
    expect(spy).not.toHaveBeenCalled()
  })
})
