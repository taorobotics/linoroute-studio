/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import type { LiveJob } from '../live-types'
import { createMemoryStore } from '../memory-store'

const key = 'sk-ui-test-only'
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13])
beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 64, height: 96, close: vi.fn() }))
  )
})
afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})
function mockRelay(
  post: () => Promise<Response> = async () =>
    Response.json({ data: [{ url: 'https://media.example.com/actual.png' }] })
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({
        data: [
          { id: 'gpt-image-2.5-flare' },
          { id: 'doubao-seedance-2-0-260128' },
        ],
      })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({
        data: [
          { model_name: 'gpt-image-2.5-flare' },
          { model_name: 'doubao-seedance-2-0-260128' },
        ],
      })
    }
    if (init?.method === 'POST') return post()
    return Response.json({
      id: 'cgt-1',
      status: 'succeeded',
      content: { video_url: 'https://media.example.com/real.mp4' },
    })
  })
}
async function connect() {
  fireEvent.click(screen.getByRole('button', { name: 'Configure API key' }))
  fireEvent.change(screen.getByLabelText('API Key'), { target: { value: key } })
  fireEvent.click(screen.getByRole('button', { name: 'Connect to LinoRoute' }))
  await screen.findByText('Live mode · Usage is billed')
}
async function selectModel(label: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  await user.click(screen.getByRole('option', { name: label }))
}

it('displays GPT-image-2 while paid requests retain the original gateway model ID', async () => {
  let submitted: unknown
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({ data: [{ id: 'gpt-image-2-c' }] })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({ data: [{ model_name: 'gpt-image-2-c' }] })
    }
    submitted = JSON.parse(String(init?.body))
    return Response.json({
      data: [{ url: 'https://media.example.com/actual.png' }],
    })
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
    'GPT-image-2'
  )
  generate()
  expect(screen.getByRole('dialog')).toHaveTextContent('GPT-image-2')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByRole('img', { name: 'Generated image' })
  expect(submitted).toMatchObject({ model: 'gpt-image-2-c' })
})
function generate() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A porcelain cup' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
}

it('uses full live video names without changing their gateway bindings', async () => {
  const videoIds = [
    'aigc-video-hailuo',
    'kling-video',
    'kling-omni-video',
    'veo_3_1',
    'veo_3_1-fast',
    'grok-imagine-video',
  ]
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({ data: videoIds.map((id) => ({ id })) })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({
        data: videoIds.map((model_name) => ({ model_name })),
      })
    }
    throw new Error('This name-only check must not generate media')
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
  await selectModel('MiniMax H3')
  expect(
    screen.getByText(
      'MiniMax H3 supports text-to-video and image-to-video at 768P, 1080P, 2K or 4K. Upstream media links may expire; download important results promptly.'
    )
  ).toBeInTheDocument()
  for (const label of [
    'MiniMax H3',
    'Kling Video 3.0',
    'Kling Video 3.0 Omni',
    'Veo 3.1',
    'Veo 3.1 Fast',
    'Grok Imagine Video',
  ]) {
    await selectModel(label)
    generate()
    expect(screen.getByRole('dialog')).toHaveTextContent(label)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  }
})

