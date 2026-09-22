// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated browser profiles; never access real keys or paid generation.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const url = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const width of [1440, 390]) {
    await test(`brand logos and visitor-ready key flow at ${width}px`, async () => {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      })
      const apiRequests = []
      await context.route('**/*', (route) => {
        const request = route.request()
        if (
          request.url().includes('/studio-api/') ||
          request.method() !== 'GET'
        ) {
          apiRequests.push(request.url())
          return route.abort()
        }
        if (new URL(request.url()).origin === new URL(url).origin) {
          return route.continue()
        }
        return route.abort()
      })
      try {
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(url)
        await page
          .getByRole('heading', { name: '图片创作', exact: true })
          .waitFor()
        for (const label of ['图片创作', '视频创作', '我的作品']) {
          await page
            .getByRole('navigation')
            .getByRole('button', { name: label, exact: true })
            .click()
          assert.doesNotMatch(
            await page.locator('body').innerText(),
            /演示模式|本地演示|预览图片生成|预览视频生成|演示记录/
          )
          await page
            .getByRole('main')
            .getByRole('button', { name: '配置 API Key 后生成', exact: true })
            .click()
          const dialog = page.getByRole('dialog')
          await dialog.waitFor()
          assert.equal(
            await dialog
              .getByLabel('API Key', { exact: true })
              .getAttribute('type'),
            'password'
          )
          assert.doesNotMatch(
            await dialog.innerText(),
            /Demo A|Demo B|演示 A|演示 B|无效 Key/
          )
          await page.keyboard.press('Escape')
          await dialog.waitFor({ state: 'hidden' })
        }
        await page
          .getByRole('navigation')
          .getByRole('button', { name: '视频创作', exact: true })
          .click()
        const picker = page.getByRole('combobox', { name: '模型', exact: true })
        for (const label of [
          'MiniMax H3',
          'Seedance 2.0',
          'Seedance 2.0 Fast',
          'Kling Video 3.0',
          'Veo 3.1',
          'Gemini Omni',
          'Grok Imagine Video',
        ]) {
          await picker.click()
          const option = page.getByRole('option', { name: label, exact: true })
          await option.scrollIntoViewIfNeeded()
          assert.equal(
            await option.locator('.lr-model-mark').evaluate((el) => {
              const img = el.querySelector('img')
              if (img) return img.complete && img.naturalWidth > 0
              return !!el.querySelector('svg path')
            }),
            true,
            `${label} needs renderable brand artwork`
          )
          await option.click()
          assert.ok((await picker.innerText()).includes(label))
          assert.ok(
            await picker
              .locator('.lr-model-mark svg, .lr-model-mark img')
              .count()
          )
        }
        await picker.click()
        await page
          .getByRole('option', { name: 'MiniMax H3', exact: true })
          .click()
        if (process.env.STUDIO_BRANDS_SCREENSHOT_DIR) {
          await page.screenshot({
            path: `${process.env.STUDIO_BRANDS_SCREENSHOT_DIR}/studio-ready-${width}.png`,
          })
          await picker.click()
          await page.screenshot({
            path: `${process.env.STUDIO_BRANDS_SCREENSHOT_DIR}/studio-brands-${width}.png`,
          })
          await page.keyboard.press('Escape')
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        )
        assert.deepEqual(apiRequests, [])
        assert.deepEqual(errors, [])
      } finally {
        await context.close()
      }
    })
  }
} finally {
  await browser.close()
}
