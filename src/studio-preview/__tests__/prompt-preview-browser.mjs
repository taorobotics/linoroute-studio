// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Requires the local studio and STUDIO_PLAYWRIGHT_MODULE; never calls paid APIs.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const studioUrl = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({
  channel: process.env.STUDIO_BROWSER_CHANNEL ?? 'msedge',
  headless: true,
})

try {
  for (const scenario of [
    { close: 'button', width: 1440, motion: 'no-preference' },
    { close: 'escape', width: 1440, motion: 'no-preference' },
    { close: 'backdrop', width: 1440, motion: 'no-preference' },
    { close: 'button', width: 390, motion: 'no-preference' },
    { close: 'button', width: 1440, motion: 'reduce' },
  ]) {
    await test(`image preview releases the page after ${scenario.close}, ${scenario.width}px, ${scenario.motion}`, async () => {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: 1000 },
        reducedMotion: scenario.motion,
      })
      try {
        await context.route('**/*', (route) => {
          const request = route.request()
          if (request.resourceType() === 'image') {
            return route.fulfill({
              contentType: 'image/svg+xml',
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200"><rect width="600" height="1200" fill="#729acc"/></svg>',
            })
          }
          if (
            request.method() === 'GET' &&
            new URL(request.url()).origin === new URL(studioUrl).origin
          ) {
            return route.continue()
          }
          return route.abort()
        })
        const page = await context.newPage()
        page.setDefaultTimeout(5000)
        await page.goto(studioUrl, { waitUntil: 'domcontentloaded' })
        await page
          .getByRole('button', { name: '图片提示词库', exact: true })
          .click()
        const open = page.getByRole('button', {
          name: '查看大图：幼儿词汇拆解学习卡',
          exact: true,
        })
        const secondCard = page.getByRole('article', {
          name: '旅行纪念珐琅徽章',
        })

        await open.click()
        await page.getByRole('dialog').waitFor()
        await page
          .getByRole('button', { name: '下一张图片', exact: true })
          .click()
        await page
          .getByRole('dialog', { name: '图片预览：旅行纪念珐琅徽章' })
          .waitFor()
        if (scenario.close === 'escape') {
          await page.keyboard.press('Escape')
        } else if (scenario.close === 'backdrop') {
          await page.mouse.click(3, 3)
        } else {
          await page
            .getByRole('button', { name: '关闭图片预览', exact: true })
            .click()
        }

        // A transparent leftover overlay used to intercept every click here.
        await page
          .locator('.studio-image-preview-backdrop')
          .waitFor({ state: 'detached' })
        assert.equal(
          await open.evaluate((element) => element === document.activeElement),
          true
        )
        const scrollBefore = await page.evaluate(() => window.scrollY)
        await page.mouse.move(5, 500)
        await page.mouse.wheel(0, 320)
        await page.waitForFunction(
          (before) => window.scrollY > before,
          scrollBefore
        )
        await secondCard
          .getByRole('button', { name: '用于图片创作', exact: true })
          .click()
        await page
          .getByRole('heading', { name: '图片创作', exact: true })
          .waitFor()
        assert.ok(
          await page
            .getByRole('textbox', { name: '提示词', exact: true })
            .inputValue()
        )

        // Reopen with the keyboard, then navigate away after closing again.
        await page
          .getByRole('button', { name: '图片提示词库', exact: true })
          .click()
        await open.focus()
        await page.keyboard.press('Enter')
        await page.getByRole('dialog').waitFor()
        await page.keyboard.press('Escape')
        await page
          .locator('.studio-image-preview-backdrop')
          .waitFor({ state: 'detached' })
        await page
          .getByRole('button', { name: '视频创作', exact: true })
          .click()
        await page
          .getByRole('heading', { name: '视频创作', exact: true })
          .waitFor()
      } finally {
        await context.close()
      }
    })
  }
} finally {
  await browser.close()
}
