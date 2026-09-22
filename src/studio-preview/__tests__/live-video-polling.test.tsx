/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { LiveHistory } from '../components/LiveHistory'
import { LiveWorkspace } from '../components/LiveWorkspace'
import { LIVE_MODELS } from '../live-models'
import type { LiveJob, LiveSession } from '../live-types'
import { createMemoryStore } from '../memory-store'

const session: LiveSession = {
  key: 'test-video-polling-only',
  owner: 'live:polling',
  models: LIVE_MODELS.filter(
    (model) => model.id === 'doubao-seedance-2-5-260628'
  ),
}
const saved: LiveJob = {
  id: 'video-local',
  clientRequestId: 'video-local',
  owner: session.owner,
  live: true,
  kind: 'video',
  modelId: 'doubao-seedance-2-5-260628',
  prompt: 'Slow movement around a ceramic cup',
  stage: 'running',
  taskId: 'video-upstream',
  createdAt: 100,
  duration: 5,
  assets: [],
}
const complete = () =>
  Response.json({
    id: 'video-upstream',
    status: 'succeeded',
    content: { video_url: 'https://media.example.com/video.mp4' },
  })
const running = () => Response.json({ id: 'video-upstream', status: 'running' })
const storedUrl =
  'https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/result/video.mp4?signature=read'

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function relay(
  query: (attempt: number, signal?: AbortSignal | null) => Promise<Response>
) {
  let queries = 0
  let submissions = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url)
    if (path === '/studio-api/api/v3/contents/generations/tasks') {
      submissions++
      return Response.json({ id: 'video-upstream' })
    }
    if (
      path === '/studio-api/api/v3/contents/generations/tasks/video-upstream'
    ) {
      expect(init?.method).toBe('GET')
      return query(++queries, init?.signal)
    }
    if (path === 'https://media.example.com/video.mp4') {
      return new Response('video-fixture', {
        headers: { 'Content-Type': 'video/mp4' },
      })
    }
    if (path === '/studio-storage/v1/uploads') {
      return Response.json({
        uploadUrl: storedUrl.replace('signature=read', 'signature=write'),
        readUrl: storedUrl,
        objectKey: 'studio/result/video.mp4',
        expiresAt: Date.now() + 604_800_000,
      })
    }
    if (path === storedUrl.replace('signature=read', 'signature=write')) {
      return new Response(null, { status: 200 })
    }
    throw new Error('Unexpected transport path')
  })
  return { queries: () => queries, submissions: () => submissions }
}

async function openSaved(active = true, record = saved) {
  const store = createMemoryStore()
  await store.put(record)
  const props = { kind: 'video' as const, active, session, store }
  const view = render(<LiveWorkspace {...props} />)
  await act(async () =>
    view.rerender(
      <LiveWorkspace {...props} openJob={{ job: record, nonce: 1 }} />
    )
  )
  return { ...view, store }
}
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

it('automatically recovers a transient query error, keeps the loader, and displays the paid video once', async () => {
  const transport = relay(async (attempt) =>
    attempt === 1 ? new Response(null, { status: 503 }) : complete()
  )
  const store = createMemoryStore()
  render(<LiveWorkspace kind='video' active session={session} store={store} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: saved.prompt },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  await act(async () =>
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm and generate' })
    )
  )
  await advance(4000)
  expect(
    screen.getByRole('status', { name: 'Video generation in progress' })
  ).toBeVisible()
  await advance(30_000)
  expect(screen.getByLabelText('Generated video')).toHaveAttribute(
    'src',
    storedUrl
  )
  expect((await store.list(session.owner))[0]).toMatchObject({
    stage: 'ready',
    taskId: 'video-upstream',
  })
  const queries = transport.queries()
  await advance(60_000)
  expect(transport.queries()).toBe(queries)
  expect(transport.submissions()).toBe(1)
})

