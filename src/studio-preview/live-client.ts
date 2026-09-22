import {
  GPT25_DOCUMENTED_IDS,
  imageOutputOptions,
  imagePromptLimit,
  imageReferenceLimit,
  imageRequestOptions,
  supportsImageEditing,
  supportsImageMask,
} from './image-output-specs'
/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { LIVE_MODELS } from './live-models'
import {
  LiveError,
  type LiveAsset,
  type LiveDraft,
  type LiveModel,
  type LiveResult,
  type LiveSession,
} from './live-types'
import {
  defaultVideoResolution,
  isVideoResolution,
  supportsGeneratedAudio,
  supportsVideoGenerationModes,
  videoResolutionOptions,
} from './video-output-specs'

export type Transport = typeof fetch
type Json = Record<string, unknown>
const object = (v: unknown): Json =>
  v && typeof v === 'object' ? (v as Json) : {}
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export function safeMediaUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  try {
    const u = new URL(value)
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(
        u.hostname
      ) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)
    ) {
      return
    }
    return u.href
  } catch {
    return
  }
}

async function request(
  key: string,
  path: string,
  signal: AbortSignal,
  transport: Transport,
  body?: BodyInit,
  contentType?: string
): Promise<unknown> {
  const paid = body !== undefined
  let response: Response
  try {
    response = await transport(`/studio-api${path}`, {
      method: paid ? 'POST' : 'GET',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal,
      headers: {
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      body,
    })
  } catch {
    throw new LiveError(paid ? 'submission_unknown' : 'query_failed')
  }
  if (!response.ok) {
    const codes: Record<number, string> = {
      401: 'unauthorized',
      403: 'forbidden',
      402: 'credits',
      429: 'rate_limit',
    }
    let fallback = 'request_rejected'
    if (response.status >= 500) {
      fallback = paid ? 'submission_unknown' : 'query_failed'
    }
    throw new LiveError(codes[response.status] ?? fallback)
  }
  try {
    const value: unknown = await response.json()
    if (typeof value !== 'string') {
      return value
    }
    if (value.length > 2 * 1024 * 1024) {
      throw new Error('oversized JSON envelope')
    }
    const nested: unknown = JSON.parse(value)
    if (!nested || typeof nested !== 'object') {
      throw new Error('invalid JSON envelope')
    }
    return nested
  } catch {
    throw new LiveError(paid ? 'submission_unknown' : 'invalid_response')
  }
}

export async function connectLive(
  rawKey: string,
  signal: AbortSignal,
  transport: Transport = fetch
): Promise<LiveSession> {
  const key = rawKey.trim()
  if (!key || /\s/.test(key) || key.length > 512) {
    throw new LiveError('unauthorized')
  }
  const authorized = object(await request(key, '/v1/models', signal, transport))
  const catalog = object(await request('', '/api/pricing', signal, transport))
  const allowed = new Set(array(authorized.data).map((m) => object(m).id))
  const listed = new Set(
    array(catalog.data)
      .filter((m) => object(m).available !== false)
      .map((m) => object(m).model_name)
  )
  const models = LIVE_MODELS.filter(
    (m) => allowed.has(m.id) && listed.has(m.id)
  )
  if (!models.length) throw new LiveError('no_models')
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`linoroute-studio:${key}`)
  )
  const owner = `live:${Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')}`
  return { key, owner: owner as LiveSession['owner'], models }
}

function base64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => resolve(String(reader.result).split(',')[1]),
      { once: true }
    )
    reader.addEventListener(
      'error',
      () => reject(new LiveError('invalid_parameters')),
      { once: true }
    )
    reader.readAsDataURL(file)
  })
}