it('exposes MiniMax H3 text/image modes, resolutions and the 4–15 second range', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({ data: [{ id: 'aigc-video-hailuo' }] })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({ data: [{ model_name: 'aigc-video-hailuo' }] })
    }
    throw new Error('This controls-only check must not generate media')
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))

  expect(screen.getByRole('radio', { name: 'Text to video' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Image to video' })).toBeEnabled()
  for (const resolution of ['768P', '1080P', '2K', '4K']) {
    expect(screen.getByRole('radio', { name: resolution })).toBeEnabled()
  }
  const duration = screen.getByRole('combobox', {
    name: 'Duration (seconds)',
  })
  expect(duration).toHaveValue('4')
  expect(duration.querySelectorAll('option')).toHaveLength(12)

  fireEvent.click(screen.getByRole('radio', { name: 'Image to video' }))
  expect(screen.getByLabelText('Choose first-frame image')).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeDisabled()
})

it('exposes Seedance 2.5 text/image modes and documented video controls', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({
        data: [{ id: 'doubao-seedance-2-5-260628' }],
      })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({
        data: [{ model_name: 'doubao-seedance-2-5-260628' }],
      })
    }
    throw new Error('This controls-only check must not generate media')
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))

  expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
    'Seedance 2.5'
  )
  expect(screen.getByRole('radio', { name: 'Text to video' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Image to video' })).toBeEnabled()
  for (const resolution of ['480P', '720P', '1080P']) {
    expect(screen.getByRole('radio', { name: resolution })).toBeEnabled()
  }
  for (const aspectRatio of ['16:9', '9:16', '1:1', '4:3', 'Adaptive']) {
    expect(screen.getByRole('button', { name: aspectRatio })).toBeEnabled()
  }
  const duration = screen.getByRole('combobox', {
    name: 'Duration (seconds)',
  })
  expect(duration).toHaveValue('5')
  expect(duration.querySelectorAll('option')).toHaveLength(27)
  expect(
    screen.getByRole('checkbox', { name: 'Generate synchronized audio' })
  ).toBeChecked()

  fireEvent.click(screen.getByRole('radio', { name: 'Image to video' }))
  expect(screen.getByLabelText('Choose first-frame image')).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeDisabled()
})

it('uploads a local MiniMax H3 first frame to OSS before the paid video request', async () => {
  const calls: string[] = []
  let paidPayload: Record<string, unknown> | undefined
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url)
    if (target.endsWith('/v1/models')) {
      return Response.json({ data: [{ id: 'aigc-video-hailuo' }] })
    }
    if (target.endsWith('/api/pricing')) {
      return Response.json({ data: [{ model_name: 'aigc-video-hailuo' }] })
    }
    if (target === '/studio-storage/v1/uploads') {
      calls.push('ticket')
      return Response.json({
        uploadUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/first-frame.png?signature=put',
        readUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/first-frame.png?signature=get',
        objectKey: 'studio/reference/first-frame.png',
        expiresAt: Date.now() + 604_800_000,
      })
    }
    if (target.includes('signature=put')) {
      calls.push('upload')
      return new Response(null, { status: 200 })
    }
    if (target.includes('/studio-api/tencent-vod/v1/aigc-video')) {
      calls.push('paid')
      paidPayload = JSON.parse(String(init?.body))
      return Response.json({ data: { task_id: 'h3-local-frame-task' } })
    }
    throw new Error(`Unexpected request: ${target}`)
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Image to video' }))
  fireEvent.change(screen.getByLabelText('Choose first-frame image'), {
    target: {
      files: [new File([png], 'first-frame.png', { type: 'image/png' })],
    },
  })
  await screen.findByText('first-frame.png')
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'Slow camera push toward the subject' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))

  await waitFor(() => expect(calls).toEqual(['ticket', 'upload', 'paid']))
  expect(paidPayload).toMatchObject({
    file_infos: [
      {
        type: 'Url',
        category: 'Image',
        url: expect.stringContaining('signature=get'),
      },
    ],
  })
})

