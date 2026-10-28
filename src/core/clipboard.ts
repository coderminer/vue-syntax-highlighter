/**
 * Copies text without assuming a secure context. The async Clipboard API is
 * preferred; document.execCommand remains a fallback for plain HTTP pages and
 * older browsers. Never throws: callers receive false when copying fails.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied and non-secure contexts both fall through to the
      // legacy path instead of failing outright.
    }
  }

  const doc = typeof document === 'undefined' ? undefined : document
  if (!doc) return false

  let textarea: HTMLTextAreaElement | undefined
  let active: HTMLElement | null = null
  try {
    textarea = doc.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'

    active = doc.activeElement as HTMLElement | null
    doc.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    return typeof doc.execCommand === 'function' ? doc.execCommand('copy') : false
  } catch {
    return false
  } finally {
    try {
      textarea?.remove()
    } catch {
      // Cleanup must not turn a successful copy into a failure.
    }
    try {
      active?.focus?.()
    } catch {
      // Focus restoration is best-effort.
    }
  }
}