export async function submitLive(
  key: string,
  model: LiveModel,
  draft: LiveDraft,
  signal: AbortSignal,
  transport: Transport = fetch
): Promise<LiveResult> {
  const known = LIVE_MODELS.find((entry) => entry.id === model.id)
  if (!known) throw new LiveError('invalid_parameters')
  model = known
  const isImage = model.kind === 'image'
  const configurableVideo = supportsVideoGenerationModes(model)
  const mode =
    draft.mode ??
    (draft.images?.length || draft.referenceUrl ? 'image' : 'text')
  if (
    !draft.prompt.trim() ||
    draft.prompt.length > imagePromptLimit(model) ||
    !['text', 'image'].includes(mode) ||
    !model.ratios.includes(draft.ratio) ||
    (model.durations && !model.durations.includes(draft.duration)) ||
    (draft.referenceUrl && !safeMediaUrl(draft.referenceUrl))
  ) {
    throw new LiveError('invalid_parameters')
  }
  const images = isImage && mode === 'text' ? [] : (draft.images ?? [])
  const mask = isImage && mode === 'image' ? draft.mask : undefined
  const videoResolution = videoResolutionOptions(model).length
    ? (draft.size ?? defaultVideoResolution(model))
    : undefined
  if (
    (isImage &&
      mode === 'image' &&
      (!supportsImageEditing(model) || !images.length)) ||
    images.length > imageReferenceLimit(model) ||
    (videoResolutionOptions(model).length > 0 &&
      !isVideoResolution(model, videoResolution)) ||
    (configurableVideo && mode === 'image' && !draft.referenceUrl) ||
    images.some(
      (f) =>
        !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) ||
        f.size > 5 * 1024 * 1024 ||
        !f.size
    ) ||
    (mask &&
      (!supportsImageMask(model) ||
        mask.type !== 'image/png' ||
        mask.size > 5 * 1024 * 1024 ||
        !mask.size))
  ) {
    throw new LiveError('invalid_parameters')
  }
  let path = '',
    data: Json = {}
  let multipart: FormData | undefined
  const prompt = draft.prompt.trim()
  const ratio = draft.ratio
  const seconds = draft.duration
  if (model.protocol === 'openai-image') {
    const options = imageOutputOptions(model, mode)
    const requestOptions = imageRequestOptions(model, mode)
    const quality = draft.quality ?? requestOptions?.defaultQuality
    const format = draft.format ?? requestOptions?.defaultFormat
    const background = draft.background ?? requestOptions?.defaultBackground
    const moderation = draft.moderation ?? requestOptions?.defaultModeration
    const size =
      draft.size ??
      options.find((entry) => entry.ratio === ratio && !entry.experimental)
        ?.size
    if (
      !size ||
      !options.some((entry) => entry.ratio === ratio && entry.size === size)
    ) {
      throw new LiveError('invalid_parameters')
    }
    if (
      requestOptions &&
      (!quality ||
        !requestOptions.qualities.includes(quality) ||
        (!!requestOptions.formats.length &&
          (!format || !requestOptions.formats.includes(format))) ||
        (!!requestOptions.backgrounds.length &&
          (!background || !requestOptions.backgrounds.includes(background))) ||
        (!!requestOptions.moderations.length &&
          (!moderation || !requestOptions.moderations.includes(moderation))) ||
        (background === 'transparent' && format === 'jpeg'))
    ) {
      throw new LiveError('invalid_parameters')
    }
    data = {
      model: model.id,
      prompt,
      size,
      response_format: 'b64_json',
    }
    if (model.id !== 'gpt-image-2-c') data.n = 1
    if (requestOptions) {
      data.quality = quality
      if (requestOptions.formats.length) data.format = format
      if (requestOptions.backgrounds.length) data.background = background
      if (requestOptions.moderations.length) data.moderation = moderation
    }
    path = '/v1/images/generations'
    if (images.length) {
      path = '/v1/images/edits'
      multipart = new FormData()
      for (const [name, value] of Object.entries(data)) {
        multipart.set(name, String(value))
      }
      const field =
        GPT25_DOCUMENTED_IDS.includes(model.id) || model.id === 'gpt-image-2'
          ? 'image'
          : 'image[]'
      for (const file of images) multipart.append(field, file)
      if (mask) multipart.set('mask', mask)
    }
  } else if (model.protocol === 'gemini-image') {
    const imageSize = draft.size ?? '1K'
    if (
      !imageOutputOptions(model).some(
        (entry) => entry.ratio === ratio && entry.size === imageSize
      )
    ) {
      throw new LiveError('invalid_parameters')
    }
    path = `/v1beta/models/${model.id}:generateContent`
    const parts: Json[] = [{ text: prompt }]
    for (const file of images) {
      parts.push({
        inline_data: { mime_type: file.type, data: await base64(file) },
      })
    }
    data = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: ratio, imageSize },
      },
    }
  } else {
    if (images.length) throw new LiveError('invalid_parameters')
    const ref = mode === 'image' ? draft.referenceUrl : undefined
    if (model.protocol === 'seedance') {
      path = '/api/v3/contents/generations/tasks'
      const content: Json[] = [{ type: 'text', text: prompt }]
      if (ref) {
        content.push({
          type: 'image_url',
          image_url: { url: ref },
          role: 'first_frame',
        })
      }
      data = {
        model: model.id,
        content,
        ratio,
        duration: seconds,
        resolution: videoResolution ?? '480p',
      }
      if (supportsGeneratedAudio(model)) {
        data.generate_audio = draft.generateAudio ?? true
      }
    } else if (model.protocol === 'kling' || model.protocol === 'kling-omni') {
      path = `/kling/v1/videos/${
        model.protocol === 'kling-omni' ? 'omni-video' : 'text2video'
      }`
      data = {
        model_name: model.protocol === 'kling' ? 'kling-v3' : 'kling-v3-omni',
        prompt,
        mode: 'std',
        duration: String(seconds),
        aspect_ratio: ratio,
      }
      if (ref && model.protocol === 'kling') {
        path = '/kling/v1/videos/image2video'
        data.image = ref
      }
      if (ref && model.protocol === 'kling-omni') {
        data.image_list = [{ image_url: ref, type: 'first_frame' }]
      }
    } else if (model.protocol === 'vod') {
      path = '/tencent-vod/v1/aigc-video'
      data = {
        model_name: 'Hailuo',
        model_version: 'H3',
        prompt,
        session_id: crypto.randomUUID(),
        output_config: {
          storage_mode: 'Temporary',
          duration: seconds,
          resolution: videoResolution,
          aspect_ratio: ratio,
        },
      }
      if (ref) data.file_infos = [{ type: 'Url', category: 'Image', url: ref }]
    } else if (model.protocol === 'veo') {
      path = '/v1/videos'
      multipart = new FormData()
      for (const [name, value] of Object.entries({
        model: model.id,
        prompt,
        seconds: String(seconds),
        size: ratio.replace(':', 'x'),
      })) {
        multipart.set(name, value)
      }
      if (ref) multipart.set('input_reference', ref)
    } else {
      path = '/v1/videos/generations'
      data = {
        model: model.id,
        prompt,
        duration: seconds,
        aspect_ratio: ratio,
        resolution: '480p',
      }
      if (ref) data.image = { url: ref }
    }
  }
  if (signal.aborted) throw new LiveError('submission_unknown')
  const response = await request(
    key,
    path,
    signal,
    transport,
    multipart ?? JSON.stringify(data),
    multipart ? undefined : 'application/json'
  )
  return decodeResult(model, response, true)
}

