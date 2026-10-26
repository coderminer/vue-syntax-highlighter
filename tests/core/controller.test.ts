import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createHighlighterContext } from '@/core/context'
import { createHighlightController } from '@/core/controller'
import { createPlainResult, splitSource } from '@/core/source'
import type { HighlightEngine, HighlightResult } from '@/types'

function tokenResult(code: string, language = 'js', tag?: string): HighlightResult {
  const suffix = tag ? `-${tag}` : ''
  return {
    lines: splitSource(code).map((line) => ({
      tokens: line ? [{ text: line + suffix, type: 'keyword' }] : [],
    })),
    language,
  }
}

function syncEngine(spy = vi.fn((request: { code: string }) => tokenResult(request.code))): HighlightEngine & {
  highlight: typeof spy
} {
  return {
    id: 'fake',
    capabilities: { sync: true },
    highlight: spy,
  }
}

describe('highlight controller', () => {
  it('applies a synchronous result during setup', () => {
    const engine = syncEngine()
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'const x = 1', language: 'js' }),
    })
    expect(controller.attemptInitialSync()).toBe(true)
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(controller.result.value?.lines[0]?.tokens[0]?.text).toContain('const x = 1')
    expect(controller.busy.value).toBe(false)
  })

  it('reuses the provider cache across controllers', () => {
    const engine = syncEngine()
    const context = createHighlighterContext({ engine })
    const first = createHighlightController({
      context,
      getInput: () => ({ code: 'same', language: 'js' }),
    })
    first.attemptInitialSync()
    const second = createHighlightController({
      context,
      getInput: () => ({ code: 'same', language: 'js' }),
    })
    second.attemptInitialSync()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    expect(second.result.value).toBe(first.result.value)
  })

  it('coalesces input changes and applies only the latest result', async () => {
    const pending: ((value: HighlightResult) => void)[] = []
    const engine: HighlightEngine = {
      id: 'async',
      capabilities: { sync: false },
      highlight: vi.fn(
        () =>
          new Promise<HighlightResult>((resolve) => {
            pending.push(resolve)
          }),
      ),
    }
    let input = { code: 'first', language: 'js' }
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({ context, getInput: () => input })
    void controller.start()
    await flushPromises()
    expect(pending).toHaveLength(1)

    input = { code: 'second', language: 'js' }
    input = { code: 'third', language: 'js' }
    controller.schedule()
    controller.schedule()
    await flushPromises()
    expect(pending).toHaveLength(2)

    pending[1]!(tokenResult('third'))
    await flushPromises()
    expect(controller.result.value?.lines[0]?.tokens[0]?.text).toContain('third')

    pending[0]!(tokenResult('first'))
    await flushPromises()
    expect(controller.result.value?.lines[0]?.tokens[0]?.text).toContain('third')
    expect(engine.highlight).toHaveBeenCalledTimes(2)
  })

  it('deduplicates identical concurrent requests', async () => {
    let resolve!: (value: HighlightResult) => void
    const engine: HighlightEngine = {
      id: 'shared',
      capabilities: { sync: false },
      highlight: vi.fn(
        () =>
          new Promise<HighlightResult>((done) => {
            resolve = done
          }),
      ),
    }
    const context = createHighlighterContext({ engine })
    const make = () =>
      createHighlightController({
        context,
        getInput: () => ({ code: 'same', language: 'js' }),
      })
    const first = make()
    const second = make()
    const runs = [first.start(), second.start()]
    await flushPromises()
    expect(engine.highlight).toHaveBeenCalledTimes(1)
    resolve(tokenResult('same'))
    const results = await Promise.all(runs)
    expect(results[0]).toBe(results[1])
  })

  it('clears previous output when input changes and rejects stale results', async () => {
    const pending: ((value: HighlightResult) => void)[] = []
    const engine: HighlightEngine = {
      id: 'slow',
      capabilities: { sync: false },
      highlight: vi.fn(
        () =>
          new Promise<HighlightResult>((resolve) => {
            pending.push(resolve)
          }),
      ),
    }
    let input = { code: 'one', language: 'js' }
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({ context, getInput: () => input })
    const firstRun = controller.start()
    await flushPromises()
    pending[0]!(tokenResult('one'))
    await firstRun
    expect(controller.result.value).toBeDefined()

    input = { code: 'two', language: 'js' }
    controller.schedule()
    await flushPromises()
    expect(controller.result.value).toBeUndefined()
    expect(controller.busy.value).toBe(true)
    // Resolve superseded work after the new input started.
    pending[1]!(tokenResult('two'))
    await flushPromises()
    expect(controller.result.value?.lines[0]?.tokens[0]?.text).toContain('two')
  })

  it('reports invalid output and keeps plain-text fallback', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine: HighlightEngine = {
      id: 'invalid',
      capabilities: { sync: true },
      highlight: () =>
        ({ lines: [{ tokens: [{ text: 'x', type: 'not-a-type' }] }], language: 'js' }) as never,
    }
    const context = createHighlighterContext({ engine })
    const errors: Error[] = []
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'x', language: 'js' }),
      onError: (error) => errors.push(error),
    })
    expect(controller.attemptInitialSync()).toBe(true)
    expect(controller.result.value).toBeUndefined()
    expect(controller.error.value).toBeInstanceOf(Error)
    expect(errors).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('rejects results that do not reproduce the source text', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const engine: HighlightEngine = {
      id: 'wrong-text',
      capabilities: { sync: true },
      highlight: () => tokenResult('different'),
    }
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'expected', language: 'js' }),
    })
    expect(controller.attemptInitialSync()).toBe(true)
    expect(controller.result.value).toBeUndefined()
    expect(controller.error.value?.message).toContain('do not reproduce')
  })

  it('ignores results after disposal', async () => {
    let resolve!: (value: HighlightResult) => void
    const engine: HighlightEngine = {
      id: 'late',
      capabilities: { sync: false },
      highlight: () =>
        new Promise<HighlightResult>((done) => {
          resolve = done
        }),
    }
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'late', language: 'js' }),
    })
    void controller.start()
    await flushPromises()
    controller.dispose()
    resolve(tokenResult('late'))
    await flushPromises()
    expect(controller.result.value).toBeUndefined()
  })

  it('reports unknown engines without throwing during render', () => {
    const context = createHighlighterContext({})
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'x', language: 'js', engine: 'missing-engine' }),
    })
    expect(controller.attemptInitialSync()).toBe(true)
    expect(controller.error.value?.message).toContain('Unknown engine')
  })

  it('returns a plain result from highlight() for explicit input', async () => {
    const engine = syncEngine()
    const context = createHighlighterContext({ engine })
    const controller = createHighlightController({
      context,
      getInput: () => ({ code: 'default', language: 'js' }),
    })
    const result = await controller.highlight({ code: 'explicit', language: 'js' })
    expect(result.language).toBe('js')
    expect(engine.highlight).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'explicit', language: 'js' }),
      undefined,
    )
  })

  it('creates a safe plain fallback result', () => {
    expect(createPlainResult('a\n', 'text').lines).toHaveLength(2)
  })
})
