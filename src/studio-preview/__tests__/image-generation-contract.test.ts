/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect, it, vi } from 'vitest'

import { submitLive } from '../live-client'
import { LIVE_MODELS } from '../live-models'

const base = { prompt: 'A ceramic cup', ratio: '1:1', duration: 5 }
const file = new File(['fixture'], 'reference.png', { type: 'image/png' })
const model = (id: string) => {
  const found = LIVE_MODELS.find((m) => m.id === id)
  if (!found) throw new Error('Missing fixture model')
  return found
}
const reply = () =>
  Response.json({ data: [{ url: 'https://example.com/result.png' }] })

it.each(['1K', '2K', '4K'])(
  'Nano Banana Pro sends %s through native imageConfig for generation and editing',
  async (size) => {
    for (const mode of ['text', 'image'] as const) {
      const transport = vi.fn(async () =>
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: { mimeType: 'image/png', data: 'Zml4dHVyZQ==' },
                  },
                ],
              },
            },
          ],
        })
      )
      await submitLive(
        'sk-test',
        model('gemini-3-pro-image-preview'),
        { ...base, size, mode, images: [file] },
        new AbortController().signal,
        transport
      )
      const calls = transport.mock.calls as unknown as [string, RequestInit][]
      expect(calls).toHaveLength(1)
      expect(calls[0][0]).toBe(
        '/studio-api/v1beta/models/gemini-3-pro-image-preview:generateContent'
      )
      const body = JSON.parse(String(calls[0][1].body))
      expect(body.generationConfig.imageConfig).toEqual({
        aspectRatio: '1:1',
        imageSize: size,
      })
      expect(body.contents[0].parts).toHaveLength(mode === 'image' ? 2 : 1)
      expect(body).not.toHaveProperty('size')
    }
  }
)

it.each(['8K', '512', '2048x2048'])(
  'Nano Banana Pro rejects unsupported resolution %s before a paid call',
  async (size) => {
    const transport = vi.fn(async () => reply())
    await expect(
      submitLive(
        'sk-test',
        model('gemini-3-pro-image-preview'),
        { ...base, size },
        new AbortController().signal,
        transport
      )
    ).rejects.toMatchObject({ code: 'invalid_parameters' })
    expect(transport).not.toHaveBeenCalled()
  }
)

it.each([
  ['3:2', '1536x1024'],
  ['2:3', '1024x1536'],
  ['1:1', '2048x2048'],
  ['16:9', '3840x2160'],
])(
  'GPT 2 per-request sends verified %s size %s without an n parameter',
  async (ratio, size) => {
    const transport = vi.fn(async () => reply())
    await submitLive(
      'sk-test',
      model('gpt-image-2-c'),
      { ...base, ratio, size },
      new AbortController().signal,
      transport
    )
    const calls = transport.mock.calls as unknown as [string, RequestInit][]
    expect(calls).toHaveLength(1)
    const body = JSON.parse(String(calls[0][1].body))
    expect(body).toMatchObject({ model: 'gpt-image-2-c', size })
    expect(body).not.toHaveProperty('n')
  }
)

it.each(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'])(
  '%s sends every documented size without confusing ratio and pixels',
  async (id) => {
    for (const [ratio, size] of [
      ['1:1', '1024x1024'],
      ['1:1', '2048x2048'],
      ['3:2', '1536x1024'],
      ['2:3', '1024x1536'],
      ['16:9', '2048x1152'],
      ['16:9', '3840x2160'],
      ['9:16', '2160x3840'],
      ['auto', 'auto'],
    ]) {
      const transport = vi.fn(async () => reply())
      await submitLive(
        'sk-test',
        model(id),
        { ...base, ratio, size, mode: 'text' },
        new AbortController().signal,
        transport
      )
      const request = transport.mock.calls as unknown as [string, RequestInit][]
      expect(JSON.parse(String(request[0][1].body))).toMatchObject({
        model: id,
        size,
        n: 1,
      })
      expect(request).toHaveLength(1)
    }
  }
)

it('explicit text mode excludes hidden image drafts and uses generations', async () => {
  const transport = vi.fn(async () => reply())
  const draft = { ...base, images: [file], mode: 'text' as const }
  await submitLive(
    'sk-test',
    model('gpt-image-2.5-flare'),
    draft,
    new AbortController().signal,
    transport
  )
  const request = transport.mock.calls as unknown as [string, RequestInit][]
  expect(request[0][0]).toBe('/studio-api/v1/images/generations')
  expect(typeof request[0][1].body).toBe('string')
  expect(JSON.parse(String(request[0][1].body))).not.toHaveProperty('image')
})

