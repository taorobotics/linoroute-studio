/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect, it, vi } from 'vitest'

import { connectLive, submitLive, queryLive } from '../live-client'
import { LIVE_MODELS } from '../live-models'

const controller = () => new AbortController().signal
const model = (id: string) => {
  const found = LIVE_MODELS.find((m) => m.id === id)
  if (!found) throw new Error('Missing test model')
  return found
}
const key = 'sk-test-only-not-a-real-key'
const draft = {
  prompt: 'A ceramic cup in soft light',
  ratio: '1:1',
  duration: 5,
}

it('submits MiniMax H3 text-to-video with the selected resolution and duration', async () => {
  const transport = vi.fn(async (url, init) => {
    expect(url).toBe('/studio-api/tencent-vod/v1/aigc-video')
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      model_name: 'Hailuo',
      model_version: 'H3',
      prompt: draft.prompt,
      output_config: {
        storage_mode: 'Temporary',
        duration: 15,
        resolution: '4K',
        aspect_ratio: '16:9',
      },
    })
    expect(body).not.toHaveProperty('file_infos')
    return Response.json({ Response: { TaskId: 'h3-text-task' } })
  })

  await expect(
    submitLive(
      key,
      model('aigc-video-hailuo'),
      {
        ...draft,
        mode: 'text',
        ratio: '16:9',
        duration: 15,
        size: '4K',
      },
      controller(),
      transport
    )
  ).resolves.toMatchObject({ stage: 'running', taskId: 'h3-text-task' })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('submits MiniMax H3 image-to-video with its first frame and rejects missing input', async () => {
  const transport = vi.fn(async (_url, init) => {
    expect(JSON.parse(String(init?.body))).toMatchObject({
      output_config: { duration: 4, resolution: '2K' },
      file_infos: [
        {
          type: 'Url',
          category: 'Image',
          url: 'https://media.example.com/first-frame.png',
        },
      ],
    })
    return Response.json({ Response: { TaskId: 'h3-image-task' } })
  })
  const imageDraft = {
    ...draft,
    mode: 'image' as const,
    duration: 4,
    size: '2K',
  }

  await expect(
    submitLive(
      key,
      model('aigc-video-hailuo'),
      {
        ...imageDraft,
        referenceUrl: 'https://media.example.com/first-frame.png',
      },
      controller(),
      transport
    )
  ).resolves.toMatchObject({ stage: 'running', taskId: 'h3-image-task' })
  await expect(
    submitLive(
      key,
      model('aigc-video-hailuo'),
      imageDraft,
      controller(),
      transport
    )
  ).rejects.toMatchObject({ code: 'invalid_parameters' })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('rejects unsupported MiniMax H3 resolutions before a paid request', async () => {
  const transport = vi.fn()
  await expect(
    submitLive(
      key,
      model('aigc-video-hailuo'),
      { ...draft, mode: 'text', duration: 4, size: '8K' },
      controller(),
      transport
    )
  ).rejects.toMatchObject({ code: 'invalid_parameters' })
  expect(transport).not.toHaveBeenCalled()
})

it('submits Seedance 2.5 image-to-video with its selected production settings', async () => {
  const transport = vi.fn(async (url, init) => {
    expect(url).toBe('/studio-api/api/v3/contents/generations/tasks')
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'doubao-seedance-2-5-260628',
      content: [
        { type: 'text', text: 'A cinematic product reveal' },
        {
          type: 'image_url',
          image_url: { url: 'https://media.example.com/product.png' },
          role: 'first_frame',
        },
      ],
      ratio: 'adaptive',
      duration: 30,
      resolution: '1080p',
      generate_audio: true,
    })
    return Response.json({ id: 'seedance-25-task' })
  })

  await expect(
    submitLive(
      key,
      model('doubao-seedance-2-5-260628'),
      {
        prompt: 'A cinematic product reveal',
        mode: 'image',
        ratio: 'adaptive',
        duration: 30,
        size: '1080p',
        generateAudio: true,
        referenceUrl: 'https://media.example.com/product.png',
      },
      controller(),
      transport
    )
  ).resolves.toMatchObject({ stage: 'running', taskId: 'seedance-25-task' })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('rejects unsupported Seedance 2.5 resolutions before a paid request', async () => {
  const transport = vi.fn()
  await expect(
    submitLive(
      key,
      model('doubao-seedance-2-5-260628'),
      {
        ...draft,
        mode: 'text',
        size: '4K',
      },
      controller(),
      transport
    )
  ).rejects.toMatchObject({ code: 'invalid_parameters' })
  expect(transport).not.toHaveBeenCalled()
})

it.each([
  [
    'kling-video',
    '/kling/v1/videos/image2video',
    {
      model_name: 'kling-v3',
      mode: 'std',
      duration: '5',
      aspect_ratio: '1:1',
      image: 'https://media.example.com/reference.png',
    },
    { code: 0, data: { task_id: 'task-1' } },
  ],
  [
    'kling-omni-video',
    '/kling/v1/videos/omni-video',
    {
      model_name: 'kling-v3-omni',
      mode: 'std',
      image_list: [
        {
          image_url: 'https://media.example.com/reference.png',
          type: 'first_frame',
        },
      ],
    },
    { code: 0, data: { task_id: 'task-1' } },
  ],
  [
    'grok-imagine-video',
    '/v1/videos/generations',
    {
      model: 'grok-imagine-video',
      duration: 5,
      aspect_ratio: '1:1',
      resolution: '480p',
      image: { url: 'https://media.example.com/reference.png' },
    },
    { request_id: 'task-1' },
  ],
  [
    'aigc-video-hailuo',
    '/tencent-vod/v1/aigc-video',
    {
      model_name: 'Hailuo',
      model_version: 'H3',
      output_config: {
        storage_mode: 'Temporary',
        duration: 5,
        resolution: '768P',
        aspect_ratio: '1:1',
      },
      file_infos: [
        {
          type: 'Url',
          category: 'Image',
          url: 'https://media.example.com/reference.png',
        },
      ],
    },
    { Response: { TaskId: 'task-1' } },
  ],
])(
  'submits %s using its own documented schema',
  async (id, path, body, response) => {
    const transport = vi.fn(async (url, init) => {
      expect(url).toBe(`/studio-api${path}`)
      if (!init) throw new Error('Missing request')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toMatchObject({
        ...body,
        prompt: draft.prompt,
      })
      return Response.json(response)
    })
    expect(
      await submitLive(
        key,
        model(id),
        { ...draft, referenceUrl: 'https://media.example.com/reference.png' },
        controller(),
        transport
      )
    ).toMatchObject({ stage: 'running', taskId: 'task-1' })
    expect(transport).toHaveBeenCalledTimes(1)
  }
)

it.each(['veo_3_1', 'veo_3_1-fast'])(
  'sends %s as multipart and lets fetch set the boundary',
  async (id) => {
    const transport = vi.fn(async (url, init) => {
      expect(url).toBe('/studio-api/v1/videos')
      if (!init) throw new Error('Missing request')
      expect(init.body).toBeInstanceOf(FormData)
      const form = init.body as FormData
      expect(Object.fromEntries(form.entries())).toEqual({
        model: id,
        prompt: draft.prompt,
        seconds: '8',
        size: '16x9',
        input_reference: 'https://media.example.com/reference.png',
      })
      expect(new Headers(init.headers).get('Content-Type')).toBeNull()
      return Response.json({ id: 'veo-task', status: 'queued' })
    })
    expect(
      await submitLive(
        key,
        model(id),
        {
          ...draft,
          ratio: '16:9',
          duration: 8,
          referenceUrl: 'https://media.example.com/reference.png',
        },
        controller(),
        transport
      )
    ).toMatchObject({ stage: 'running', taskId: 'veo-task' })
  }
)

it('connection intersects authenticated entitlement with supported catalog and never generates', async () => {
  const calls: string[] = []
  const transport = vi.fn(async (url: string | URL | Request) => {
    calls.push(String(url))
    if (String(url).endsWith('/v1/models')) {
      return Response.json({
        data: [{ id: 'gpt-image-2.5-flare' }, { id: 'unmapped-model' }],
      })
    }
    return Response.json({
      data: [
        { model_name: 'gpt-image-2.5-flare', available: true },
        { model_name: 'gemini-3-pro-image-preview', available: true },
      ],
    })
  })
  const session = await connectLive(key, controller(), transport)
  expect(session.models.map((m) => m.id)).toEqual(['gpt-image-2.5-flare'])
  expect(calls).toEqual(['/studio-api/v1/models', '/studio-api/api/pricing'])
  expect(session.owner).toMatch(/^live:[a-f0-9]{64}$/)
})

it('connection accepts the pricing endpoint JSON string envelope', async () => {
  const transport = vi.fn(async (url: string | URL | Request) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({ data: [{ id: 'gpt-image-2' }] })
    }
    return Response.json(
      JSON.stringify({
        data: [{ model_name: 'gpt-image-2', available: true }],
      })
    )
  })

  const session = await connectLive(key, controller(), transport)
  expect(session.models.map((entry) => entry.id)).toEqual(['gpt-image-2'])
})

