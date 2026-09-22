/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
// Imported by the local dev server only. Never bundle this into the browser entry.
const ORIGIN = 'http://127.0.0.1:4178'
const UPSTREAM = process.env.STUDIO_API_UPSTREAM ?? 'https://linoroute.com'
const POST_PATHS = new Set([
  '/v1/images/generations',
  '/v1/images/edits',
  '/v1beta/models/gemini-3-pro-image-preview:generateContent',
  '/api/v3/contents/generations/tasks',
  '/kling/v1/videos/text2video',
  '/kling/v1/videos/image2video',
  '/kling/v1/videos/omni-video',
  '/tencent-vod/v1/aigc-video',
  '/v1/videos',
  '/v1/videos/generations',
])
const GET_TASK =
  /^\/(?:api\/v3\/contents\/generations\/tasks|kling\/v1\/videos\/(?:text2video|image2video|omni-video)|tencent-vod\/v1\/query|v1\/videos)\/[a-zA-Z0-9_:.-]{1,240}$/

export async function relayRequest(
  request: Request,
  transport: typeof fetch = fetch
): Promise<Response> {
  const url = new URL(request.url)
  const fail = (status: number) =>
    Response.json(
      { error: { code: 'relay_rejected' } },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  if (
    url.origin !== ORIGIN ||
    !url.pathname.startsWith('/studio-api/') ||
    url.search
  ) {
    return fail(404)
  }
  const path = url.pathname.slice('/studio-api'.length)
  const get =
    request.method === 'GET' &&
    (path === '/v1/models' || path === '/api/pricing' || GET_TASK.test(path))
  const post = request.method === 'POST' && POST_PATHS.has(path)
  if (!get && !post) return fail(404)
  const origin = request.headers.get('Origin')
  if (
    (origin && origin !== ORIGIN) ||
    (post && origin !== ORIGIN) ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    return fail(403)
  }
  const key = request.headers.get('Authorization')
  if (
    path !== '/api/pricing' &&
    (!key || !/^Bearer [A-Za-z0-9_.-]{3,512}$/.test(key))
  ) {
    return fail(401)
  }
  const body = post ? await request.arrayBuffer() : undefined
  if (body && body.byteLength > 30 * 1024 * 1024) return fail(413)
  const headers = new Headers()
  if (key && path !== '/api/pricing') headers.set('Authorization', key)
  if (post) {
    headers.set(
      'Content-Type',
      request.headers.get('Content-Type') ?? 'application/json'
    )
  }
  try {
    const response = await transport(`${UPSTREAM}${path}`, {
      method: request.method,
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(post ? 240000 : 30000),
      ]),
    })
    // Never log request headers, body, upstream errors or supplied credentials.
    if (!response.ok) {
      await response.body?.cancel()
      return fail(response.status)
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return fail(502)
  }
}
