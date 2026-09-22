// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Run only after explicit permission for isolated Chrome browser checks.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const output = path.resolve('artifacts/studio-ui4/chrome')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 1487, height: 1058 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
const errors = [],
  external = [],
  checks = []
page.on('pageerror', (error) => errors.push(error.message))
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (
    url.hostname === '127.0.0.1' ||
    ['data:', 'blob:'].includes(url.protocol)
  ) {
    return route.continue()
  }
  external.push(url.origin)
  return route.abort()
})
const button = (name) => page.getByRole('button', { name, exact: true })
const nav = (name) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true })
async function capture(name) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() =>
    Promise.all(
      [...document.images]
        .filter((img) => img.getBoundingClientRect().width > 0)
        .map((img) => img.decode().catch(() => {}))
    )
  )
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    animations: 'disabled',
  })
}
async function check(label, action) {
  try {
    await action()
    checks.push({ label, passed: true })
  } catch (error) {
    checks.push({ label, passed: false, error: error.message })
  }
}
async function noOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  )
}
try {
  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' })
  await capture('reference-size-initial')
  await page
    .getByRole('combobox', { name: '模型', exact: true })
    .selectOption('demo-gpt-image-2-5')
  await button('使用模板').click()
  await button('应用模板').click()
  await capture('reference-size-filled')
  await check(
    'selected layout has a 68px header, continuous surfaces and contained artwork',
    async () => {
      const header = await page.getByRole('banner').boundingBox()
      const form = await page
        .getByRole('form', { name: '图片创作设置', exact: true })
        .boundingBox()
      const photo = await page
        .getByRole('img', { name: '图片演示素材', exact: true })
        .boundingBox()
      assert.equal(header.height, 68)
      assert.equal(form.x, 0)
      assert.ok(photo.width > 900 && photo.height > 480)
      const surfaces = await page
        .locator('.studio-workspace:not([hidden]) .studio-panel')
        .first()
        .evaluate((el) => getComputedStyle(el).boxShadow)
      assert.equal(surfaces, 'none')
      assert.equal(
        await page
          .getByRole('img', { name: '图片演示素材', exact: true })
          .evaluate((el) => getComputedStyle(el).objectFit),
        'contain'
      )
      await noOverflow()
    }
  )
  await check(
    'thumbnail and lightbox switch together without changing the typed draft',
    async () => {
      const prompt = page.getByRole('textbox', { name: '提示词', exact: true })
      const draft = await prompt.inputValue()
      await button('预览示例：一朵花，盛在柔光里').click()
      assert.match(
        await page
          .getByRole('img', { name: '图片演示素材', exact: true })
          .getAttribute('src'),
        /flower-sample/
      )
      await button('放大图片').click()
      const dialog = page.getByRole('dialog', { name: '示例作品', exact: true })
      await dialog.waitFor()
      assert.match(
        await dialog.getByRole('img').getAttribute('src'),
        /flower-sample/
      )
      await capture('flower-fullscreen')
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      assert.equal(
        await button('放大图片').evaluate(
          (el) => el === document.activeElement
        ),
        true
      )
      assert.equal(await prompt.inputValue(), draft)
      await button('预览示例：把午后，装进琥珀里').click()
    }
  )
  await check(
    'preview settings are collapsed initially and keep state controls usable',
    async () => {
      assert.equal(
        await button('预览设置').getAttribute('aria-expanded'),
        'false'
      )
      await button('预览设置').click()
      await button('空白状态').click()
      assert.equal(await button('查看示例作品').isVisible(), true)
      await capture('empty-state')
      await button('示例结果').click()
      await button('预览设置').click()
    }
  )
  await check('video plays and pauses when navigating away', async () => {
    await nav('视频创作').click()
    const video = page.getByLabel('视频演示素材', { exact: true })
    await video.evaluate(async (el) => {
      el.muted = true
      await el.play()
    })
    await page.waitForFunction(
      () => document.querySelector('video')?.currentTime > 0.2
    )
    await capture('video')
    await nav('图片创作').click()
    assert.equal(await video.evaluate((el) => el.paused), true)
  })
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 900],
    [768, 1024],
    [390, 844],
    [320, 800],
  ]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => scrollTo(0, 0))
    await check(`Chinese ${width}px fits with reachable controls`, async () => {
      await noOverflow()
      const header = page.getByRole('banner')
      const boxes = await Promise.all(
        (await header.getByRole('button').all()).map((el) => el.boundingBox())
      )
      for (const box of boxes) {
        assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1)
      }
      if (width > 760) {
        const primary = await button('预览生成效果').boundingBox()
        assert.ok(primary.y + primary.height <= height)
      } else {
        assert.equal(
          await page
            .getByRole('textbox', { name: '提示词', exact: true })
            .evaluate((el) => getComputedStyle(el).fontSize),
          '16px'
        )
      }
    })
    await capture(`zh-${width}-create`)
    if (width <= 760) {
      await button('结果').click()
      await check(`Chinese ${width}px result and thumbnails fit`, noOverflow)
      await capture(`zh-${width}-result`)
      await button('创作').click()
    }
  }
  await button('切换语言').click()
  for (const width of [1487, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await check(`English ${width}px has no horizontal overflow`, noOverflow)
    await capture(`en-${width}`)
  }
  await page.setViewportSize({ width: 1487, height: 1058 })
  await button('More works').click()
  await check('More works uses the existing works route', async () => {
    assert.equal(await nav('My works').getAttribute('aria-pressed'), 'true')
    await noOverflow()
  })
  await nav('Images').click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await check('reduced motion and no external requests', async () => {
    assert.equal(
      await button('More works').evaluate(
        (el) => getComputedStyle(el).transitionDuration
      ),
      '0s'
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
  })
} finally {
  await writeFile(
    path.join(output, 'atelier-checks.json'),
    JSON.stringify({ checks, errors, external }, null, 2)
  )
  await browser.close()
  process.stdout.write(
    JSON.stringify({ output, checks, errors, external }, null, 2)
  )
}
assert.ok(
  checks.every((item) => item.passed),
  'Atelier checks failed'
)