it('continues checking a slow video beyond the old 150-query cutoff', async () => {
  const transport = relay(async (attempt) =>
    attempt <= 150 ? running() : complete()
  )
  await openSaved()
  // This boundary reproduces the former fixed cutoff, not a stress test.
  for (let attempt = 0; attempt < 151; attempt++) await advance(4000)
  expect(screen.getByLabelText('Generated video')).toHaveAttribute(
    'src',
    storedUrl
  )
  expect(transport.queries()).toBe(151)
  expect(transport.submissions()).toBe(0)
})

it('keeps checking an existing video when another studio section is active', async () => {
  const transport = relay(async () => complete())
  const { store } = await openSaved(false)
  await advance(4000)
  expect((await store.list(session.owner))[0]).toMatchObject({ stage: 'ready' })
  expect(transport.submissions()).toBe(0)
})

it('updates a visible My works card when its background video completes without reloading the page', async () => {
  relay(async () => complete())
  const { store } = await openSaved(false)
  await act(async () => {
    render(<LiveHistory session={session} store={store} onOpen={() => {}} />)
  })
  expect(screen.queryByLabelText('Work video preview')).not.toBeInTheDocument()
  await advance(4000)
  await advance(4000)
  expect(screen.getByLabelText('Work video preview')).toHaveAttribute(
    'src',
    storedUrl
  )
})

it('backs off repeated temporary failures and automatically recovers from rate limiting', async () => {
  const transport = relay(async (attempt) =>
    attempt <= 3 ? new Response(null, { status: 429 }) : complete()
  )
  await openSaved()
  await advance(4000)
  expect(transport.queries()).toBe(1)
  await advance(7999)
  expect(transport.queries()).toBe(1)
  await advance(1)
  expect(transport.queries()).toBe(2)
  await advance(16_000)
  expect(transport.queries()).toBe(3)
  await advance(30_000)
  expect(screen.getByLabelText('Generated video')).toHaveAttribute(
    'src',
    storedUrl
  )
  expect(transport.submissions()).toBe(0)
})

it('stops checking a definitively failed generation rather than resubmitting it', async () => {
  const transport = relay(async () =>
    Response.json({ id: 'video-upstream', status: 'failed' })
  )
  await openSaved()
  await advance(4000)
  expect(
    screen.getByRole('heading', { name: 'Generation failed' })
  ).toBeVisible()
  await advance(60_000)
  expect(transport.queries()).toBe(1)
  expect(transport.submissions()).toBe(0)
})

it('times out a stalled status GET and automatically resumes without another generation POST', async () => {
  let aborted = false
  const transport = relay(async (attempt, signal) => {
    if (attempt > 1) return complete()
    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener(
        'abort',
        () => {
          aborted = true
          reject(new DOMException('Timed out', 'AbortError'))
        },
        { once: true }
      )
    })
  })
  await openSaved()
  await advance(4000)
  await advance(30_000)
  expect(aborted).toBe(true)
  await advance(30_000)
  expect(screen.getByLabelText('Generated video')).toHaveAttribute(
    'src',
    storedUrl
  )
  expect(transport.submissions()).toBe(0)
})

it('stops automatic queries for invalid credentials and explains that reconnection is required', async () => {
  const transport = relay(async () => new Response(null, { status: 401 }))
  await openSaved()
  await advance(4000)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'The key is invalid or has expired. Please reconnect.'
  )
  await advance(120_000)
  expect(transport.queries()).toBe(1)
  expect(transport.submissions()).toBe(0)
})

it('resumes on return to the tab without overlapping status requests, and stops on unmount', async () => {
  let finish: ((response: Response) => void) | undefined
  const transport = relay(
    async () =>
      new Promise<Response>((resolve) => {
        finish = resolve
      })
  )
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  const view = await openSaved()
  await advance(12_000)
  expect(transport.queries()).toBe(0)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
  })
  expect(transport.queries()).toBe(1)
  await advance(4000)
  expect(transport.queries()).toBe(1)
  await act(async () => finish?.(running()))
  view.unmount()
  await advance(60_000)
  expect(transport.queries()).toBe(1)
})
