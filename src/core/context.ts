import { shallowReactive, type InjectionKey } from 'vue'
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
  if (options.colorScheme && !['auto', 'light', 'dark'].includes(options.colorScheme)) {
    warnOnce(
      'context-color-scheme',
      `Unknown colorScheme "${String(options.colorScheme)}"; expected auto, light, or dark.`,
      warningSet,
    )
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

  const context: HighlighterContext = shallowReactive({
    id: nextContextId++,
    parent,
    engines,
    themeRegistry,
    languages: [...new Set([...(parent?.languages ?? []), ...(options.languages ?? [])])],
    cache,
    cacheOwned,
    engineManager: new EngineManager(engines, warningSet),
    warningSet,
    providesScope,
    disposed: false,
    ...(options.engine !== undefined ? { engine: options.engine } : {}),
    ...(options.theme !== undefined ? { theme: options.theme } : {}),
    ...(options.themes !== undefined ? { themes: options.themes } : {}),
    ...(options.colorScheme !== undefined ? { colorScheme: options.colorScheme } : {}),
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

export interface EngineSelection {
  choice: EngineChoice | undefined
  manager: EngineManager
  owner: HighlighterContext
}

export function selectEngine(
  context: HighlighterContext,
  localChoice?: EngineChoice,
): EngineSelection {
  if (localChoice !== undefined) {
    return { choice: localChoice, manager: context.engineManager, owner: context }
  }
  let current: HighlighterContext | undefined = context
  while (current) {
    if (current.engine !== undefined) {
      return { choice: current.engine, manager: current.engineManager, owner: current }
    }
    current = current.parent
  }
  return { choice: 'shiki', manager: context.engineManager, owner: context }
}

export interface ThemeSelectionFromContext {
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
  registry: Record<string, ThemeDefinition>
  inherited: boolean
  scoped: boolean
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
  const scoped =
    inherited &&
    local.colorScheme === undefined &&
    hasScopeAncestor(context) &&
    (theme !== undefined || themes !== undefined)

  return { theme, themes, colorScheme, registry, inherited, scoped }
}

function hasScopeAncestor(context: HighlighterContext): boolean {
  let current: HighlighterContext | undefined = context
  while (current) {
    if (current.providesScope) return true
    current = current.parent
  }
  return false
}

export async function preloadLanguages(context: HighlighterContext): Promise<void> {
  if (context.disposed || context.languages.length === 0) return
  const selection = selectEngine(context)
  try {
    const engine = await selection.manager.resolve(selection.choice)
    await Promise.allSettled(
      context.languages.map(async (language) => {
        if (!engine.loadLanguage) return
        if (engine.hasLanguage && engine.hasLanguage(language)) return
        await engine.loadLanguage(language)
      }),
    )
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
  context.engineManager.dispose()
  if (context.cacheOwned) context.cache.clear()
}
