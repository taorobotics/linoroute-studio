/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import type { MediaKind } from './contracts'
import { GPT2_OPTIONS, GPT25_OPTIONS } from './gpt-image-selection'

interface DemoMedia {
  src: string
  poster?: string
  mime: string
  label: string
}

interface DemoParameter {
  id: string
  label: string
  options: readonly string[]
}

export const DEMO_MEDIA: Record<MediaKind, DemoMedia> = {
  image: {
    src: '/studio-preview/image-sample.webp',
    mime: 'image/webp',
    label: 'Shared image interaction sample',
  },
  video: {
    src: '/studio-preview/video-sample.mp4',
    poster: '/studio-preview/video-sample-poster.webp',
    mime: 'video/mp4',
    label: 'Shared video interaction sample',
  },
}

export const DEMO_IMAGE_MODELS = [
  ...GPT2_OPTIONS.map((option) => ({
    id: option.apiId === 'gpt-image-2-c' ? 'demo-image' : 'demo-gpt-image-2',
    label: 'GPT-image-2',
    productionCandidateId: option.apiId,
    parameters: [
      {
        id: 'size',
        label: 'Preview layout',
        options: ['Square preview', 'Landscape preview', 'Portrait preview'],
      },
    ] satisfies DemoParameter[],
  })),
  ...GPT25_OPTIONS.map((option) => ({
    // Preserve the original demo ID so existing local records can still be reused.
    id:
      option.apiId === 'gpt-image-2.5-flare-c'
        ? 'demo-gpt-image-2-5'
        : `demo-${option.apiId}`,
    label: 'GPT-image-2.5',
    productionCandidateId: option.apiId,
    parameters: [] satisfies DemoParameter[],
  })),
  {
    id: 'demo-nanobanana-pro',
    label: 'Nano Banana Pro',
    productionCandidateId: 'gemini-3-pro-image-preview',
    parameters: [
      {
        id: 'aspectRatio',
        label: 'Aspect ratio',
        options: ['1:1', '9:16', '16:9'],
      },
      {
        id: 'resolution',
        label: 'Resolution preview',
        options: ['1K'],
      },
    ] satisfies DemoParameter[],
  },
] as const

// Curated preview assets, never presented as the user's generated history.
export const DEMO_IMAGE_SAMPLES = [
  {
    id: 'amber',
    src: DEMO_MEDIA.image.src,
    title: 'An afternoon, in amber',
    description: 'Light, texture, and a little imagination.',
    width: 1200,
    height: 750,
  },
  {
    id: 'flower',
    src: '/studio-preview/flower-sample.png',
    title: 'A flower in soft light',
    description: 'A quiet study of petals, light and delicate texture.',
    width: 1586,
    height: 992,
  },
  {
    id: 'vase',
    src: '/studio-preview/vase-sample.png',
    title: 'A little room for green',
    description: 'Natural forms, warm stone and a slower afternoon.',
    width: 1586,
    height: 992,
  },
] as const

export const DEMO_VIDEO_MODELS = [
  { id: 'demo-video', label: 'MiniMax H3' },
  { id: 'demo-seedance-2-5', label: 'Seedance 2.5' },
  { id: 'demo-seedance-2', label: 'Seedance 2.0' },
  { id: 'demo-seedance-2-fast', label: 'Seedance 2.0 Fast' },
  { id: 'demo-kling-3', label: 'Kling Video 3.0' },
  { id: 'demo-veo', label: 'Veo 3.1' },
  { id: 'demo-omni', label: 'Gemini Omni' },
  { id: 'demo-grok-video', label: 'Grok Imagine Video' },
] as const
