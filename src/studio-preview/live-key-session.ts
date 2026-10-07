/* Copyright (C) 2023-2026 QuantumNous
 * SPDX-License-Identifier: AGPL-3.0-or-later */

const LIVE_KEY_STORAGE_KEY = 'linoroute-studio:live-api-key:v1'

function getStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return globalThis[kind] ?? null
  } catch {
    return null
  }
}

function isValidKey(rawKey: string | null | undefined): rawKey is string {
  const key = rawKey?.trim()
  return Boolean(key && !/\s/.test(key) && key.length <= 512)
}

export function readRememberedLiveKey(): string | null {
  try {
    const persistentStorage = getStorage('localStorage')
    const persistedKey = persistentStorage?.getItem(LIVE_KEY_STORAGE_KEY)
    if (isValidKey(persistedKey)) return persistedKey.trim()

    // Migrate keys saved by older builds, which only lasted for the tab.
    const legacyStorage = getStorage('sessionStorage')
    const legacyKey = legacyStorage?.getItem(LIVE_KEY_STORAGE_KEY)
    if (isValidKey(legacyKey)) {
      const key = legacyKey.trim()
      persistentStorage?.setItem(LIVE_KEY_STORAGE_KEY, key)
      legacyStorage?.removeItem(LIVE_KEY_STORAGE_KEY)
      return key
    }

    persistentStorage?.removeItem(LIVE_KEY_STORAGE_KEY)
    legacyStorage?.removeItem(LIVE_KEY_STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

export function rememberLiveKey(rawKey: string): void {
  try {
    const key = rawKey.trim()
    if (!key || /\s/.test(key) || key.length > 512) return
    getStorage('localStorage')?.setItem(LIVE_KEY_STORAGE_KEY, key)
    getStorage('sessionStorage')?.removeItem(LIVE_KEY_STORAGE_KEY)
  } catch {
    // The live session remains usable in memory when browser storage is blocked.
  }
}

export function forgetRememberedLiveKey(): void {
  try {
    getStorage('localStorage')?.removeItem(LIVE_KEY_STORAGE_KEY)
    getStorage('sessionStorage')?.removeItem(LIVE_KEY_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}