it('uploads a local Seedance first frame instead of asking for an HTTPS URL', async () => {
  const calls: string[] = []
  let paidPayload: Record<string, unknown> | undefined
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url)
    if (target.endsWith('/v1/models')) {
      return Response.json({
        data: [{ id: 'doubao-seedance-2-0-260128' }],
      })
    }
    if (target.endsWith('/api/pricing')) {
      return Response.json({
        data: [{ model_name: 'doubao-seedance-2-0-260128' }],
      })
    }
    if (target === '/studio-storage/v1/uploads') {
      calls.push('ticket')
      return Response.json({
        uploadUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/seedance-frame.png?signature=put',
        readUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/reference/seedance-frame.png?signature=get',
        objectKey: 'studio/reference/seedance-frame.png',
        expiresAt: Date.now() + 604_800_000,
      })
    }
    if (target.includes('signature=put')) {
      calls.push('upload')
      return new Response(null, { status: 200 })
    }
    if (target.endsWith('/studio-api/api/v3/contents/generations/tasks')) {
      calls.push('paid')
      paidPayload = JSON.parse(String(init?.body))
      return Response.json({ id: 'seedance-local-frame-task' })
    }
    throw new Error(`Unexpected request: ${target}`)
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))

  expect(
    screen.queryByLabelText('First-frame image HTTPS URL (optional)')
  ).not.toBeInTheDocument()
  const picker = screen.getByLabelText('Choose first-frame image')
  fireEvent.change(picker, {
    target: {
      files: [new File([png], 'seedance-frame.png', { type: 'image/png' })],
    },
  })
  await screen.findByText('seedance-frame.png')
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'Slow cinematic movement from the uploaded first frame' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))

  await waitFor(() => expect(calls).toEqual(['ticket', 'upload', 'paid']))
  expect(paidPayload).toMatchObject({
    content: [
      { type: 'text' },
      {
        type: 'image_url',
        image_url: { url: expect.stringContaining('signature=get') },
        role: 'first_frame',
      },
    ],
  })
})

it('archives a completed base64 image to OSS and keeps the seven-day link in history', async () => {
  const store = createMemoryStore()
  const saved = vi.spyOn(store, 'put')
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url)
    if (target.endsWith('/v1/models')) {
      return Response.json({ data: [{ id: 'gpt-image-2-c' }] })
    }
    if (target.endsWith('/api/pricing')) {
      return Response.json({ data: [{ model_name: 'gpt-image-2-c' }] })
    }
    if (target === '/studio-storage/v1/uploads') {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        purpose: 'result',
        contentType: 'image/png',
      })
      return Response.json({
        uploadUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/result/final.png?signature=put',
        readUrl:
          'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/result/final.png?signature=get',
        objectKey: 'studio/result/final.png',
        expiresAt: 1_800_000_000_000,
      })
    }
    if (target.includes('signature=put')) {
      expect(init).toMatchObject({ method: 'PUT' })
      return new Response(null, { status: 200 })
    }
    if (target.endsWith('/studio-api/v1/images/generations')) {
      return Response.json({
        data: [{ b64_json: btoa('generated-image-bytes') }],
      })
    }
    throw new Error(`Unexpected request: ${target}`)
  })
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  generate()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))

  expect(
    await screen.findByRole('img', { name: 'Generated image' })
  ).toHaveAttribute('src', expect.stringContaining('signature=get'))
  expect(saved.mock.calls.at(-1)?.[0]).toMatchObject({
    stage: 'ready',
    expiresAt: 1_800_000_000_000,
    assets: [
      {
        url: expect.stringContaining('signature=get'),
        objectKey: 'studio/result/final.png',
      },
    ],
  })
})

