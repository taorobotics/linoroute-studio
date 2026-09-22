// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated browser; no real credentials, external traffic or paid requests.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const url = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

try {
  // CSS viewport widths cover the former 1760 breakpoint and the layout used
  // by a 1920px desktop at 125%, 150% and 200% browser zoom.
  for (const [width, locale] of [
    [1920, 'zh'],
    [1759, 'zh'],
    [1536, 'zh'],
    [1280, 'zh'],
    [960, 'en'],
    [820, 'zh'],
    [390, 'zh'],
    [320, 'en'],
  ]) {
    await test(`${locale} header stays compact and all navigation is reachable at ${width}px`, async () => {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      })
      try {
        await context.route('**/*', (route) => {
          const request = route.request()
          if (
            request.method() !== 'GET' ||
            request.url().includes('/studio-api/')
          ) {
            return route.abort()
          }
          if (new URL(request.url()).origin === new URL(url).origin) {
            return route.continue()
          }
          return route.abort()
        })
        const page = await context.newPage()
        page.setDefaultTimeout(5000)
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(url)
        await page
          .getByRole('heading', { name: '图片创作', exact: true })
          .waitFor()
        if (locale === 'en') {
          await page
            .getByRole('button', { name: '切换语言', exact: true })
            .click()
        }
        await page.evaluate(() => document.fonts.ready)
        const header = page.getByRole('banner')
        const navigation = header.getByRole('navigation')
        const headerBox = await header.boundingBox()
        const navBox = await navigation.boundingBox()
        assert.ok(
          headerBox.height <= (width > 760 ? 88 : 180),
          `Unexpected header expansion: ${JSON.stringify(headerBox)}`
        )
        assert.ok(navBox.height <= 56, 'navigation must remain one compact row')
        assert.ok(
          navBox.y >= headerBox.y &&
            navBox.y + navBox.height <= headerBox.y + headerBox.height
        )
        assert.ok(
          (await page.getByRole('main').boundingBox()).y >=
            headerBox.y + headerBox.height
        )
        assert.equal(await navigation.getByRole('button').count(), 5)
        assert.equal(await navigation.getByRole('link').count(), 4)
        for (const entry of await navigation.locator('button, a').all()) {
          // Keyboard focus must reveal even the last offscreen link without
          // scrolling the entire document horizontally or covering actions.
          await entry.focus()
          const rect = await entry.boundingBox()
          const rail = await navigation.boundingBox()
          assert.ok(rect.height >= 44 && rect.height <= 46)
          assert.ok(
            rect.width <= 205,
            `Navigation item stretched: ${JSON.stringify(rect)}`
          )
          assert.ok(
            rect.x >= rail.x - 1 &&
              rect.x + rect.width <= rail.x + rail.width + 1,
            `Focused item is clipped: ${JSON.stringify({ rect, rail })}`
          )
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        )
        const resources = header.getByRole('button', {
          name: locale === 'zh' ? '更多入口' : 'Resources',
          exact: true,
        })
        await resources.click()
        const popup = page.getByRole('dialog')
        await popup.waitFor()
        assert.equal(
          await popup
            .locator('a[href="https://linoroute.com/console"]')
            .count(),
          1
        )
        await page.keyboard.press('Escape')
        await popup.waitFor({ state: 'hidden' })
        await navigation.getByRole('button').first().click()
        await navigation.evaluate((element) => {
          element.scrollLeft = 0
        })
        await page.evaluate(() => window.scrollTo(0, 0))
        if (
          process.env.STUDIO_HEADER_SCREENSHOT_DIR &&
          [1920, 1280, 390].includes(width)
        ) {
          await page.screenshot({
            path: `${process.env.STUDIO_HEADER_SCREENSHOT_DIR}/studio-header-${width}.png`,
          })
        }
        assert.deepEqual(errors, [])
      } finally {
        await context.close()
      }
    })
  }
} finally {
  await browser.close()
}
