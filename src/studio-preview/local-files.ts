/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import type { MediaKind } from './contracts'

export const RESULT_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}

export function validResultFile(file: Blob, kind: MediaKind): boolean {
  const limit = (kind === 'image' ? 20 : 100) * 1024 * 1024
  return (
    file.size > 0 &&
    file.size <= limit &&
    RESULT_TYPES[kind].includes(file.type)
  )
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`
}

export function downloadName(name: string): string {
  // Keep a portable basename. Imported names are never HTML or filesystem paths.
  const base = name.split(/[\\/]/).pop() ?? ''
  const printable = [...base]
    .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
    .join('')
  return (
    printable
      .replaceAll(/[<>:"|?*]/g, '_')
      .replaceAll(/^[. ]+|[. ]+$/g, '')
      .slice(0, 180) || 'studio-test-file'
  )
}

export function fileErrorMessage(error: unknown): string {
  if (error instanceof Error || error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return 'Browser storage is full. Download the file or remove unneeded local files, then retry.'
    }
    if (
      [
        'StorageUnavailableError',
        'SecurityError',
        'InvalidStateError',
      ].includes(error.name)
    ) {
      return 'Browser file storage is unavailable. Download this file now; it has not been saved.'
    }
  }
  return 'The file was not saved. Your selected file is still here; download it or retry.'
}
