import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type {
  EngineOptions,
  HighlightEngine,
  HighlightRequest,
  HighlightResult,
  HighlightToken,
} from '../../types.js'
import { createPlainResult, normalizeSource, resultToSource, splitSource } from '../../core/source.js'
import { mapShikiScopes } from '../../core/token-types.js'
import { languageAliases, languageLoaders, supportedLanguages } from './languages.js'

const NEUTRAL_THEME = {
  name: 'vsh-neutral',
  type: 'dark' as const,
  colors: {
    'editor.background': '#000000',
    'editor.foreground': '#ffffff',
  },
  settings: [],
}

const PLAIN_LANGUAGES = new Set(['text', 'plain', 'plaintext', 'txt'])

export type ShikiLanguageRegistration = unknown
export type ShikiLanguageLoader = () => Promise<unknown>

export interface ShikiEngine extends HighlightEngine {
  readonly id: 'shiki'
  readonly capabilities: { sync: true }
  registerLanguage(name: string, language: ShikiLanguageRegistration | ShikiLanguageLoader): void
  readonly supportedLanguages: readonly string[]
}

export interface ShikiEngineOptions {
  preload?: readonly string[]
}

export async function createShikiEngine(options: ShikiEngineOptions = {}): Promise<ShikiEngine> {
  const highlighter = await createHighlighterCore({
    themes: [NEUTRAL_THEME],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  })
  const engine = new ShikiEngineImpl(highlighter, options)
  if (options.preload?.length) {
    await Promise.allSettled(options.preload.map((language) => engine.loadLanguage(language)))
  }
  return engine
}

class ShikiEngineImpl implements ShikiEngine {
  readonly id = 'shiki' as const
  readonly capabilities = { sync: true } as const
  readonly supportedLanguages = supportedLanguages

  private readonly loaders = new Map<string, ShikiLanguageLoader>(
    Object.entries(languageLoaders) as [string, ShikiLanguageLoader][],
  )
  private readonly loaded = new Set<string>()
  private readonly loading = new Map<string, Promise<void>>()
  private disposed = false

  constructor(
    private readonly highlighter: HighlighterCore,
    _options: ShikiEngineOptions,
  ) {}

  hasLanguage(language: string): boolean {
    const canonical = canonicalLanguage(language)
    if (PLAIN_LANGUAGES.has(canonical)) return true
    return this.loaded.has(canonical)
  }

  registerLanguage(
    name: string,
    language: ShikiLanguageRegistration | ShikiLanguageLoader,
  ): void {
    const canonical = canonicalLanguage(name)
    if (typeof language === 'function') {
      this.loaders.set(canonical, language as ShikiLanguageLoader)
      this.loaded.delete(canonical)
      return
    }
    this.loaders.set(canonical, async () => language)
    this.loaded.delete(canonical)
  }

  loadLanguage(language: string): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error('[vue-syntax-highlighter] The Shiki engine was disposed.'))
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
          `[vue-syntax-highlighter] Language "${language}" is not available in the Shiki adapter. ` +
            'Use a supported language or call engine.registerLanguage(name, registration) first.',
        ),
      )
    }

    const promise = loader()
      .then(async (module) => {
        const registration =
          module && typeof module === 'object' && 'default' in module
            ? (module as { default: unknown }).default
            : module
        await this.highlighter.loadLanguage(registration as never)
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
    options?: EngineOptions,
  ): HighlightResult | Promise<HighlightResult> {
    const lang = canonicalLanguage(request.language)
    if (PLAIN_LANGUAGES.has(lang)) {
      return createPlainResult(request.code, request.language)
    }
    if (this.loaded.has(lang)) {
      return this.highlightSync(request, options)
    }
    return this.loadLanguage(lang).then(() => this.highlightSync(request, options))
  }

  private highlightSync(request: HighlightRequest, _options?: EngineOptions): HighlightResult {
    if (this.disposed) {
      throw new Error('[vue-syntax-highlighter] The Shiki engine was disposed.')
    }
    const code = normalizeSource(request.code)
    const lang = canonicalLanguage(request.language)
    const options = {
      lang: lang as never,
      theme: NEUTRAL_THEME.name,
      includeExplanation: true as const,
    }
    let result: ReturnType<HighlighterCore['codeToTokens']>
    try {
      result = this.highlighter.codeToTokens(code, options)
    } catch {
      // Shiki 4.5 can throw on the first tokenization of a grammar that has
      // dependencies loaded later (observed with C++). A second call uses the
      // same grammar state without the transient failure.
      result = this.highlighter.codeToTokens(code, options)
    }

    const lines = result.tokens.map((line) => {
      const tokens: HighlightToken[] = []
      for (const token of line) {
        const explanation = (token as { explanation?: readonly { content: string; scopes?: readonly { scopeName: string }[] }[] })
          .explanation
        if (!explanation || explanation.length === 0) {
          if (token.content.length > 0) {
            tokens.push({ text: token.content, type: mapNumericType(token.type) })
          }
          continue
        }
        const joined = explanation.map((entry) => entry.content).join('')
        if (joined !== token.content) {
          if (token.content.length > 0) {
            tokens.push({ text: token.content, type: 'plain' })
          }
          continue
        }
        for (const entry of explanation) {
          if (entry.content.length === 0) continue
          const scopes = (entry.scopes ?? []).map((scope) => scope.scopeName)
          tokens.push({ text: entry.content, type: mapShikiScopes(scopes) })
        }
      }
      return { tokens }
    })

    const normalized = { lines, language: request.language }
    if (resultToSource(normalized) !== code) {
      // Shiki is expected to preserve source text exactly. If a grammar ever
      // violates that invariant, fall back to a safe plain result instead of
      // returning tokens that do not round-trip.
      const plain = createPlainResult(code, request.language)
      const expected = splitSource(code)
      if (plain.lines.length === expected.length) return plain
      throw new Error(
        '[vue-syntax-highlighter] The Shiki adapter produced tokens that do not match the source text.',
      )
    }
    return normalized
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.loaded.clear()
    this.loading.clear()
    this.loaders.clear()
    this.highlighter.dispose()
  }
}

function canonicalLanguage(language: string): string {
  const normalized = language.trim().toLowerCase().replace(/^language-/, '')
  return languageAliases[normalized] ?? normalized
}

function mapNumericType(type: number | undefined): HighlightToken['type'] {
  switch (type) {
    case 1:
      return 'comment'
    case 2:
      return 'string'
    case 3:
      return 'regexp'
    default:
      return 'plain'
  }
}
