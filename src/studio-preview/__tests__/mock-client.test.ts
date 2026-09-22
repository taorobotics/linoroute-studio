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

import { DEMO_IMAGE_MODELS, DEMO_VIDEO_MODELS } from '../fixtures'
import { createMemoryStore } from '../memory-store'
import { createMockClient } from '../mock-client'

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

describe('mock media client', () => {
  it('reuses the same job and retries archiving without generating again', async () => {
    const store = createMemoryStore()
    let count = 0
    const client = createMockClient({
      owner: 'demo-a',
      store,
      now: () => 1000,
      id: () => `j${++count}`,
    })
    const input = {
      kind: 'video' as const,
      clientRequestId: 'click-1',
      modelId: 'demo-video',
      prompt: 'A blue shape',
    }

    const first = await client.submit(input)
    expect((await client.submit(input)).id).toBe(first.id)
    await client.advance(first.id, 'running')
    await client.advance(first.id, 'archiving')
    await client.advance(first.id, 'archive_failed')
    expect((await client.retryArchive(first.id)).stage).toBe('archiving')
    const ready = await client.advance(first.id, 'ready')
    expect(ready.expiresAt).toBe(1000 + WEEK_IN_MS)
    expect(ready.assetId).toBe(`${first.id}-asset`)
    expect(await store.list('demo-a')).toHaveLength(1)
  })

  it('deduplicates concurrent submissions before the first write settles', async () => {
    const store = createMemoryStore()
    let count = 0
    const client = createMockClient({
      owner: 'demo-a',
      store,
      now: () => 1000,
      id: () => `job-${++count}`,
    })
    const input = {
      kind: 'image' as const,
      clientRequestId: 'double-click',
      modelId: 'demo-image',
      prompt: 'A calm blue sculpture',
    }

    const [first, second] = await Promise.all([
      client.submit(input),
      client.submit(input),
    ])
    expect(first.id).toBe(second.id)
    expect(count).toBe(1)
    expect(await store.list('demo-a')).toHaveLength(1)
  })

  it('rejects cross-owner and illegal stage changes', async () => {
    const store = createMemoryStore()
    const ownerA = createMockClient({
      owner: 'demo-a',
      store,
      now: () => 1000,
      id: () => 'job-a',
    })
    const ownerB = createMockClient({
      owner: 'demo-b',
      store,
      now: () => 1000,
      id: () => 'job-b',
    })
    const job = await ownerA.submit({
      kind: 'image',
      clientRequestId: 'owner-a-request',
      modelId: 'demo-image',
      prompt: 'Private draft',
    })

    await expect(ownerB.advance(job.id, 'running')).rejects.toThrow('not found')
    await expect(ownerA.advance(job.id, 'ready')).rejects.toThrow(
      'Cannot move queued to ready'
    )
    await expect(ownerA.retryArchive(job.id)).rejects.toThrow(
      'Only archive_failed jobs can retry archiving'
    )
  })

  it('rejects empty prompts and unknown models without writing a record', async () => {
    const store = createMemoryStore()
    const client = createMockClient({
      owner: 'demo-a',
      store,
      now: () => 1000,
      id: () => 'job-1',
    })

    await expect(
      client.submit({
        kind: 'image',
        clientRequestId: 'empty',
        modelId: 'demo-image',
        prompt: '   ',
      })
    ).rejects.toThrow('Prompt is required')
    await expect(
      client.submit({
        kind: 'video',
        clientRequestId: 'unknown',
        modelId: 'not-in-demo-catalog',
        prompt: 'A blue shape',
      })
    ).rejects.toThrow('Unsupported video model')
    expect(await store.list('demo-a')).toEqual([])
  })

  it.each(DEMO_IMAGE_MODELS)(
    'keeps the selected image model $label on its job',
    async ({ id: modelId }) => {
      const store = createMemoryStore()
      const client = createMockClient({
        owner: 'demo-a',
        store,
        now: () => 1000,
        id: () => 'job-1',
      })
      const job = await client.submit({
        kind: 'image',
        clientRequestId: 'click-1',
        modelId,
        prompt: 'A blue shape',
      })
      expect(job.modelId).toBe(modelId)
      const saved = (await store.list('demo-a')).filter(
        (record) => record.kind === 'image'
      )
      expect(saved).toHaveLength(1)
      const savedJob = saved[0]
      if (!savedJob || savedJob.kind !== 'image') {
        throw new Error('Expected an image job')
      }
      expect(savedJob.modelId).toBe(modelId)
    }
  )

  it.each(DEMO_VIDEO_MODELS)(
    'keeps the selected video model $label on its job',
    async ({ id: modelId }) => {
      const store = createMemoryStore()
      const client = createMockClient({
        owner: 'demo-a',
        store,
        now: () => 1000,
        id: () => 'job-1',
      })
      const job = await client.submit({
        kind: 'video',
        clientRequestId: 'click-1',
        modelId,
        prompt: 'A blue shape',
      })
      expect(job.modelId).toBe(modelId)
      const saved = (await store.list('demo-a')).filter(
        (record) => record.kind === 'video'
      )
      expect(saved).toHaveLength(1)
      const savedJob = saved[0]
      if (!savedJob || savedJob.kind !== 'video') {
        throw new Error('Expected a video job')
      }
      expect(savedJob.modelId).toBe(modelId)
    }
  )
})
