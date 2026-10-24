// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
// Regression test for the production bundle: prompt catalogs must be bundled
// into JavaScript instead of being fetched as missing runtime JSON files.
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'

const distRoot = join(process.cwd(), 'dist-studio-preview')

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectJavaScript(path)))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path)
  }
  return files
}

test('production bundle contains both prompt catalogs', async () => {
  const files = await collectJavaScript(join(distRoot, 'static', 'js'))
  const bundle = (
    await Promise.all(files.map((file) => readFile(file, 'utf8')))
  ).join('\n')

  assert.match(bundle, /幼儿词汇拆解学习卡/)
  assert.match(bundle, /Car Sketch 3D/)
  assert.doesNotMatch(bundle, /image-prompt-catalog\.json/)
  assert.doesNotMatch(bundle, /video-prompt-catalog\.json/)
})