it('does not send a paid request if the initial history record cannot be saved', async () => {
  const transport = mockRelay()
  const store = createMemoryStore()
  vi.spyOn(store, 'put').mockRejectedValue(
    new DOMException('Quota exceeded', 'QuotaExceededError')
  )
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  generate()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByText(/OSS upload or browser saving failed/)
  expect(
    transport.mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(0)
})

it('keeps a paid result visible when final history saving fails and does not resubmit', async () => {
  const transport = mockRelay()
  const store = createMemoryStore()
  const put = store.put
  vi.spyOn(store, 'put').mockImplementation(async (record) => {
    if ('stage' in record && record.stage === 'ready') {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    return put(record)
  })
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  generate()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  expect(
    await screen.findByRole('img', { name: 'Generated image' })
  ).toHaveAttribute('src', 'https://media.example.com/actual.png')
  await screen.findByText(/OSS upload or browser saving failed/)
  expect(
    transport.mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(1)
})
it('requires paid confirmation, displays real output and never saves the key in generation history', async () => {
  const transport = mockRelay()
  const store = createMemoryStore()
  const save = vi.spyOn(store, 'put')
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
  generate()
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Confirm paid generation'
  )
  expect(
    transport.mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  expect(
    await screen.findByRole('img', { name: 'Generated image' })
  ).toHaveAttribute('src', 'https://media.example.com/actual.png')
  expect(JSON.stringify(save.mock.calls)).not.toContain(key)
  expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
    live: true,
    stage: 'ready',
  })
})
it('shows a loading panel while live image generation is in flight', async () => {
  let finishRequest!: (response: Response) => void
  const pendingResponse = new Promise<Response>((resolve) => {
    finishRequest = resolve
  })
  mockRelay(() => pendingResponse)
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  generate()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))

  expect(
    await screen.findByRole('status', {
      name: 'Image generation in progress',
    })
  ).toBeVisible()
  expect(
    screen.queryByRole('img', { name: 'Generated image' })
  ).not.toBeInTheDocument()
  expect(screen.queryByText(/Requested output size:/)).not.toBeInTheDocument()

  finishRequest(
    Response.json({ data: [{ url: 'https://media.example.com/actual.png' }] })
  )
  expect(
    await screen.findByRole('img', { name: 'Generated image' })
  ).toBeVisible()
  expect(screen.getByText(/Requested output size:/)).toBeVisible()
  await waitFor(() =>
    expect(
      screen.queryByRole('status', {
        name: 'Image generation in progress',
      })
    ).not.toBeInTheDocument()
  )
})
it('ambiguous generation never displays the perfume sample or automatically resubmits', async () => {
  const transport = mockRelay(async () => {
    throw new TypeError('connection lost')
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  generate()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByText(/Submission could not be confirmed/)
  expect(
    screen.queryByRole('img', { name: 'Generated image' })
  ).not.toBeInTheDocument()
  expect(screen.queryByText('Fixed sample')).not.toBeInTheDocument()
  expect(
    transport.mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(1)
})
it('disconnect returns to key setup without demo claims and removes the live session', async () => {
  mockRelay()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'API connected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect API key' }))
  expect(screen.queryByText('Demo mode · No charges')).not.toBeInTheDocument()
  expect(
    await screen.findByRole('button', { name: 'Connect key to generate' })
  ).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Configure API key' })
  ).toBeVisible()
})
it('restores a connected API key after remounting in the same browser tab', async () => {
  mockRelay()
  const firstView = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()

  firstView.unmount()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)

  expect(await screen.findByText('Live mode · Usage is billed')).toBeVisible()
  expect(screen.getByRole('button', { name: 'API connected' })).toBeVisible()
})
it('does not restore an API key after the user disconnects it', async () => {
  const transport = mockRelay()
  const firstView = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'API connected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect API key' }))

  firstView.unmount()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)

  expect(
    screen.queryByText('Live mode · Usage is billed')
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Configure API key' })
  ).toBeVisible()
  expect(transport).toHaveBeenCalledTimes(2)
})
it('resume checks an existing video task without submitting a second paid request', async () => {
  const transport = mockRelay()
  const store = createMemoryStore()
  const save = vi.spyOn(store, 'put')
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
  // Seed local history for this exact key namespace by deriving it through the same connection boundary.
  const { connectLive } = await import('../live-client')
  const session = await connectLive(key, new AbortController().signal)
  const job: LiveJob = {
    id: 'saved-video',
    clientRequestId: 'saved-video',
    owner: session.owner,
    live: true,
    kind: 'video',
    modelId: 'doubao-seedance-2-0-260128',
    prompt: 'Saved task',
    stage: 'running',
    taskId: 'cgt-1',
    assets: [],
    duration: 5,
    createdAt: 1,
  }
  await store.put(job)
  fireEvent.click(screen.getByRole('button', { name: 'My works' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Open task' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Resume status check' })
  )
  await waitFor(() =>
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
      stage: 'ready',
      taskId: 'cgt-1',
    })
  )
  expect(
    transport.mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(0)
})
