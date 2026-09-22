/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

type RelayTransport = (request: Request) => Promise<Response>

const allowedOrigins = new Set([
  'http://127.0.0.1:4178',
  'https://studio.linoroute.com',
])
const bearer = /^Bearer [A-Za-z0-9._-]{3,512}$/
const STORAGE_SIGNER =
  process.env.STUDIO_STORAGE_SIGNER ?? 'http://127.0.0.1:4181/v1/uploads'

function empty(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function relayStorageRequest(
  request: Request,
  transport: RelayTransport = fetch
): Promise<Response> {
  const source = new URL(request.url)
  if (
    request.method !== 'POST' ||
    source.pathname !== '/studio-storage/v1/uploads' ||
    source.search
  ) {
    return empty(404)
  }
  const origin = request.headers.get('Origin') ?? ''
  if (!allowedOrigins.has(origin)) return empty(403)
  const authorization = request.headers.get('Authorization') ?? ''
  if (!bearer.test(authorization)) return empty(401)
  if (
    !request.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    return empty(415)
  }
  const body = await request.arrayBuffer()
  if (body.byteLength > 8 * 1024) return empty(413)
  try {
    const upstream = await transport(
      new Request(STORAGE_SIGNER, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Origin: origin,
        },
        body,
        cache: 'no-store',
        redirect: 'error',
      })
    )
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type':
        upstream.headers.get('Content-Type') ??
        'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    })
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    return empty(502)
  }
}
