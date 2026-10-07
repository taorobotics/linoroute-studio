/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import type { LiveModel } from './live-types'

export const MINIMAX_H3_RESOLUTIONS = ['768P', '1080P', '2K', '4K'] as const
export const SEEDANCE_25_MODEL_ID = 'doubao-seedance-2-5-260628'
export const SEEDANCE_25_RESOLUTIONS = ['480p', '720p', '1080p'] as const
export const SEEDANCE_REFERENCE_IMAGE_LIMIT = 9
export const SEEDANCE_25_REFERENCE_IMAGE_LIMIT = 30
// NinoRoute's Kling Omni schema accepts an image_list. Keep a conservative
// four-image UI cap, matching the gateway's documented multi-image limit.
export const KLING_OMNI_REFERENCE_IMAGE_LIMIT = 4

export type MiniMaxH3Resolution = (typeof MINIMAX_H3_RESOLUTIONS)[number]
export type Seedance25Resolution = (typeof SEEDANCE_25_RESOLUTIONS)[number]
export type VideoResolution = MiniMaxH3Resolution | Seedance25Resolution

export function isMiniMaxH3(model?: Pick<LiveModel, 'protocol'>): boolean {
  return model?.protocol === 'vod'
}

export function isSeedance25(model?: Pick<LiveModel, 'id'>): boolean {
  return model?.id === SEEDANCE_25_MODEL_ID
}

export function videoReferenceImageLimit(
  model?: Pick<LiveModel, 'id' | 'protocol'>
): number {
  if (isSeedance25(model)) return SEEDANCE_25_REFERENCE_IMAGE_LIMIT
  if (model?.protocol === 'seedance') return SEEDANCE_REFERENCE_IMAGE_LIMIT
  if (model?.protocol === 'kling-omni') return KLING_OMNI_REFERENCE_IMAGE_LIMIT
  return 1
}

export function supportsVideoGenerationModes(
  model?: Pick<LiveModel, 'id' | 'protocol'>
): boolean {
  return isMiniMaxH3(model) || isSeedance25(model)
}

export function supportsGeneratedAudio(model?: Pick<LiveModel, 'id'>): boolean {
  return isSeedance25(model)
}

export function videoResolutionOptions(
  model?: Pick<LiveModel, 'id' | 'protocol'>
): readonly VideoResolution[] {
  if (isMiniMaxH3(model)) return MINIMAX_H3_RESOLUTIONS
  if (isSeedance25(model)) return SEEDANCE_25_RESOLUTIONS
  return []
}

export function defaultVideoResolution(
  model?: Pick<LiveModel, 'id' | 'protocol'>
): VideoResolution | undefined {
  return videoResolutionOptions(model)[0]
}

export function defaultVideoDuration(model?: LiveModel): number {
  return model?.defaultDuration ?? model?.durations?.[0] ?? 5
}

export function isVideoResolution(
  model: Pick<LiveModel, 'id' | 'protocol'> | undefined,
  value: unknown
): value is VideoResolution {
  return (
    typeof value === 'string' &&
    (videoResolutionOptions(model) as readonly string[]).includes(value)
  )
}

export function isMiniMaxH3Resolution(
  value: unknown
): value is MiniMaxH3Resolution {
  return (
    typeof value === 'string' &&
    (MINIMAX_H3_RESOLUTIONS as readonly string[]).includes(value)
  )
}
