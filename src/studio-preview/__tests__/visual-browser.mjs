// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only visual checks. Uses an isolated browser; never a user's profile.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const modulePath = process.env.STUDIO_PLAYWRIGHT_MODULE
if (!modulePath) {
  throw new Error(
    'Set STUDIO_PLAYWRIGHT_MODULE to the available Playwright package entry'
  )
}
const { chromium } = await import(pathToFileURL(modulePath).href)
const channel = process.env.STUDIO_BROWSER || 'msedge'
const output = path.resolve(
  process.env.STUDIO_ARTIFACT_DIR || 'artifacts/studio-ui2',
  channel
)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel, headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()
const external = []
const errors = []
const checks = []
await page.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:') {
    external.push(url.origin)
    return route.abort()
  }
  return route.continue()
})
page.on('pageerror', (error) => errors.push(error.message))
async function capture(name) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}
async function check(label, fn) {
  try {
    await fn()
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
async function topNavigation() {
  const header = page.getByRole('banner')
  const navigation = header.getByRole('navigation')
  const navBox = await navigation.boundingBox()
  const headerBox = await header.boundingBox()
  assert.ok(
    navBox &&
      headerBox &&
      navBox.y + navBox.height <= headerBox.y + headerBox.height
  )
  const buttons = await navigation.getByRole('button').all()
  assert.equal(buttons.length, 4)
  let previous
  for (const button of buttons) {
    const box = await button.boundingBox()
    assert.ok(box && box.height >= 44 && box.x >= 0)
    if (previous) {
      assert.ok(
        Math.abs(box.y - previous.y) < 1,
        'workspace links should share one horizontal row'
      )
      assert.ok(
        box.x >= previous.x + previous.width,
        'workspace links should not overlap'
      )
    }
    previous = box
  }
  for (const control of await header.getByRole('button').all()) {
    if (await control.evaluate((el) => Boolean(el.closest('nav')))) continue
    const box = await control.boundingBox()
    assert.ok(box)
    const overlaps =
      box.x < navBox.x + navBox.width &&
      box.x + box.width > navBox.x &&
      box.y < navBox.y + navBox.height &&
      box.y + box.height > navBox.y
    assert.equal(
      overlaps,
      false,
      'header controls should not overlap workspace navigation'
    )
  }
  assert.equal(await page.getByRole('complementary').count(), 0)
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox()
  assert.ok(
    headingBox && headingBox.x <= 40,
    'workspace should use the former sidebar space'
  )
  await noOverflow()
}
try {
  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '使用模板', exact: true }).click()
  await page.getByRole('button', { name: '应用模板', exact: true }).click()
  await capture('desktop-image')
  await check(
    'desktop split handle supports drag, keyboard limits and reset',
    async () => {
      const handle = page.getByRole('separator', {
        name: '调整创作区宽度',
        exact: true,
      })
      const controls = page.getByRole('form', {
        name: '图片创作设置',
        exact: true,
      })
      await handle.waitFor({ timeout: 3000 })
      const start = await handle.boundingBox()
      const before = await controls.boundingBox()
      assert.ok(start && before)
      await page.mouse.move(start.x + start.width / 2, start.y + 150)
      await page.mouse.down()
      await page.mouse.move(start.x + start.width / 2 + 120, start.y + 150, {
        steps: 8,
      })
      await page.mouse.up()
      assert.ok((await controls.boundingBox()).width > before.width + 100)
      await handle.focus()
      await page.keyboard.press('Home')
      assert.ok(Math.abs((await controls.boundingBox()).width - 300) < 2)
      await page.keyboard.press('End')
      assert.ok((await controls.boundingBox()).width <= 621)
      await page.keyboard.press('ArrowLeft')
      assert.ok((await controls.boundingBox()).width < 620)
      await handle.dblclick()
      assert.ok(
        Math.abs((await controls.boundingBox()).width - before.width) < 2
      )
      await noOverflow()
    }
  )
  await check(
    'GPT-image-2.5 can be selected without losing the draft or existing models',
    async () => {
      const picker = page.getByRole('combobox', { name: '模型', exact: true })
      const prompt = page.getByRole('textbox', { name: '提示词', exact: true })
      const draft = await prompt.inputValue()
      await picker.selectOption({ label: 'GPT-image-2.5' })
      assert.equal(
        await picker.locator('option:checked').textContent(),
        'GPT-image-2.5'
      )
      await page.getByRole('button', { name: '视频创作', exact: true }).click()
      await page.getByRole('button', { name: '图片创作', exact: true }).click()
      assert.equal(
        await picker.locator('option:checked').textContent(),
        'GPT-image-2.5'
      )
      assert.equal(await prompt.inputValue(), draft)
      await capture('desktop-gpt-image-2-5')
      await picker.selectOption({ label: 'Nano Banana Pro' })
      await picker.selectOption({ label: 'GPT-image-2' })
    }
  )
  await check(
    '1440px workspace navigation is horizontal in the header',
    topNavigation
  )
  await check(
    'resource links are preserved and Escape restores focus',
    async () => {
      const trigger = page.getByRole('button', {
        name: '更多入口',
        exact: true,
      })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const popup = page.getByRole('dialog', { name: '更多入口', exact: true })
      await popup.waitFor()
      assert.equal(await popup.getByRole('link').count(), 3)
      assert.equal(
        await popup
          .getByRole('link', { name: '模型广场' })
          .getAttribute('href'),
        'https://linoroute.com/pricing'
      )
      assert.equal(
        await popup.getByRole('link', { name: '控制台' }).getAttribute('href'),
        'https://linoroute.com/console'
      )
      assert.equal(
        await popup
          .getByRole('link', { name: 'API 文档' })
          .getAttribute('href'),
        'https://ninoroute.com/tutorials/00-intro'
      )
      await capture('desktop-resources')
      await page.keyboard.press('Escape')
      await popup.waitFor({ state: 'hidden' })
      assert.ok(await trigger.evaluate((el) => el === document.activeElement))
    }
  )
  await check(
    '1440 desktop has a first-screen primary action and no horizontal overflow',
    async () => {
      await noOverflow()
      const box = await page
        .getByRole('button', { name: '预览生成效果', exact: true })
        .boundingBox()
      assert.ok(box && box.y >= 0 && box.y + box.height <= 900)
    }
  )
  await page.getByRole('button', { name: '放大图片', exact: true }).click()
  await check('image enlargement opens and Escape returns focus', async () => {
    assert.ok(
      await page
        .getByRole('dialog', { name: '示例作品', exact: true })
        .isVisible()
    )
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.ok(
      await page
        .getByRole('button', { name: '放大图片', exact: true })
        .evaluate((el) => el === document.activeElement)
    )
  })
  await page.getByRole('button', { name: '预览设置', exact: true }).click()
  await page.getByRole('button', { name: '空白状态', exact: true }).click()
  await capture('desktop-empty')
  await page.getByRole('button', { name: '视频创作', exact: true }).click()
  await page.getByRole('button', { name: '使用模板', exact: true }).click()
  await page.getByRole('button', { name: '应用模板', exact: true }).click()
  await capture('desktop-video')
  await check(
    'video plays locally and pauses when leaving its workspace',
    async () => {
      const video = page.getByLabel('视频演示素材', { exact: true })
      await video.evaluate(async (el) => {
        el.muted = true
        await el.play()
      })
      await page.waitForFunction(
        () => document.querySelector('video')?.currentTime > 0.2
      )
      await page.getByRole('button', { name: '图片创作', exact: true }).click()
      assert.equal(await video.evaluate((el) => el.paused), true)
    }
  )
  await page.getByRole('button', { name: '视频创作', exact: true }).click()
  await page.getByRole('button', { name: '预览设置', exact: true }).click()
  await page.getByRole('button', { name: '生成中', exact: true }).click()
  await capture('desktop-generating')
  await page.getByRole('button', { name: '图片创作', exact: true }).click()
  await page.getByRole('button', { name: '示例结果', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 800 })
  await capture('desktop-1280')
  await check('1280px workspace navigation fits in the header', topNavigation)
  await check(
    '1280 desktop primary action stays inside the first screen',
    async () => {
      await noOverflow()
      const box = await page
        .getByRole('button', { name: '预览生成效果', exact: true })
        .boundingBox()
      assert.ok(box && box.y + box.height <= 800)
    }
  )
  for (const [width, height] of [
    [1024, 900],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height })
    await check(
      `${width}px top navigation and workspace do not overlap or overflow`,
      topNavigation
    )
    await capture(`width-${width}-create`)
    if (width < 760) {
      await page.getByRole('button', { name: '结果', exact: true }).click()
      await check(
        `${width}px result tab shows the artwork and preserves the draft`,
        async () => {
          assert.ok(
            await page
              .getByRole('img', { name: '图片演示素材', exact: true })
              .isVisible()
          )
          await noOverflow()
        }
      )
      await capture(`width-${width}-result`)
      await page.getByRole('button', { name: '创作', exact: true }).click()
      assert.ok(
        (
          await page
            .getByRole('textbox', { name: '提示词', exact: true })
            .inputValue()
        ).length > 0
      )
    }
  }
  await page.getByRole('button', { name: '配置演示 Key', exact: true }).click()
  await capture('mobile-key-dialog')
  await page.keyboard.press('Escape')
  await check(
    'mobile resources remain accessible inside the viewport',
    async () => {
      await page.getByRole('button', { name: '更多入口', exact: true }).click()
      const popup = page.getByRole('dialog', { name: '更多入口', exact: true })
      await popup.waitFor()
      const box = await popup.boundingBox()
      assert.ok(box && box.x >= 0 && box.x + box.width <= 360)
      await capture('mobile-resources')
      await page.keyboard.press('Escape')
      await popup.waitFor({ state: 'hidden' })
    }
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: '切换语言', exact: true }).click()
  await capture('desktop-english')
  await check(
    'English layout keeps all four workspace links in the header',
    topNavigation
  )
  for (const width of [1920, 1280, 1241, 1101, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await check(
      `English ${width}px navigation remains horizontal and unobstructed`,
      topNavigation
    )
  }
  await capture('mobile-english')
  await page.setViewportSize({ width: 1440, height: 900 })
  await check(
    'design-review controls stay out of the normal workspace',
    async () => {
      assert.equal(
        await page.getByText('View the design system', { exact: true }).count(),
        0
      )
    }
  )
  await check('interface stays usable when font downloads fail', async () => {
    const fallbackPage = await context.newPage()
    try {
      await fallbackPage.route('**/*.woff2', (route) => route.abort())
      await fallbackPage.goto('http://127.0.0.1:4178/', {
        waitUntil: 'domcontentloaded',
      })
      await fallbackPage
        .getByRole('textbox', { name: '提示词', exact: true })
        .waitFor()
      assert.ok(
        await fallbackPage
          .getByRole('heading', { name: '图片创作', exact: true })
          .isVisible()
      )
    } finally {
      await fallbackPage.close()
    }
  })
  await check(
    'preview makes no external requests and produces no page errors',
    async () => {
      assert.deepEqual(external, [])
      assert.deepEqual(errors, [])
    }
  )
} finally {
  await writeFile(
    path.join(output, 'checks.json'),
    JSON.stringify({ channel, checks, errors, external }, null, 2)
  )
  await browser.close()
  process.stdout.write(
    JSON.stringify({ output, checks, errors, external }, null, 2)
  )
}
assert.ok(
  checks.every((item) => item.passed),
  'Some visual checks failed'
)
