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
  getGlobalContext,
  HIGHLIGHTER_CONTEXT,
  preloadLanguages,
  type HighlighterContext,
} from '../core/context.js'
import type { EngineChoice, EngineRegistry } from '../core/engine.js'
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
    defer: { type: Boolean, default: undefined },
    rootMargin: { type: String, default: undefined },
    virtualized: {
      type: [Boolean, String] as PropType<boolean | 'auto'>,
      default: undefined,
    },
    virtualizeAfter: { type: Number, default: undefined },
  },
  setup(props, { slots }) {
    const parent = inject(HIGHLIGHTER_CONTEXT, getGlobalContext())
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
        ...(props.defer !== undefined ? { defer: props.defer } : {}),
        ...(props.rootMargin !== undefined ? { rootMargin: props.rootMargin } : {}),
        ...(props.virtualized !== undefined ? { virtualized: props.virtualized } : {}),
        ...(props.virtualizeAfter !== undefined
          ? { virtualizeAfter: props.virtualizeAfter }
          : {}),
      },
      parent,
      true,
    )

    provide(HIGHLIGHTER_CONTEXT, context)

    const resolvedTheme = useResolvedTheme(context, () => ({
      theme: props.theme,
      themes: props.themes,
      colorScheme: props.colorScheme,
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
        if (value === undefined) delete context.colorScheme
        else context.colorScheme = value
      },
    )
    watch(
      () => props.languages,
      (value) => {
        if (value) context.languages = [...new Set(value)]
      },
    )

    onMounted(() => {
      void preloadLanguages(context)
    })

    onBeforeUnmount(() => {
      disposeContext(context)
    })

    return () =>
      h(
        'div',
        {
          class: 'vsh-scope',
          style: { display: 'contents', ...resolvedTheme.variables.value },
          ...resolvedTheme.attributes.value,
        },
        slots.default?.(),
      )
  },
})

export type { HighlighterContext, HighlightEngine }
