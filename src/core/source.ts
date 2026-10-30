import { TOKEN_TYPES, type HighlightLine, type HighlightResult, type TokenType } from '../types.js'

const TOKEN_TYPE_SET = new Set<string>(TOKEN_TYPES)

export function isTokenType(value: unknown): value is TokenType {
  return typeof value === 'string' && TOKEN_TYPE_SET.has(value)
}

export function normalizeSource(code: string): string {
  return code.replace(/\r\n?/g, '\n')
}

/**
 * Renders source without the terminal line break that editors add to files.
 * Keeping one blank line for `"a\n\n"` while treating `"a\n"` as one line
 * avoids an empty numbered row without flattening intentional blank lines.
 */
export function normalizeDisplaySource(code: string): string {
  return normalizeSource(code).replace(/\n$/, '')
}

export function splitSource(code: string): string[] {
  return normalizeSource(code).split('\n')
}

export function createPlainResult(code: string, language: string): HighlightResult {
  const lines: HighlightLine[] = splitSource(code).map((line) => ({
    tokens: line.length > 0 ? [{ text: line, type: 'plain' as const }] : [],
  }))
  return { lines, language }
}

export function resultToSource(result: HighlightResult): string {
  return result.lines
    .map((line) => line.tokens.map((token) => token.text).join(''))
    .join('\n')
}

export function countResultChars(result: HighlightResult): number {
  let count = result.language.length
  for (const line of result.lines) {
    for (const token of line.tokens) {
      count += token.text.length
      if (token.scopes) {
        for (const scope of token.scopes) count += scope.length + 1
      }
    }
  }
  return count
}

export function isHighlightResult(value: unknown): value is HighlightResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<HighlightResult>
  if (typeof candidate.language !== 'string') return false
  if (!Array.isArray(candidate.lines)) return false
  for (const line of candidate.lines) {
    if (!line || typeof line !== 'object' || !Array.isArray(line.tokens)) return false
    for (const token of line.tokens) {
      if (!token || typeof token !== 'object') return false
      if (typeof token.text !== 'string') return false
      if (!isTokenType(token.type)) return false
      if (token.scopes !== undefined) {
        if (!Array.isArray(token.scopes)) return false
        for (const scope of token.scopes) {
          if (typeof scope !== 'string') return false
        }
      }
    }
  }
  return true
}

export function freezeResult(result: HighlightResult): HighlightResult {
  const lines: HighlightLine[] = result.lines.map((line) => {
    const tokens = line.tokens.map((token) => {
      if (!token.scopes) {
        return Object.freeze({ text: token.text, type: token.type })
      }
      return Object.freeze({
        text: token.text,
        type: token.type,
        scopes: Object.freeze([...token.scopes]),
      })
    })
    return Object.freeze({ tokens: Object.freeze(tokens) })
  })
  return Object.freeze({
    lines: Object.freeze(lines),
    language: result.language,
    ...(result.meta ? { meta: Object.freeze({ ...result.meta }) } : {}),
  })
}

export function assertHighlightResult(value: unknown): asserts value is HighlightResult {
  if (!isHighlightResult(value)) {
    throw new TypeError(
      'Highlight engine returned an invalid result. Expected ordered lines of { text, type } tokens.',
    )
  }
}

export function resultLineText(line: HighlightLine): string {
  return line.tokens.map((token) => token.text).join('')
}
