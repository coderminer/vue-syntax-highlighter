import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  type PropType,
} from 'vue'
import type {
  ColorScheme,
  HighlightCacheLike,
  HighlightEngine,
  ThemeDefinition,
  ThemePair,
} from '../types.js'
import {
  createHighlighterContext,
  disposeContext,
  getDefaultContext,
  HIGHLIGHTER_CONTEXT,
  preloadLanguages,
  type HighlighterContext,
} from '../core/context.js'
import type { EngineChoice, EngineRegistry } from '../core/engine.js'
import { isColorScheme } from '../core/theme.js'
import { warnOnce } from '../core/warn.js'
import { useResolvedTheme } from './use-theme.js'

export const SyntaxHighlighterProvider = defineComponent({
  name: 'SyntaxHighlighterProvider',
  props: {
    engine: { type: [String, Object] as PropType<EngineChoice>, default: undefined },
    engines: { type: Object as PropType<EngineRegistry>, default: undefined },
    theme: { type: [String, Object] as PropType<ThemeDefinition | string>, default: undefined },
    themes: { type: Object as PropType<ThemePair>, default: undefined },
    colorScheme: { type: String as PropType<ColorScheme>, default: undefined },
    themeRegistry: {
      type: Object as PropType<Record<string, ThemeDefinition>>,
      default: undefined,
    },
    languages: { type: Array as PropType<readonly string[]>, default: undefined },
    cache: { type: Object as PropType<HighlightCacheLike>, default: undefined },
    cacheCapacity: { type: Number, default: undefined },
    cacheMaxChars: { type: Number, default: undefined },
    cacheEngineIdentity: { type: Boolean, default: undefined },
    renderless: { type: Boolean, default: false },
    defer: { type: Boolean, default: undefined },
    rootMargin: { type: String, default: undefined },
    virtualized: {
      type: [Boolean, String] as PropType<boolean | 'auto'>,
      default: undefined,
    },
    virtualizeAfter: { type: Number, default: undefined },
    scopeTag: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const parent = inject(HIGHLIGHTER_CONTEXT, null) ?? getDefaultContext()
    const context = createHighlighterContext(
      {
        ...(props.engine !== undefined ? { engine: props.engine } : {}),
        ...(props.engines !== undefined ? { engines: props.engines } : {}),
        ...(props.theme !== undefined ? { theme: props.theme } : {}),
        ...(props.themes !== undefined ? { themes: props.themes } : {}),
        ...(props.colorScheme !== undefined ? { colorScheme: props.colorScheme } : {}),
        ...(props.themeRegistry !== undefined ? { themeRegistry: props.themeRegistry } : {}),
        ...(props.languages !== undefined ? { languages: [...props.languages] } : {}),
        ...(props.cache !== undefined ? { cache: props.cache } : {}),
        ...(props.cacheCapacity !== undefined ? { cacheCapacity: props.cacheCapacity } : {}),
        ...(props.cacheMaxChars !== undefined ? { cacheMaxChars: props.cacheMaxChars } : {}),
        ...(props.cacheEngineIdentity !== undefined
          ? { cacheEngineIdentity: props.cacheEngineIdentity }
          : {}),
        scopeMode: props.renderless ? 'renderless' : 'wrapper',
        ...(props.defer !== undefined ? { defer: props.defer } : {}),
        ...(props.rootMargin !== undefined ? { rootMargin: props.rootMargin } : {}),
        ...(props.virtualized !== undefined ? { virtualized: props.virtualized } : {}),
        ...(props.virtualizeAfter !== undefined
          ? { virtualizeAfter: props.virtualizeAfter }
          : {}),
      },
      parent,
      !props.renderless,
    )

    provide(HIGHLIGHTER_CONTEXT, context)

    watch(
      () => props.renderless,
      (renderless) => {
        context.scopeMode = renderless ? 'renderless' : 'wrapper'
        context.providesScope = !renderless
      },
    )

    watch(
      [() => props.renderless, () => props.scopeTag],
      ([renderless, scopeTag]) => {
        if (renderless && scopeTag !== undefined) {
          warnOnce(
            'provider-renderless-scope-tag',
            'The "scopeTag" prop is ignored when "renderless" is enabled because no wrapper element is rendered.',
            context.warningSet,
          )
        }
      },
      { immediate: true },
    )

    const resolvedTheme = useResolvedTheme(context, () => ({
      theme: props.theme,
      themes: props.themes,
      colorScheme: isColorScheme(props.colorScheme) ? props.colorScheme : undefined,
    }))

    watch(
      () => props.engine,
      (value) => {
        if (value === undefined) delete context.engine
        else context.engine = value
      },
    )
    watch(
      () => props.theme,
      (value) => {
        if (value === undefined) delete context.theme
        else context.theme = value
      },
    )
    watch(
      () => props.themes,
      (value) => {
        if (value === undefined) delete context.themes
        else context.themes = value
      },
    )
    watch(
      () => props.colorScheme,
      (value) => {
        if (value === undefined) {
          delete context.colorScheme
        } else if (isColorScheme(value)) {
          context.colorScheme = value
        } else {
          delete context.colorScheme
          warnOnce(
            'context-color-scheme',
            `Unknown colorScheme "${String(value)}"; expected auto, light, or dark.`,
            context.warningSet,
          )
        }
      },
    )
    const mergeLanguages = (value: readonly string[] | undefined): string[] => [
      ...new Set([...(parent.languages ?? []), ...(value ?? [])]),
    ]
    watch(
      [() => props.languages, () => parent.languages],
      () => {
        context.languages = mergeLanguages(props.languages)
        void preloadLanguages(context)
      },
    )
    watch(
      () => props.defer,
      (value) => {
        if (value === undefined) delete context.defer
        else context.defer = value
      },
    )
    watch(
      () => props.rootMargin,
      (value) => {
        if (value === undefined) delete context.rootMargin
        else context.rootMargin = value
      },
    )
    watch(
      () => props.virtualized,
      (value) => {
        if (value === undefined) delete context.virtualized
        else context.virtualized = value
      },
    )
    watch(
      () => props.virtualizeAfter,
      (value) => {
        if (value === undefined) delete context.virtualizeAfter
        else context.virtualizeAfter = value
      },
    )

    watch(
      () => [
        props.engines,
        props.themeRegistry,
        props.cache,
        props.cacheCapacity,
        props.cacheMaxChars,
        props.cacheEngineIdentity,
      ],
      () => {
        warnOnce(
          'provider-static-config',
          'Changes to provider engines, themeRegistry, cache, cacheCapacity, cacheMaxChars, or cacheEngineIdentity after creation are ignored. Recreate the provider or plugin scope to apply them.',
          context.warningSet,
        )
      },
    )

    onMounted(() => {
      void preloadLanguages(context)
    })

    onBeforeUnmount(() => {
      disposeContext(context)
    })

    return () => {
      const children = slots.default?.()
      if (props.renderless) return children
      return h(
        props.scopeTag || 'div',
        {
          class: 'vsh-scope',
          style: { display: 'contents', ...resolvedTheme.variables.value },
          ...resolvedTheme.attributes.value,
        },
        children,
      )
    }
  },
})

export type { HighlighterContext, HighlightEngine }
