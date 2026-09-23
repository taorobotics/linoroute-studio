/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import { expect, it } from 'vitest'

import { loadImagePromptCatalog } from '../prompt-library-data'

it('ships hundreds of traceable image prompt cases without broken metadata', async () => {
  const imagePromptCatalog = await loadImagePromptCatalog()
  expect(imagePromptCatalog).toHaveLength(270)

  for (const item of imagePromptCatalog) {
    expect(item.imageUrl).toMatch(/^https:\/\//)
    expect(item.promptZh.trim()).not.toBe('')
    expect(item.promptEn.trim()).not.toBe('')
    expect(item.sourceCaseUrl).toMatch(/^https:\/\//)
    expect(item.sourceId).toMatch(
      /^(awesome-gpt-image-2|youmind-nano-banana-pro|aiwind-imagegen)$/
    )
    expect(item.models.length).toBeGreaterThan(0)
  }

  expect(
    imagePromptCatalog.filter((item) => item.models.includes('GPT Image 2.5'))
  ).toHaveLength(190)
  expect(
    imagePromptCatalog.filter((item) => item.models.includes('GPT Image 2'))
  ).toHaveLength(190)
  expect(
    imagePromptCatalog.filter((item) => item.models.includes('Nano Banana Pro'))
  ).toHaveLength(80)
})
