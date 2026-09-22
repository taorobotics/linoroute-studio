// Copyright (C) 2023-2026 QuantumNous — AGPL-3.0-or-later
// Fresh, anonymous browser contexts. No API requests are allowed.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const base = 'http://127.0.0.1:4178'
const output = process.env.STUDIO_BUTTON_SCREENSHOTS
if (output) await mkdir(output, { recursive: true })
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 980 },
      reducedMotion: 'reduce',
    })
    await context.route('**/*', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (
        url.origin !== base ||
        url.pathname.startsWith('/studio-api/') ||
        request.method() !== 'GET'
      ) {
        return route.abort()
      }
      return route.continue()
    })
    try {
      const page = await context.newPage()
      await page.goto(base)
      await page.getByRole('combobox', { name: '模型', exact: true }).click()
      await page
        .getByRole('option', { name: 'GPT-image-2.5', exact: true })
        .click()
      await page.getByRole('radio', { name: '按量计费', exact: true }).check()

      // The drawn frame must communicate landscape vs portrait, not just repeat a square icon.
      for (const [ratio, landscape] of [
        ['16:9', true],
        ['9:16', false],
        ['1:1', null],
      ]) {
        const button = page.getByRole('button', { name: ratio, exact: true })
        const frame = button.locator('svg rect')
        assert.equal(
          await frame.count(),
          1,
          `${ratio}: missing visual aspect-ratio frame`
        )
        const box = await frame.boundingBox()
        if (landscape === true) assert.ok(box.width > box.height)
        if (landscape === false) assert.ok(box.height > box.width)
        if (landscape === null) assert.ok(Math.abs(box.width - box.height) < 1)
        const target = await button.boundingBox()
        assert.ok(
          target.height >= 44 && target.width >= 44,
          'Ratio buttons remain touch-friendly'
        )
      }
      // A checkmark supplements color so selection stays readable without color perception.
      const usage = page.getByRole('radio', { name: '按量计费', exact: true })
      const selectedMark = usage.locator('..').locator('.studio-choice-check')
      assert.equal(
        await selectedMark.evaluate((el) => getComputedStyle(el).opacity),
        '1'
      )
      await page.getByRole('radio', { name: '按次计费', exact: true }).check()
      assert.equal(
        await selectedMark.evaluate((el) => getComputedStyle(el).opacity),
        '0'
      )
      await usage.check()
      const mode = page.getByRole('radio', { name: '文生图', exact: true })
      await mode.focus()
      await page.keyboard.press('ArrowRight')
      const imageMode = page.getByRole('radio', { name: '图生图', exact: true })
      assert.equal(await imageMode.isChecked(), true)
      assert.notEqual(
        await imageMode
          .locator('..')
          .evaluate((el) => getComputedStyle(el).outlineStyle),
        'none'
      )

      await page.getByRole('button', { name: '16:9', exact: true }).click()
      const size = page.getByRole('radio', { name: /2048 × 1152.*2K/ })
      assert.equal(await size.isChecked(), true)
      // No overflowing choice labels or horizontal page scrolling on narrow screens.
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      )
      for (const label of await page.locator('.studio-model-choice').all()) {
        assert.equal(
          await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          true
        )
      }
      if (output) {
        await mode.scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/buttons-${width}.png` })
        await size.scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/ratios-${width}.png` })
      }
      process.stdout.write(
        `PASS ${width}px: proportional frames, non-color selection, keyboard focus, touch targets and overflow\n`
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
