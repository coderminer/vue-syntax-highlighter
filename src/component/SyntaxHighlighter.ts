import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type VNode,
  type VNodeChild,
} from 'vue'
import type {
  HighlightLine,
  HighlightResult,
  HighlightToken,
  HighlightedEventContext,
  LineRenderInfo,
  TokenRenderInfo,
} from '../types.js'
import {
  getDefaultContext,
  HIGHLIGHTER_CONTEXT,
  selectHighlighterBehavior,
} from '../core/context.js'
import { createHighlightController } from '../core/controller.js'
import { normalizeProps, highlighterProps, type RawHighlighterProps } from '../core/props.js'
import { copyText } from '../core/clipboard.js'
import { createPlainResult, normalizeSource } from '../core/source.js'
import {
  computeVirtualWindow,
  decideVirtualization,
  toCssSize,
} from '../core/virtual.js'
import { warnOnce } from '../core/warn.js'
import { useResolvedTheme } from './use-theme.js'

function mergeClass(base: unknown, extra: unknown): unknown {
  return extra === undefined ? base : [base, extra]
}

function viewportFallback(value: string | number | undefined, fallback = 400): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim())
  return match ? Number(match[1]) : fallback
}

export const SyntaxHighlighter = defineComponent({
  name: 'SyntaxHighlighter',
  inheritAttrs: false,
  props: highlighterProps,
  emits: {
    highlighted: (_result: HighlightResult, _context: HighlightedEventContext) => true,
    error: (_error: Error) => true,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const context = inject(HIGHLIGHTER_CONTEXT, null) ?? getDefaultContext()
    const normalized = computed(() =>
      normalizeProps(
        props as unknown as RawHighlighterProps,
        context.warningSet,
        selectHighlighterBehavior(context),
      ),
    )

    const resolvedTheme = useResolvedTheme(context, () => ({
      theme: normalized.value.theme,
      themes: normalized.value.themes,
      colorScheme: normalized.value.colorScheme,
    }))

    const hasProviderScope = computed(() => {
      let current: typeof context | undefined = context
      while (current) {
        if (current.providesScope) return true
        current = current.parent
      }
      return false
    })
    const localThemeOverride = computed(
      () =>
        props.theme !== undefined ||
        props.themes !== undefined ||
        props.colorScheme !== undefined,
    )
    const ownsScope = computed(() => localThemeOverride.value || !hasProviderScope.value)

    const plain = computed(() =>
      createPlainResult(normalized.value.code, normalized.value.language),
    )

    // Engine selection walks the provider chain. Track ancestors so a block
    // inside a nested provider re-highlights when an outer provider changes
    // its engine, not only when its nearest context changes.
    const inheritedEngine = computed(() => {
      let current: typeof context | undefined = context
      while (current) {
        if (current.engine !== undefined) return current.engine
        current = current.parent
      }
      return undefined
    })
    const selectedEngine = computed(() =>
      props.engine !== undefined ? props.engine : inheritedEngine.value,
    )

    const controller = createHighlightController({
      context,
      getInput: () => {
        const current = normalized.value
        return {
          code: current.code,
          language: current.language,
          engine: current.engine,
          engineOptions: current.engineOptions,
        }
      },
      isDeferred: () => normalized.value.defer,
      onResult: (result) => {
        const theme = resolvedTheme.theme.value
        emit('highlighted', result, {
          language: result.language,
          theme: theme.scopeName,
          colorScheme: theme.mode,
        })
      },
      onError: (error) => emit('error', error),
    })

    const mounted = ref(false)
    const scrollTop = ref(0)
    const measuredHeight = ref(0)
    const preEl = shallowRef<HTMLElement | undefined>()
    const rootEl = shallowRef<HTMLElement | undefined>()

    const renderedLines = computed(() => controller.result.value?.lines ?? plain.value.lines)

    const virtualDecision = computed(() => {
      const current = normalized.value
      return decideVirtualization({
        virtualized: current.virtualized,
        lineCount: renderedLines.value.length,
        threshold: current.virtualizeAfter,
        wrap: current.wrap,
        height: current.height,
        maxHeight: current.maxHeight,
      })
    })

    // The fallback viewport derived from height/maxHeight is deterministic, so
    // the same window is safe to render on the server and during hydration.
    const virtualActive = computed(() => virtualDecision.value.active)

    watchEffect(() => {
      if (!mounted.value) return
      if (normalized.value.virtualized === false) return
      const decision = virtualDecision.value
      if (decision.active || decision.reason === 'threshold' || decision.reason === 'disabled') {
        return
      }
      const requirement =
        decision.reason === 'wrap'
          ? 'Virtualization requires wrap=false because variable-height lines cannot be windowed safely.'
          : 'Virtualization requires a bounded height or maxHeight.'
      warnOnce(
        `virtualization:${decision.reason}`,
        `Virtualization was disabled: ${requirement}`,
        context.warningSet,
      )
    })

    const virtualWindow = computed(() => {
      const current = normalized.value
      const fallback = viewportFallback(current.height ?? current.maxHeight)
      return computeVirtualWindow({
        scrollTop: scrollTop.value,
        viewportHeight: measuredHeight.value || fallback,
        lineHeight: current.lineHeight,
        overscan: current.overscan,
        lineCount: renderedLines.value.length,
      })
    })

    const visibleLines = computed(() => {
      const lines = renderedLines.value
      if (!virtualActive.value) {
        return lines.map((line, index) => ({ line, index }))
      }
      const window = virtualWindow.value
      return lines
        .slice(window.start, window.end)
        .map((line, index) => ({ line, index: window.start + index }))
    })

    function isHighlighted(lineNumber: number): boolean {
      for (const entry of normalized.value.highlightLines) {
        if (typeof entry === 'number') {
          if (entry === lineNumber) return true
          continue
        }
        if (lineNumber >= entry[0] && lineNumber <= entry[1]) return true
      }
      return false
    }

    function renderToken(
      token: HighlightToken,
      tokenIndex: number,
      line: HighlightLine,
      lineNumber: number,
    ): VNodeChild {
      const info: TokenRenderInfo = {
        token,
        index: tokenIndex,
        line,
        lineNumber,
        tokenIndex,
      }
      const defaultNode = () => {
        const extra = normalized.value.tokenProps?.(info) ?? {}
        const { class: extraClass, ...rest } = extra
        return h(
          'span',
          {
            ...rest,
            class: mergeClass(['vsh-token', `vsh-token-${token.type}`], extraClass),
          },
          token.text,
        )
      }
      if (!slots.token) return defaultNode()
      return slots.token({ ...info, renderToken: defaultNode }) ?? defaultNode()
    }

    function renderLine(line: HighlightLine, index: number, virtualActiveNow: boolean): VNode {
      const current = normalized.value
      const lineNumber = current.startLine + index
      const highlighted = isHighlighted(lineNumber)
      const info: LineRenderInfo = { line, lineNumber, index, highlighted }
      const extra = current.lineProps?.(info) ?? {}
      const { class: extraClass, style: extraStyle, ...rest } = extra

      const renderTokens = () =>
        line.tokens.map((token, tokenIndex) =>
          renderToken(token, tokenIndex, line, lineNumber),
        )
      const renderGutter = (): VNode | null => {
        if (!current.lineNumbers) return null
        const payload = {
          ...info,
          tokens: line.tokens,
          renderTokens,
        }
        const content = slots['line-number']?.(payload) ?? String(lineNumber)
        return h('span', { class: 'vsh-gutter', 'aria-hidden': 'true' }, content)
      }

      const linePayload = {
        ...info,
        tokens: line.tokens,
        renderTokens,
      }
      const slotContent = slots.line?.(linePayload)
      const content = slotContent ?? renderTokens()

      // Virtualization positions rows with padding computed from lineHeight.
      // The base `.vsh-line` min-height (1.5em) can be taller than the numeric
      // lineHeight, so it must not participate in the virtual row box.
      const lineStyle = virtualActiveNow
        ? [
            {
              height: `${current.lineHeight}px`,
              minHeight: '0px',
              lineHeight: `${current.lineHeight}px`,
            },
            extraStyle,
          ]
        : extraStyle

      return h(
        'span',
        {
          ...rest,
          class: mergeClass(
            ['vsh-line', highlighted && 'vsh-line-highlighted'],
            extraClass,
          ),
          style: lineStyle,
          'data-line': lineNumber,
        },
        [renderGutter(), h('span', { class: 'vsh-line-content' }, content)],
      )
    }

    function setPreElement(value: unknown): void {
      const element =
        value && typeof value === 'object' && '$el' in (value as Record<string, unknown>)
          ? ((value as { $el?: unknown }).$el as HTMLElement | undefined)
          : (value as HTMLElement | undefined)
      preEl.value = element ?? undefined
    }

    function setRootElement(value: unknown): void {
      rootEl.value = (value as HTMLElement | undefined) ?? undefined
    }

    function measure(): void {
      if (!preEl.value) return
      measuredHeight.value = preEl.value.clientHeight
      scrollTop.value = preEl.value.scrollTop
    }

    let frame = 0
    function onScroll(): void {
      if (!virtualActive.value || typeof requestAnimationFrame === 'undefined') return
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (preEl.value) scrollTop.value = preEl.value.scrollTop
      })
    }

    let observer: IntersectionObserver | undefined
    let resizeObserver: ResizeObserver | undefined
    let observedPre: HTMLElement | undefined

    function disconnectDeferred(): void {
      observer?.disconnect()
      observer = undefined
    }

    function startHighlighting(): void {
      void controller.start()
    }

    function observeDeferred(): void {
      if (controller.started()) return
      if (!normalized.value.defer) {
        disconnectDeferred()
        startHighlighting()
        return
      }
      const observed = preEl.value ?? rootEl.value
      if (!observed || typeof IntersectionObserver === 'undefined') {
        disconnectDeferred()
        startHighlighting()
        return
      }
      disconnectDeferred()
      try {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              disconnectDeferred()
              startHighlighting()
            }
          },
          { rootMargin: normalized.value.rootMargin },
        )
        observer.observe(observed)
      } catch (error) {
        observer = undefined
        warnOnce(
          'intersection-observer',
          `Unable to observe the deferred block: ${
            error instanceof Error ? error.message : String(error)
          }. Highlighting immediately instead.`,
          context.warningSet,
        )
        startHighlighting()
      }
    }

    onMounted(() => {
      mounted.value = true
      measure()
      observedPre = preEl.value
      if (typeof ResizeObserver !== 'undefined' && preEl.value) {
        resizeObserver = new ResizeObserver(() => measure())
        resizeObserver.observe(preEl.value)
      }
      if (typeof window !== 'undefined' && typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', measure)
      }
      observeDeferred()
    })

    // preTag can change after mount. Move both observers to the new element so
    // sizing stays fresh and deferral still waits for the visible block. The
    // initial element is handled by onMounted above; the identity check keeps
    // this watcher from attaching a second observer during the first flush.
    watch(preEl, (element, previous) => {
      if (!mounted.value) return
      if (previous && previous !== element) resizeObserver?.unobserve(previous)
      if (element && element !== observedPre) {
        if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => measure())
        }
        resizeObserver?.observe(element)
        observedPre = element
        measure()
      } else if (!element) {
        observedPre = undefined
      }
      if (previous) observeDeferred()
    })

    watch(
      [() => normalized.value.defer, () => normalized.value.rootMargin],
      () => {
        if (!mounted.value) return
        observeDeferred()
      },
    )

    onBeforeUnmount(() => {
      mounted.value = false
      if (frame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
      frame = 0
      disconnectDeferred()
      resizeObserver?.disconnect()
      resizeObserver = undefined
      if (typeof window !== 'undefined') window.removeEventListener('resize', measure)
      controller.dispose()
    })

    watch(
      () => [props.code, props.language, props.engine, props.engineOptions, selectedEngine.value],
      () => controller.schedule(),
    )

    // A synchronous custom/preloaded engine produces its first result during
    // setup, so SSR markup and the first client render are already highlighted.
    // Async engines stay on the deterministic plain-text shell until mount.
    controller.attemptInitialSync()

    function getCopyPayload(): string {
      // Keep the terminal line break in clipboard output even though the
      // rendered document omits the extra empty row it would create. Runtime
      // callers can pass null through a non-required String prop, so guard it
      // here even though normalizeProps already does so for rendering.
      return normalizeSource(typeof props.code === 'string' ? props.code : '')
    }

    async function copy(): Promise<boolean> {
      try {
        return await copyText(getCopyPayload())
      } catch {
        return false
      }
    }

    expose({
      refresh: () => controller.refresh(),
      highlight: (input: { code: string; language?: string }) => controller.highlight(input),
      copy,
      getCopyPayload,
    })

    return () => {
      const current = normalized.value
      const busy = controller.busy.value
      const error = controller.error.value
      const active = virtualActive.value
      const window = virtualWindow.value
      const {
        class: attrClass,
        style: attrStyle,
        'aria-label': attrAriaLabel,
        'aria-labelledby': attrAriaLabelledby,
        ...restAttrs
      } = attrs

      const gutterDigits = Math.max(
        3,
        String(current.startLine + Math.max(0, renderedLines.value.length - 1)).length,
      )
      const gutterStyle = current.lineNumbers
        ? { '--vsh-gutter-width': `${gutterDigits + 0.25}ch` }
        : undefined
      const rootStyle = ownsScope.value
        ? [
            resolvedTheme.variables.value,
            gutterStyle,
            current.customStyle,
            attrStyle,
          ]
        : [gutterStyle, current.customStyle, attrStyle]

      const rootAttributes: Record<string, unknown> = {
        ...restAttrs,
        ...(ownsScope.value ? resolvedTheme.attributes.value : {}),
        'data-language': current.language,
        class: mergeClass(['vsh', current.wrap && 'vsh-wrap'], attrClass),
        style: rootStyle,
        ref: setRootElement,
      }

      const preStyle: Record<string, unknown> = {}
      const height = toCssSize(current.height)
      const maxHeight = toCssSize(current.maxHeight)
      if (height) preStyle.height = height
      if (maxHeight) preStyle.maxHeight = maxHeight
      if (active) preStyle.overflow = 'auto'

      const ariaLabel =
        typeof attrAriaLabel === 'string' && attrAriaLabel.length > 0
          ? attrAriaLabel
          : undefined
      const ariaLabelledby =
        typeof attrAriaLabelledby === 'string' && attrAriaLabelledby.length > 0
          ? attrAriaLabelledby
          : undefined
      const hasAccessibleName = Boolean(ariaLabel || ariaLabelledby)

      const preNode = h(
        current.preTag,
        {
          class: 'vsh-pre',
          style: preStyle,
          ...(hasAccessibleName ? { role: 'region' } : {}),
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
          ...(ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : {}),
          ...(busy ? { 'aria-busy': 'true' } : {}),
          ...(current.tabindex !== false && current.tabindex !== null
            ? { tabindex: current.tabindex }
            : {}),
          onScroll,
          ref: setPreElement,
        },
        h(
          current.codeTag,
          {
            ...(current.codeTagProps ?? {}),
            class: mergeClass(
              ['vsh-code', current.languageClass],
              current.codeTagProps?.class,
            ),
          },
          [
            ...(active
              ? [
                  h('span', {
                    class: 'vsh-spacer',
                    'aria-hidden': 'true',
                    style: { display: 'block', height: `${window.topPadding}px` },
                  }),
                ]
              : []),
            ...visibleLines.value.map(({ line, index }) =>
              renderLine(line, index, active),
            ),
            ...(active
              ? [
                  h('span', {
                    class: 'vsh-spacer',
                    'aria-hidden': 'true',
                    style: { display: 'block', height: `${window.bottomPadding}px` },
                  }),
                ]
              : []),
          ],
        ),
      )

      const children: VNodeChild[] = []
      if (slots.header) {
        children.push(
          slots.header({ language: current.language, theme: resolvedTheme.theme.value }),
        )
      }
      if (slots.loading && busy) {
        children.push(
          slots.loading({
            busy,
            language: current.language,
            error: error ?? null,
          }),
        )
      }
      if (slots.error && error) {
        children.push(slots.error({ error, language: current.language }))
      }
      children.push(preNode)
      if (slots.footer) {
        children.push(
          slots.footer({ language: current.language, theme: resolvedTheme.theme.value }),
        )
      }

      return h('div', rootAttributes, children)
    }
  },
})
