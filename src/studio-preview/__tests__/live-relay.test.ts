/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect, it, vi } from 'vitest'

import { relayRequest } from '../live-relay'

const request = (path: string, extra?: RequestInit) =>
  new Request(`http://127.0.0.1:4178/studio-api${path}`, extra)
it('rejects cross-origin generation before contacting the upstream', async () => {
  const upstream = vi.fn()
  const response = await relayRequest(
    request('/v1/images/generations', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        Authorization: 'Bearer sk-test',
      },
      body: '{}',
    }),
    upstream
  )
  expect(response.status).toBe(403)
  expect(upstream).not.toHaveBeenCalled()
})
it.each([
  '/https://evil.example/',
  '/v1/../api/user/self',
  '/api/user/self',
  '/v1/models?key=secret',
  '/v1/videos/a%2Fb',
])('rejects non-allowlisted route %s', async (path) => {
  expect((await relayRequest(request(path), vi.fn())).status).toBe(404)
})
it('forwards to fixed LinoRoute origin with no cookies, redirects or key in URL', async () => {
  const upstream = vi.fn(async (url, init) => {
    expect(url).toBe('https://linoroute.com/v1/models')
    expect(new Headers(init.headers).get('cookie')).toBeNull()
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer sk-test'
    )
    expect(init.redirect).toBe('error')
    return Response.json({ data: [] })
  })
  const response = await relayRequest(
    request('/v1/models', {
      headers: { Cookie: 'session=private', Authorization: 'Bearer sk-test' },
    }),
    upstream
  )
  expect(await response.json()).toEqual({ data: [] })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})