it.each([
  ['gpt-image-2.5-flare-c', '16:9', '2048x1152'],
  ['gpt-image-2.5-flare-c', '9:16', '1152x2048'],
  ['gpt-image-2.5-sunburst-c', '16:9', '2048x1152'],
  ['gpt-image-2.5-sunburst-c', '9:16', '1152x2048'],
])(
  '%s submits the verified %s preset without switching billing',
  async (id, ratio, size) => {
    const transport = vi.fn(async () => reply())
    await submitLive(
      'sk-test',
      model(id),
      { ...base, ratio, size, mode: 'text' },
      new AbortController().signal,
      transport
    )
    const request = transport.mock.calls as unknown as [string, RequestInit][]
    expect(request).toHaveLength(1)
    expect(request[0][0]).toBe('/studio-api/v1/images/generations')
    expect(JSON.parse(String(request[0][1].body))).toMatchObject({
      model: id,
      size,
      n: 1,
    })
  }
)

it('GPT 2.5 editing sends repeated image fields with the selected size', async () => {
  const transport = vi.fn(async () => reply())
  const draft = {
    ...base,
    mode: 'image' as const,
    images: [file, file],
    size: '2048x2048',
    quality: 'xhigh' as const,
    format: 'webp' as const,
    background: 'transparent' as const,
    moderation: 'low' as const,
  }
  await submitLive(
    'sk-test',
    model('gpt-image-2.5-sunburst'),
    draft,
    new AbortController().signal,
    transport
  )
  const request = transport.mock.calls as unknown as [string, RequestInit][]
  expect(request[0][0]).toBe('/studio-api/v1/images/edits')
  const body = request[0][1].body as FormData
  expect(body.getAll('image')).toHaveLength(2)
  expect(body.has('image[]')).toBe(false)
  expect(body.get('size')).toBe('2048x2048')
  expect(body.get('quality')).toBe('xhigh')
  expect(body.get('format')).toBe('webp')
  expect(body.get('background')).toBe('transparent')
  expect(body.get('moderation')).toBe('low')
  expect(body.get('n')).toBe('1')
  expect(new Headers(request[0][1].headers).has('Content-Type')).toBe(false)
})

it('GPT 2.5 generation sends the documented request controls', async () => {
  const transport = vi.fn(async () => reply())
  await submitLive(
    'sk-test',
    model('gpt-image-2.5-flare'),
    {
      ...base,
      mode: 'text',
      ratio: '9:16',
      size: '2160x3840',
      quality: 'max',
      format: 'png',
      background: 'transparent',
      moderation: 'low',
    } as Parameters<typeof submitLive>[2],
    new AbortController().signal,
    transport
  )

  const request = transport.mock.calls as unknown as [string, RequestInit][]
  expect(request).toHaveLength(1)
  expect(JSON.parse(String(request[0][1].body))).toEqual({
    model: 'gpt-image-2.5-flare',
    prompt: base.prompt,
    size: '2160x3840',
    quality: 'max',
    format: 'png',
    background: 'transparent',
    moderation: 'low',
    n: 1,
    response_format: 'b64_json',
  })
})

it('GPT 2.5 editing accepts up to 16 references and sends an optional mask', async () => {
  const transport = vi.fn(async () => reply())
  const images = Array.from(
    { length: 16 },
    (_, index) =>
      new File(['fixture'], `reference-${index}.png`, { type: 'image/png' })
  )
  const mask = new File(['mask'], 'mask.png', { type: 'image/png' })
  await submitLive(
    'sk-test',
    model('gpt-image-2.5-sunburst'),
    {
      ...base,
      mode: 'image',
      images,
      mask,
      ratio: 'auto',
      size: 'auto',
      quality: 'auto',
      format: 'png',
      background: 'auto',
      moderation: 'auto',
    } as Parameters<typeof submitLive>[2],
    new AbortController().signal,
    transport
  )

  const request = transport.mock.calls as unknown as [string, RequestInit][]
  const body = request[0][1].body as FormData
  expect(body.getAll('image')).toHaveLength(16)
  expect(body.get('mask')).toBe(mask)
})

