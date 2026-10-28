import { afterEach, vi } from 'vitest'
// Default/full entry behavior is enabled for tests that omit an explicit engine.
import { installBuiltinEngines } from '@/core/builtin-engines'

installBuiltinEngines()

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (globalThis as { __VSH_DEV_OVERRIDE__?: unknown }).__VSH_DEV_OVERRIDE__
})
