import { refractor } from 'refractor'
import type {
  EngineOptions,
  HighlightEngine,
  HighlightRequest,
  HighlightResult,
  HighlightToken,
} from '../../types.js'
import { createPlainResult, normalizeSource, resultToSource } from '../../core/source.js'
import { mapPrismClasses } from '../../core/token-types.js'
import { languageAliases, languageLoaders, supportedLanguages } from './languages.js'

const PLAIN_LANGUAGES = new Set(['text', 'plain', 'plaintext', 'txt'])

interface HastText {
  type: 'text'
  value: string
}

interface HastElement {
  type: 'element'
  properties?: { className?: unknown }
  children?: HastNode[]
}

type HastNode = HastText | HastElement | { type: string; children?: HastNode[] }

export type PrismLanguageRegistration = unknown
export type PrismLanguageLoader = () => Promise<{ default: unknown } | unknown>

export interface PrismEngine extends HighlightEngine {
  readonly id: 'prism'
  readonly capabilities: { sync: true }
  hasLanguage(language: string): boolean
  loadLanguage(language: string): Promise<void>
  registerLanguage(name: string, language: PrismLanguageRegistration | PrismLanguageLoader): void
  readonly supportedLanguages: readonly string[]
}

export interface PrismEngineOptions {
  preload?: readonly string[]
}

export async function createPrismEngine(options: PrismEngineOptions = {}): Promise<PrismEngine> {
  const engine = new PrismEngineImpl(options)
  if (options.preload?.length) {
    await Promise.allSettled(options.preload.map((language) => engine.loadLanguage(language)))
  }
  return engine
}

class PrismEngineImpl implements PrismEngine {
  readonly id = 'prism' as const
  readonly capabilities = { sync: true } as const
  readonly supportedLanguages = supportedLanguages

  private readonly loaders = new Map<string, PrismLanguageLoader>(
    Object.entries(languageLoaders) as [string, PrismLanguageLoader][],
  )
  private readonly loading = new Map<string, Promise<void>>()
  private readonly loaded = new Set<string>()
  private disposed = false

  constructor(_options: PrismEngineOptions) {}

  hasLanguage(language: string): boolean {
    const canonical = canonicalLanguage(language)
    if (PLAIN_LANGUAGES.has(canonical)) return true
    return this.loaded.has(canonical) || refractor.registered(canonical)
  }

  registerLanguage(
    name: string,
    language: PrismLanguageRegistration | PrismLanguageLoader,
  ): void {
    const canonical = canonicalLanguage(name)
    if (typeof language === 'function' && language.length === 0) {
      this.loaders.set(canonical, language as PrismLanguageLoader)
      this.loaded.delete(canonical)
      return
    }
    const grammar = language as Parameters<typeof refractor.register>[0]
    const grammarName = grammarNameOf(grammar)
    refractor.register(grammar)
    if (grammarName && grammarName !== canonical) {
      refractor.alias(grammarName, canonical)
    }
    this.loaders.set(canonical, async () => language)
    this.loaded.add(canonical)
  }

  loadLanguage(language: string): Promise<void> {
    if (this.disposed) {
      return Promise.reject(
        new Error('[vue-syntax-highlighter] The Prism engine was disposed.'),
      )
    }
    const canonical = canonicalLanguage(language)
    if (PLAIN_LANGUAGES.has(canonical)) return Promise.resolve()
    if (this.loaded.has(canonical) || refractor.registered(canonical)) {
      this.loaded.add(canonical)
      return Promise.resolve()
    }
    const existing = this.loading.get(canonical)
    if (existing) return existing

    const loader = this.loaders.get(canonical)
    if (!loader) {
      return Promise.reject(
        new Error(
          `[vue-syntax-highlighter] Language "${language}" is not available in the Prism adapter. ` +
            'Use a supported language or call engine.registerLanguage(name, grammar) first.',
        ),
      )
    }

    const promise = loader()
      .then((module) => {
        const grammar =
          module && typeof module === 'object' && 'default' in module
            ? (module as { default: unknown }).default
            : module
        const registration = grammar as Parameters<typeof refractor.register>[0]
        const grammarName = grammarNameOf(registration)
        refractor.register(registration)
        if (grammarName && grammarName !== canonical) {
          refractor.alias(grammarName, canonical)
        }
        this.loaded.add(canonical)
      })
      .finally(() => {
        this.loading.delete(canonical)
      })
    this.loading.set(canonical, promise)
    return promise
  }

  highlight(
    request: HighlightRequest,
    _options?: EngineOptions,
  ): HighlightResult | Promise<HighlightResult> {
    const lang = canonicalLanguage(request.language)
    if (PLAIN_LANGUAGES.has(lang)) {
      return createPlainResult(request.code, request.language)
    }
    if (this.loaded.has(lang) || refractor.registered(lang)) {
      return this.highlightSync(request)
    }
    return this.loadLanguage(lang).then(() => this.highlightSync(request))
  }

  private highlightSync(request: HighlightRequest): HighlightResult {
    if (this.disposed) {
      throw new Error('[vue-syntax-highlighter] The Prism engine was disposed.')
    }
    const code = normalizeSource(request.code)
    const lang = canonicalLanguage(request.language)
    const tree = refractor.highlight(code, lang) as HastNode

    const lines: HighlightToken[][] = [[]]
    const push = (text: string, type: HighlightToken['type']): void => {
      if (text.length === 0) return
      const parts = text.split('\n')
      for (let index = 0; index < parts.length; index += 1) {
        if (index > 0) lines.push([])
        const part = parts[index] ?? ''
        if (part.length > 0) lines[lines.length - 1]!.push({ text: part, type })
      }
    }

    const walk = (node: HastNode, classes: unknown): void => {
      if (node.type === 'text') {
        push((node as HastText).value, mapPrismClasses(classes))
        return
      }
      const element = node as HastElement
      for (const child of element.children ?? []) {
        const childClasses =
          child.type === 'element'
            ? combineClasses(classes, (child as HastElement).properties?.className)
            : classes
        walk(child, childClasses)
      }
    }

    const treeChildren = (tree as HastElement).children ?? []
    for (const child of treeChildren) {
      const classes =
        child.type === 'element' ? (child as HastElement).properties?.className : undefined
      walk(child, classes)
    }

    const normalized: HighlightResult = {
      lines: lines.map((tokens) => ({ tokens })),
      language: request.language,
    }
    if (resultToSource(normalized) !== code) {
      return createPlainResult(code, request.language)
    }
    return normalized
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.loaded.clear()
    this.loading.clear()
    this.loaders.clear()
  }
}

function combineClasses(parent: unknown, own: unknown): unknown {
  if (own === undefined) return parent
  if (parent === undefined) return own
  return [...normalize(parent), ...normalize(own)]
}

function normalize(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(/\s+/)
  return []
}

function grammarNameOf(grammar: unknown): string | undefined {
  if (!grammar || (typeof grammar !== 'object' && typeof grammar !== 'function')) {
    return undefined
  }
  const record = grammar as { displayName?: unknown; name?: unknown }
  if (typeof record.displayName === 'string') return record.displayName
  if (typeof record.name === 'string') return record.name
  return undefined
}

function canonicalLanguage(language: string): string {
  const normalized = language.trim().toLowerCase().replace(/^language-/, '')
  return languageAliases[normalized] ?? normalized
}
