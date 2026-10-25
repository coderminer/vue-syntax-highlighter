import { describe, expect, it } from 'vitest'
import {
  computeVirtualWindow,
  decideVirtualization,
  hasBoundedHeight,
  toCssSize,
} from '@/core/virtual'

describe('virtualization math', () => {
  it('returns a bounded window and padding', () => {
    const window = computeVirtualWindow({
      scrollTop: 0,
      viewportHeight: 400,
      lineHeight: 20,
      overscan: 10,
      lineCount: 50_000,
    })
    expect(window.start).toBe(0)
    expect(window.end).toBeLessThanOrEqual(41)
    expect(window.topPadding).toBe(0)
    expect(window.bottomPadding).toBe((50_000 - window.end) * 20)
    expect(window.totalHeight).toBe(1_000_000)
  })

  it('moves the window while scrolling and clamps at the end', () => {
    const middle = computeVirtualWindow({
      scrollTop: 20_000,
      viewportHeight: 400,
      lineHeight: 20,
      overscan: 10,
      lineCount: 50_000,
    })
    expect(middle.start).toBe(990)
    expect(middle.end).toBe(1031)

    const end = computeVirtualWindow({
      scrollTop: 1_000_000,
      viewportHeight: 400,
      lineHeight: 20,
      overscan: 10,
      lineCount: 50_000,
    })
    expect(end.end).toBe(50_000)
    expect(end.bottomPadding).toBe(0)
    expect(end.end - end.start).toBeLessThanOrEqual(41)
  })

  it('handles empty and short documents', () => {
    expect(
      computeVirtualWindow({
        scrollTop: 0,
        viewportHeight: 400,
        lineHeight: 20,
        overscan: 10,
        lineCount: 0,
      }).end,
    ).toBe(0)
    const short = computeVirtualWindow({
      scrollTop: 0,
      viewportHeight: 400,
      lineHeight: 20,
      overscan: 10,
      lineCount: 5,
    })
    expect(short.start).toBe(0)
    expect(short.end).toBe(5)
    expect(short.bottomPadding).toBe(0)
  })
})

describe('virtualization decisions', () => {
  it('requires a bounded height and disabled wrapping', () => {
    expect(
      decideVirtualization({
        virtualized: true,
        lineCount: 5000,
        threshold: 2000,
        wrap: false,
      }),
    ).toEqual({ active: false, reason: 'height' })
    expect(
      decideVirtualization({
        virtualized: true,
        lineCount: 5000,
        threshold: 2000,
        wrap: true,
        height: 400,
      }),
    ).toEqual({ active: false, reason: 'wrap' })
    expect(
      decideVirtualization({
        virtualized: true,
        lineCount: 5000,
        threshold: 2000,
        wrap: false,
        height: 400,
      }),
    ).toEqual({ active: true })
  })

  it('applies the automatic threshold', () => {
    expect(
      decideVirtualization({
        virtualized: 'auto',
        lineCount: 10,
        threshold: 2000,
        wrap: false,
        height: 400,
      }),
    ).toEqual({ active: false, reason: 'threshold' })
    expect(
      decideVirtualization({
        virtualized: 'auto',
        lineCount: 2001,
        threshold: 2000,
        wrap: false,
        height: 400,
      }),
    ).toEqual({ active: true })
  })

  it('normalizes CSS sizes and bounded-height checks', () => {
    expect(toCssSize(400)).toBe('400px')
    expect(toCssSize('20rem')).toBe('20rem')
    expect(toCssSize(undefined)).toBeUndefined()
    expect(hasBoundedHeight(undefined, '10px')).toBe(true)
    expect(hasBoundedHeight(0, '0')).toBe(false)
    expect(hasBoundedHeight('auto', undefined)).toBe(false)
    expect(hasBoundedHeight(undefined, 'none')).toBe(false)
    expect(hasBoundedHeight('0px', undefined)).toBe(false)
    expect(hasBoundedHeight('calc(100vh - 10px)', undefined)).toBe(true)
  })
})
