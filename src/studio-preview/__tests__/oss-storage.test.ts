/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect, it, vi } from 'vitest'

import { uploadStudioFile } from '../oss-storage'

const key = 'sk-oss-test-only'
const signal = () => new AbortController().signal

it('uploads an approved local image with a short-lived same-purpose ticket', async () => {
  const file = new File(['image-bytes'], 'portrait.png', { type: 'image/png' })
  const transport = vi.fn(async (url, init) => {
    if (url === '/studio-storage/v1/uploads') {
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      })
      expect(JSON.parse(String(init?.body))).toEqual({
        contentType: 'image/png',
        fileName: 'portrait.png',
        purpose: 'reference',
        size: 11,
      })
      return Response.json({
        uploadUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/id.png?signature=upload',
        readUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/id.png?signature=read',
        objectKey: 'studio/reference/id.png',
        expiresAt: 700_000,
      })
    }
    expect(url).toContain('signature=upload')
    expect(init).toMatchObject({
      method: 'PUT',
      body: file,
      credentials: 'omit',
      redirect: 'error',
      headers: { 'Content-Type': 'image/png' },
    })
    return new Response(null, { status: 200 })
  })

  await expect(
    uploadStudioFile(key, file, 'reference', signal(), transport)
  ).resolves.toEqual({
    url: 'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/id.png?signature=read',
    objectKey: 'studio/reference/id.png',
    expiresAt: 700_000,
  })
  expect(transport).toHaveBeenCalledTimes(2)
})

it.each([
  [new File([], 'empty.png', { type: 'image/png' }), 'invalid_parameters'],
  [
    new File(['text'], 'notes.txt', { type: 'text/plain' }),
    'invalid_parameters',
  ],
])(
  'rejects an unsafe local reference before requesting a ticket',
  async (file, code) => {
    const transport = vi.fn()
    await expect(
      uploadStudioFile(key, file, 'reference', signal(), transport)
    ).rejects.toMatchObject({ code })
    expect(transport).not.toHaveBeenCalled()
  }
)

it('does not send file bytes when the signing service returns an unsafe destination', async () => {
  const file = new File(['image'], 'portrait.webp', { type: 'image/webp' })
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      uploadUrl: 'https://example.com/collect',
      readUrl: 'https://example.com/result.webp',
      objectKey: 'studio/reference/id.webp',
      expiresAt: 700_000,
    })
  )
  await expect(
    uploadStudioFile(key, file, 'reference', signal(), transport)
  ).rejects.toMatchObject({ code: 'storage_failed' })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('reports storage failure without retrying an ambiguous OSS upload', async () => {
  const file = new File(['image'], 'portrait.jpeg', { type: 'image/jpeg' })
  const transport = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        uploadUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/id.jpg?signature=upload',
        readUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/id.jpg?signature=read',
        objectKey: 'studio/reference/id.jpg',
        expiresAt: 700_000,
      })
    )
    .mockRejectedValueOnce(new TypeError('network lost'))

  await expect(
    uploadStudioFile(key, file, 'reference', signal(), transport)
  ).rejects.toMatchObject({ code: 'storage_failed' })
  expect(transport).toHaveBeenCalledTimes(2)
})