export async function queryLive(
  key: string,
  model: LiveModel,
  id: string,
  signal: AbortSignal,
  transport: Transport = fetch,
  referenceMode = false
): Promise<LiveResult> {
  if (!/^[a-zA-Z0-9_:.-]{1,240}$/.test(id) || id === '.' || id === '..') {
    throw new LiveError('invalid_parameters')
  }
  let path = '/v1/videos/'
  if (model.protocol === 'seedance') {
    path = '/api/v3/contents/generations/tasks/'
  }
  if (model.protocol === 'vod') path = '/tencent-vod/v1/query/'
  if (model.protocol === 'kling') {
    path = `/kling/v1/videos/${referenceMode ? 'image2video/' : 'text2video/'}`
  }
  if (model.protocol === 'kling-omni') path = '/kling/v1/videos/omni-video/'
  return decodeResult(
    model,
    await request(key, path + encodeURIComponent(id), signal, transport),
    false
  )
}

function decodeResult(
  model: LiveModel,
  value: unknown,
  submitting: boolean
): LiveResult {
  let root = object(value)
  // VOD queries can wrap the provider response in the gateway's task envelope.
  if (model.protocol === 'vod' && root.code === 'success' && !root.error) {
    const task = object(root.data)
    const response = object(object(task.data).Response)
    if (
      ['failure', 'failed', 'error', 'cancelled', 'canceled'].includes(
        String(task.status).toLowerCase()
      )
    ) {
      return {
        stage: 'failed',
        taskId: typeof task.task_id === 'string' ? task.task_id : undefined,
        assets: [],
      }
    }
    root = {
      Response: {
        ...response,
        TaskId: response.TaskId ?? task.task_id,
        Status: response.Status ?? task.status,
      },
    }
  }
  if (
    root.error ||
    object(root.Response).Error ||
    (root.code !== undefined && root.code !== 0 && root.code !== '0')
  ) {
    throw new LiveError('request_rejected')
  }
  const assets: LiveAsset[] = []
  const add = (url: unknown) => {
    // This VOD host was verified to serve the same file over HTTPS. Do not allow
    // arbitrary HTTP media, which would be blocked on the production HTTPS page.
    if (model.protocol === 'vod' && typeof url === 'string') {
      url = url.replace(
        /^http:\/\/store\.vod-qcloud\.com\//i,
        'https://store.vod-qcloud.com/'
      )
    }
    const safe = safeMediaUrl(url)
    if (safe) assets.push({ url: safe })
  }
  const inline = (data: unknown, mime: unknown) => {
    if (
      typeof data === 'string' &&
      data.length > 0 &&
      data.length < 50 * 1024 * 1024 &&
      /^[A-Za-z0-9+/=\r\n]+$/.test(data) &&
      ['image/png', 'image/jpeg', 'image/webp'].includes(String(mime))
    ) {
      let detected = String(mime)
      if (data.startsWith('/9j/')) {
        detected = 'image/jpeg'
      } else if (data.startsWith('UklGR')) {
        detected = 'image/webp'
      } else if (data.startsWith('iVBOR')) {
        detected = 'image/png'
      }
      assets.push({ base64: data, mime: detected })
    }
  }
  if (model.kind === 'image') {
    for (const item of array(root.data)) {
      const img = object(item)
      add(img.url)
      inline(img.b64_json, 'image/png')
    }
    for (const c of array(root.candidates)) {
      for (const p of array(object(object(c).content).parts)) {
        const part = object(p),
          img = object(part.inlineData ?? part.inline_data)
        inline(img.data, img.mimeType ?? img.mime_type)
        const file = object(part.fileData ?? part.file_data)
        add(file.fileUri ?? file.file_uri)
      }
    }
    if (!assets.length) throw new LiveError('invalid_response')
    return { stage: 'ready', assets }
  }
  let payload = root
  if (model.protocol === 'kling' || model.protocol === 'kling-omni') {
    payload = object(root.data)
  }
  if (model.protocol === 'vod') {
    payload = object(object(root.Response).AigcVideoTask ?? root.Response)
  }
  add(root.video_url)
  add(object(root.content).video_url)
  add(object(root.video).url)
  for (const v of array(object(payload.task_result).videos)) add(object(v).url)
  for (const f of array(object(payload.Output).FileInfos)) {
    add(object(f).FileUrl)
  }
  add(object(payload.Output).FileUrl)
  const rawId =
    payload.id ??
    payload.task_id ??
    payload.TaskId ??
    root.request_id ??
    object(root.Response).TaskId
  const taskId = typeof rawId === 'string' ? rawId : undefined
  const state = String(
    payload.status ?? payload.task_status ?? payload.Status ?? root.status ?? ''
  ).toLowerCase()
  if (
    ['failed', 'fail', 'error', 'cancelled', 'canceled', 'expired'].includes(
      state
    ) ||
    (payload.ErrCode && payload.ErrCode !== 0)
  ) {
    return { stage: 'failed', taskId, assets: [] }
  }
  if (assets.length) return { stage: 'ready', taskId, assets }
  if (submitting && taskId) return { stage: 'running', taskId, assets: [] }
  if (
    [
      'pending',
      'processing',
      'queued',
      'submitted',
      'running',
      'in_progress',
      'wait',
      'waiting',
    ].includes(state)
  ) {
    return { stage: 'running', taskId, assets: [] }
  }
  throw new LiveError('invalid_response')
}
