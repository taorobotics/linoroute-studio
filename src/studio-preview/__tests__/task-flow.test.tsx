/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import type { MediaJob } from '../contracts'
import { createMemoryStore } from '../memory-store'

const draft = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value },
  })
const press = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

it('resumes a partially saved success transition without creating a second job', async () => {
  const store = createMemoryStore()
  const save = store.put
  let failOnce = true
  vi.spyOn(store, 'put').mockImplementation(async (record) => {
    if (
      (record.kind === 'image' || record.kind === 'video') &&
      record.stage === 'archiving' &&
      failOnce
    ) {
      failOnce = false
      throw new Error('Quota temporarily unavailable')
    }
    await save(record)
  })
  render(<StudioPreviewApp store={store} locale='en' initialOwner='demo-a' />)
  draft('Keep this single attempt')
  press('Preview generation')
  await screen.findByRole('button', { name: 'Simulate success' })
  press('Simulate success')
  await screen.findByRole('button', { name: 'Retry save' })
  expect((await store.list('demo-a'))[0]).toMatchObject({ stage: 'running' })
  expect(screen.queryByText('Demo completed')).not.toBeInTheDocument()
  press('Retry save')
  await waitFor(async () =>
    expect((await store.list('demo-a'))[0]).toMatchObject({ stage: 'ready' })
  )
  expect(await store.list('demo-a')).toHaveLength(1)
})

it('does not show an expired sample as available but preserves reusable prompt metadata', async () => {
  const store = createMemoryStore()
  await store.put({
    kind: 'image',
    id: 'expired',
    owner: 'demo-a',
    clientRequestId: 'expired',
    modelId: 'demo-image',
    prompt: 'An old idea',
    stage: 'ready',
    createdAt: 100,
    expiresAt: 200,
  })
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
      now={() => 300}
    />
  )
  await screen.findByText('Demo preview expired')
  expect(
    screen.queryByRole('img', { name: 'Shared demo thumbnail' })
  ).not.toBeInTheDocument()
  press('View details')
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'The simulated seven-day preview has expired'
  )
  press('Reuse settings')
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'An old idea'
  )
})

it('does not render a late history response after switching demo identities', async () => {
  const store = createMemoryStore()
  const oldJob: MediaJob = {
    kind: 'image',
    id: 'private-a',
    owner: 'demo-a',
    clientRequestId: 'private-a',
    modelId: 'demo-image',
    prompt: 'Private to A',
    stage: 'queued',
    createdAt: 100,
  }
  let resolveA!: (records: MediaJob[]) => void
  const response = new Promise<MediaJob[]>((resolve) => {
    resolveA = resolve
  })
  vi.spyOn(store, 'list').mockImplementation((owner) =>
    owner === 'demo-a' ? response : Promise.resolve([])
  )
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
    />
  )
  expect(screen.getByText('Loading local records')).toBeVisible()
  press('Demo A')
  press('Use Demo B')
  await screen.findByText('No local demo records yet')
  await act(async () => {
    resolveA([oldJob])
    await response
  })
  expect(screen.queryByText('Private to A')).not.toBeInTheDocument()
})

it('supports retrying a history read and keeps a record after a failed deletion', async () => {
  const store = createMemoryStore()
  await store.put({
    kind: 'image',
    id: 'saved',
    owner: 'demo-a',
    clientRequestId: 'saved',
    modelId: 'demo-image',
    prompt: 'Do not lose this',
    stage: 'failed',
    createdAt: 100,
  })
  vi.spyOn(store, 'list').mockRejectedValueOnce(new Error('Not ready'))
  vi.spyOn(store, 'remove').mockRejectedValueOnce(new Error('Unable to delete'))
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
    />
  )
  await screen.findByText('Could not load local records. Try again.')
  press('Retry')
  await screen.findByRole('button', { name: 'View details' })
  press('Delete record')
  press('Confirm deletion')
  await screen.findByText(
    'Deletion failed. The record is still here; please try again.'
  )
  expect(await store.list('demo-a')).toHaveLength(1)
  press('Confirm deletion')
  await waitFor(async () => expect(await store.list('demo-a')).toHaveLength(0))
  await screen.findByText('No local demo records yet')
})