it.each([
  { quality: 'ultra' },
  { format: 'gif' },
  { background: 'transparent', format: 'jpeg' },
  { moderation: 'off' },
  {
    mode: 'image' as const,
    images: Array.from({ length: 17 }, () => file),
  },
])(
  'rejects undocumented GPT 2.5 request controls before a paid request: %j',
  async (change) => {
    const transport = vi.fn(async () => reply())
    await expect(
      submitLive(
        'sk-test',
        model('gpt-image-2.5-flare'),
        { ...base, ...change } as Parameters<typeof submitLive>[2],
        new AbortController().signal,
        transport
      )
    ).rejects.toMatchObject({ code: 'invalid_parameters' })
    expect(transport).not.toHaveBeenCalled()
  }
)

it.each([
  { mode: 'image' as const, images: [] },
  { ratio: '16:9', size: '1024x1024' },
  { size: '9999x9999' },
  { ratio: '9:16' },
  { prompt: 'a'.repeat(1001) },
])(
  'rejects invalid GPT 2.5 input before any paid request: %j',
  async (change) => {
    const transport = vi.fn(async () => reply())
    await expect(
      submitLive(
        'sk-test',
        model('gpt-image-2.5-flare'),
        { ...base, ...change },
        new AbortController().signal,
        transport
      )
    ).rejects.toMatchObject({ code: 'invalid_parameters' })
    expect(transport).not.toHaveBeenCalled()
  }
)

it.each(['gpt-image-2.5-flare-c', 'gpt-image-2.5-sunburst-c'])(
  '%s does not inherit extended sizes or unconfirmed editing from non-c variants',
  async (id) => {
    for (const change of [
      { size: '2048x2048' },
      { ratio: '16:9', size: '3840x2160' },
      { ratio: '9:16', size: '2160x3840' },
      { ratio: 'auto', size: 'auto' },
      { mode: 'image' as const, images: [file] },
    ]) {
      const transport = vi.fn(async () => reply())
      await expect(
        submitLive(
          'sk-test',
          model(id),
          { ...base, ...change },
          new AbortController().signal,
          transport
        )
      ).rejects.toMatchObject({ code: 'invalid_parameters' })
      expect(transport).not.toHaveBeenCalled()
    }
  }
)

it('GPT Image 2 generation sends the documented size, quality, format and fixed count', async () => {
  const transport = vi.fn(async () => reply())
  await submitLive(
    'sk-test',
    model('gpt-image-2'),
    {
      ...base,
      mode: 'text',
      ratio: '16:9',
      size: '3840x2160',
      quality: 'low',
      format: 'webp',
    },
    new AbortController().signal,
    transport
  )

  const request = transport.mock.calls as unknown as [string, RequestInit][]
  expect(request).toHaveLength(1)
  expect(request[0][0]).toBe('/studio-api/v1/images/generations')
  expect(JSON.parse(String(request[0][1].body))).toEqual({
    model: 'gpt-image-2',
    prompt: base.prompt,
    size: '3840x2160',
    quality: 'low',
    format: 'webp',
    n: 1,
    response_format: 'b64_json',
  })
})

it('GPT Image 2 editing uses the image field and treats size as the output canvas', async () => {
  const transport = vi.fn(async () => reply())
  await submitLive(
    'sk-test',
    model('gpt-image-2'),
    {
      ...base,
      mode: 'image',
      images: [file],
      ratio: '3:2',
      size: '1536x1024',
      quality: 'low',
      format: 'webp',
    },
    new AbortController().signal,
    transport
  )

  const request = transport.mock.calls as unknown as [string, RequestInit][]
  expect(request).toHaveLength(1)
  expect(request[0][0]).toBe('/studio-api/v1/images/edits')
  const body = request[0][1].body as FormData
  expect(body.getAll('image')).toHaveLength(1)
  expect(body.has('image[]')).toBe(false)
  expect(body.get('model')).toBe('gpt-image-2')
  expect(body.get('size')).toBe('1536x1024')
  expect(body.get('quality')).toBe('low')
  expect(body.get('n')).toBe('1')
  expect(body.get('response_format')).toBe('b64_json')
  expect(body.has('format')).toBe(false)
})

it.each([
  { quality: 'max' },
  { format: 'gif' },
  { ratio: '16:9', size: '3840x2160', mode: 'image', images: [file] },
])(
  'rejects undocumented GPT Image 2 input before a paid request: %j',
  async (change) => {
    const transport = vi.fn(async () => reply())
    await expect(
      submitLive(
        'sk-test',
        model('gpt-image-2'),
        { ...base, ...change } as Parameters<typeof submitLive>[2],
        new AbortController().signal,
        transport
      )
    ).rejects.toMatchObject({ code: 'invalid_parameters' })
    expect(transport).not.toHaveBeenCalled()
  }
)
