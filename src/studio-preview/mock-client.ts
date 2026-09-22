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

import type {
  JobStage,
  LocalRecord,
  MediaJob,
  MediaRequest,
  MockClient,
  MockOptions,
} from './contracts'
import { DEMO_IMAGE_MODELS, DEMO_VIDEO_MODELS } from './fixtures'

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000

const nextStages: Record<JobStage, JobStage[]> = {
  queued: ['running', 'failed', 'submission_unknown', 'cancelled'],
  running: ['archiving', 'failed', 'cancelled'],
  archiving: ['ready', 'archive_failed'],
  archive_failed: ['archiving'],
  submission_unknown: ['queued', 'failed'],
  ready: [],
  failed: [],
  cancelled: [],
}

const imageModelIds = new Set<string>(
  DEMO_IMAGE_MODELS.map((model) => model.id)
)
const videoModelIds = new Set<string>(
  DEMO_VIDEO_MODELS.map((model) => model.id)
)

function isMediaJob(record: LocalRecord): record is MediaJob {
  return record.kind === 'image' || record.kind === 'video'
}

function validateRequest(input: MediaRequest): void {
  if (!input.prompt.trim()) throw new Error('Prompt is required')
  if (!input.clientRequestId.trim()) {
    throw new Error('Client request ID is required')
  }

  const supported =
    input.kind === 'image'
      ? imageModelIds.has(input.modelId)
      : videoModelIds.has(input.modelId)
  if (!supported) throw new Error(`Unsupported ${input.kind} model`)
}

export function createMockClient(options: MockOptions): MockClient {
  const inFlight = new Map<string, Promise<MediaJob>>()

  async function findJob(id: string): Promise<MediaJob | undefined> {
    const records = await options.store.list(options.owner)
    return records.find(
      (record): record is MediaJob => isMediaJob(record) && record.id === id
    )
  }

  async function advance(id: string, next: JobStage): Promise<MediaJob> {
    const current = await findJob(id)
    if (!current) throw new Error('Job not found for this demo identity')
    if (!nextStages[current.stage].includes(next)) {
      throw new Error(`Cannot move ${current.stage} to ${next}`)
    }

    const updated: MediaJob = { ...current, stage: next }
    if (next === 'ready') {
      const readyAt = options.now()
      updated.readyAt = readyAt
      updated.expiresAt = readyAt + RETENTION_MS
      updated.assetId = `${updated.id}-asset`
    }
    await options.store.put(updated)
    return structuredClone(updated)
  }

  return {
    async submit(input) {
      validateRequest(input)
      const requestKey = `${input.kind}:${input.clientRequestId}`
      const pending = inFlight.get(requestKey)
      if (pending) return pending

      const submission = (async () => {
        const records = await options.store.list(options.owner)
        const existing = records.find(
          (record): record is MediaJob =>
            isMediaJob(record) &&
            record.kind === input.kind &&
            record.clientRequestId === input.clientRequestId
        )
        if (existing) return structuredClone(existing)

        const job: MediaJob = {
          kind: input.kind,
          id: options.id(),
          owner: options.owner,
          clientRequestId: input.clientRequestId,
          modelId: input.modelId,
          prompt: input.prompt.trim(),
          previewLayout: input.previewLayout,
          stage: 'queued',
          createdAt: options.now(),
        }
        await options.store.put(job)
        return structuredClone(job)
      })()

      inFlight.set(requestKey, submission)
      try {
        return await submission
      } finally {
        if (inFlight.get(requestKey) === submission) inFlight.delete(requestKey)
      }
    },
    advance,
    async retryArchive(id) {
      const job = await findJob(id)
      if (!job) throw new Error('Job not found for this demo identity')
      if (job.stage !== 'archive_failed') {
        throw new Error('Only archive_failed jobs can retry archiving')
      }
      return advance(id, 'archiving')
    },
  }
}
