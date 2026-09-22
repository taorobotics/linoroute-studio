/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { LiveHistory } from '../components/LiveHistory'
import type { LiveJob, LiveSession } from '../live-types'
import { createMemoryStore } from '../memory-store'

const session: LiveSession = { key: 'test-only', owner: 'live:a', models: [] }
const makeJob = (overrides: Partial<LiveJob> = {}): LiveJob => ({
  id: 'image-1',
  clientRequestId: 'image-1',
  owner: session.owner,
  live: true,
  kind: 'image',
  stage: 'ready',
  modelId: 'gpt-image-2.5-sunburst',
  prompt: 'A handcrafted blue ceramic vase with soft natural light. '.repeat(
    30
  ),
  createdAt: 100,
  duration: 5,
  generationMode: 'text',
  requestedSize: '1536x1024',
  assets: [{ url: 'https://media.example.com/vase.png' }],
  ...overrides,
})
afterEach(() => vi.restoreAllMocks())

it('shows the saved image and a short prompt but opens the complete unchanged job', async () => {
  const store = createMemoryStore()
  const job = makeJob()
  await store.put(job)
  const onOpen = vi.fn()
  render(<LiveHistory session={session} store={store} onOpen={onOpen} />)
  expect(
    await screen.findByRole('img', { name: 'Work image preview' })
  ).toHaveAttribute('src', 'https://media.example.com/vase.png')
  const card = screen.getByRole('article')
  const excerpt = card.querySelector('.studio-history-prompt')
  expect(excerpt).toBeInTheDocument()
  expect(excerpt?.textContent?.length).toBeLessThanOrEqual(181)
  expect(excerpt).not.toHaveTextContent(job.prompt)
  fireEvent.click(within(card).getByRole('button', { name: 'Open task' }))
  expect(onOpen).toHaveBeenCalledWith(job)
  expect(await store.list(session.owner)).toEqual([job])
})

it('shows a muted video cover without autoplay and filters by media kind', async () => {
  const store = createMemoryStore()
  await store.put(makeJob())
  await store.put(
    makeJob({
      id: 'video-1',
      kind: 'video',
      modelId: 'doubao-seedance-2-5-260128',
      createdAt: 200,
      assets: [{ url: 'https://media.example.com/clip.mp4' }],
    })
  )
  render(<LiveHistory session={session} store={store} onOpen={() => {}} />)
  const video = (await screen.findByLabelText(
    'Work video preview'
  )) as HTMLVideoElement
  expect(video).toHaveAttribute('src', 'https://media.example.com/clip.mp4')
  expect(video.muted).toBe(true)
  expect(video.autoplay).toBe(false)
  expect(video).toHaveAttribute('preload', 'metadata')
  fireEvent.click(screen.getByRole('button', { name: /^Video works/ }))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(
    screen.queryByRole('img', { name: 'Work image preview' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^All works/ }))
  expect(screen.getAllByRole('article')).toHaveLength(2)
})

it.each([
  [
    'expired',
    {
      assets: [{ url: 'https://media.example.com/expired.png', expiresAt: 1 }],
    },
    'Preview expired',
  ],
  [
    'unsafe',
    { assets: [{ url: 'http://127.0.0.1/private.png' }] },
    'Preview unavailable',
  ],
  ['failed', { stage: 'failed', assets: [] }, 'Generation failed'],
  ['running', { stage: 'running', assets: [] }, 'Generating'],
  [
    'unknown',
    { stage: 'submission_unknown', assets: [] },
    'Submission not confirmed',
  ],
] satisfies [string, Partial<LiveJob>, string][])(
  'keeps %s records readable without a broken or misleading image',
  async (_, override, label) => {
    const store = createMemoryStore()
    await store.put(makeJob(override))
    render(<LiveHistory session={session} store={store} onOpen={() => {}} />)
    const card = await screen.findByRole('article')
    expect(card).toHaveTextContent(label)
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    expect(
      within(card).getByRole('button', { name: 'Open task' })
    ).toBeEnabled()
  }
)

it('replaces an expired upstream response with an unavailable cover on image error', async () => {
  const store = createMemoryStore()
  await store.put(makeJob())
  render(<LiveHistory session={session} store={store} onOpen={() => {}} />)
  fireEvent.error(
    await screen.findByRole('img', { name: 'Work image preview' })
  )
  expect(screen.getByText('Preview unavailable')).toBeVisible()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

it('loads local saved media under its owner and releases the temporary URL', async () => {
  const store = createMemoryStore()
  await store.put(makeJob({ assets: [{ blobId: 'local-vase' }], expiresAt: 1 }))
  await store.putBlob(
    session.owner,
    'local-vase',
    new Blob(['png'], { type: 'image/png' })
  )
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-vase')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const view = render(
    <LiveHistory session={session} store={store} onOpen={() => {}} />
  )
  expect(
    await screen.findByRole('img', { name: 'Work image preview' })
  ).toHaveAttribute('src', 'blob:test-vase')
  view.unmount()
  expect(revoke).toHaveBeenCalledWith('blob:test-vase')
})

it('displays inline image fallbacks and clears old work immediately on key switch', async () => {
  const store = createMemoryStore()
  await store.put(
    makeJob({ assets: [{ base64: 'aGVsbG8=', mime: 'image/png' }] })
  )
  const view = render(
    <LiveHistory session={session} store={store} onOpen={() => {}} />
  )
  expect(
    await screen.findByRole('img', { name: 'Work image preview' })
  ).toHaveAttribute('src', 'data:image/png;base64,aGVsbG8=')
  view.rerender(
    <LiveHistory
      session={{ ...session, owner: 'live:b' }}
      store={store}
      onOpen={() => {}}
    />
  )
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  await waitFor(() =>
    expect(
      screen.getByText('No real generations saved for this key yet.')
    ).toBeVisible()
  )
})
