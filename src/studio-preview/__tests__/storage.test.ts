/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { describe, expect, it } from 'vitest'

import type { LocalRecord } from '../contracts'
import { openLocalStore } from '../local-store'
import { createMemoryStore } from '../memory-store'
import { createResilientLocalStore } from '../resilient-store'

type Listener = EventListenerOrEventListenerObject

function emit(listener: Listener | undefined, event: Event): void {
  if (!listener) return
  if (typeof listener === 'function') listener(event)
  else listener.handleEvent(event)
}

function createOpenErrorFactory(error: Error): IDBFactory {
  const listeners = new Map<string, Listener>()
  return {
    open() {
      const request: {
        error: Error
        addEventListener: (type: string, listener: Listener) => void
      } = {
        error,
        addEventListener: (type, listener) => listeners.set(type, listener),
      }
      queueMicrotask(() => emit(listeners.get('error'), new Event('error')))
      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory
}

function createFailingWriteFactory(error: DOMException): IDBFactory {
  const transactionListeners = new Map<string, Listener>()
  const database = {
    addEventListener: () => undefined,
    transaction() {
      const transaction: {
        error: DOMException
        addEventListener: (type: string, listener: Listener) => void
        objectStore: () => { put: () => void }
      } = {
        error,
        addEventListener: (type, listener) =>
          transactionListeners.set(type, listener),
        objectStore: () => ({
          put: () =>
            queueMicrotask(() =>
              emit(transactionListeners.get('error'), new Event('error'))
            ),
        }),
      }
      return transaction as unknown as IDBTransaction
    },
  }

  return {
    open() {
      const listeners = new Map<string, Listener>()
      const request: {
        result: typeof database
        addEventListener: (type: string, listener: Listener) => void
      } = {
        result: database,
        addEventListener: (type, listener) => listeners.set(type, listener),
      }
      queueMicrotask(() => emit(listeners.get('success'), new Event('success')))
      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory
}

describe('local record storage', () => {
  it('keeps file metadata accessible after deleting its record, and never deletes another identity file', async () => {
    const store = createMemoryStore()
    await store.put({
      kind: 'prompt',
      id: 'job',
      owner: 'demo-a',
      title: 'Idea',
      text: 'Keep me',
    })
    await store.putBlob(
      'demo-a',
      'asset',
      new Blob(['original'], { type: 'image/png' }),
      { name: 'my-image.png', savedAt: 123 }
    )
    await store.putBlob('demo-b', 'asset', new Blob(['other']), {
      name: 'other.png',
      savedAt: 456,
    })
    await store.remove('demo-a', 'job')
    expect(await store.listBlobs('demo-a')).toEqual([
      {
        id: 'asset',
        owner: 'demo-a',
        name: 'my-image.png',
        savedAt: 123,
        size: 8,
        type: 'image/png',
      },
    ])
    expect(await (await store.getBlob('demo-a', 'asset'))?.text()).toBe(
      'original'
    )
    await store.removeBlob('demo-a', 'asset')
    expect(await store.listBlobs('demo-a')).toEqual([])
    expect(await store.listBlobs('demo-b')).toHaveLength(1)
  })

  it('leaves the prompt record intact when only its file is removed', async () => {
    const store = createMemoryStore()
    await store.put({
      kind: 'prompt',
      id: 'job',
      owner: 'demo-a',
      title: 'Idea',
      text: 'Keep me',
    })
    await store.putBlob('demo-a', 'asset', new Blob(['file']))
    await store.removeBlob('demo-a', 'asset')
    expect((await store.list('demo-a'))[0]).toMatchObject({ text: 'Keep me' })
  })

  it('does not turn a failed durable file write into a successful memory save', async () => {
    const failures: Error[] = []
    const store = createResilientLocalStore({
      factory: createFailingWriteFactory(
        new DOMException('Full', 'QuotaExceededError')
      ),
      onFallback: (error) => failures.push(error),
    })
    await expect(
      store.putBlob('demo-a', 'asset', new Blob(['file']))
    ).rejects.toMatchObject({ name: 'QuotaExceededError' })
    expect(failures).toEqual([])
    await expect(
      store.put({
        kind: 'prompt',
        id: 'p',
        owner: 'demo-a',
        title: '',
        text: '',
      })
    ).rejects.toMatchObject({ name: 'QuotaExceededError' })
  })

  it('refuses persistent file saving when only page memory is available', async () => {
    const store = createResilientLocalStore({
      factory: createOpenErrorFactory(new Error('disabled')),
    })
    await expect(
      store.putBlob('demo-a', 'asset', new Blob(['file']))
    ).rejects.toMatchObject({ name: 'StorageUnavailableError' })
    expect(await store.getBlob('demo-a', 'asset')).toBeUndefined()
  })
  it('keeps records and blobs partitioned by demo identity', async () => {
    const store = createMemoryStore()
    await store.put({
      kind: 'prompt',
      id: 'p1',
      owner: 'demo-a',
      title: 'A',
      text: 'Private draft',
    })
    await store.putBlob('demo-a', 'a1', new Blob(['sample']))

    expect(await store.list('demo-b')).toEqual([])
    expect(await store.getBlob('demo-b', 'a1')).toBeUndefined()
    await store.clear('demo-b')
    expect(await store.list('demo-a')).toHaveLength(1)
    expect((await store.getBlob('demo-a', 'a1'))?.size).toBe(6)
  })

  it('returns copies and replaces duplicate record keys', async () => {
    const store = createMemoryStore()
    const original: LocalRecord = {
      kind: 'prompt',
      id: 'same-id',
      owner: 'demo-a',
      title: 'First',
      text: 'One',
    }
    await store.put(original)
    original.title = 'Mutated outside'

    const firstRead = await store.list('demo-a')
    const firstPrompt = firstRead.find((record) => record.kind === 'prompt')
    expect(firstPrompt?.title).toBe('First')
    if (firstPrompt) firstPrompt.title = 'Mutated read'
    const secondPrompt = (await store.list('demo-a')).find(
      (record) => record.kind === 'prompt'
    )
    expect(secondPrompt?.title).toBe('First')

    await store.put({ ...original, title: 'Replacement', text: 'Two' })
    const records = await store.list('demo-a')
    expect(records).toHaveLength(1)
    const replacement = records.find((record) => record.kind === 'prompt')
    expect(replacement?.title).toBe('Replacement')
  })

  it('re-reads and removes copied Blob data', async () => {
    const store = createMemoryStore()
    await store.putBlob(
      'demo-a',
      'asset-1',
      new Blob(['preview'], { type: 'text/plain' })
    )

    const first = await store.getBlob('demo-a', 'asset-1')
    const second = await store.getBlob('demo-a', 'asset-1')
    expect(first).not.toBe(second)
    expect(first?.type).toBe('text/plain')
    expect(await second?.text()).toBe('preview')

    await store.removeBlob('demo-a', 'asset-1')
    expect(await store.getBlob('demo-a', 'asset-1')).toBeUndefined()
  })

  it('rejects when IndexedDB cannot be opened', async () => {
    await expect(
      openLocalStore(createOpenErrorFactory(new Error('blocked')))
    ).rejects.toThrow('blocked')
  })

  it('rejects a write when its IndexedDB transaction fails', async () => {
    const store = await openLocalStore(
      createFailingWriteFactory(
        new DOMException('quota reached', 'QuotaExceededError')
      )
    )

    await expect(
      store.put({
        kind: 'prompt',
        id: 'p1',
        owner: 'demo-a',
        title: 'Unsaved',
        text: 'Draft',
      })
    ).rejects.toMatchObject({ name: 'QuotaExceededError' })
  })

  it('falls back to page memory and reports the storage failure', async () => {
    const failures: Error[] = []
    const store = createResilientLocalStore({
      factory: createOpenErrorFactory(new Error('storage disabled')),
      onFallback: (error) => failures.push(error),
    })

    await store.put({
      kind: 'prompt',
      id: 'p1',
      owner: 'demo-a',
      title: 'Temporary draft',
      text: 'This survives only while the page stays open.',
    })

    expect(await store.list('demo-a')).toHaveLength(1)
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toBe('storage disabled')
  })
})
