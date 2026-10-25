const PREFIX = '[vue-syntax-highlighter]'

/**
 * A per-application warning registry. Warnings are keyed by signature, not by
 * message, so repeated occurrences of the same failure stay quiet while a new
 * failure mode is still reported.
 */
export type WarningSet = Set<string>

export const globalWarningSet: WarningSet = new Set<string>()

export function createWarningSet(parent?: WarningSet): WarningSet {
  return parent ? new Set(parent) : new Set<string>()
}

export function isDevelopment(): boolean {
  // The override exists so the production no-warning path is testable without
  // rebuilding with a different flag. It is intentionally undocumented.
  const override = (globalThis as { __VSH_DEV_OVERRIDE__?: unknown }).__VSH_DEV_OVERRIDE__
  if (typeof override === 'boolean') return override
  if (typeof __VSH_DEV__ === 'boolean') return __VSH_DEV__
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return false
  return true
}

export function warn(message: string): void {
  if (!isDevelopment()) return
  console.warn(`${PREFIX} ${message}`)
}

export function warnOnce(
  signature: string,
  message: string,
  warningSet: WarningSet = globalWarningSet,
): void {
  if (!isDevelopment()) return
  if (warningSet.has(signature)) return
  warningSet.add(signature)
  console.warn(`${PREFIX} ${message}`)
}

export function hasWarned(signature: string, warningSet: WarningSet = globalWarningSet): boolean {
  return warningSet.has(signature)
}
