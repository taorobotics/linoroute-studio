/* Copyright (C) 2023-2026 QuantumNous
 * SPDX-License-Identifier: AGPL-3.0-or-later */

const LIVE_KEY_STORAGE_KEY = 'linoroute-studio:live-api-key:v1'

function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

export function readRememberedLiveKey(): string | null {
  try {
    const storage = getSessionStorage()
    const key = storage?.getItem(LIVE_KEY_STORAGE_KEY)?.trim()
    if (!key || /\s/.test(key) || key.length > 512) {
      storage?.removeItem(LIVE_KEY_STORAGE_KEY)
      return null
    }
    return key
  } catch {
    return null
  }
}

export function rememberLiveKey(rawKey: string): void {
  try {
    const key = rawKey.trim()
    if (!key || /\s/.test(key) || key.length > 512) return
    getSessionStorage()?.setItem(LIVE_KEY_STORAGE_KEY, key)
  } catch {
    // The live session remains usable in memory when browser storage is blocked.
  }
}

export function forgetRememberedLiveKey(): void {
  try {
    getSessionStorage()?.removeItem(LIVE_KEY_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}
