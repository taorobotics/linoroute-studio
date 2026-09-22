/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect, it, vi } from 'vitest'

import { relayStorageRequest } from '../storage-relay'

it('forwards only the fixed upload-ticket route to the loopback signer', async () => {
  const transport = vi.fn(async (request: Request) => {
    expect(request.url).toBe('http://127.0.0.1:4181/v1/uploads')
    expect(request.method).toBe('POST')
    expect(request.headers.get('authorization')).toBe('Bearer sk-test')
    expect(request.headers.get('origin')).toBe('http://127.0.0.1:4178')
    expect(request.headers.get('cookie')).toBeNull()
    expect(await request.json()).toEqual({ purpose: 'reference' })
    return Response.json({ uploadUrl: 'signed' })
  })
  const response = await relayStorageRequest(
    new Request('http://127.0.0.1:4178/studio-storage/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk-test',
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:4178',
        Cookie: 'must-not-forward=true',
      },
      body: JSON.stringify({ purpose: 'reference' }),
    }),
    transport
  )
  expect(response.status).toBe(200)
  expect(transport).toHaveBeenCalledOnce()
})

it.each([
  ['GET', '/studio-storage/v1/uploads', 'http://127.0.0.1:4178', 404],
  [
    'POST',
    '/studio-storage/v1/uploads?next=http://evil.test',
    'http://127.0.0.1:4178',
    404,
  ],
  ['POST', '/studio-storage/other', 'http://127.0.0.1:4178', 404],
  ['POST', '/studio-storage/v1/uploads', 'https://evil.test', 403],
])(
  'rejects unsafe signer relay request %s %s',
  async (method, path, origin, expected) => {
    const transport = vi.fn()
    const response = await relayStorageRequest(
      new Request(`http://127.0.0.1:4178${path}`, {
        method,
        headers: { Authorization: 'Bearer sk-test', Origin: origin },
      }),
      transport
    )
    expect(response.status).toBe(expected)
    expect(transport).not.toHaveBeenCalled()
  }
)
