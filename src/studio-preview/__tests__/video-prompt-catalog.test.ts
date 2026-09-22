/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest'

import catalog from '../video-prompt-catalog.json'

const expectedModels = new Set([
  'MiniMax H3',
  'Seedance 2.0',
  'Seedance 2.0 Fast',
  'Kling Video 3.0',
  'Kling Video 3.0 Omni',
  'Veo 3.1',
  'Veo 3.1 Fast',
  'Grok Imagine Video',
])

describe('video prompt catalog', () => {
  it('contains 159 playable and attributed prompt cases', () => {
    expect(catalog).toHaveLength(159)

    for (const item of catalog) {
      expect(item.kind).toBe('video')
      expect(item.videoUrl).toMatch(/^https:\/\/.+\.mp4(?:\?.*)?$/)
      expect(item.videoPosterUrl).toMatch(/^https:\/\//)
      expect(item.promptEn.trim().length).toBeGreaterThan(30)
      expect(item.sourceId).toBe('awesome-video-prompts')
      expect(item.sourceCaseUrl).toMatch(
        /^https:\/\/github\.com\/ilkerzg\/awesome-video-prompts\/blob\/[a-f0-9]{40}\//
      )
      expect(item.creatorName.trim()).not.toBe('')
      expect(item.creatorUrl).toMatch(/^https:\/\//)
      expect(item.generationModel).toBe('Seedance 2.0')
      expect(item.models).toContain('Seedance 2.0')
      expect(item.models).toContain('Seedance 2.0 Fast')
      expect(item.models.every((model) => expectedModels.has(model))).toBe(true)
    }
  })

  it('covers every video model currently offered by the studio', () => {
    const coveredModels = new Set(catalog.flatMap((item) => item.models))
    expect(coveredModels).toEqual(expectedModels)
  })
})
