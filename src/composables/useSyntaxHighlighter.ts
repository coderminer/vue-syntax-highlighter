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
import { copyText } from '../core/clipboard.js'
import {
  createPlainResult,
  normalizeDisplaySource,
  normalizeSource,
} from '../core/source.js'
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
  readonly copy: () => Promise<boolean>
  readonly getCopyPayload: () => string
  readonly controller: HighlightController
}

export function useSyntaxHighlighter(
  options: UseSyntaxHighlighterOptions,
): UseSyntaxHighlighterReturn {
  const context =
    options.context ?? inject(HIGHLIGHTER_CONTEXT, null) ?? getDefaultContext()
  const instance = getCurrentInstance()

  const language = computed(() => normalizeLanguage(toValue(options.language)))
  const inheritedEngine = computed(() => {
    let current: HighlighterContext | undefined = context
    while (current) {
      if (current.engine !== undefined) return current.engine
      current = current.parent
    }
    return undefined
  })
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
      inheritedEngine.value,
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

  function getCopyPayload(): string {
    const value = toValue(options.code)
    return normalizeSource(typeof value === 'string' ? value : '')
  }

  async function copy(): Promise<boolean> {
    try {
      return await copyText(getCopyPayload())
    } catch {
      return false
    }
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
    copy,
    getCopyPayload,
    controller,
  }
}
