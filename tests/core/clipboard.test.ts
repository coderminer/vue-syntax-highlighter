import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from '@/core/clipboard'

const originalClipboard = navigator.clipboard

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
  delete (document as { execCommand?: unknown }).execCommand
})

describe('clipboard helper', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await expect(copyText('const x = 1')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('const x = 1')
  })

  it('falls back to execCommand outside a secure context', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await expect(copyText('fallback')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('returns false when no clipboard mechanism is available', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })

    await expect(copyText('nope')).resolves.toBe(false)
  })
})
