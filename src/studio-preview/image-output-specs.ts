/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import type { LiveModel } from './live-types'

export interface ImageOutputOption {
  ratio: string
  size: string
  tier?: '1K' | '2K' | '4K'
  experimental?: boolean
}

export type ImageGenerationMode = 'text' | 'image'
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type ImageFormat = 'png' | 'jpeg' | 'webp'
export type ImageBackground = 'auto' | 'opaque' | 'transparent'
export type ImageModeration = 'auto' | 'low'

export interface ImageRequestOptions {
  qualities: ImageQuality[]
  formats: ImageFormat[]
  backgrounds: ImageBackground[]
  moderations: ImageModeration[]
  defaultQuality: ImageQuality
  defaultFormat: ImageFormat
  defaultBackground: ImageBackground
  defaultModeration: ImageModeration
  count: 1
}

// Ninoroute entries 513295251 / 513297453, checked 2026-09-13.
// Explicit non-c IDs: billing aliases must not inherit undocumented capabilities.
export const GPT25_DOCUMENTED_IDS = [
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
]
export const GPT25_PER_REQUEST_IDS = [
  'gpt-image-2.5-flare-c',
  'gpt-image-2.5-sunburst-c',
]
// Real generation probes, 2026-09-13: both -c variants accepted these wide/tall
// sizes but returned different pixel dimensions. Do not advertise exact 2K/4K.
const GPT25_PER_REQUEST_OUTPUTS: ImageOutputOption[] = [
  { ratio: '1:1', size: '1024x1024' },
  { ratio: '3:2', size: '1536x1024' },
  { ratio: '2:3', size: '1024x1536' },
  { ratio: '16:9', size: '2048x1152' },
  { ratio: '9:16', size: '1152x2048' },
]
const GPT25_OUTPUTS: ImageOutputOption[] = [
  { ratio: '1:1', size: '1024x1024', tier: '1K' },
  { ratio: '1:1', size: '2048x2048', tier: '2K' },
  { ratio: '3:2', size: '1536x1024', tier: '1K' },
  { ratio: '2:3', size: '1024x1536', tier: '1K' },
  { ratio: '16:9', size: '2048x1152', tier: '2K' },
  { ratio: '16:9', size: '3840x2160', tier: '4K', experimental: true },
  { ratio: '9:16', size: '2160x3840', tier: '4K', experimental: true },
  { ratio: 'auto', size: 'auto' },
]
const LEGACY_SIZES: Record<string, string> = {
  '1:1': '1024x1024',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
}

// These exact dimensions were decoded from real responses on 2026-09-13.
// The gateway limits this capability to eligible GPT Image 2 groups.
const GPT2_PER_REQUEST_OUTPUTS: ImageOutputOption[] = [
  { ratio: '1:1', size: '1024x1024', tier: '1K' },
  { ratio: '1:1', size: '2048x2048', tier: '2K' },
  { ratio: '3:2', size: '1536x1024', tier: '1K' },
  { ratio: '2:3', size: '1024x1536', tier: '1K' },
  { ratio: '16:9', size: '3840x2160', tier: '4K', experimental: true },
]

// Ninoroute GPT Image 2 generation documentation, leaf 453199915,
// checked 2026-09-13. 4K presets are documented as experimental upstream.
const GPT2_GENERATION_OUTPUTS: ImageOutputOption[] = [
  { ratio: '1:1', size: '1024x1024', tier: '1K' },
  { ratio: '1:1', size: '2048x2048', tier: '2K' },
  { ratio: '3:2', size: '1536x1024', tier: '1K' },
  { ratio: '2:3', size: '1024x1536', tier: '1K' },
  { ratio: '16:9', size: '2048x1152', tier: '2K' },
  { ratio: '16:9', size: '3840x2160', tier: '4K', experimental: true },
  { ratio: '9:16', size: '2160x3840', tier: '4K', experimental: true },
  { ratio: 'auto', size: 'auto' },
]

// The edit endpoint accepts an explicit output canvas. `auto` delegates that
// choice to the model; the uploaded image does not force the output size.
const GPT2_EDIT_OUTPUTS: ImageOutputOption[] = [
  { ratio: '1:1', size: '1024x1024', tier: '1K' },
  { ratio: '3:2', size: '1536x1024', tier: '1K' },
  { ratio: '2:3', size: '1024x1536', tier: '1K' },
  { ratio: 'auto', size: 'auto' },
]

export function imageOutputOptions(
  model?: LiveModel,
  mode: ImageGenerationMode = 'text'
): ImageOutputOption[] {
  if (!model) return []
  if (model.id === 'gemini-3-pro-image-preview') {
    return model.ratios.flatMap((ratio) =>
      ['1K', '2K', '4K'].map((size) => ({ ratio, size }))
    )
  }
  if (model.protocol !== 'openai-image') return []
  if (GPT25_DOCUMENTED_IDS.includes(model.id)) return GPT25_OUTPUTS
  if (GPT25_PER_REQUEST_IDS.includes(model.id)) return GPT25_PER_REQUEST_OUTPUTS
  if (model.id === 'gpt-image-2-c') return GPT2_PER_REQUEST_OUTPUTS
  if (model.id === 'gpt-image-2') {
    return mode === 'image' ? GPT2_EDIT_OUTPUTS : GPT2_GENERATION_OUTPUTS
  }
  return model.ratios.map((ratio) => ({
    ratio,
    size: LEGACY_SIZES[ratio],
    tier: '1K',
  }))
}

export function imageRequestOptions(
  model?: LiveModel,
  mode: ImageGenerationMode = 'text'
): ImageRequestOptions | undefined {
  if (model?.id === 'gpt-image-2') {
    return {
      qualities: ['auto', 'low', 'medium', 'high'],
      formats: mode === 'text' ? ['png', 'jpeg', 'webp'] : [],
      backgrounds: [],
      moderations: [],
      defaultQuality: 'auto',
      defaultFormat: 'png',
      defaultBackground: 'auto',
      defaultModeration: 'auto',
      count: 1,
    }
  }
  if (!model || !GPT25_DOCUMENTED_IDS.includes(model.id)) return
  return {
    qualities: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'],
    formats: ['png', 'jpeg', 'webp'],
    backgrounds: ['auto', 'opaque', 'transparent'],
    moderations: ['auto', 'low'],
    defaultQuality: 'auto',
    defaultFormat: 'png',
    defaultBackground: 'auto',
    defaultModeration: 'auto',
    count: 1,
  }
}

export function imageReferenceLimit(model?: LiveModel): number {
  return model && GPT25_DOCUMENTED_IDS.includes(model.id) ? 16 : 4
}

export function supportsImageMask(model?: LiveModel): boolean {
  return !!model && GPT25_DOCUMENTED_IDS.includes(model.id)
}

export function supportsImageEditing(model?: LiveModel): boolean {
  return (
    !!model &&
    [
      ...GPT25_DOCUMENTED_IDS,
      'gpt-image-2',
      'gemini-3-pro-image-preview',
    ].includes(model.id)
  )
}

export function imagePromptLimit(model?: LiveModel): number {
  return model &&
    (model.id === 'gpt-image-2' || GPT25_DOCUMENTED_IDS.includes(model.id))
    ? 1000
    : 2500
}
