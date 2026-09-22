/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import { expect, it } from 'vitest'

import imagePromptCatalog from '../image-prompt-catalog.json'

it('ships hundreds of traceable image prompt cases without broken metadata', () => {
  expect(imagePromptCatalog).toHaveLength(240)

  for (const item of imagePromptCatalog) {
    expect(item.imageUrl).toMatch(/^https:\/\//)
    expect(item.promptZh.trim()).not.toBe('')
    expect(item.promptEn.trim()).not.toBe('')
    expect(item.sourceCaseUrl).toMatch(/^https:\/\//)
    expect(item.sourceId).toMatch(
      /^(awesome-gpt-image-2|youmind-nano-banana-pro)$/
    )
    expect(item.models.length).toBeGreaterThan(0)
  }

  expect(
    imagePromptCatalog.filter((item) => item.models.includes('GPT Image 2.5'))
  ).toHaveLength(160)
  expect(
    imagePromptCatalog.filter((item) => item.models.includes('GPT Image 2'))
  ).toHaveLength(160)
  expect(
    imagePromptCatalog.filter((item) => item.models.includes('Nano Banana Pro'))
  ).toHaveLength(80)
})
