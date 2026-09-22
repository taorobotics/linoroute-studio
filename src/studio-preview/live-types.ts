/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import type { MediaJob, MediaKind } from './contracts'
import type {
  ImageBackground,
  ImageFormat,
  ImageModeration,
  ImageQuality,
} from './image-output-specs'
import type { StudioStoredObject } from './oss-storage'

export type LiveProtocol =
  | 'openai-image'
  | 'gemini-image'
  | 'seedance'
  | 'kling'
  | 'kling-omni'
  | 'vod'
  | 'veo'
  | 'grok'
export interface LiveModel {
  id: string
  label: string
  kind: MediaKind
  protocol: LiveProtocol
  ratios: string[]
  durations?: number[]
  defaultDuration?: number
}
export interface LiveSession {
  key: string
  owner: `live:${string}`
  models: LiveModel[]
}
export interface LiveDraft {
  mode?: 'text' | 'image'
  size?: string
  prompt: string
  ratio: string
  duration: number
  images?: File[]
  mask?: File
  referenceUrl?: string
  generateAudio?: boolean
  quality?: ImageQuality
  format?: ImageFormat
  background?: ImageBackground
  moderation?: ImageModeration
}
export interface LiveAsset {
  id?: string
  url?: string
  base64?: string
  mime?: string
  blobId?: string
  objectKey?: string
  expiresAt?: number
}
export interface LiveResult {
  stage: 'running' | 'ready' | 'failed'
  taskId?: string
  assets: LiveAsset[]
}
export interface LiveJob extends MediaJob {
  live: true
  generationMode?: 'text' | 'image'
  referenceCount?: number
  requestedSize?: string
  requestedQuality?: ImageQuality
  requestedFormat?: ImageFormat
  requestedBackground?: ImageBackground
  requestedModeration?: ImageModeration
  requestedGenerateAudio?: boolean
  maskUsed?: boolean
  referenceMode?: boolean
  taskId?: string
  assets: LiveAsset[]
  duration: number
  issue?: string
  referenceAssets?: StudioStoredObject[]
  maskAsset?: StudioStoredObject
}
export class LiveError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'LiveError'
  }
}
export const RETRYABLE_QUERY_ISSUES = [
  'query_failed',
  'rate_limit',
  'invalid_response',
  'storage_failed',
]
export const LIVE_ERRORS: Record<string, string> = {
  unauthorized: 'The key is invalid or has expired. Please reconnect.',
  forbidden: 'This key does not have access to this model or group.',
  credits:
    'The upstream rejected this request for billing or quota reasons. Check your console.',
  rate_limit:
    'The upstream is busy or rate limited. Please wait before trying again.',
  request_rejected:
    'The upstream rejected these parameters. Check the model, key group and API documentation.',
  submission_unknown:
    'Submission could not be confirmed. It may already be billed. Check the console before generating again.',
  query_failed:
    'Status lookup failed. Keep this task ID and resume checking; do not submit again.',
  invalid_response:
    'The upstream response did not contain a supported result. No sample has been substituted.',
  invalid_parameters:
    'Please check the prompt, model parameters and reference files.',
  no_models: 'No supported image or video models are available for this key.',
  storage_failed:
    'OSS upload or browser saving failed. Check your OSS configuration and CORS settings. No automatic retry was made.',
  archive_failed:
    'The result is available, but copying it to your OSS failed. Download it before the upstream link expires.',
  failed:
    'The upstream reported that generation failed. Check the request in your console.',
}
