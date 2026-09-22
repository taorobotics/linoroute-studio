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

import type { LocalStore } from './contracts'
import { openLocalStore } from './local-store'
import { createMemoryStore } from './memory-store'

interface ResilientStoreOptions {
  factory?: IDBFactory
  onFallback?: (error: Error) => void
  onReady?: () => void
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('Browser storage failed')
}

export function createResilientLocalStore(
  options: ResilientStoreOptions = {}
): LocalStore {
  const memoryStore = createMemoryStore()
  let fallbackActive = false
  let backendPromise: Promise<LocalStore>

  function activateFallback(reason: unknown): LocalStore {
    if (!fallbackActive) {
      fallbackActive = true
      options.onFallback?.(toError(reason))
    }
    backendPromise = Promise.resolve(memoryStore)
    return memoryStore
  }

  const factory = options.factory ?? globalThis.indexedDB
  if (!factory) {
    backendPromise = Promise.resolve(
      activateFallback(new Error('IndexedDB is unavailable'))
    )
  } else {
    backendPromise = openLocalStore(factory).then(
      (store) => {
        options.onReady?.()
        return store
      },
      (error: unknown) => activateFallback(error)
    )
  }

  async function run<T>(
    operation: (store: LocalStore) => Promise<T>
  ): Promise<T> {
    const backend = await backendPromise
    // A runtime failure must not hide previously persisted files in an empty
    // memory store, or acknowledge an unsuccessful write as durable.
    return operation(backend)
  }

  return {
    put: (record) => run((store) => store.put(record)),
    list: (owner) => run((store) => store.list(owner)),
    remove: (owner, id) => run((store) => store.remove(owner, id)),
    putBlob: (owner, assetId, blob, details) =>
      run((store) => {
        if (fallbackActive) {
          throw new DOMException(
            'Browser file storage is unavailable',
            'StorageUnavailableError'
          )
        }
        return store.putBlob(owner, assetId, blob, details)
      }),
    listBlobs: (owner) => run((store) => store.listBlobs(owner)),
    getBlob: (owner, assetId) => run((store) => store.getBlob(owner, assetId)),
    removeBlob: (owner, assetId) =>
      run((store) => store.removeBlob(owner, assetId)),
    clear: (owner) => run((store) => store.clear(owner)),
  }
}
