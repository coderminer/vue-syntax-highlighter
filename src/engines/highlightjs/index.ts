import { createLowlight } from 'lowlight'
import type { LanguageFn } from 'highlight.js'
import type {
  EngineOptions,
  HighlightEngine,
  HighlightRequest,
  HighlightResult,
  HighlightToken,
} from '../../types.js'
import { createPlainResult, normalizeSource, resultToSource } from '../../core/source.js'
import { mapHljsClasses } from '../../core/token-types.js'
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

interface HastRoot {
  type: 'root'
  children?: HastNode[]
}

type HastNode = HastText | HastElement | { type: string; children?: HastNode[] }

export type HighlightjsLanguageRegistration = LanguageFn
export type HighlightjsLanguageLoader = () => Promise<{ default: LanguageFn } | LanguageFn>

export interface HighlightjsEngine extends HighlightEngine {
  readonly id: 'highlightjs'
  readonly capabilities: { sync: true }
  hasLanguage(language: string): boolean
  loadLanguage(language: string): Promise<void>
  registerLanguage(
    name: string,
    language: HighlightjsLanguageRegistration | HighlightjsLanguageLoader,
  ): void
  readonly supportedLanguages: readonly string[]
}

export interface HighlightjsEngineOptions {
  preload?: readonly string[]
}

export async function createHighlightjsEngine(
  options: HighlightjsEngineOptions = {},
): Promise<HighlightjsEngine> {
  const engine = new HighlightjsEngineImpl(options)
  if (options.preload?.length) {
    await Promise.allSettled(options.preload.map((language) => engine.loadLanguage(language)))
  }
  return engine
}

class HighlightjsEngineImpl implements HighlightjsEngine {
  readonly id = 'highlightjs' as const
  readonly capabilities = { sync: true } as const
  readonly supportedLanguages = supportedLanguages

  private readonly lowlight = createLowlight()
  private readonly loaders = new Map<string, HighlightjsLanguageLoader>(
    Object.entries(languageLoaders) as [string, HighlightjsLanguageLoader][],
  )
  private readonly loaded = new Set<string>()
  private readonly loading = new Map<string, Promise<void>>()
  private disposed = false

  constructor(_options: HighlightjsEngineOptions) {}

  hasLanguage(language: string): boolean {
    const canonical = canonicalLanguage(language)
    if (PLAIN_LANGUAGES.has(canonical)) return true
    return this.loaded.has(canonical)
  }

  registerLanguage(
    name: string,
    language: HighlightjsLanguageRegistration | HighlightjsLanguageLoader,
  ): void {
    const canonical = canonicalLanguage(name)
    // highlight.js grammars are functions too. A zero-argument function is
    // treated as a loader; a grammar receives the highlight.js instance.
    if (typeof language === 'function' && language.length === 0) {
      this.loaders.set(canonical, language as HighlightjsLanguageLoader)
      this.loaded.delete(canonical)
      return
    }
    const grammar = language as HighlightjsLanguageRegistration
    this.lowlight.register(canonical, grammar)
    this.loaders.set(canonical, async () => grammar)
    this.loaded.add(canonical)
  }

  loadLanguage(language: string): Promise<void> {
    if (this.disposed) {
      return Promise.reject(
        new Error('[vue-syntax-highlighter] The highlight.js engine was disposed.'),
      )
    }
    const canonical = canonicalLanguage(language)
    if (PLAIN_LANGUAGES.has(canonical)) return Promise.resolve()
    if (this.loaded.has(canonical)) return Promise.resolve()
    const existing = this.loading.get(canonical)
    if (existing) return existing

    const loader = this.loaders.get(canonical)
    if (!loader) {
      return Promise.reject(
        new Error(
          `[vue-syntax-highlighter] Language "${language}" is not available in the highlight.js adapter. ` +
            'Use a supported language or call engine.registerLanguage(name, grammar) first.',
        ),
      )
    }

    const promise = loader()
      .then((module) => {
        const grammar =
          typeof module === 'function'
            ? module
            : (module as { default: LanguageFn }).default
        this.lowlight.register(canonical, grammar)
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
    if (this.loaded.has(lang)) return this.highlightSync(request)
    return this.loadLanguage(lang).then(() => this.highlightSync(request))
  }

  private highlightSync(request: HighlightRequest): HighlightResult {
    if (this.disposed) {
      throw new Error('[vue-syntax-highlighter] The highlight.js engine was disposed.')
    }
    const code = normalizeSource(request.code)
    const lang = canonicalLanguage(request.language)
    const tree = this.lowlight.highlight(lang, code) as HastRoot

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
        push((node as HastText).value, mapHljsClasses(classes))
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

    for (const child of tree.children ?? []) {
      const classes =
        child.type === 'element' ? (child as HastElement).properties?.className : undefined
      walk(child, classes)
    }

    const normalized: HighlightResult = { lines: lines.map((tokens) => ({ tokens })), language: request.language }
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

function canonicalLanguage(language: string): string {
  const normalized = language.trim().toLowerCase().replace(/^language-/, '')
  return languageAliases[normalized] ?? normalized
}
