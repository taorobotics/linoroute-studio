// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated profiles; external navigation is fulfilled locally, never fetched.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const url = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

try {
  for (const [width, language] of [
    [1440, 'zh'],
    [390, 'zh'],
    [320, 'en'],
  ]) {
    await test(`Seedance top navigation link fits at ${width}px (${language}) and keyboard activation preserves the studio tab`, async () => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      })
      try {
        await context.route('**/*', (route) => {
          const request = route.request()
          if (request.method() !== 'GET') return route.abort()
          if (request.url() === 'https://seedancekit.com/') {
            return route.fulfill({
              contentType: 'text/html',
              body: '<title>External test destination</title>',
            })
          }
          if (
            new URL(request.url()).origin === new URL(url).origin &&
            !request.url().includes('/studio-api/')
          ) {
            return route.continue()
          }
          return route.abort()
        })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(url)
        await page
          .getByRole('heading', { name: '图片创作', exact: true })
          .waitFor()
        if (language === 'en') {
          await page
            .getByRole('button', { name: '切换语言', exact: true })
            .click()
        }
        const link = page
          .locator('.studio-workspace-nav')
          .getByRole('link', { name: /SeedanceKit/ })
        await link.focus()
        const box = await link.boundingBox()
        const headerBox = await page.locator('.studio-topbar').boundingBox()
        assert.ok(
          box.height >= 44 && box.x >= 0 && box.x + box.width <= width,
          `Resource must fit and remain touch-friendly: ${JSON.stringify(box)}`
        )
        assert.ok(
          box.y >= headerBox.y &&
            box.y + box.height <= headerBox.y + headerBox.height,
          'The resource belongs in the top navigation, not in the library content'
        )
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        )
        assert.equal(
          await link.evaluate((el) => el === document.activeElement),
          true
        )
        if (process.env.STUDIO_RESOURCE_SCREENSHOT_DIR) {
          await page.screenshot({
            path: `${process.env.STUDIO_RESOURCE_SCREENSHOT_DIR}/seedance-resource-${width}.png`,
          })
        }
        const opened = page.waitForEvent('popup')
        await page.keyboard.press('Enter')
        const destination = await opened
        await destination.waitForLoadState('domcontentloaded')
        assert.equal(destination.url(), 'https://seedancekit.com/')
        assert.equal(await destination.evaluate(() => window.opener), null)
        assert.equal(page.url(), url)
        assert.equal(await link.isVisible(), true)
        assert.deepEqual(errors, [])
      } finally {
        await context.close()
      }
    })
  }
} finally {
  await browser.close()
}