it('requires a demo identity, then stores an immutable job snapshot without network calls or duplicate submissions', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const store = createMemoryStore()
  render(<StudioPreviewApp demoEnabled store={store} locale='en' />)
  draft('Porcelain in daylight')
  press('Preview generation')
  expect(
    screen.getByRole('dialog', { name: 'Connect your LinoRoute key' })
  ).toBeVisible()
  expect(await store.list('demo-a')).toHaveLength(0)
  press('Use Demo A')
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Porcelain in daylight'
  )
  press('Preview generation')
  press('Preview generation')
  await screen.findByRole('button', { name: 'Simulate success' })
  draft('New unsent idea')
  const records = await store.list('demo-a')
  expect(records).toHaveLength(1)
  expect(records[0]).toMatchObject({
    prompt: 'Porcelain in daylight',
    stage: 'queued',
  })
  press('Simulate success')
  await waitFor(async () =>
    expect((await store.list('demo-a'))[0]).toMatchObject({ stage: 'ready' })
  )
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'New unsent idea'
  )
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('keeps failed jobs visible, creates a new attempt on retry, and scopes history and deletion by demo identity', async () => {
  const store = createMemoryStore()
  render(<StudioPreviewApp store={store} locale='en' initialOwner='demo-a' />)
  draft('A moonlit lake')
  press('Preview generation')
  await screen.findByRole('button', { name: 'Simulate failure' })
  press('Simulate failure')
  await screen.findByRole('button', { name: 'Retry demo task' })
  draft('Different draft')
  press('Retry demo task')
  await screen.findByRole('button', { name: 'Simulate success' })
  expect(await store.list('demo-a')).toHaveLength(2)
  expect((await store.list('demo-a'))[1]).toMatchObject({
    prompt: 'A moonlit lake',
  })
  press('Simulate success')
  await waitFor(async () =>
    expect((await store.list('demo-a'))[1]).toMatchObject({ stage: 'ready' })
  )
  press('My works')
  await screen.findAllByRole('button', { name: 'View details' })
  expect(screen.getAllByRole('article')).toHaveLength(2)
  press('Demo A')
  press('Use Demo B')
  await screen.findByText('No local demo records yet')
  expect(screen.queryByText('A moonlit lake')).not.toBeInTheDocument()
  press('Demo B')
  press('Use Demo A')
  await screen.findAllByRole('button', { name: 'View details' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete record' })[0])
  expect(await store.list('demo-a')).toHaveLength(2)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirm deletion' })
  )
  await waitFor(async () => expect(await store.list('demo-a')).toHaveLength(1))
})

it('reloads existing metadata, filters by kind and reuses the exact saved model and prompt', async () => {
  const store = createMemoryStore()
  const saved: MediaJob = {
    kind: 'image',
    id: 'saved',
    owner: 'demo-a',
    clientRequestId: 'saved',
    modelId: 'demo-gpt-image-2-5',
    prompt: 'Saved ceramic composition',
    stage: 'ready',
    createdAt: 100,
    expiresAt: 300,
  }
  await store.put(saved)
  await store.put({
    ...saved,
    kind: 'video',
    id: 'movie',
    modelId: 'demo-video',
    prompt: 'Saved video',
  })
  render(
    <StudioPreviewApp
      store={store}
      locale='en'
      initialOwner='demo-a'
      initialRoute='works'
      now={() => 200}
    />
  )
  await screen.findAllByRole('button', { name: 'View details' })
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Filter works' })).getByRole(
      'button',
      { name: 'Images' }
    )
  )
  expect(screen.getAllByRole('article')).toHaveLength(1)
  press('View details')
  expect(
    screen.getByRole('dialog', { name: 'Record details' })
  ).toHaveTextContent('Saved ceramic composition')
  press('Reuse settings')
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Saved ceramic composition'
  )
  expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
    'GPT-image-2.5'
  )
})

it('reports storage failure honestly, keeps the prompt and allows a safe retry', async () => {
  const store = createMemoryStore()
  const put = vi
    .spyOn(store, 'put')
    .mockRejectedValueOnce(new Error('Storage unavailable'))
  render(<StudioPreviewApp store={store} locale='en' initialOwner='demo-a' />)
  draft('Unlost idea')
  press('Preview generation')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not save this demo operation'
  )
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Unlost idea'
  )
  expect(await store.list('demo-a')).toHaveLength(0)
  press('Retry save')
  await screen.findByRole('button', { name: 'Simulate success' })
  expect(await store.list('demo-a')).toHaveLength(1)
  expect(put).toHaveBeenCalledTimes(2)
})
