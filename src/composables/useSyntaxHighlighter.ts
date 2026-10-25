import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import type {
  EngineOptions,
  HighlightResult,
  HighlightLine,
} from '../types.js'
import {
  getDefaultContext,
  HIGHLIGHTER_CONTEXT,
  type HighlighterContext,
} from '../core/context.js'
import {
  createHighlightController,
  type HighlightController,
} from '../core/controller.js'
import type { EngineChoice } from '../core/engine.js'
import { createPlainResult, normalizeDisplaySource } from '../core/source.js'
import { normalizeLanguage } from '../core/props.js'

export interface UseSyntaxHighlighterOptions {
  code: MaybeRefOrGetter<string>
  language?: MaybeRefOrGetter<string | undefined>
  engine?: MaybeRefOrGetter<EngineChoice | undefined>
  engineOptions?: MaybeRefOrGetter<EngineOptions | undefined>
  context?: HighlighterContext
}

export interface UseSyntaxHighlighterReturn {
  readonly result: ShallowRef<HighlightResult | undefined>
  readonly lines: ComputedRef<readonly HighlightLine[]>
  readonly language: ComputedRef<string>
  readonly loading: ShallowRef<boolean>
  readonly busy: ShallowRef<boolean>
  readonly error: ShallowRef<Error | undefined>
  readonly refresh: () => Promise<HighlightResult | undefined>
  readonly highlight: (input: { code: string; language?: string }) => Promise<HighlightResult>
  readonly controller: HighlightController
}

export function useSyntaxHighlighter(
  options: UseSyntaxHighlighterOptions,
): UseSyntaxHighlighterReturn {
  const context =
    options.context ?? inject(HIGHLIGHTER_CONTEXT, null) ?? getDefaultContext()
  const instance = getCurrentInstance()

  const language = computed(() => normalizeLanguage(toValue(options.language)))
  const controller = createHighlightController({
    context,
    getInput: () => ({
      code: normalizeDisplaySource(toValue(options.code) ?? ''),
      language: language.value,
      engine: toValue(options.engine),
      engineOptions: toValue(options.engineOptions),
    }),
  })

  const lines = computed<readonly HighlightLine[]>(() => {
    if (controller.lines.value) return controller.lines.value
    return createPlainResult(normalizeDisplaySource(toValue(options.code) ?? ''), language.value).lines
  })

  controller.attemptInitialSync()

  const stop = watch(
    () => [
      toValue(options.code),
      language.value,
      toValue(options.engine),
      toValue(options.engineOptions),
    ],
    () => {
      if (controller.started()) controller.schedule()
    },
  )

  if (instance) {
    onMounted(() => {
      if (!controller.started()) void controller.start()
    })
    onBeforeUnmount(() => {
      stop()
      controller.dispose()
    })
  } else {
    void controller.start()
  }

  return {
    result: controller.result,
    lines,
    language,
    loading: controller.busy,
    busy: controller.busy,
    error: controller.error,
    refresh: () => controller.refresh(),
    highlight: (input) => controller.highlight(input),
    controller,
  }
}
