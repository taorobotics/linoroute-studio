// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Isolated local file tests. Synthetic canvas fixtures, never stock video downloads.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(
  pathToFileURL(process.env.STUDIO_PLAYWRIGHT_MODULE).href
)
const channel = process.env.STUDIO_BROWSER || 'chrome'
const output = path.resolve('artifacts/studio-ui3', channel)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel, headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
})
const external = [],
  errors = [],
  checks = []
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
await context.addInitScript(() => {
  const original = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (...args) {
    if (globalThis.__fileTestQuota && this.name === 'blobs') {
      throw new DOMException('Test quota full', 'QuotaExceededError')
    }
    return original.apply(this, args)
  }
  const get = IDBObjectStore.prototype.get
  IDBObjectStore.prototype.get = function (...args) {
    const request = get.apply(this, args)
    if (globalThis.__fileTestReadAbort && this.name === 'blobs') {
      queueMicrotask(() => this.transaction.abort())
    }
    return request
  }
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', (error) => errors.push(error.message))
const button = (name) => page.getByRole('button', { name, exact: true })
const nav = (name) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true })
const result = () => page.getByRole('region', { name: '生成结果' })
const capture = async (name) => {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: (await page.getByRole('dialog').count()) === 0,
    animations: 'disabled',
  })
}
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  )
const check = async (name, run) => {
  try {
    await run()
    checks.push({ name, passed: true })
  } catch (error) {
    checks.push({ name, passed: false, error: error.message })
    throw error
  }
}
const chooseA = async () => {
  await button('配置演示 Key').click()
  await button('使用演示身份 A').click()
}
const complete = async (prompt) => {
  await page.getByRole('textbox', { name: '提示词', exact: true }).fill(prompt)
  await button('预览生成效果').click()
  await button('演示完成').click()
  await result().getByText('演示已完成', { exact: true }).waitFor()
  await result()
    .getByLabel('选择测试结果文件', { exact: true })
    .waitFor({ state: 'attached' })
}
const importFile = async (name, mimeType, buffer) => {
  await result()
    .getByLabel('选择测试结果文件', { exact: true })
    .setInputFiles({ name, mimeType, buffer })
}
const download = async (name, bytes) => {
  const pending = page.waitForEvent('download')
  await page.getByRole('link', { name: '下载文件', exact: true }).click()
  const file = await pending
  assert.equal(file.suggestedFilename(), name)
  const stream = await file.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  assert.deepEqual(Buffer.concat(chunks), bytes)
}
let imageBytes, videoBytes
try {
  await page.goto('http://127.0.0.1:4178/')
  await chooseA()
  const png = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#eaf1ff'
    ctx.fillRect(0, 0, 960, 600)
    ctx.fillStyle = '#2864f0'
    ctx.fillRect(80, 100, 160, 160)
    ctx.fillStyle = '#071a36'
    ctx.font = '40px sans-serif'
    ctx.fillText('LINOROUTE / LOCAL TEST', 80, 350)
    ctx.font = '24px sans-serif'
    ctx.fillText('Original bytes. No model request.', 80, 400)
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
  imageBytes = Buffer.from(png)
  await check(
    'image save writes original bytes and renders a browser-local preview',
    async () => {
      await complete('UI-3 image persistence test')
      await importFile('local-test.png', 'image/png', imageBytes)
      await result().getByRole('img', { name: 'local-test.png' }).waitFor()
      await result()
        .getByRole('button', { name: '保留到此浏览器', exact: true })
        .click()
      await result().getByText('已保留到此浏览器', { exact: true }).waitFor()
      await download('local-test.png', imageBytes)
      await noOverflow()
      await capture('image-saved-desktop')
    }
  )
  await check(
    'refresh restores the exact file; simulated seven-day expiry does not remove it',
    async () => {
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open('linoroute-studio-preview-v1')
            request.addEventListener('success', () => {
              const db = request.result
              const tx = db.transaction('records', 'readwrite')
              const cursor = tx.objectStore('records').openCursor()
              cursor.addEventListener('success', () => {
                const item = cursor.result
                if (!item) return
                item.update({ ...item.value, expiresAt: 1 })
                item.continue()
              })
              tx.addEventListener('complete', () => {
                db.close()
                resolve()
              })
              tx.addEventListener('error', () => reject(tx.error))
            })
            request.addEventListener('error', () => reject(request.error))
          })
      )
      await page.reload()
      await chooseA()
      await nav('我的作品').click()
      await button('查看详情').click()
      await page
        .getByRole('dialog')
        .getByRole('img', { name: 'local-test.png' })
        .waitFor()
      await download('local-test.png', imageBytes)
      assert.equal(
        await page
          .getByRole('dialog')
          .getByText('本地文件不受模拟预览到期时间影响。建议另行下载一份备份。')
          .isVisible(),
        true
      )
      await capture('image-restored-detail')
      await page.keyboard.press('Escape')
    }
  )
  await check(
    'deleting a prompt record leaves a discoverable, downloadable file',
    async () => {
      await button('删除记录').click()
      await button('确认删除').click()
      await page.getByText('还没有本地演示记录').waitFor()
      await button('查看文件 local-test.png').click()
      await download('local-test.png', imageBytes)
      await page.keyboard.press('Escape')
      await capture('record-deleted-file-retained')
    }
  )
  await check(
    'Demo B cannot list, preview or remove Demo A files',
    async () => {
      await button('演示身份 A').click()
      await button('使用演示身份 B').click()
      await page
        .getByText('还没有保存文件。完成一次演示任务，再导入测试结果即可体验。')
        .waitFor()
      assert.equal(
        await page.getByText('local-test.png', { exact: true }).count(),
        0
      )
      await button('演示身份 B').click()
      await button('使用演示身份 A').click()
      await button('查看文件 local-test.png').waitFor()
    }
  )
  await check(
    'video file saves, plays, and stops when leaving the workspace',
    async () => {
      videoBytes = Buffer.from(
        await page.evaluate(async () => {
          const canvas = document.createElement('canvas')
          canvas.width = 640
          canvas.height = 360
          const ctx = canvas.getContext('2d')
          const stream = canvas.captureStream(12)
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8',
          })
          const chunks = []
          const done = new Promise((resolve) => {
            recorder.addEventListener('dataavailable', (event) =>
              chunks.push(event.data)
            )
            recorder.addEventListener('stop', async () =>
              resolve([
                ...new Uint8Array(
                  await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()
                ),
              ])
            )
          })
          recorder.start()
          const start = performance.now()
          const draw = () => {
            const elapsed = performance.now() - start
            ctx.fillStyle = '#071a36'
            ctx.fillRect(0, 0, 640, 360)
            ctx.fillStyle = '#2864f0'
            ctx.fillRect(40 + elapsed / 15, 60, 120, 120)
            ctx.fillStyle = '#ffffff'
            ctx.font = '24px sans-serif'
            ctx.fillText('LOCAL VIDEO TEST', 40, 260)
            if (elapsed < 1500) requestAnimationFrame(draw)
            else {
              recorder.stop()
              stream.getTracks().forEach((track) => track.stop())
            }
          }
          draw()
          return done
        })
      )
      await nav('视频创作').click()
      await complete('UI-3 video persistence test')
      await importFile('local-test.webm', 'video/webm', videoBytes)
      await result()
        .getByRole('button', { name: '保留到此浏览器', exact: true })
        .click()
      await result().getByText('已保留到此浏览器', { exact: true }).waitFor()
      const video = page.locator('video[aria-label="local-test.webm"]')
      await video.evaluate(async (element) => {
        element.muted = true
        await element.play()
      })
      await page.waitForFunction(() =>
        [...document.querySelectorAll('video')].some(
          (element) =>
            element.getAttribute('aria-label') === 'local-test.webm' &&
            element.currentTime > 0
        )
      )
      await nav('我的作品').click()
      assert.equal(await video.evaluate((element) => element.paused), true)
      await button('查看文件 local-test.webm').click()
      await download('local-test.webm', videoBytes)
      await capture('video-file-preview')
      await page.keyboard.press('Escape')
      await page.reload()
      await chooseA()
      await nav('我的作品').click()
      await button('查看文件 local-test.webm').click()
      await download('local-test.webm', videoBytes)
      await page.keyboard.press('Escape')
    }
  )
  await check(
    'file-only deletion leaves the video prompt record and the other file untouched',
    async () => {
      await button('删除文件 local-test.webm').click()
      await button('取消').click()
      await button('查看文件 local-test.webm').waitFor()
      await button('删除文件 local-test.webm').click()
      await button('仅删除文件').click()
      await button('查看文件 local-test.webm').waitFor({ state: 'detached' })
      await button('查看详情').click()
      await page.getByText('未找到本地文件', { exact: true }).waitFor()
      await page.keyboard.press('Escape')
      await button('查看文件 local-test.png').waitFor()
    }
  )
  await check(
    'an aborted IndexedDB read is recoverable without an unhandled promise or lost file',
    async () => {
      const previousErrors = errors.length
      await page.evaluate(() => {
        globalThis.__fileTestReadAbort = true
      })
      await button('查看文件 local-test.png').click()
      await page
        .getByRole('dialog')
        .getByText('读取本地文件失败，请先重试，避免覆盖已有文件。')
        .waitFor()
      await page.evaluate(() => {
        globalThis.__fileTestReadAbort = false
      })
      await page
        .getByRole('dialog')
        .getByRole('button', { name: '重试', exact: true })
        .click()
      await download('local-test.png', imageBytes)
      await page.keyboard.press('Escape')
      assert.deepEqual(errors.slice(previousErrors), [])
    }
  )
  await check(
    'quota errors never claim a successful save and never hide previously saved files',
    async () => {
      await nav('图片创作').click()
      await complete('UI-3 quota retry test')
      await importFile('quota-test.png', 'image/png', imageBytes)
      await page.evaluate(() => {
        globalThis.__fileTestQuota = true
      })
      await result()
        .getByRole('button', { name: '保留到此浏览器', exact: true })
        .click()
      await result()
        .getByRole('alert')
        .filter({ hasText: '浏览器存储空间不足' })
        .waitFor()
      assert.equal(
        await result().getByText('已保留到此浏览器', { exact: true }).count(),
        0
      )
      await download('quota-test.png', imageBytes)
      await nav('我的作品').click()
      await button('查看文件 local-test.png').waitFor()
      await nav('图片创作').click()
      await page.evaluate(() => {
        globalThis.__fileTestQuota = false
      })
      await result()
        .getByRole('button', { name: '保留到此浏览器', exact: true })
        .click()
      await result().getByText('已保留到此浏览器', { exact: true }).waitFor()
    }
  )
  await check(
    'mobile and English file controls, dialogs and library fit narrow screens',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await button('结果').click()
      await noOverflow()
      await capture('mobile-file-result')
      await nav('我的作品').click()
      await noOverflow()
      await capture('mobile-file-library')
      await button('查看文件 quota-test.png').click()
      await page.getByRole('link', { name: '下载文件', exact: true }).waitFor()
      await noOverflow()
      await capture('mobile-file-dialog')
      await page.keyboard.press('Escape')
      await button('切换语言').click()
      await page.setViewportSize({ width: 320, height: 800 })
      await noOverflow()
      await capture('english-320-library')
    }
  )
  await check(
    'no uncaught errors or real API/OSS/external requests',
    async () => {
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
    }
  )
} finally {
  await writeFile(
    path.join(output, 'file-checks.json'),
    JSON.stringify({ checks, errors, external }, null, 2)
  )
  await browser.close()
  process.stdout.write(JSON.stringify({ checks, errors, external }, null, 2))
}
