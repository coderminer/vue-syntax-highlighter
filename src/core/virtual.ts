export interface VirtualWindowInput {
  scrollTop: number
  viewportHeight: number
  lineHeight: number
  overscan: number
  lineCount: number
}

export interface VirtualWindow {
  start: number
  end: number
  topPadding: number
  bottomPadding: number
  totalHeight: number
  visibleCount: number
}

export interface VirtualDecision {
  active: boolean
  reason?: 'height' | 'wrap' | 'threshold' | 'disabled'
}

export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const lineCount = Math.max(0, Math.trunc(input.lineCount))
  const lineHeight = Math.max(1, input.lineHeight)
  const overscan = Math.max(0, Math.trunc(input.overscan))
  const viewportHeight = Math.max(0, input.viewportHeight)
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / lineHeight) + 1)
  const windowSize = Math.min(lineCount, visibleCount + overscan * 2)

  if (lineCount === 0) {
    return {
      start: 0,
      end: 0,
      topPadding: 0,
      bottomPadding: 0,
      totalHeight: 0,
      visibleCount: 0,
    }
  }

  const maxStart = Math.max(0, lineCount - windowSize)
  const rawStart = Math.max(0, Math.floor(Math.max(0, input.scrollTop) / lineHeight) - overscan)
  const start = Math.min(maxStart, rawStart)
  const end = Math.min(lineCount, start + windowSize)

  return {
    start,
    end,
    topPadding: start * lineHeight,
    bottomPadding: (lineCount - end) * lineHeight,
    totalHeight: lineCount * lineHeight,
    visibleCount,
  }
}

export interface VirtualDecisionInput {
  virtualized: boolean | 'auto'
  lineCount: number
  threshold: number
  wrap: boolean
  height?: string | number
  maxHeight?: string | number
}

export function decideVirtualization(input: VirtualDecisionInput): VirtualDecision {
  if (input.virtualized === false) return { active: false, reason: 'disabled' }
  if (input.virtualized === 'auto' && input.lineCount <= input.threshold) {
    return { active: false, reason: 'threshold' }
  }
  if (!hasBoundedHeight(input.height, input.maxHeight)) {
    return { active: false, reason: 'height' }
  }
  if (input.wrap) {
    return { active: false, reason: 'wrap' }
  }
  return { active: true }
}

export function hasBoundedHeight(
  height: string | number | undefined,
  maxHeight: string | number | undefined,
): boolean {
  return isPositiveSize(height) || isPositiveSize(maxHeight)
}

function isPositiveSize(value: string | number | undefined): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value !== 'string') return false
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return false
  if (
    [
      '0',
      'auto',
      'none',
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
      'fit-content',
      'min-content',
      'max-content',
    ].includes(trimmed)
  ) {
    return false
  }
  if (/^0(?:\.[0-9]+)?(?:[a-z%]+)?$/.test(trimmed)) return false
  return true
}

export function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}
