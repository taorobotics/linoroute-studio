const DEFAULT_BASE = 'https://linoroute.com'
const IMAGE_MODELS = [
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare',
  'gpt-image-2',
  'gpt-image-2.5-sunburst-c',
  'gpt-image-2.5-flare-c',
  'gpt-image-2-c',
  'gemini-3-pro-image-preview',
]
const VIDEO_MODELS = [
  'aigc-video-hailuo',
  'doubao-seedance-2-5-260628',
  'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast-260128',
  'kling-video',
  'kling-omni-video',
  'veo_3_1',
  'veo_3_1-fast',
  'grok-imagine-video',
]
const IMAGE_SIZES = new Set([
  'auto',
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x2048',
  '2048x1152',
  '1152x2048',
  '3840x2160',
  '2160x3840',
  '1K',
  '2K',
  '4K',
])
const RATIOS = new Set(['1:1', '3:2', '2:3', '16:9', '9:16', '4:3', 'adaptive', 'auto'])
const QUALITIES = new Set(['auto', 'low', 'medium', 'high', 'xhigh', 'max'])
const FORMATS = new Set(['png', 'jpeg', 'webp'])

export class ConnectorError extends Error {
  constructor(code, message, status = 500) {
    super(message)
    this.name = 'ConnectorError'
    this.code = code
    this.status = status
  }
}

export function normalizeBaseUrl(value = DEFAULT_BASE) {
  const url = new URL(value)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('LINOROUTE_API_BASE must use HTTPS')
  }
  url.pathname = url.pathname.replace(/\/$/, '').replace(/\/v1$/, '')
  url.search = ''
  url.hash = ''
  return url.href.replace(/\/$/, '')
}

export function parseBearer(value) {
  if (typeof value !== 'string') return ''
  const match = value.match(/^Bearer ([^\s]{3,512})$/)
  return match?.[1] ?? ''
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function contentText(payload) {
  if (!payload || typeof payload !== 'object') return ''
  const root = payload
  return String(root.error?.message ?? root.message ?? root.msg ?? root.code ?? '')
}

export function classifyModel(model, kind) {
  if (!model || typeof model !== 'string') return false
  const image = IMAGE_MODELS.includes(model) || model.includes('image')
  const video = VIDEO_MODELS.includes(model) || /seedance|kling|hailuo|veo|grok.*video/i.test(model)
  return kind === 'image' ? image : kind === 'video' ? video : image || video
}

function imageRatioSize(ratio) {
  return {
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '16:9': '2048x1152',
    '9:16': '1152x2048',
  }[ratio] ?? '1024x1024'
}

function mediaUrlAllowed(raw, allowedHosts) {
  let url
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(url.hostname)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)) return false
  if (allowedHosts.length && !allowedHosts.includes(url.hostname.toLowerCase())) return false
  return true
}

async function fetchReferenceFile(raw, config) {
  if (!mediaUrlAllowed(raw, config.mediaAllowedHosts)) {
    throw new ConnectorError('invalid_reference_url', 'Reference URL must be an allowed HTTPS media URL.', 400)
  }
  const response = await fetch(raw, {
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
    headers: { Accept: 'image/png,image/jpeg,image/webp' },
  })
  if (!response.ok) throw new ConnectorError('reference_fetch_failed', 'Reference media could not be fetched.', 400)
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
    throw new ConnectorError('invalid_reference_type', 'Reference must be a PNG, JPEG, or WebP image.', 400)
  }
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > config.mediaMaxBytes) throw new ConnectorError('reference_too_large', 'Reference image exceeds the configured size limit.', 413)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > config.mediaMaxBytes) throw new ConnectorError('reference_too_large', 'Reference image exceeds the configured size limit.', 413)
  const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1]
  return { bytes, contentType, filename: `reference.${extension}` }
}

function base64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

