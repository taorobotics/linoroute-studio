// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated local preview only. No real keys, paid calls or cloud writes.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const modulePath = process.env.STUDIO_PLAYWRIGHT_MODULE
if (!modulePath) throw new Error('Set STUDIO_PLAYWRIGHT_MODULE')
const { chromium } = await import(pathToFileURL(modulePath).href)
const channel = process.env.STUDIO_BROWSER || 'chrome'
const output = path.resolve('artifacts/studio-ui2', channel)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel, headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()
page.setDefaultTimeout(6000)
const errors = []
const external = []
const checks = []
page.on('pageerror', (error) => errors.push(error.message))
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (
    url.hostname !== '127.0.0.1' &&
    !['data:', 'blob:'].includes(url.protocol)
  ) {
    external.push(url.origin)
    return route.abort()
  }
  return route.continue()
})
const button = (name) => page.getByRole('button', { name, exact: true })
const prompt = () => page.getByRole('textbox', { name: '提示词', exact: true })
const input = () =>
  page
    .getByRole('form', { name: /创作设置/ })
    .getByLabel('选择参考文件', { exact: true })
const capture = async (name) => {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: path.join(output, `flow-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}
const check = async (name, run) => {
  try {
    await run()
    checks.push({ name, passed: true })
  } catch (error) {
    checks.push({ name, passed: false, error: error.message })
    throw error
  }
}
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  )

try {
  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' })
  await check(
    'reference files preview locally and template replacement is deliberate',
    async () => {
      await input().setInputFiles(
        path.resolve('public/studio-preview/image-sample.webp')
      )
      await page
        .getByRole('img', { name: 'image-sample.webp', exact: true })
        .waitFor()
      await prompt().fill('保留我的第一份草稿')
      await button('使用模板').click()
      await capture('templates')
      await button('应用模板').click()
      assert.equal(
        await page.locator('textarea').first().inputValue(),
        '保留我的第一份草稿'
      )
      await button('保留草稿').click()
      await page.keyboard.press('Escape')
      assert.equal(await prompt().inputValue(), '保留我的第一份草稿')
      await button('使用模板').click()
      await button('选择模板：陶瓷静物').click()
      await button('应用模板').click()
      await button('确认替换').click()
      assert.ok((await prompt().inputValue()).includes('陶瓷杯'))
    }
  )
  await check(
    'first identity selection keeps draft; queued demo fails then retries as a separate job',
    async () => {
      const draft = await prompt().inputValue()
      await button('预览生成效果').click()
      await button('使用演示身份 A').click()
      assert.equal(await prompt().inputValue(), draft)
      await button('预览生成效果').click()
      await button('演示完成').waitFor()
      assert.equal(await button('预览生成效果').isEnabled(), false)
      await capture('queued')
      await button('演示失败').click()
      await button('重试演示任务').waitFor()
      await capture('failure')
      await button('重试演示任务').click()
      await button('演示完成').click()
      await page
        .getByRole('region', { name: '生成结果' })
        .getByText('演示已完成', { exact: true })
        .waitFor()
      await capture('success')
    }
  )
  await check(
    'local video reference playback, demo generation and history filters work',
    async () => {
      await button('视频创作').click()
      await input().setInputFiles(
        path.resolve('public/studio-preview/video-sample.mp4')
      )
      const video = page.getByLabel('video-sample.mp4', { exact: true })
      await video.evaluate(async (element) => {
        element.muted = true
        await element.play()
      })
      await prompt().fill('镜头平稳推进，安静的湖面泛着晨光。')
      await button('预览生成效果').click()
      assert.equal(
        await video.evaluate((element) => element.paused),
        true,
        'Reference playback must stop when switching to results'
      )
      await button('演示完成').click()
      await page
        .getByRole('region', { name: '生成结果' })
        .getByText('演示已完成', { exact: true })
        .waitFor()
      await button('我的作品').click()
      assert.equal(await video.evaluate((element) => element.paused), true)
      await page.getByRole('article').first().waitFor()
      assert.equal(await page.getByRole('article').count(), 3)
      await capture('works')
      await page
        .getByRole('group', { name: '作品类型筛选' })
        .getByRole('button', { name: '视频创作' })
        .click()
      assert.equal(await page.getByRole('article').count(), 1)
      await button('查看详情').click()
      await capture('details')
      await button('复用设置').click()
      assert.equal(
        await prompt().inputValue(),
        '镜头平稳推进，安静的湖面泛着晨光。'
      )
    }
  )
  await check(
    'durable metadata survives reload; reference files are not persisted',
    async () => {
      await page.reload({ waitUntil: 'networkidle' })
      assert.equal(
        await page.getByRole('button', { name: /^移除 / }).count(),
        0
      )
      await button('配置演示 Key').click()
      await button('使用演示身份 A').click()
      await button('我的作品').click()
      await page.getByRole('article').first().waitFor()
      assert.equal(await page.getByRole('article').count(), 3)
    }
  )
  await check(
    'identity B cannot see identity A records; deletion requires confirmation and is scoped',
    async () => {
      await button('演示身份 A').click()
      await button('使用演示身份 B').click()
      await page.getByText('还没有本地演示记录', { exact: true }).waitFor()
      assert.equal(await page.getByRole('article').count(), 0)
      await button('演示身份 B').click()
      await button('使用演示身份 A').click()
      await page.getByRole('article').first().waitFor()
      await button('删除记录').first().click()
      await capture('delete-confirmation')
      await button('取消').click()
      assert.equal(await page.getByRole('article').count(), 3)
      await button('删除记录').first().click()
      await button('确认删除').click()
      await page.waitForFunction(
        () => document.querySelectorAll('article').length === 2
      )
    }
  )
  await check(
    'wide and narrow desktop dragging keeps both panels usable',
    async () => {
      await page
        .getByRole('navigation')
        .getByRole('button', { name: '图片创作', exact: true })
        .click()
      await page.setViewportSize({ width: 1024, height: 800 })
      const separator = page.getByRole('separator', { name: '调整创作区宽度' })
      await separator.focus()
      await page.keyboard.press('End')
      await noOverflow()
      const result = await page
        .getByRole('region', { name: '生成结果' })
        .boundingBox()
      assert.ok(result && result.width >= 360)
      await capture('narrow-desktop-resized')
      await separator.dblclick()
      await page.setViewportSize({ width: 1920, height: 1080 })
      await separator.focus()
      await page.keyboard.press('End')
      await noOverflow()
      await capture('wide-desktop-resized')
    }
  )
  await check(
    'mobile template, creation/result switch and history stay within the viewport',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(await page.getByRole('separator').count(), 0)
      await button('使用模板').click()
      await capture('mobile-templates')
      await noOverflow()
      await button('应用模板').click()
      await button('预览生成效果').click()
      await button('演示完成').click()
      await page
        .getByRole('region', { name: '生成结果' })
        .getByText('演示已完成', { exact: true })
        .waitFor()
      await capture('mobile-result')
      await noOverflow()
      await button('创作').click()
      assert.ok((await prompt().inputValue()).length > 0)
      await button('我的作品').click()
      await page.getByRole('article').first().waitFor()
      await capture('mobile-works')
      await noOverflow()
      await button('查看详情').first().click()
      const dialog = page.getByRole('dialog', { name: '记录详情' })
      const box = await dialog.boundingBox()
      assert.ok(box && box.x >= 0 && box.x + box.width <= 390)
      await capture('mobile-details')
      await page.keyboard.press('Escape')
    }
  )
  await check(
    'English records and templates remain usable at 320px',
    async () => {
      await button('切换语言').click()
      await page.setViewportSize({ width: 320, height: 800 })
      await noOverflow()
      await capture('english-mobile-works')
      await button('Images').first().click()
      await button('Use a template').click()
      await noOverflow()
      await capture('english-mobile-templates')
      await page.keyboard.press('Escape')
    }
  )
  await check(
    'no real API, OSS or external requests and no uncaught page errors',
    async () => {
      assert.deepEqual(external, [])
      assert.deepEqual(errors, [])
    }
  )
} finally {
  await writeFile(
    path.join(output, 'flow-checks.json'),
    JSON.stringify({ channel, checks, errors, external }, null, 2)
  )
  await browser.close()
  process.stdout.write(JSON.stringify({ checks, errors, external }, null, 2))
}
