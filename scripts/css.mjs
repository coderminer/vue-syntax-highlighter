/**
 * Shared stylesheet assembly for the published dist files. Keeping the
 * concatenation here lets tests verify the generated order without relying on
 * a previous build.
 */
export function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .trim()
}

export function buildBaseStyles(source) {
  return `${minifyCss(source)}\n`
}

export function buildCompleteStyles(base, fallback) {
  return `${minifyCss(base)}\n${minifyCss(fallback)}\n`
}
