import { getCurrentInstance, shallowReactive, type InjectionKey } from 'vue'
import type {
  ColorScheme,
  HighlighterOptions,
  HighlightCacheLike,
  ThemeDefinition,
  ThemePair,
} from '../types.js'
import { ResultCache } from './cache.js'
import {
  EngineManager,
  hasBuiltinEngineLoader,
  isHighlightEngine,
  type EngineChoice,
  type EngineRegistry,
} from './engine.js'
import { BUILTIN_THEME_REGISTRY } from './theme.js'
import { createWarningSet, warnOnce, type WarningSet } from './warn.js'

export interface HighlighterContext {
  readonly id: number
  parent?: HighlighterContext
  engine?: EngineChoice
  engines: EngineRegistry
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  themeRegistry: Record<string, ThemeDefinition>
  languages: string[]
  cache: HighlightCacheLike
  cacheOwned: boolean
  engineManager: EngineManager
  abortController: AbortController
  abortSignal: AbortSignal
  warningSet: WarningSet
  defer?: boolean
  rootMargin?: string
  virtualized?: boolean | 'auto'
  virtualizeAfter?: number
  providesScope: boolean
  disposed: boolean
}

let nextContextId = 1

export const HIGHLIGHTER_CONTEXT: InjectionKey<HighlighterContext> = Symbol(
  'vue-syntax-highlighter-context',
)

function mergeRegistry(
  parent: EngineRegistry | undefined,
  own: EngineRegistry | undefined,
): EngineRegistry {
  return { ...(parent ?? {}), ...(own ?? {}) }
}

function assertEngines(engines: EngineRegistry | undefined): void {
  if (!engines) return
  if (typeof engines !== 'object' || Array.isArray(engines)) {
    throw new TypeError('[vue-syntax-highlighter] "engines" must be an object of engine loaders.')
  }
  for (const [name, engine] of Object.entries(engines)) {
    if (typeof engine !== 'function' && !isHighlightEngine(engine)) {
      throw new TypeError(
        `[vue-syntax-highlighter] Invalid engine registration "${name}". ` +
          'Expected an engine object or a loader function.',
      )
    }
  }
}

export function createHighlighterContext(
  options: HighlighterOptions = {},
  parent?: HighlighterContext,
  providesScope = false,
): HighlighterContext {
  assertEngines(options.engines)

  const warningSet = parent?.warningSet ?? createWarningSet()
  let contextColorScheme = options.colorScheme
  if (
    contextColorScheme !== undefined &&
    !['auto', 'light', 'dark'].includes(contextColorScheme)
  ) {
    warnOnce(
      'context-color-scheme',
      `Unknown colorScheme "${String(contextColorScheme)}"; expected auto, light, or dark.`,
      warningSet,
    )
    contextColorScheme = undefined
  }

  let cache: HighlightCacheLike
  let cacheOwned = false
  if (options.cache) {
    cache = options.cache
  } else if (
    parent &&
    options.cacheCapacity === undefined &&
    options.cacheMaxChars === undefined
  ) {
    cache = parent.cache
  } else {
    cache = new ResultCache({
      capacity: options.cacheCapacity,
      maxChars: options.cacheMaxChars,
    })
    cacheOwned = true
  }

  const engines = mergeRegistry(parent?.engines, options.engines)
  const themeRegistry = {
    ...BUILTIN_THEME_REGISTRY,
    ...(parent?.themeRegistry ?? {}),
    ...(options.themeRegistry ?? {}),
  }

  const abortController = new AbortController()
  const context: HighlighterContext = shallowReactive({
    id: nextContextId++,
    parent,
    engines,
    themeRegistry,
    languages: [...new Set([...(parent?.languages ?? []), ...(options.languages ?? [])])],
    cache,
    cacheOwned,
    engineManager: new EngineManager(engines, warningSet),
    abortController,
    abortSignal: abortController.signal,
    warningSet,
    providesScope,
    disposed: false,
    ...(options.engine !== undefined ? { engine: options.engine } : {}),
    ...(options.theme !== undefined ? { theme: options.theme } : {}),
    ...(options.themes !== undefined ? { themes: options.themes } : {}),
    ...(contextColorScheme !== undefined ? { colorScheme: contextColorScheme } : {}),
    ...(options.defer !== undefined ? { defer: options.defer } : {}),
    ...(options.rootMargin !== undefined ? { rootMargin: options.rootMargin } : {}),
    ...(options.virtualized !== undefined ? { virtualized: options.virtualized } : {}),
    ...(options.virtualizeAfter !== undefined
      ? { virtualizeAfter: options.virtualizeAfter }
      : {}),
  })
  return context
}

let globalContext: HighlighterContext | undefined

export function getGlobalContext(): HighlighterContext {
  globalContext ??= createHighlighterContext({}, undefined, false)
  return globalContext
}

const appContexts = new WeakMap<object, HighlighterContext>()

/**
 * Components without a provider/plugin get one context per Vue application.
 * This keeps browser state shared within an app while isolating SSR requests
 * (each request creates its own app context) from one another.
 */
