/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { LocalFilePanel } from '../components/LocalFilePanel'
import { createStudioI18n } from '../i18n'
import { createMemoryStore } from '../memory-store'

beforeEach(() => {
  let next = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(
    () => `blob:file-${++next}`
  )
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
it('keeps a file discoverable when deletion fails and leaves records intact on retry', async () => {
  const store = createMemoryStore()
  await store.put({
    kind: 'prompt',
    owner: 'demo-a',
    id: 'idea',
    title: 'Saved idea',
    text: 'Keep the words',
  })
  await store.putBlob('demo-a', 'asset', file(), {
    name: 'test.png',
    savedAt: 123,
  })
  vi.spyOn(store, 'removeBlob').mockRejectedValueOnce(
    new Error('Storage unavailable')
  )
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
    />
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete file test.png' })
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete file only' })
  )
  await screen.findByText(
    'File deletion failed. Nothing was removed; please retry.'
  )
  expect(await store.listBlobs('demo-a')).toHaveLength(1)
  press('Delete file only')
  await waitFor(async () =>
    expect(await store.listBlobs('demo-a')).toHaveLength(0)
  )
  expect((await store.list('demo-a'))[0]).toMatchObject({
    text: 'Keep the words',
  })
})

it('does not claim a removed file is still saved when returning to its workspace', async () => {
  const store = createMemoryStore()
  await store.putBlob('demo-a', 'asset', file(), {
    name: 'test.png',
    savedAt: 123,
  })
  const i18n = createStudioI18n('en')
  const panel = (active: boolean) => (
    <I18nextProvider i18n={i18n}>
      <LocalFilePanel
        store={store}
        owner='demo-a'
        assetId='asset'
        kind='image'
        allowImport
        active={active}
        now={() => 123}
      />
    </I18nextProvider>
  )
  const view = render(panel(true))
  await screen.findByText('Saved in this browser')
  view.rerender(panel(false))
  await store.removeBlob('demo-a', 'asset')
  view.rerender(panel(true))
  await screen.findByRole('heading', { name: 'Try a file of your own' })
  expect(
    screen.queryByRole('link', { name: 'Download file' })
  ).not.toBeInTheDocument()
  expect(screen.queryByText('Saved in this browser')).not.toBeInTheDocument()
})

const press = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))
const select = (file: File) =>
  fireEvent.change(screen.getByLabelText('Choose a test result file'), {
    target: { files: [file] },
  })
const file = () =>
  new File(['original-test-bytes'], 'test.png', { type: 'image/png' })
const show = (store = createMemoryStore()) => ({
  store,
  ...render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <LocalFilePanel
        store={store}
        owner='demo-a'
        assetId='asset'
        kind='image'
        allowImport
        active
        now={() => 123}
      />
    </I18nextProvider>
  ),
})

it('stores the selected original bytes, restores preview after remount, and releases object URLs', async () => {
  const first = show()
  await screen.findByLabelText('Choose a test result file')
  select(file())
  await screen.findByRole('img', { name: 'test.png' })
  expect(screen.getByText('Not saved · This page only')).toBeVisible()
  press('Keep in this browser')
  await screen.findByText('Saved in this browser')
  expect(await (await first.store.getBlob('demo-a', 'asset'))?.text()).toBe(
    'original-test-bytes'
  )
  expect(await first.store.listBlobs('demo-a')).toEqual([
    {
      owner: 'demo-a',
      id: 'asset',
      name: 'test.png',
      size: 19,
      type: 'image/png',
      savedAt: 123,
    },
  ])
  first.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file-1')
  const second = show(first.store)
  await screen.findByRole('img', { name: 'test.png' })
  expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute(
    'download',
    'test.png'
  )
  expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute(
    'href',
    'blob:file-2'
  )
  second.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file-2')
})

it('keeps the unsaved original downloadable after quota failure and supports retry without duplicate saves', async () => {
  const store = createMemoryStore()
  const write = vi
    .spyOn(store, 'putBlob')
    .mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
  show(store)
  await screen.findByLabelText('Choose a test result file')
  select(file())
  press('Keep in this browser')
  await screen.findByText(
    'Browser storage is full. Download the file or remove unneeded local files, then retry.'
  )
  expect(screen.queryByText('Saved in this browser')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Download file' })).toBeVisible()
  expect(await store.listBlobs('demo-a')).toEqual([])
  const retry = screen.getByRole('button', { name: 'Keep in this browser' })
  fireEvent.click(retry)
  fireEvent.click(retry)
  await screen.findByText('Saved in this browser')
  expect(write).toHaveBeenCalledTimes(2)
})

it.each([
  new File(['x'], 'script.svg', { type: 'image/svg+xml' }),
  new File([], 'empty.png', { type: 'image/png' }),
  new File(['x'], 'movie.mp4', { type: 'video/mp4' }),
])(
  'rejects an invalid test file before creating a preview or writing storage',
  async (invalid) => {
    const view = show()
    await screen.findByLabelText('Choose a test result file')
    select(invalid)
    expect(screen.getByRole('alert')).toBeVisible()
    expect(await view.store.listBlobs('demo-a')).toEqual([])
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  }
)

it('rejects files over the image limit and preserves an already selected valid file', async () => {
  show()
  await screen.findByLabelText('Choose a test result file')
  select(file())
  const large = file()
  Object.defineProperty(large, 'size', { value: 21 * 1024 * 1024 })
  select(large)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByRole('img', { name: 'test.png' })).toBeVisible()
})

it('does not overwrite a stored file when its initial read failed', async () => {
  const store = createMemoryStore()
  await store.putBlob('demo-a', 'asset', file(), {
    name: 'test.png',
    savedAt: 123,
  })
  vi.spyOn(store, 'getBlob').mockRejectedValueOnce(
    new Error('read unavailable')
  )
  show(store)
  await screen.findByText(
    'Could not read this local file. Retry before making changes.'
  )
  expect(
    screen.queryByLabelText('Choose a test result file')
  ).not.toBeInTheDocument()
  press('Retry')
  await screen.findByText('Saved in this browser')
  expect(await (await store.getBlob('demo-a', 'asset'))?.text()).toBe(
    'original-test-bytes'
  )
})

it('retains downloadable local bytes past simulated expiry and preserves the file after record deletion', async () => {
  const store = createMemoryStore()
  await store.put({
    kind: 'image',
    owner: 'demo-a',
    id: 'job',
    clientRequestId: 'job',
    modelId: 'demo-image',
    prompt: 'An old idea',
    stage: 'ready',
    createdAt: 1,
    expiresAt: 2,
    assetId: 'asset',
  })
  await store.putBlob('demo-a', 'asset', file(), {
    name: 'test.png',
    savedAt: 1,
  })
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
      now={() => 999}
    />
  )
  await screen.findByRole('button', { name: 'View details' })
  expect(screen.queryByText('Demo preview expired')).not.toBeInTheDocument()
  press('View details')
  const dialog = await screen.findByRole('dialog', { name: 'Record details' })
  await within(dialog).findByRole('link', { name: 'Download file' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  press('Delete record')
  press('Confirm deletion')
  await waitFor(async () => expect(await store.list('demo-a')).toEqual([]))
  expect(await store.listBlobs('demo-a')).toHaveLength(1)
  press('View file test.png')
  await screen.findByRole('link', { name: 'Download file' })
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })
  )
  press('Delete file test.png')
  press('Delete file only')
  await waitFor(async () => expect(await store.listBlobs('demo-a')).toEqual([]))
})
