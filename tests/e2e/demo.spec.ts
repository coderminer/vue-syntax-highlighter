import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('docs demo', () => {
  test('renders, switches engine/language/theme/scheme, and toggles line features', async ({
    page,
  }) => {
    await page.goto('/demo')
    const block = page.getByTestId('highlighted')
    await expect(block.locator('.vsh-token-keyword').first()).toBeVisible({ timeout: 30_000 })
    await expect(block.locator('code')).toHaveClass(/language-javascript/)

    await page.getByTestId('engine').selectOption('highlightjs')
    await expect(block.locator('.vsh-token').first()).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('engine').selectOption('lowlight')
    await expect(block.locator('.vsh-token').first()).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('engine').selectOption('prism')
    await expect(block.locator('.vsh-token').first()).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('language').selectOption('python')
    await expect(block.locator('code')).toHaveClass(/language-python/)

    await page.getByTestId('theme').selectOption('paper')
    await expect(block).toHaveAttribute('data-vsh-theme', 'vsh-paper/vsh-midnight')
    await page.getByTestId('scheme').selectOption('dark')
    await expect(block).toHaveAttribute('data-vsh-scheme', 'dark')

    const gutterCount = await block.locator('.vsh-gutter').count()
    expect(gutterCount).toBeGreaterThan(0)
    await page.getByTestId('line-numbers').uncheck()
    await expect(block.locator('.vsh-gutter')).toHaveCount(0)
    await page.getByTestId('line-numbers').check()
    await expect(block.locator('.vsh-gutter').first()).toBeVisible()

    await page.getByTestId('wrap').check()
    await expect(block).toHaveClass(/vsh-wrap/)
    await page.getByTestId('wrap').uncheck()
    await expect(block).not.toHaveClass(/vsh-wrap/)

    await page.getByTestId('source').fill('const replaced = 42')
    await expect(block.locator('code')).toContainText('const replaced = 42')
  })

  test('copies the full source without gutter numbers', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/demo')
    await expect(page.getByTestId('highlighted').locator('.vsh-token').first()).toBeVisible({
      timeout: 30_000,
    })
    await page.getByTestId('copy').click()
    await expect(page.getByTestId('status')).toContainText('Copied the complete source')
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('export function useCounter')
    expect(text).toContain('return { count, doubled, increment }')
    expect(text).not.toMatch(/^\s*1\s+import/m)
  })

  test('has no axe violations', async ({ page }) => {
    await page.goto('/demo')
    await expect(page.getByTestId('highlighted').locator('.vsh-token').first()).toBeVisible({
      timeout: 30_000,
    })
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('deferral', () => {
  test('waits for intersection before highlighting', async ({ page }) => {
    await page.goto('/e2e-fixtures')
    const block = page.getByTestId('deferred-block')
    await expect(block).toContainText('const deferred = true')
    await expect(block.locator('.vsh-token-keyword')).toHaveCount(0)
    await page.getByTestId('deferred-block').scrollIntoViewIfNeeded()
    await expect(block.locator('.vsh-token-keyword').first()).toBeVisible({ timeout: 30_000 })
  })
})

test.describe('nested scheme scopes', () => {
  test('the explicit fallback aliases also resolve nested scopes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/e2e-fixtures')
    const fallback = readFileSync(
      new URL('../../src/styles/fallback.css', import.meta.url),
      'utf8',
    ).replace(
      '@supports not (color: light-dark(#000000, #ffffff))',
      '@supports (color: light-dark(#000000, #ffffff))',
    )
    await page.addStyleTag({ content: fallback })
    const automatic = page.getByTestId('auto-scheme-block')
    const forcedLight = page.getByTestId('light-scheme-block')
    await expect(automatic.locator('.vsh-token-keyword').first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(forcedLight.locator('.vsh-token-keyword').first()).toBeVisible({
      timeout: 30_000,
    })
    const colors = await page.evaluate(() => {
      const auto = document.querySelector('[data-testid="auto-scheme-block"]')
      const light = document.querySelector('[data-testid="light-scheme-block"]')
      return {
        autoBackground: auto ? getComputedStyle(auto).backgroundColor : null,
        lightBackground: light ? getComputedStyle(light).backgroundColor : null,
      }
    })
    expect(colors.autoBackground).toBe('rgb(13, 17, 23)')
    expect(colors.lightBackground).toBe('rgb(255, 255, 255)')
  })

  test('a nested light scope overrides an automatic ancestor under dark preference', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/e2e-fixtures')
    const automatic = page.getByTestId('auto-scheme-block')
    const forcedLight = page.getByTestId('light-scheme-block')
    await expect(automatic).toBeVisible()
    await expect(forcedLight).toBeVisible()
    await expect(automatic.locator('.vsh-token-keyword').first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(forcedLight.locator('.vsh-token-keyword').first()).toBeVisible({
      timeout: 30_000,
    })
    const colors = await page.evaluate(() => {
      const auto = document.querySelector('[data-testid="auto-scheme-block"]')
      const light = document.querySelector('[data-testid="light-scheme-block"]')
      const autoToken = auto?.querySelector('.vsh-token-keyword')
      const lightToken = light?.querySelector('.vsh-token-keyword')
      return {
        autoBackground: auto ? getComputedStyle(auto).backgroundColor : null,
        lightBackground: light ? getComputedStyle(light).backgroundColor : null,
        autoToken: autoToken ? getComputedStyle(autoToken).color : null,
        lightToken: lightToken ? getComputedStyle(lightToken).color : null,
      }
    })
    expect(colors.autoBackground).toBe('rgb(13, 17, 23)')
    expect(colors.lightBackground).toBe('rgb(255, 255, 255)')
    expect(colors.autoToken).toBe('rgb(255, 123, 114)')
    expect(colors.lightToken).toBe('rgb(207, 34, 46)')
  })
})

test.describe('50k-line stress demo', () => {
  test('bounds the DOM and reveals lines while scrolling', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/stress')
    const block = page.getByTestId('stress-block')
    await expect(block.locator('.vsh-line').first()).toBeVisible({ timeout: 60_000 })
    const initialCount = await block.locator('.vsh-line').count()
    expect(initialCount).toBeLessThanOrEqual(100)
    const firstLine = await block.locator('.vsh-line').first().getAttribute('data-line')
    expect(Number(firstLine)).toBe(1)

    const pre = block.locator('.vsh-pre')
    await pre.evaluate((element) => {
      element.scrollTop = 200_000
      element.dispatchEvent(new Event('scroll'))
    })
    await expect
      .poll(async () => Number(await block.locator('.vsh-line').first().getAttribute('data-line')))
      .toBeGreaterThan(9000)
    expect(await block.locator('.vsh-line').count()).toBeLessThanOrEqual(100)
    expect(await block.locator('.vsh-gutter').first().textContent()).toMatch(/\d+/)
    const gutterFits = await page.evaluate(() => {
      const line = document.querySelector('[data-testid="stress-block"] .vsh-line')
      const gutter = line?.querySelector('.vsh-gutter')
      const content = line?.querySelector('.vsh-line-content')
      if (!gutter || !content) return false
      return gutter.getBoundingClientRect().right <= content.getBoundingClientRect().left + 1
    })
    expect(gutterFits).toBe(true)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