export function getDefaultContext(): HighlighterContext {
  const appContext = getCurrentInstance()?.appContext
  if (!appContext) return getGlobalContext()
  let context = appContexts.get(appContext)
  if (!context) {
    context = createHighlighterContext({}, undefined, false)
    appContexts.set(appContext, context)
  }
  return context
}

export interface HighlighterBehavior {
  defer: boolean
  rootMargin: string
  virtualized: boolean | 'auto'
  virtualizeAfter: number
}

export const DEFAULT_HIGHLIGHTER_BEHAVIOR: HighlighterBehavior = Object.freeze({
  defer: false,
  rootMargin: '200px 0px',
  virtualized: false,
  virtualizeAfter: 2000,
})

export function selectHighlighterBehavior(context: HighlighterContext): HighlighterBehavior {
  let defer: boolean | undefined
  let rootMargin: string | undefined
  let virtualized: boolean | 'auto' | undefined
  let virtualizeAfter: number | undefined

  let current: HighlighterContext | undefined = context
  while (current) {
    if (defer === undefined && current.defer !== undefined) defer = current.defer
    if (rootMargin === undefined && current.rootMargin !== undefined) {
      rootMargin = current.rootMargin
    }
    if (virtualized === undefined && current.virtualized !== undefined) {
      virtualized = current.virtualized
    }
    if (virtualizeAfter === undefined && current.virtualizeAfter !== undefined) {
      virtualizeAfter = current.virtualizeAfter
    }
    current = current.parent
  }

  return {
    defer: defer ?? DEFAULT_HIGHLIGHTER_BEHAVIOR.defer,
    rootMargin: rootMargin ?? DEFAULT_HIGHLIGHTER_BEHAVIOR.rootMargin,
    virtualized: virtualized ?? DEFAULT_HIGHLIGHTER_BEHAVIOR.virtualized,
    virtualizeAfter: virtualizeAfter ?? DEFAULT_HIGHLIGHTER_BEHAVIOR.virtualizeAfter,
  }
}

export interface EngineSelection {
  choice: EngineChoice | undefined
  manager: EngineManager
}

export function selectEngine(
  context: HighlighterContext,
  localChoice?: EngineChoice,
): EngineSelection {
  if (localChoice !== undefined) {
    return { choice: localChoice, manager: context.engineManager }
  }
  let current: HighlighterContext | undefined = context
  while (current) {
    if (current.engine !== undefined) {
      return { choice: current.engine, manager: current.engineManager }
    }
    current = current.parent
  }
  return { choice: 'shiki', manager: context.engineManager }
}

export interface ThemeSelectionFromContext {
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  registry: Record<string, ThemeDefinition>
}

export function selectTheme(
  context: HighlighterContext,
  local: { theme?: ThemeDefinition | string; themes?: ThemePair; colorScheme?: ColorScheme },
): ThemeSelectionFromContext {
  const inherited = local.theme === undefined && local.themes === undefined
  let theme: ThemeDefinition | string | undefined = local.theme
  let themes: ThemePair | undefined = local.themes
  let colorScheme: ColorScheme | undefined = local.colorScheme

  if (inherited) {
    let current: HighlighterContext | undefined = context
    while (current) {
      if (current.themes !== undefined || current.theme !== undefined) {
        themes = current.themes
        theme = current.theme
        break
      }
      current = current.parent
    }
  }

  if (colorScheme === undefined) {
    let current: HighlighterContext | undefined = context
    while (current) {
      if (current.colorScheme !== undefined) {
        colorScheme = current.colorScheme
        break
      }
      current = current.parent
    }
  }

  const registry = context.themeRegistry
  return { theme, themes, colorScheme, registry }
}

export async function preloadLanguages(context: HighlighterContext): Promise<void> {
  if (context.disposed || context.languages.length === 0) return

  let configuredEngine = false
  let current: HighlighterContext | undefined = context
  while (current) {
    if (current.engine !== undefined) {
      configuredEngine = true
      break
    }
    current = current.parent
  }
  // The core entry has no default engine. A provider may preload languages for
  // a child that supplies its own engine later; there is nothing to preload
  // here, and resolving the implicit Shiki default would only emit a warning.
  if (!configuredEngine && !hasBuiltinEngineLoader()) return

  const selection = selectEngine(context)
  try {
    const engine = await selection.manager.resolve(selection.choice)
    const languages = [...context.languages]
    const results = await Promise.allSettled(
      languages.map(async (language) => {
        if (!engine.loadLanguage) return
        if (engine.hasLanguage && engine.hasLanguage(language)) return
        await engine.loadLanguage(language)
      }),
    )
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return
      const language = languages[index] ?? 'unknown'
      const detail =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      warnOnce(
        `preload-language:${language}:${detail}`,
        `Unable to preload language "${language}": ${detail}`,
        context.warningSet,
      )
    })
  } catch (error) {
    warnOnce(
      'preload-failed',
      `Unable to preload languages: ${error instanceof Error ? error.message : String(error)}`,
      context.warningSet,
    )
  }
}

export function disposeContext(context: HighlighterContext): void {
  if (context.disposed) return
  context.disposed = true
  context.abortController.abort()
  context.engineManager.dispose()
  if (context.cacheOwned) context.cache.clear()
}