export function chooseModel(available, kind, preference = 'price') {
  const ids = available.filter((item) => classifyModel(item, kind))
  if (!ids.length) throw new ConnectorError('no_models', `No ${kind} models are available for this API key.`, 403)
  const qualityOrder = kind === 'image'
    ? ['gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare', 'gemini-3-pro-image-preview']
    : ['aigc-video-hailuo', 'doubao-seedance-2-5-260628', 'kling-video', 'veo_3_1']
  const speedOrder = kind === 'image'
    ? ['gpt-image-2.5-flare', 'gpt-image-2', 'gemini-3-pro-image-preview']
    : ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128', 'kling-video']
  const priceOrder = kind === 'image'
    ? ['gpt-image-2', 'gpt-image-2.5-flare', 'gemini-3-pro-image-preview']
    : ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128', 'kling-video']
  const order = preference === 'quality' ? qualityOrder : preference === 'speed' ? speedOrder : priceOrder
  return order.find((id) => ids.includes(id)) ?? ids[0]
}

export function createClient({ baseUrl = process.env.LINOROUTE_API_BASE, mediaMaxBytes = 5 * 1024 * 1024, mediaAllowedHosts = [] } = {}) {
  const base = normalizeBaseUrl(baseUrl || DEFAULT_BASE)
  const config = { mediaMaxBytes, mediaAllowedHosts: mediaAllowedHosts.map((host) => host.toLowerCase()).filter(Boolean) }

  async function request(token, path, options = {}) {
    if (!token) throw new ConnectorError('missing_api_key', 'Configure a LinoRoute API Key before using this tool.', 401)
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body && options.contentType ? { 'Content-Type': options.contentType } : {}),
      },
      body: options.body,
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(options.timeoutMs ?? 120000),
    })
    const text = await response.text()
    const payload = safeJson(text)
    if (!response.ok) {
      const code = response.status === 401 ? 'unauthorized' : response.status === 402 ? 'credits' : response.status === 429 ? 'rate_limit' : 'upstream_rejected'
      throw new ConnectorError(code, `LinoRoute rejected the request (${response.status}).`, response.status)
    }
    return payload
  }

  async function listModels(token) {
    const payload = await request(token, '/v1/models')
    const data = Array.isArray(payload?.data) ? payload.data : []
    return data.map((item) => String(item?.id ?? item?.model_name ?? '')).filter(Boolean)
  }

  async function createImage(token, input) {
    const available = await listModels(token)
    const model = input.model === 'auto' ? chooseModel(available, 'image', input.preference) : input.model
    if (!available.includes(model)) throw new ConnectorError('model_unavailable', `Model ${model} is not available for this API key.`, 403)
    const ratio = input.aspect_ratio ?? '1:1'
    if (!RATIOS.has(ratio)) throw new ConnectorError('invalid_parameters', 'Unsupported image aspect ratio.', 400)
    const size = input.size ?? imageRatioSize(ratio)
    if (!IMAGE_SIZES.has(size) && !/^\d{3,5}x\d{3,5}$/.test(size)) throw new ConnectorError('invalid_parameters', 'Unsupported image size.', 400)
    if (input.quality && !QUALITIES.has(input.quality)) throw new ConnectorError('invalid_parameters', 'Unsupported image quality.', 400)
    if (input.format && !FORMATS.has(input.format)) throw new ConnectorError('invalid_parameters', 'Unsupported image format.', 400)
    if (input.background === 'transparent' && input.format === 'jpeg') throw new ConnectorError('invalid_parameters', 'Transparent background cannot use JPEG.', 400)
    const references = input.reference_urls ?? []
    if (references.length > 4) throw new ConnectorError('invalid_parameters', 'At most four reference images are accepted by this connector.', 400)
    if (model === 'gemini-3-pro-image-preview') {
      const parts = [{ text: input.prompt }]
      for (const url of references) {
        const file = await fetchReferenceFile(url, config)
        parts.push({ inline_data: { mime_type: file.contentType, data: base64(file.bytes) } })
      }
      const payload = await request(token, `/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: ratio, imageSize: ['1K', '2K', '4K'].includes(size) ? size : '1K' } },
        }),
      })
      return { model, mode: references.length ? 'image-to-image' : 'text-to-image', payload: normalizeImageResult(payload) }
    }
    const fields = {
      model,
      prompt: input.prompt,
      size,
      response_format: input.response_format ?? 'url',
      n: Math.min(Math.max(input.n ?? 1, 1), 10),
    }
    if (input.quality) fields.quality = input.quality
    if (input.format) fields.format = input.format
    if (input.background) fields.background = input.background
    if (input.moderation) fields.moderation = input.moderation
    if (model === 'gpt-image-2-c') delete fields.n
    if (!references.length) {
      const payload = await request(token, '/v1/images/generations', { method: 'POST', contentType: 'application/json', body: JSON.stringify(fields) })
      return { model, mode: 'text-to-image', payload: normalizeImageResult(payload) }
    }
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      const fieldName = key === 'format' && /^gpt-image-2\.5-/.test(model) ? 'output_format' : key
      form.set(fieldName, String(value))
    }
    const fieldName = /^gpt-image-2\.5-/.test(model) || model === 'gpt-image-2' ? 'image' : 'image[]'
    for (const url of references) {
      const file = await fetchReferenceFile(url, config)
      form.append(fieldName, new Blob([file.bytes], { type: file.contentType }), file.filename)
    }
    const payload = await request(token, '/v1/images/edits', { method: 'POST', body: form })
    return { model, mode: 'image-to-image', payload: normalizeImageResult(payload) }
  }

  async function createVideo(token, input) {
    const available = await listModels(token)
    const model = input.model === 'auto' ? chooseModel(available, 'video', input.preference) : input.model
    if (!available.includes(model)) throw new ConnectorError('model_unavailable', `Model ${model} is not available for this API key.`, 403)
    const ratio = input.aspect_ratio ?? '16:9'
    if (!RATIOS.has(ratio)) throw new ConnectorError('invalid_parameters', 'Unsupported video aspect ratio.', 400)
    const duration = input.duration_seconds ?? 5
    if (!Number.isInteger(duration) || duration < 1 || duration > 60) throw new ConnectorError('invalid_parameters', 'Video duration must be an integer from 1 to 60 seconds.', 400)
    const reference = input.reference_url
    if (reference && !mediaUrlAllowed(reference, config.mediaAllowedHosts)) throw new ConnectorError('invalid_reference_url', 'Reference URL must be an allowed HTTPS media URL.', 400)
    let path
    let body
    let contentType = 'application/json'
    if (model.startsWith('doubao-seedance')) {
      path = '/api/v3/contents/generations/tasks'
      const content = [{ type: 'text', text: input.prompt }]
      if (reference) content.push({ type: 'image_url', image_url: { url: reference }, role: 'first_frame' })
      body = { model, content, ratio, duration }
      if (input.resolution) body.resolution = input.resolution
      if (typeof input.generate_audio === 'boolean') body.generate_audio = input.generate_audio
    } else if (model === 'kling-video') {
      path = `/kling/v1/videos/${reference ? 'image2video' : 'text2video'}`
      body = { model_name: 'kling-v3', prompt: input.prompt, mode: 'std', duration: String(duration), aspect_ratio: ratio }
      if (reference) body.image = reference
    } else if (model === 'kling-omni-video') {
      path = '/kling/v1/videos/omni-video'
      body = { model_name: 'kling-v3-omni', prompt: input.prompt, mode: 'std', duration: String(duration), aspect_ratio: ratio }
      if (reference) body.image_list = [{ image_url: reference, type: 'first_frame' }]
    } else if (model === 'aigc-video-hailuo') {
      path = '/tencent-vod/v1/aigc-video'
      body = { model_name: 'Hailuo', model_version: 'H3', prompt: input.prompt, session_id: crypto.randomUUID(), output_config: { storage_mode: 'Temporary', duration, resolution: input.resolution, aspect_ratio: ratio } }
      if (reference) body.file_infos = [{ type: 'Url', category: 'Image', url: reference }]
    } else if (model.startsWith('veo_3_1')) {
      path = '/v1/videos'
      const form = new FormData()
      form.set('model', model)
      form.set('prompt', input.prompt)
      form.set('seconds', String(duration))
      form.set('size', ratio.replace(':', 'x'))
      if (reference) form.set('input_reference', reference)
      body = form
      contentType = undefined
    } else {
      path = '/v1/videos/generations'
      body = { model, prompt: input.prompt, duration, aspect_ratio: ratio, resolution: input.resolution ?? '480p' }
      if (reference) body.image = { url: reference }
    }
    const payload = await request(token, path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), contentType })
    return { model, mode: reference ? 'image-to-video' : 'text-to-video', payload: normalizeVideoResult(payload) }
  }

  async function getVideoTask(token, input) {
    if (!input.task_id || !/^[A-Za-z0-9_:.-]{1,240}$/.test(input.task_id)) throw new ConnectorError('invalid_parameters', 'Invalid task ID.', 400)
    let path = '/v1/videos/'
    if (input.model.startsWith('doubao-seedance')) path = '/api/v3/contents/generations/tasks/'
    else if (input.model === 'aigc-video-hailuo') path = '/tencent-vod/v1/query/'
    else if (input.model === 'kling-video') path = `/kling/v1/videos/${input.image_to_video ? 'image2video' : 'text2video'}/`
    else if (input.model === 'kling-omni-video') path = '/kling/v1/videos/omni-video/'
    const payload = await request(token, path + encodeURIComponent(input.task_id))
    return { model: input.model, task_id: input.task_id, payload: normalizeVideoResult(payload) }
  }

  return { listModels, createImage, createVideo, getVideoTask }
}

export function normalizeImageResult(payload) {
  const assets = []
  for (const item of Array.isArray(payload?.data) ? payload.data : []) {
    if (typeof item?.url === 'string') assets.push({ url: item.url })
    if (typeof item?.b64_json === 'string') assets.push({ mime: 'image/png', base64: item.b64_json })
  }
  for (const candidate of Array.isArray(payload?.candidates) ? payload.candidates : []) {
    for (const part of Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []) {
      const inline = part?.inlineData ?? part?.inline_data
      if (inline?.data) assets.push({ mime: inline.mimeType ?? inline.mime_type ?? 'image/png', base64: inline.data })
      const file = part?.fileData ?? part?.file_data
      if (file?.fileUri ?? file?.file_uri) assets.push({ url: file.fileUri ?? file.file_uri })
    }
  }
  if (!assets.length) return { status: 'unknown', assets: [] }
  return { status: 'ready', assets }
}

export function normalizeVideoResult(payload) {
  const root = payload && typeof payload === 'object' ? payload : {}
  const nested = root.data && typeof root.data === 'object' ? root.data : root
  const assets = []
  const add = (value) => { if (typeof value === 'string' && /^https:\/\//i.test(value)) assets.push({ url: value }) }
  add(root.video_url); add(root.content?.video_url); add(root.video?.url); add(nested.Output?.FileUrl)
  for (const item of Array.isArray(nested.task_result?.videos) ? nested.task_result.videos : []) add(item?.url)
  for (const item of Array.isArray(nested.Output?.FileInfos) ? nested.Output.FileInfos : []) add(item?.FileUrl)
  const taskId = nested.id ?? nested.task_id ?? nested.TaskId ?? root.request_id ?? root.Response?.TaskId
  const state = String(nested.status ?? nested.task_status ?? nested.Status ?? root.status ?? '').toLowerCase()
  const failed = ['failed', 'fail', 'error', 'cancelled', 'canceled', 'expired'].includes(state)
  const normalized = { status: failed ? 'failed' : assets.length ? 'ready' : taskId ? 'running' : 'unknown', assets }
  if (typeof taskId === 'string') normalized.task_id = taskId
  return normalized
}