it('image 2-C omits unsupported n and decodes actual image response', async () => {
  let sent: unknown
  const transport = vi.fn(async (_url, init) => {
    if (!init) throw new Error('Request options missing')
    sent = JSON.parse(init.body as string)
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer ${key}`)
    expect(init.credentials).toBe('omit')
    return Response.json({
      created: 123,
      data: [{ url: 'https://media.example.com/result.webp' }],
    })
  })
  const result = await submitLive(
    key,
    model('gpt-image-2-c'),
    draft,
    controller(),
    transport
  )
  expect(sent).toEqual({
    model: 'gpt-image-2-c',
    prompt: draft.prompt,
    size: '1024x1024',
    response_format: 'b64_json',
  })
  expect(result).toMatchObject({
    stage: 'ready',
    assets: [{ url: 'https://media.example.com/result.webp' }],
  })
})

it('Nano Banana uses native Gemini content and extracts inline image data', async () => {
  const transport = vi.fn(async (url, init) => {
    expect(url).toBe(
      '/studio-api/v1beta/models/gemini-3-pro-image-preview:generateContent'
    )
    if (!init) throw new Error('Request options missing')
    expect(JSON.parse(init.body as string)).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: draft.prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    })
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: 'Done' },
              { inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } },
            ],
          },
        },
      ],
    })
  })
  expect(
    await submitLive(
      key,
      model('gemini-3-pro-image-preview'),
      draft,
      controller(),
      transport
    )
  ).toMatchObject({
    stage: 'ready',
    assets: [{ base64: 'aGVsbG8=', mime: 'image/png' }],
  })
})

it('Seedance persists the returned task ID and GET polling returns the actual video', async () => {
  const m = model('doubao-seedance-2-0-fast-260128')
  const transport = vi.fn(async (url, init) => {
    if (init?.method === 'POST') {
      expect(JSON.parse(init.body as string)).toEqual({
        model: m.id,
        content: [{ type: 'text', text: draft.prompt }],
        ratio: '1:1',
        duration: 5,
        resolution: '480p',
      })
      return Response.json({ id: 'cgt-task-123' })
    }
    expect(url).toBe(
      '/studio-api/api/v3/contents/generations/tasks/cgt-task-123'
    )
    return Response.json({
      id: 'cgt-task-123',
      status: 'succeeded',
      content: { video_url: 'https://media.example.com/result.mp4' },
    })
  })
  expect(
    await submitLive(key, m, draft, controller(), transport)
  ).toMatchObject({ stage: 'running', taskId: 'cgt-task-123' })
  expect(
    await queryLive(key, m, 'cgt-task-123', controller(), transport)
  ).toMatchObject({
    stage: 'ready',
    assets: [{ url: 'https://media.example.com/result.mp4' }],
  })
})

it('ambiguous paid submission fails without automatically retrying', async () => {
  const transport = vi
    .fn()
    .mockRejectedValue(new TypeError(`network unavailable ${key}`))
  await expect(
    submitLive(
      key,
      model('gpt-image-2.5-flare'),
      draft,
      controller(),
      transport
    )
  ).rejects.toMatchObject({ code: 'submission_unknown' })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('HTTP errors do not expose the entered key or raw upstream error text', async () => {
  const transport = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: { message: `${key} private diagnostics` } },
        { status: 401 }
      )
    )
  await expect(
    submitLive(key, model('gpt-image-2-c'), draft, controller(), transport)
  ).rejects.toMatchObject({ code: 'unauthorized', message: 'unauthorized' })
})

it('invalid options and unsafe media responses cannot become completed jobs', async () => {
  const transport = vi
    .fn()
    .mockResolvedValue(
      Response.json({ data: [{ url: 'javascript:alert(1)' }] })
    )
  await expect(
    submitLive(
      key,
      model('gpt-image-2-c'),
      { ...draft, ratio: '9:16' },
      controller(),
      transport
    )
  ).rejects.toMatchObject({ code: 'invalid_parameters' })
  expect(transport).not.toHaveBeenCalled()
  await expect(
    submitLive(key, model('gpt-image-2-c'), draft, controller(), transport)
  ).rejects.toMatchObject({ code: 'invalid_response' })
})

it.each([
  [
    'kling-video',
    {
      code: 0,
      data: {
        task_id: 'k1',
        task_status: 'succeed',
        task_result: { videos: [{ url: 'https://media.example.com/k.mp4' }] },
      },
    },
  ],
  [
    'kling-omni-video',
    {
      code: 0,
      data: {
        task_id: 'k1',
        task_status: 'succeed',
        task_result: { videos: [{ url: 'https://media.example.com/k.mp4' }] },
      },
    },
  ],
  [
    'aigc-video-hailuo',
    {
      Response: {
        Status: 'FINISH',
        AigcVideoTask: {
          Status: 'FINISH',
          Output: {
            FileInfos: [{ FileUrl: 'https://media.example.com/k.mp4' }],
          },
        },
      },
    },
  ],
  [
    'veo_3_1',
    {
      id: 'k1',
      status: 'completed',
      video_url: 'https://media.example.com/k.mp4',
    },
  ],
  [
    'grok-imagine-video',
    { status: 'done', video: { url: 'https://media.example.com/k.mp4' } },
  ],
])(
  'decodes documented %s result without a demo fallback',
  async (id, response) => {
    const transport = vi.fn().mockResolvedValue(Response.json(response))
    expect(
      await queryLive(key, model(id), 'k1', controller(), transport)
    ).toMatchObject({
      stage: 'ready',
      assets: [{ url: 'https://media.example.com/k.mp4' }],
    })
  }
)

it('H3 gateway envelope returns its completed media over verified HTTPS without another POST', async () => {
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      code: 'success',
      data: {
        task_id: 'h3-real-shape',
        status: 'SUCCESS',
        data: {
          Response: {
            Status: 'FINISH',
            AigcVideoTask: {
              Status: 'FINISH',
              Output: {
                FileInfos: [
                  {
                    FileUrl: 'http://store.vod-qcloud.com/example/result.mp4',
                  },
                ],
              },
            },
          },
        },
      },
    })
  )
  const result = await queryLive(
    key,
    model('aigc-video-hailuo'),
    'h3-real-shape',
    controller(),
    transport
  )
  expect(result).toEqual({
    stage: 'ready',
    taskId: 'h3-real-shape',
    assets: [{ url: 'https://store.vod-qcloud.com/example/result.mp4' }],
  })
  expect(transport).toHaveBeenCalledTimes(1)
  expect(transport.mock.calls[0][1].method).toBe('GET')
})

it.each([
  ['IN_PROGRESS', 'running'],
  ['FAILURE', 'failed'],
])('H3 gateway task status %s is displayed as %s', async (status, expected) => {
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      code: 'success',
      data: { task_id: 'h3-1', status, data: {} },
    })
  )
  expect(
    await queryLive(
      key,
      model('aigc-video-hailuo'),
      'h3-1',
      controller(),
      transport
    )
  ).toEqual({ stage: expected, taskId: 'h3-1', assets: [] })
})

it('H3 never upgrades arbitrary HTTP hosts or mistakes a rejected envelope for a result', async () => {
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      code: 'success',
      data: {
        task_id: 'h3-1',
        status: 'SUCCESS',
        data: {
          Response: {
            AigcVideoTask: {
              Status: 'FINISH',
              Output: {
                FileInfos: [{ FileUrl: 'http://untrusted.example/result.mp4' }],
              },
            },
          },
        },
      },
    })
  )
  await expect(
    queryLive(key, model('aigc-video-hailuo'), 'h3-1', controller(), transport)
  ).rejects.toMatchObject({ code: 'invalid_response' })
  transport.mockResolvedValue(
    Response.json({
      code: 'failed',
      data: { task_id: 'h3-1', status: 'SUCCESS' },
    })
  )
  await expect(
    queryLive(key, model('aigc-video-hailuo'), 'h3-1', controller(), transport)
  ).rejects.toMatchObject({ code: 'request_rejected' })
})
