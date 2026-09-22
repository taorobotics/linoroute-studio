// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated profiles and intercepted APIs: never reads a real key or spends credits.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const url = process.env.STUDIO_PREVIEW_URL ?? 'http://127.0.0.1:4178/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ids = [
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare-c',
  'gpt-image-2.5-sunburst-c',
]

try {
  for (const family of ['GPT-image-2', 'GPT-image-2.5']) {
    for (const width of [1440, 390, 320]) {
      await test(`${family} choices are keyboard operable, remembered and fit at ${width}px`, async () => {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
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
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.goto(url)
          await page
            .getByRole('combobox', { name: '模型', exact: true })
            .click()
          await page.getByRole('option', { name: family, exact: true }).click()
          assert.equal(
            await page
              .getByRole('radio', { name: '按次计费', exact: true })
              .isChecked(),
            true
          )

          if (family === 'GPT-image-2.5') {
            await page
              .getByRole('radio', { name: 'Flare', exact: true })
              .focus()
            await page.keyboard.press('ArrowRight')
            assert.equal(
              await page
                .getByRole('radio', { name: 'Sunburst', exact: true })
                .isChecked(),
              true
            )
          } else {
            assert.equal(
              await page
                .getByRole('group', { name: '版本', exact: true })
                .count(),
              0
            )
          }
          const prompt = page.getByRole('textbox', {
            name: '提示词',
            exact: true,
          })
          await prompt.fill('保留这份草稿')
          await page
            .getByRole('radio', { name: '按次计费', exact: true })
            .focus()
          await page.keyboard.press('ArrowRight')
          assert.equal(
            await page
              .getByRole('radio', { name: '按量计费', exact: true })
              .isChecked(),
            true
          )
          assert.equal(await prompt.inputValue(), '保留这份草稿')

          await page.reload()
          await page
            .getByRole('group', { name: '计费方式', exact: true })
            .waitFor()
          if (family === 'GPT-image-2.5') {
            assert.equal(
              await page
                .getByRole('radio', { name: 'Sunburst', exact: true })
                .isChecked(),
              true
            )
          } else {
            assert.equal(
              await page
                .getByRole('group', { name: '版本', exact: true })
                .count(),
              0
            )
            await page.getByText('gpt-image-2', { exact: true }).waitFor()
          }
          assert.equal(
            await page
              .getByRole('radio', { name: '按量计费', exact: true })
              .isChecked(),
            true
          )
          await page.locator('.studio-model-config').scrollIntoViewIfNeeded()
          for (const rect of await page
            .locator('.studio-model-choice')
            .evaluateAll((elements) =>
              elements.map((element) => {
                const { left, right, width, height } =
                  element.getBoundingClientRect()
                return { left, right, width, height }
              })
            )) {
            assert.ok(
              rect.left >= 0 && rect.right <= width,
              JSON.stringify(rect)
            )
            assert.ok(
              rect.width >= 44 && rect.height >= 44,
              JSON.stringify(rect)
            )
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            ),
            true
          )
          const screenshot =
            family === 'GPT-image-2'
              ? process.env.STUDIO_GPT2_SCREENSHOT
              : process.env.STUDIO_SELECTION_SCREENSHOT
          if (screenshot && width === 1440) {
            await page.screenshot({
              path: screenshot,
            })
          }
          assert.deepEqual(errors, [])
        } finally {
          await context.close()
        }
      })
    }
  }

  for (const selection of [
    {
      family: 'GPT-image-2.5',
      available: ids,
      apiId: 'gpt-image-2.5-sunburst',
      billing: '按量计费',
    },
    {
      family: 'GPT-image-2',
      available: ['gpt-image-2', 'gpt-image-2-c'],
      apiId: 'gpt-image-2-c',
      billing: '按次计费',
    },
    {
      family: 'GPT-image-2',
      available: ['gpt-image-2', 'gpt-image-2-c'],
      apiId: 'gpt-image-2',
      billing: '按量计费',
    },
  ]) {
    await test(`live ${selection.apiId} selection confirms billing and sends its exact model ID`, async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      })
      const sent = []
      try {
        await context.route('**/*', (route) => {
          const request = route.request()
          const path = new URL(request.url()).pathname
          if (path === '/studio-api/v1/models') {
            return route.fulfill({
              json: { data: selection.available.map((id) => ({ id })) },
            })
          }
          if (path === '/studio-api/api/pricing') {
            return route.fulfill({
              json: {
                data: selection.available.map((model_name) => ({ model_name })),
              },
            })
          }
          if (path === '/studio-api/v1/images/generations') {
            sent.push(request.postDataJSON())
            return route.fulfill({
              json: { data: [{ url: 'https://media.example.com/mock.png' }] },
            })
          }
          if (path.startsWith('/studio-api/') || request.method() !== 'GET') {
            return route.abort()
          }
          if (new URL(request.url()).origin === new URL(url).origin) {
            return route.continue()
          }
          return route.abort()
        })
        const page = await context.newPage()
        await page.goto(url)
        await page
          .getByRole('button', { name: '配置 API Key', exact: true })
          .click()
        await page
          .getByLabel('API Key', { exact: true })
          .fill('sk-isolated-browser-test-only')
        await page
          .getByRole('button', { name: '连接 LinoRoute', exact: true })
          .click()
        await page
          .getByRole('radio', { name: '按次计费', exact: true })
          .waitFor()
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
        await page.getByRole('combobox', { name: '模型', exact: true }).click()
        await page
          .getByRole('option', { name: selection.family, exact: true })
          .waitFor()
        assert.equal(await page.getByRole('option').count(), 1)
        await page.keyboard.press('Escape')
        if (selection.family === 'GPT-image-2.5') {
          await page.getByRole('radio', { name: 'Flare', exact: true }).focus()
          await page.keyboard.press('ArrowRight')
        }
        await page
          .getByRole('radio', { name: selection.billing, exact: true })
          .check()
        await page
          .getByRole('textbox', { name: '提示词', exact: true })
          .fill('Mock request only')
        await page
          .getByRole('button', { name: '开始生成', exact: true })
          .click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor()
        if (selection.family === 'GPT-image-2.5') {
          assert.match(await dialog.innerText(), /Sunburst/)
        } else {
          assert.doesNotMatch(await dialog.innerText(), /版本/)
        }
        await dialog.getByText(selection.apiId, { exact: true }).waitFor()
        await dialog.getByText(selection.billing, { exact: true }).waitFor()
        assert.equal(sent.length, 0)
        await dialog
          .getByRole('button', { name: '确认并生成', exact: true })
          .click()
        await page
          .getByRole('img', { name: '生成的图片', exact: true })
          .waitFor()
        assert.equal(sent.length, 1)
        assert.equal(sent[0].model, selection.apiId)
      } finally {
        await context.close()
      }
    })
  }
} finally {
  await browser.close()
}
