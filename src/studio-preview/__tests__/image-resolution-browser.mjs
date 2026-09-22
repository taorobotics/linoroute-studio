// Copyright (C) 2023-2026 QuantumNous — AGPL-3.0-or-later
// Local interaction checks only. Intercepts every API call and blocks remote hosts.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const base = 'http://127.0.0.1:4178'
const output = process.env.STUDIO_RESOLUTION_SCREENSHOTS
if (output) await mkdir(output, { recursive: true })
const ids = [
  'gpt-image-2-c',
  'gpt-image-2',
  'gpt-image-2.5-flare',
  'gpt-image-2.5-flare-c',
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-sunburst-c',
  'gemini-3-pro-image-preview',
]

try {
  for (const width of [1440, 768, 390, 720]) {
    const context = await browser.newContext({
      viewport: { width, height: 980 },
      reducedMotion: 'reduce',
    })
    const posts = []
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    let resultImage
    await context.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin !== base) return route.abort()
      if (url.pathname === '/studio-api/v1/models') {
        return route.fulfill({ json: { data: ids.map((id) => ({ id })) } })
      }
      if (url.pathname === '/studio-api/api/pricing') {
        return route.fulfill({
          json: { data: ids.map((model_name) => ({ model_name })) },
        })
      }
      if (url.pathname.startsWith('/studio-api/')) {
        assert.equal(
          url.pathname,
          '/studio-api/v1beta/models/gemini-3-pro-image-preview:generateContent'
        )
        assert.equal(request.method(), 'POST')
        posts.push(JSON.parse(request.postData()))
        return route.fulfill({
          json: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: { mimeType: 'image/png', data: resultImage },
                    },
                  ],
                },
              },
            ],
          },
        })
      }
      if (request.method() !== 'GET') return route.abort()
      return route.continue()
    })
    const choose = async (name) => {
      await page.getByRole('combobox', { name: '模型', exact: true }).click()
      await page.getByRole('option', { name, exact: true }).click()
    }
    const noOverflow = async () =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      )
    try {
      await page.goto(base)
      await page.getByRole('radio', { name: /2048 × 2048.*2K/ }).check()
      await page.getByRole('button', { name: '16:9', exact: true }).click()
      const fourK = page.getByRole('radio', { name: /3840 × 2160.*4K/ })
      assert.equal(await fourK.isChecked(), false)
      await fourK.check()
      await noOverflow()
      await choose('GPT-image-2.5')
      assert.equal(await page.getByRole('radio', { name: /2K|4K/ }).count(), 0)
      await page.getByRole('radio', { name: '按量计费', exact: true }).check()
      await page.getByRole('button', { name: '1:1', exact: true }).click()
      await page.getByRole('radio', { name: /2048 × 2048.*2K/ }).check()
      for (const version of ['Flare', 'Sunburst']) {
        await page.getByRole('radio', { name: version, exact: true }).check()
        assert.equal(
          await page
            .getByRole('radio', { name: /2048 × 2048.*2K/ })
            .isChecked(),
          true
        )
      }
      await choose('Nano Banana Pro')
      assert.equal(
        await page.getByRole('radio', { name: '1K', exact: true }).isChecked(),
        true
      )
      await page.getByRole('radio', { name: '4K', exact: true }).check()
      await page.getByRole('button', { name: '16:9', exact: true }).click()
      assert.equal(
        await page.getByRole('radio', { name: '4K', exact: true }).isChecked(),
        true
      )
      await noOverflow()
      if (output) {
        await page.screenshot({ path: `${output}/resolution-${width}.png` })
      }
      await page
        .getByRole('textbox', { name: '提示词', exact: true })
        .fill('分辨率交互测试，不调用付费接口。')
      // A tiny self-authored fixture; never pretend it is a real 4K model output.
      resultImage = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 96
        canvas.height = 54
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#3469e8'
        ctx.fillRect(0, 0, 96, 54)
        return canvas.toDataURL('image/png').split(',')[1]
      })
      await page
        .getByRole('button', { name: '配置 API Key', exact: true })
        .click()
      await page
        .getByLabel('API Key', { exact: true })
        .fill('sk-resolution-fixture-only')
      await page
        .getByRole('button', { name: '连接 LinoRoute', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'API 已连接', exact: true })
        .waitFor()
      assert.equal(
        await page.getByRole('radio', { name: '4K', exact: true }).isChecked(),
        true
      )
      await page.getByRole('button', { name: '开始生成', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByText('4K', { exact: true }).waitFor()
      await dialog
        .getByText(
          '4K 可能增加生成时间与费用，请在确认前核对分辨率和计费方式。',
          { exact: true }
        )
        .waitFor()
      assert.equal(posts.length, 0)
      await dialog
        .getByRole('button', { name: '确认并生成', exact: true })
        .click()
      await page.getByRole('img', { name: '生成的图片', exact: true }).waitFor()
      await page.getByText('实际图片尺寸: 96 × 54', { exact: true }).waitFor()
      assert.equal(posts.length, 1)
      assert.deepEqual(posts[0].generationConfig.imageConfig, {
        aspectRatio: '16:9',
        imageSize: '4K',
      })
      assert.deepEqual(errors, [])
      process.stdout.write(
        `PASS ${width}px: verified tiers, billing isolation, native resolution, confirmation, one mocked POST, actual pixels\n`
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
