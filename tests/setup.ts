import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (globalThis as { __VSH_DEV_OVERRIDE__?: unknown }).__VSH_DEV_OVERRIDE__
})
