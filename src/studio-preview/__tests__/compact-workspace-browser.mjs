// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Fresh browser profiles; all external traffic and paid requests are blocked.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const url = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function isolatedPage(width, height = 1080) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
  })
  await context.route('**/*', (route) => {
    const request = route.request()
    if (request.method() !== 'GET' || request.url().includes('/studio-api/')) {
      return route.abort()
    }
    if (new URL(request.url()).origin === new URL(url).origin) {
      return route.continue()
    }
    return route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  await page.goto(url)
  await page.getByRole('heading', { name: '图片创作', exact: true }).waitFor()
  return { context, page }
}

try {
  for (const [width, height] of [
    [2560, 1317],
    [1920, 1080],
    [1024, 768],
    [820, 540],
    [390, 844],
    [320, 640],
  ]) {
    await test(`both workspaces use the available viewport at ${width}×${height} and preserve drafts through library navigation`, async () => {
      const { context, page } = await isolatedPage(width, height)
      try {
        for (const [kind, label, library] of [
          ['image', '图片创作', '图片提示词库'],
          ['video', '视频创作', '视频提示词库'],
        ]) {
          await page
            .getByRole('navigation')
            .getByRole('button', { name: label, exact: true })
            .click()
          const workspace = page.locator('.studio-workspace:visible')
          const grid = workspace.locator('.studio-workspace-grid')
          const prompt = workspace.getByRole('textbox', {
            name: '提示词',
            exact: true,
          })
          await prompt.fill(`${kind} draft stays here`)
          if (width > 760) {
            const box = await grid.boundingBox()
            const header = await page.getByRole('banner').boundingBox()
            assert.ok(
              box.x >= 16 && box.x <= 28 && width - box.x - box.width <= 28,
              `Workspace should use the screen width with small gutters: ${JSON.stringify(box)}`
            )
            assert.ok(
              box.y >= header.y + header.height &&
                box.y - header.y - header.height <= 28 &&
                height - box.y - box.height >= 16 &&
                height - box.y - box.height <= 28,
              `Workspace should fit below the header and leave a small bottom gutter: ${JSON.stringify(box)}`
            )
            assert.ok(
              Math.abs(box.x - (width - box.width) / 2) < 2,
              JSON.stringify(box)
            )
            assert.equal(
              await workspace
                .getByRole('separator')
                .getAttribute('aria-valuenow'),
              '340'
            )
            assert.ok((await prompt.boundingBox()).height <= 160)
            const action = await workspace
              .locator('.studio-generate-area button')
              .boundingBox()
            assert.ok(
              action.y >= box.y &&
                action.y + action.height <= box.y + box.height,
              `Generation action must remain inside the workspace: ${JSON.stringify(action)}`
            )
            assert.ok(action.height >= 44 && action.height <= 60)
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollHeight <= innerHeight
              ),
              true,
              'Settings scroll should not move the outer page'
            )
          } else {
            await workspace
              .getByRole('button', { name: '结果', exact: true })
              .click()
          }
          const stage = workspace.locator('.studio-result-placeholder')
          const box = await stage.boundingBox()
          assert.ok(box.height >= 300, JSON.stringify(box))
          if (width <= 760) {
            assert.ok(box.height <= 425, 'Mobile empty state remains compact')
          } else if (height >= 768) {
            const result = await workspace
              .locator('.studio-result')
              .boundingBox()
            assert.ok(
              result.y + result.height - box.y - box.height <= 100,
              `Empty surface should grow with the result panel: ${JSON.stringify({ box, result })}`
            )
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth
            ),
            true
          )
          await workspace
            .getByRole('button', { name: `浏览${library}`, exact: true })
            .click()
          await page
            .getByRole('heading', { name: library, exact: true })
            .waitFor()
          await page
            .getByRole('navigation')
            .getByRole('button', { name: label, exact: true })
            .click()
          if (width <= 760) {
            await workspace
              .getByRole('button', { name: '创作', exact: true })
              .click()
          }
          assert.equal(await prompt.inputValue(), `${kind} draft stays here`)
          if (
            process.env.STUDIO_COMPACT_SCREENSHOT_DIR &&
            (width === 2560 || width === 1920 || width === 390 || width === 820)
          ) {
            await prompt.fill('')
            await page.evaluate(() => document.fonts.ready)
            await page.screenshot({
              path: `${process.env.STUDIO_COMPACT_SCREENSHOT_DIR}/compact-${kind}-${width}.png`,
            })
          }
        }
      } finally {
        await context.close()
      }
    })
  }

  await test('divider still supports drag, keyboard limits and double-click reset', async () => {
    const { context, page } = await isolatedPage(1440)
    try {
      const divider = page.getByRole('separator', { name: '调整创作区宽度' })
      await divider.focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await divider.getAttribute('aria-valuenow'), '356')
      await page.keyboard.press('End')
      assert.equal(
        await divider.getAttribute('aria-valuenow'),
        await divider.getAttribute('aria-valuemax')
      )
      await page.keyboard.press('Home')
      assert.equal(await divider.getAttribute('aria-valuenow'), '300')
      const box = await divider.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(
        box.x + box.width / 2 + 80,
        box.y + box.height / 2,
        { steps: 8 }
      )
      await page.mouse.up()
      assert.equal(await divider.getAttribute('aria-valuenow'), '380')
      await divider.dblclick()
      assert.equal(await divider.getAttribute('aria-valuenow'), '340')
    } finally {
      await context.close()
    }
  })

  for (const width of [1920, 390, 320]) {
    for (const kind of ['image', 'video']) {
      await test(`mock live ${kind} at ${width}px keeps loading inside the compact stage`, async () => {
        const { context, page } = await isolatedPage(width)
        let release
        const pending = new Promise((resolve) => {
          release = resolve
        })
        const ids = ['gpt-image-2.5-flare-c', 'doubao-seedance-2-0-260128']
        let submitted = 0
        try {
          await context.route('**/studio-api/**', async (route) => {
            const request = route.request()
            const path = new URL(request.url()).pathname
            if (path.endsWith('/v1/models')) {
              return route.fulfill({
                json: { data: ids.map((id) => ({ id })) },
              })
            }
            if (path.endsWith('/api/pricing')) {
              return route.fulfill({
                json: { data: ids.map((model_name) => ({ model_name })) },
              })
            }
            if (request.method() === 'POST') {
              submitted++
              await pending
              const json =
                kind === 'image'
                  ? {
                      data: [{ url: 'https://media.example.com/portrait.png' }],
                    }
                  : { id: 'compact-video', status: 'running' }
              return route.fulfill({ json })
            }
            return route.fulfill({
              json: { id: 'compact-video', status: 'running' },
            })
          })
          await context.route(
            'https://media.example.com/portrait.png',
            (route) =>
              route.fulfill({
                contentType: 'image/svg+xml',
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#d8e4f5"/></svg>',
              })
          )
          await page
            .getByRole('button', { name: '配置 API Key', exact: true })
            .click()
          await page
            .getByLabel('API Key', { exact: true })
            .fill('sk-isolated-compact-test-only')
          await page
            .getByRole('button', { name: '连接 LinoRoute', exact: true })
            .click()
          await page.getByRole('dialog').waitFor({ state: 'hidden' })
          const label = kind === 'image' ? '图片创作' : '视频创作'
          await page
            .getByRole('navigation')
            .getByRole('button', { name: label, exact: true })
            .click()
          const workspace = page.locator('.studio-workspace:visible')
          await workspace
            .getByRole('textbox', { name: '提示词', exact: true })
            .fill('Isolated layout test')
          if (width <= 760) {
            await page.evaluate(() => window.scrollTo(0, 0))
            const action = await workspace
              .getByRole('button', { name: '开始生成', exact: true })
              .boundingBox()
            assert.ok(
              action.y >= 0 && action.y + action.height <= 1080,
              `Generation action should stay visible: ${JSON.stringify(action)}`
            )
            await workspace
              .getByRole('button', { name: '结果', exact: true })
              .click()
          }
          const emptyHeight = (
            await workspace.locator('.studio-result-placeholder').boundingBox()
          ).height
          if (width <= 760) {
            await workspace
              .getByRole('button', { name: '创作', exact: true })
              .click()
          }
          await workspace
            .getByRole('button', { name: '开始生成', exact: true })
            .click()
          await page
            .getByRole('button', { name: '确认并生成', exact: true })
            .click()
          await workspace.locator('.studio-generation-loader').waitFor()
          const stage = await workspace
            .locator('.studio-result-placeholder')
            .boundingBox()
          const loader = await workspace
            .locator('.studio-generation-loader')
            .boundingBox()
          assert.equal(stage.height, emptyHeight)
          assert.ok(
            loader.y >= stage.y &&
              loader.y + loader.height <= stage.y + stage.height,
            JSON.stringify({ stage, loader })
          )
          assert.equal(
            await workspace
              .locator('.studio-generate-area button')
              .isDisabled(),
            true
          )
          assert.equal(submitted, 1)
          if (process.env.STUDIO_COMPACT_SCREENSHOT_DIR && width !== 320) {
            await page.screenshot({
              path: `${process.env.STUDIO_COMPACT_SCREENSHOT_DIR}/compact-${kind}-loading-${width}.png`,
            })
          }
          release()
          if (kind === 'image') {
            const result = page.getByRole('img', {
              name: '生成的图片',
              exact: true,
            })
            await result.waitFor()
            await page.waitForFunction(
              () =>
                document.querySelector('.studio-live-asset img')
                  ?.naturalHeight === 900
            )
            assert.equal(
              await result.evaluate((el) => getComputedStyle(el).objectFit),
              'contain'
            )
            const bounds = await result.boundingBox()
            assert.ok(bounds.height > 0 && bounds.width <= width)
            await page
              .getByRole('link', { name: '打开原文件 / 下载', exact: true })
              .waitFor()
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth
            ),
            true
          )
        } finally {
          release()
          await context.close()
        }
      })
    }
  }
} finally {
  await browser.close()
}
