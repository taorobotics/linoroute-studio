/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { LiveError } from './live-types'

export type StudioStoragePurpose = 'reference' | 'result'

export interface StudioStoredObject {
  url: string
  objectKey: string
  expiresAt: number
}

interface UploadTicket {
  uploadUrl: string
  readUrl: string
  objectKey: string
  expiresAt: number
}

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])
const maxUploadSize = 512 * 1024 * 1024

function safeOssUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string') return
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname.endsWith('.aliyuncs.com') ||
      !url.hostname.includes('.oss-')
    ) {
      return
    }
    return url
  } catch {
    return
  }
}

function validTicket(value: unknown): value is UploadTicket {
  if (!value || typeof value !== 'object') return false
  const ticket = value as Partial<UploadTicket>
  const upload = safeOssUrl(ticket.uploadUrl)
  const read = safeOssUrl(ticket.readUrl)
  return Boolean(
    upload &&
    read &&
    upload.hostname === read.hostname &&
    typeof ticket.objectKey === 'string' &&
    ticket.objectKey.startsWith('studio/') &&
    upload.pathname === `/${ticket.objectKey}` &&
    read.pathname === `/${ticket.objectKey}` &&
    typeof ticket.expiresAt === 'number' &&
    Number.isSafeInteger(ticket.expiresAt) &&
    ticket.expiresAt > 0
  )
}

export async function uploadStudioFile(
  key: string,
  file: File | Blob,
  purpose: StudioStoragePurpose,
  signal: AbortSignal,
  transport: typeof fetch = fetch
): Promise<StudioStoredObject> {
  if (
    !key ||
    !file.size ||
    file.size > maxUploadSize ||
    !allowedTypes.has(file.type)
  ) {
    throw new LiveError('invalid_parameters')
  }
  const fileName = file instanceof File ? file.name : `result-${Date.now()}`
  let response: Response
  try {
    response = await transport('/studio-storage/v1/uploads', {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: file.type,
        fileName,
        purpose,
        size: file.size,
      }),
    })
  } catch {
    throw new LiveError('storage_failed')
  }
  if (!response.ok) throw new LiveError('storage_failed')
  let ticket: unknown
  try {
    ticket = await response.json()
  } catch {
    throw new LiveError('storage_failed')
  }
  if (!validTicket(ticket)) throw new LiveError('storage_failed')
  try {
    const uploaded = await transport(ticket.uploadUrl, {
      method: 'PUT',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal,
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!uploaded.ok) throw new Error('OSS upload rejected')
  } catch {
    throw new LiveError('storage_failed')
  }
  return {
    url: ticket.readUrl,
    objectKey: ticket.objectKey,
    expiresAt: ticket.expiresAt,
  }
}
