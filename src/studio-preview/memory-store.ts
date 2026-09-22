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
  DemoOwner,
  LocalFileInfo,
  LocalRecord,
  LocalStore,
} from './contracts'

function recordKey(owner: DemoOwner, id: string): string {
  return `${owner}:${id}`
}

function cloneRecord(record: LocalRecord): LocalRecord {
  return structuredClone(record)
}

function cloneBlob(blob: Blob): Blob {
  return blob.slice(0, blob.size, blob.type)
}

export function createMemoryStore(): LocalStore {
  const records = new Map<string, LocalRecord>()
  const blobs = new Map<string, Blob>()
  const files = new Map<string, LocalFileInfo>()

  return {
    async put(record) {
      records.set(recordKey(record.owner, record.id), cloneRecord(record))
    },
    async list(owner) {
      return [...records.values()]
        .filter((record) => record.owner === owner)
        .map(cloneRecord)
    },
    async remove(owner, id) {
      records.delete(recordKey(owner, id))
    },
    async putBlob(owner, assetId, blob, details) {
      blobs.set(recordKey(owner, assetId), cloneBlob(blob))
      files.set(recordKey(owner, assetId), {
        id: assetId,
        owner,
        name: details?.name ?? assetId,
        savedAt: details?.savedAt ?? 0,
        type: blob.type,
        size: blob.size,
      })
    },
    async listBlobs(owner) {
      return [...files.values()]
        .filter((file) => file.owner === owner)
        .map((file) => ({ ...file }))
    },
    async getBlob(owner, assetId) {
      const blob = blobs.get(recordKey(owner, assetId))
      return blob ? cloneBlob(blob) : undefined
    },
    async removeBlob(owner, assetId) {
      blobs.delete(recordKey(owner, assetId))
      files.delete(recordKey(owner, assetId))
    },
    async clear(owner) {
      for (const key of records.keys()) {
        if (key.startsWith(`${owner}:`)) records.delete(key)
      }
      for (const key of blobs.keys()) {
        if (key.startsWith(`${owner}:`)) {
          blobs.delete(key)
          files.delete(key)
        }
      }
    },
  }
}
