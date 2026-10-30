import type { TokenType } from '../types.js'

interface Rule {
  match: string
  type: TokenType
}

const SHIKI_RULES: Rule[] = [
  { match: 'invalid', type: 'invalid' },
  { match: 'comment', type: 'comment' },
  { match: 'string.regexp', type: 'regexp' },
  { match: 'string', type: 'string' },
  { match: 'constant.numeric', type: 'number' },
  { match: 'constant.language', type: 'constant' },
  { match: 'constant', type: 'constant' },
  { match: 'keyword.operator', type: 'operator' },
  { match: 'keyword', type: 'keyword' },
  { match: 'storage', type: 'keyword' },
  { match: 'entity.name.function', type: 'function' },
  { match: 'support.function', type: 'function' },
  { match: 'entity.name.class', type: 'class' },
  { match: 'entity.name.type', type: 'type' },
  { match: 'support.class', type: 'class' },
  { match: 'meta.object-literal.key', type: 'property' },
  { match: 'support.type.property-name', type: 'property' },
  { match: 'variable.other.property', type: 'property' },
  { match: 'support.type', type: 'type' },
  { match: 'entity.name.tag', type: 'tag' },
  { match: 'meta.tag', type: 'tag' },
  { match: 'entity.other.attribute-name', type: 'attribute' },
  { match: 'variable', type: 'variable' },
  { match: 'punctuation', type: 'punctuation' },
  { match: 'meta.brace', type: 'punctuation' },
  { match: 'entity.name.function.decorator', type: 'decorator' },
  { match: 'meta.decorator', type: 'decorator' },
  { match: 'punctuation.definition.decorator', type: 'decorator' },
  { match: 'meta', type: 'meta' },
]

const HLJS_RULES: Rule[] = [
  { match: 'comment', type: 'comment' },
  { match: 'quote', type: 'string' },
  { match: 'string', type: 'string' },
  { match: 'regexp', type: 'regexp' },
  { match: 'number', type: 'number' },
  { match: 'literal', type: 'constant' },
  { match: 'symbol', type: 'constant' },
  { match: 'bullet', type: 'punctuation' },
  { match: 'keyword', type: 'keyword' },
  { match: 'selector-tag', type: 'tag' },
  { match: 'built_in', type: 'function' },
  { match: 'type', type: 'type' },
  { match: 'title.class', type: 'class' },
  { match: 'title.function', type: 'function' },
  { match: 'class', type: 'class' },
  { match: 'function', type: 'function' },
  { match: 'title', type: 'function' },
  { match: 'tag', type: 'tag' },
  { match: 'name', type: 'tag' },
  { match: 'attr', type: 'attribute' },
  { match: 'attribute', type: 'attribute' },
  { match: 'property', type: 'property' },
  { match: 'variable', type: 'variable' },
  { match: 'params', type: 'variable' },
  { match: 'operator', type: 'operator' },
  { match: 'punctuation', type: 'punctuation' },
  { match: 'meta', type: 'meta' },
  { match: 'decorator', type: 'decorator' },
  { match: 'section', type: 'function' },
  { match: 'addition', type: 'meta' },
  { match: 'deletion', type: 'meta' },
]

const PRISM_RULES: Rule[] = [
  { match: 'comment', type: 'comment' },
  { match: 'prolog', type: 'comment' },
  { match: 'doctype', type: 'meta' },
  { match: 'cdata', type: 'meta' },
  { match: 'string', type: 'string' },
  { match: 'char', type: 'string' },
  { match: 'attr-value', type: 'string' },
  { match: 'url', type: 'string' },
  { match: 'regex', type: 'regexp' },
  { match: 'number', type: 'number' },
  { match: 'boolean', type: 'constant' },
  { match: 'constant', type: 'constant' },
  { match: 'symbol', type: 'constant' },
  { match: 'keyword', type: 'keyword' },
  { match: 'atrule', type: 'keyword' },
  { match: 'function', type: 'function' },
  { match: 'builtin', type: 'function' },
  { match: 'class-name', type: 'class' },
  { match: 'maybe-class-name', type: 'class' },
  { match: 'tag', type: 'tag' },
  { match: 'selector', type: 'tag' },
  { match: 'attr-name', type: 'attribute' },
  { match: 'property', type: 'property' },
  { match: 'variable', type: 'variable' },
  { match: 'parameter', type: 'variable' },
  { match: 'operator', type: 'operator' },
  { match: 'punctuation', type: 'punctuation' },
  { match: 'decorator', type: 'decorator' },
  { match: 'important', type: 'meta' },
  { match: 'namespace', type: 'meta' },
  { match: 'entity', type: 'function' },
  { match: 'bold', type: 'plain' },
  { match: 'italic', type: 'plain' },
]

function matchRules(scopes: readonly string[], rules: readonly Rule[]): TokenType {
  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    const scope = scopes[index]
    if (!scope) continue
    for (const rule of rules) {
      if (scope === rule.match || scope.startsWith(`${rule.match}.`) || scope.startsWith(`${rule.match}-`)) {
        return rule.type
      }
    }
  }
  return 'plain'
}

export function mapShikiScopes(scopes: readonly string[]): TokenType {
  return matchRules(scopes, SHIKI_RULES)
}

export function normalizeClassNames(classes: unknown): string[] {
  if (typeof classes === 'string') return classes.split(/\s+/).filter(Boolean)
  if (Array.isArray(classes)) return classes.flatMap(normalizeClassNames)
  if (classes && typeof classes === 'object') {
    return Object.entries(classes as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name)
  }
  return []
}

function stripPrefix(name: string, prefix: string): string {
  return name.startsWith(prefix) ? name.slice(prefix.length) : name
}

export function hljsScopeNames(classes: unknown): string[] {
  return normalizeClassNames(classes)
    .map((name) => stripPrefix(name, 'hljs-').replace(/_$/, ''))
    .flatMap((name) => name.split('.'))
    .filter(Boolean)
}

export function mapHljsClasses(classes: unknown): TokenType {
  const normalized = hljsScopeNames(classes)
  return normalized.length > 0 ? matchRules(normalized, HLJS_RULES) : 'plain'
}

export function prismScopeNames(classes: unknown): string[] {
  return normalizeClassNames(classes)
    .map((name) => stripPrefix(name, 'token-'))
    .flatMap((name) => name.split('.'))
    .filter((name) => name !== 'token')
}

export function mapPrismClasses(classes: unknown): TokenType {
  const normalized = prismScopeNames(classes)
  return normalized.length > 0 ? matchRules(normalized, PRISM_RULES) : 'plain'
}

export function mapTokenClasses(classes: unknown): TokenType {
  const names = normalizeClassNames(classes)
  if (names.some((name) => name.startsWith('hljs'))) return mapHljsClasses(names)
  return mapPrismClasses(names)
}
