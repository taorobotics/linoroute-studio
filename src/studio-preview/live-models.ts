/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  GPT25_DOCUMENTED_IDS,
  GPT25_PER_REQUEST_IDS,
} from './image-output-specs'
import type { LiveModel } from './live-types'

// IDs and protocols checked against LinoRoute pricing and Ninoroute docs 2026-09-15.
// The authenticated model list still decides what this particular key may select.
export const LIVE_MODELS: LiveModel[] = [
  ...[
    ['gpt-image-2.5-flare', 'GPT Image 2.5 · Flare'],
    ['gpt-image-2.5-sunburst', 'GPT Image 2.5 · Sunburst'],
    ['gpt-image-2.5-flare-c', 'GPT Image 2.5 · Flare C'],
    ['gpt-image-2.5-sunburst-c', 'GPT Image 2.5 · Sunburst C'],
    ['gpt-image-2', 'GPT-image-2'],
    ['gpt-image-2-c', 'GPT-image-2'],
  ].map(
    ([id, label]): LiveModel => ({
      id,
      label,
      kind: 'image',
      protocol: 'openai-image',
      ratios: (() => {
        if (GPT25_DOCUMENTED_IDS.includes(id)) {
          return ['1:1', '3:2', '2:3', '16:9', '9:16', 'auto']
        }
        if (GPT25_PER_REQUEST_IDS.includes(id)) {
          return ['1:1', '3:2', '2:3', '16:9', '9:16']
        }
        if (id === 'gpt-image-2') {
          return ['1:1', '3:2', '2:3', '16:9', '9:16', 'auto']
        }
        if (id === 'gpt-image-2-c') return ['1:1', '3:2', '2:3', '16:9']
        return ['1:1', '3:2', '2:3']
      })(),
    })
  ),
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    kind: 'image',
    protocol: 'gemini-image',
    ratios: ['1:1', '3:2', '16:9', '9:16'],
  },
  {
    id: 'doubao-seedance-2-5-260628',
    label: 'Seedance 2.5',
    kind: 'video',
    protocol: 'seedance',
    ratios: ['16:9', '9:16', '1:1', '4:3', 'adaptive'],
    durations: Array.from({ length: 27 }, (_, index) => index + 4),
    defaultDuration: 5,
  },
  {
    id: 'doubao-seedance-2-0-260128',
    label: 'Seedance 2.0',
    kind: 'video',
    protocol: 'seedance',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [5, 8, 10],
  },
  {
    id: 'doubao-seedance-2-0-fast-260128',
    label: 'Seedance 2.0 Fast',
    kind: 'video',
    protocol: 'seedance',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [5, 8, 10],
  },
  {
    id: 'kling-video',
    label: 'Kling Video 3.0',
    kind: 'video',
    protocol: 'kling',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [5, 8, 10],
  },
  {
    id: 'kling-omni-video',
    label: 'Kling Video 3.0 Omni',
    kind: 'video',
    protocol: 'kling-omni',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [5, 8, 10],
  },
  {
    id: 'aigc-video-hailuo',
    label: 'MiniMax H3',
    kind: 'video',
    protocol: 'vod',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: 'veo_3_1',
    label: 'Veo 3.1',
    kind: 'video',
    protocol: 'veo',
    ratios: ['16:9', '9:16'],
    durations: [8],
  },
  {
    id: 'veo_3_1-fast',
    label: 'Veo 3.1 Fast',
    kind: 'video',
    protocol: 'veo',
    ratios: ['16:9', '9:16'],
    durations: [8],
  },
  {
    id: 'grok-imagine-video',
    label: 'Grok Imagine Video',
    kind: 'video',
    protocol: 'grok',
    ratios: ['16:9', '9:16', '1:1'],
    durations: [5, 8, 10],
  },
]
