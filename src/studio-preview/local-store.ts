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
  FileDetails,
  LocalFileInfo,
  LocalRecord,
  LocalStore,
} from './contracts'

const DATABASE_NAME = 'linoroute-studio-preview-v1'
const DATABASE_VERSION = 1
const RECORDS_STORE = 'records'
const BLOBS_STORE = 'blobs'

interface StoredBlob {
  owner: DemoOwner
  id: string
  blob: Blob
  details?: FileDetails
}

function cloneRecord(record: LocalRecord): LocalRecord {
  return structuredClone(record)
}

function cloneBlob(blob: Blob): Blob {
  return blob.slice(0, blob.size, blob.type)
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed')),
      { once: true }
    )
  })
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () =>
        reject(transaction.error ?? new Error('Storage transaction aborted')),
      { once: true }
    )
    transaction.addEventListener(
      'error',
      () =>
        reject(transaction.error ?? new Error('Storage transaction failed')),
      { once: true }
    )
  })
}

async function removeOwnerEntries(
  database: IDBDatabase,
  storeName: string,
  owner: DemoOwner
): Promise<void> {
  const transaction = database.transaction(storeName, 'readwrite')
  const completion = transactionCompletion(transaction)
  const request = transaction.objectStore(storeName).openCursor()

  request.addEventListener('success', () => {
    const cursor = request.result
    if (!cursor) return
    const value = cursor.value as { owner?: DemoOwner }
    if (value.owner === owner) cursor.delete()
    cursor.continue()
  })
  request.addEventListener('error', () => transaction.abort(), { once: true })
  await completion
}

function createIndexedDbStore(database: IDBDatabase): LocalStore {
  return {
    async put(record) {
      const transaction = database.transaction(RECORDS_STORE, 'readwrite')
      const completion = transactionCompletion(transaction)
      transaction.objectStore(RECORDS_STORE).put(cloneRecord(record))
      await completion
    },
    async list(owner) {
      const transaction = database.transaction(RECORDS_STORE, 'readonly')
      const completion = transactionCompletion(transaction)
      const request = transaction.objectStore(RECORDS_STORE).getAll()
      const [records] = await Promise.all([requestResult(request), completion])
      return (records as LocalRecord[])
        .filter((record) => record.owner === owner)
        .map(cloneRecord)
    },
    async remove(owner, id) {
      const transaction = database.transaction(RECORDS_STORE, 'readwrite')
      const completion = transactionCompletion(transaction)
      transaction.objectStore(RECORDS_STORE).delete([owner, id])
      await completion
    },
    async putBlob(owner, assetId, blob, details) {
      const transaction = database.transaction(BLOBS_STORE, 'readwrite')
      const completion = transactionCompletion(transaction)
      const stored: StoredBlob = {
        owner,
        id: assetId,
        blob: cloneBlob(blob),
        details,
      }
      transaction.objectStore(BLOBS_STORE).put(stored)
      await completion
    },
    async listBlobs(owner) {
      const transaction = database.transaction(BLOBS_STORE, 'readonly')
      const completion = transactionCompletion(transaction)
      const files: LocalFileInfo[] = []
      // Cursor releases each Blob before the next entry; no full-file array in UI state.
      const request = transaction
        .objectStore(BLOBS_STORE)
        .openCursor(IDBKeyRange.bound([owner, ''], [owner, []]))
      request.addEventListener('success', () => {
        const cursor = request.result
        if (!cursor) return
        const stored = cursor.value as StoredBlob
        files.push({
          id: stored.id,
          owner,
          name: stored.details?.name ?? stored.id,
          savedAt: stored.details?.savedAt ?? 0,
          type: stored.blob.type,
          size: stored.blob.size,
        })
        cursor.continue()
      })
      await completion
      return files
    },
    async getBlob(owner, assetId) {
      const transaction = database.transaction(BLOBS_STORE, 'readonly')
      const completion = transactionCompletion(transaction)
      const request = transaction
        .objectStore(BLOBS_STORE)
        .get([owner, assetId]) as IDBRequest<StoredBlob | undefined>
      // Observe both failures even when the read request aborts first.
      const [stored] = await Promise.all([requestResult(request), completion])
      return stored ? cloneBlob(stored.blob) : undefined
    },
    async removeBlob(owner, assetId) {
      const transaction = database.transaction(BLOBS_STORE, 'readwrite')
      const completion = transactionCompletion(transaction)
      transaction.objectStore(BLOBS_STORE).delete([owner, assetId])
      await completion
    },
    async clear(owner) {
      await removeOwnerEntries(database, RECORDS_STORE, owner)
      await removeOwnerEntries(database, BLOBS_STORE, owner)
    },
  }
}

export async function openLocalStore(
  factory: IDBFactory = indexedDB
): Promise<LocalStore> {
  const request = factory.open(DATABASE_NAME, DATABASE_VERSION)

  return new Promise((resolve, reject) => {
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        database.createObjectStore(RECORDS_STORE, {
          keyPath: ['owner', 'id'],
        })
      }
      if (!database.objectStoreNames.contains(BLOBS_STORE)) {
        database.createObjectStore(BLOBS_STORE, {
          keyPath: ['owner', 'id'],
        })
      }
    })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Unable to open local storage')),
      { once: true }
    )
    request.addEventListener(
      'blocked',
      () => reject(new Error('Local storage upgrade is blocked')),
      { once: true }
    )
    request.addEventListener('success', () => {
      const database = request.result
      database.addEventListener('versionchange', () => database.close())
      resolve(createIndexedDbStore(database))
    })
  })
}
