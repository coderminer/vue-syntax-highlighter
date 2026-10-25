import { computed, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue'
import type { ColorScheme, ThemeDefinition, ThemePair } from '../types.js'
import { selectTheme, type HighlighterContext } from '../core/context.js'
import {
  createThemeVariables,
  resolveThemes,
  themeScopeAttributes,
  type ResolvedTheme,
} from '../core/theme.js'
import { warnOnce } from '../core/warn.js'

export interface ThemeLocalSelection {
  theme?: ThemeDefinition | string
  themes?: ThemePair
  colorScheme?: ColorScheme
}

export interface ResolvedThemeScope {
  theme: ShallowRef<ResolvedTheme>
  variables: ComputedRef<Record<string, string>>
  attributes: ComputedRef<Record<string, string>>
  selection: ComputedRef<ThemeLocalSelection>
}

export function useResolvedTheme(
  context: HighlighterContext,
  getLocal: () => ThemeLocalSelection,
): ResolvedThemeScope {
  const theme = shallowRef<ResolvedTheme>(resolveThemes())
  const selection = computed<ThemeLocalSelection>(() => {
    const picked = selectTheme(context, getLocal())
    return {
      ...(picked.theme !== undefined ? { theme: picked.theme } : {}),
      ...(picked.themes !== undefined ? { themes: picked.themes } : {}),
      ...(picked.colorScheme !== undefined ? { colorScheme: picked.colorScheme } : {}),
    }
  })

  watch(
    selection,
    (next) => {
      try {
        theme.value = resolveThemes({
          ...next,
          registry: context.themeRegistry,
          fallback: theme.value,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnOnce(`theme-invalid:${message}`, message, context.warningSet)
      }
    },
    { immediate: true },
  )

  const variables = computed(() => createThemeVariables(theme.value))
  const attributes = computed(() => themeScopeAttributes(theme.value))

  return { theme, variables, attributes, selection }
}
