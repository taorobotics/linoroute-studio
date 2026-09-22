// Copyright (C) 2023-2026 QuantumNous — AGPL-3.0-or-later
// All API requests are intercepted. Never loads a real key or paid endpoint.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const base = 'http://127.0.0.1:4178'
const output = process.env.STUDIO_IMAGE_SCREENSHOTS
if (output) await mkdir(output, { recursive: true })
const ids = [
  'gpt-image-2.5-flare-c',
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
]
try {
  for (const width of [1440, 768, 390, 720]) {
    const context = await browser.newContext({
      viewport: { width, height: 980 },
      reducedMotion: 'reduce',
    })
    if (width === 390) {
      await context.addInitScript(() => {
        globalThis.createImageBitmap = undefined
      })
    }
    const posts = []
    let resolveGeneration
    const pending = new Promise((resolve) => {
      resolveGeneration = resolve
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    let resultImage
    await context.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url())
      if (url.pathname === '/studio-api/v1/models') {
        return route.fulfill({ json: { data: ids.map((id) => ({ id })) } })
      }
      if (url.pathname === '/studio-api/api/pricing') {
        return route.fulfill({
          json: { data: ids.map((model_name) => ({ model_name })) },
        })
      }
      if (url.pathname.startsWith('/studio-api/')) {
        assert.equal(request.method(), 'POST')
        posts.push({ path: url.pathname, body: request.postData() })
        await pending
        return route.fulfill({ json: { data: [{ b64_json: resultImage }] } })
      }
      if (url.origin !== base) return route.abort()
      if (request.method() !== 'GET') return route.abort()
      return route.continue()
    })
    try {
      await page.goto(base)
      await page.getByRole('combobox', { name: '模型', exact: true }).click()
      await page
        .getByRole('option', { name: 'GPT-image-2.5', exact: true })
        .click()
      await page.getByRole('radio', { name: '按量计费', exact: true }).check()
      await page.getByRole('radio', { name: '图生图', exact: true }).check()
      await page
        .getByRole('textbox', { name: '提示词', exact: true })
        .fill('保留主体，改成浅蓝色背景。')
      // Self-authored bitmap fixture, not a model output or third-party sample.
      resultImage = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 100
        canvas.height = 160
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#eff5ff'
        ctx.fillRect(0, 0, 100, 160)
        ctx.fillStyle = '#3266ed'
        ctx.fillRect(30, 30, 40, 100)
        return canvas.toDataURL('image/png').split(',')[1]
      })
      await page.getByLabel('添加参考图片').setInputFiles({
        name: 'portrait.png',
        mimeType: 'image/png',
        buffer: Buffer.from(resultImage, 'base64'),
      })
      await page.getByRole('button', { name: '移除 portrait.png' }).waitFor()
      assert.equal(posts.length, 0)
      const image = page.getByRole('img', { name: 'portrait.png', exact: true })
      assert.equal(
        await image.evaluate((img) => getComputedStyle(img).objectFit),
        'contain'
      )
      await page.getByRole('button', { name: '16:9', exact: true }).click()
      assert.equal(
        await page.getByRole('radio', { name: /2048 × 1152.*2K/ }).isChecked(),
        true
      )
      // Keyboard operation uses native radio semantics, not a mouse-only tab strip.
      const mode = page.getByRole('radio', { name: '图生图', exact: true })
      await mode.focus()
      await page.keyboard.press('ArrowLeft')
      assert.equal(
        await page
          .getByRole('radio', { name: '文生图', exact: true })
          .isChecked(),
        true
      )
      await page.keyboard.press('ArrowRight')
      assert.equal(await mode.isChecked(), true)
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      )
      if (output) {
        await page
          .getByRole('textbox', { name: '提示词', exact: true })
          .scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/image-draft-${width}.png` })
      }
      await page
        .getByRole('button', { name: '配置 API Key', exact: true })
        .click()
      await page
        .getByLabel('API Key', { exact: true })
        .fill('sk-browser-fixture-only')
      await page
        .getByRole('button', { name: '连接 LinoRoute', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'API 已连接', exact: true })
        .waitFor()
      assert.equal(await mode.isChecked(), true)
      assert.equal(
        await page
          .getByRole('textbox', { name: '提示词', exact: true })
          .inputValue(),
        '保留主体，改成浅蓝色背景。'
      )
      await page.getByRole('button', { name: '开始生成', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByText('2048 × 1152', { exact: true }).waitFor()
      await dialog.getByText('图生图', { exact: true }).waitFor()
      assert.equal(posts.length, 0)
      await dialog
        .getByRole('button', { name: '确认并生成', exact: true })
        .click()
      await page
        .getByRole('status', { name: '图片生成中', exact: true })
        .waitFor()
      assert.equal(posts.length, 1)
      assert.equal(posts[0].path, '/studio-api/v1/images/edits')
      assert.match(posts[0].body, /name="image"; filename="portrait.png"/)
      assert.match(posts[0].body, /2048x1152/)
      assert.equal(
        await page
          .getByRole('radio', {
            name: '按量计费',
            exact: true,
            includeHidden: true,
          })
          .isDisabled(),
        true
      )
      resolveGeneration()
      await page.getByRole('img', { name: '生成的图片', exact: true }).waitFor()
      await page.getByText('实际图片尺寸: 100 × 160', { exact: true }).waitFor()
      assert.deepEqual(errors, [])
      process.stdout.write(
        `PASS ${width}px: anonymous draft, keyboard, portrait, billing confirmation, loading, multipart and actual dimensions\n`
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
