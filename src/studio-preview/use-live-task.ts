/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useRef, useState } from 'react'

import type { LocalStore } from './contracts'
import { queryLive, safeMediaUrl, submitLive } from './live-client'
import {
  LiveError,
  type LiveAsset,
  type LiveDraft,
  type LiveJob,
  type LiveModel,
  type LiveResult,
  type LiveSession,
} from './live-types'
import { uploadStudioFile } from './oss-storage'

export function useLiveTask(session: LiveSession | null, store: LocalStore) {
  const [job, setJob] = useState<LiveJob | null>(null)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState('')
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abort.current?.abort()
    }
  }, [])
  const persist = async (value: LiveJob) => {
    if (mounted.current) setJob(value)
    try {
      await store.put(value)
      return true
    } catch {
      if (mounted.current) setIssue('storage_failed')
      return false
    }
  }
  const accept = async (current: LiveJob, result: LiveResult) => {
    if (!session) return
    let assets: LiveAsset[] = result.assets.map((asset, index) => ({
      ...asset,
      id: `${current.id}-${index}`,
    }))
    let archiveIssue = ''
    if (result.stage === 'ready' && assets.length) {
      await persist({ ...current, ...result, stage: 'archiving', assets })
      const archived: LiveAsset[] = []
      try {
        for (const asset of assets) {
          let blob: Blob
          if (asset.base64) {
            const bytes = Uint8Array.from(atob(asset.base64), (c) =>
              c.charCodeAt(0)
            )
            blob = new Blob([bytes], { type: asset.mime ?? 'image/png' })
          } else {
            const source = safeMediaUrl(asset.url)
            if (!source) throw new LiveError('archive_failed')
            const downloaded = await fetch(source, {
              credentials: 'omit',
              cache: 'no-store',
              redirect: 'error',
              signal: abort.current?.signal,
            })
            if (!downloaded.ok) throw new LiveError('archive_failed')
            const contentType =
              downloaded.headers.get('Content-Type')?.split(';')[0] ?? ''
            blob = await downloaded.blob()
            if (contentType && blob.type !== contentType) {
              blob = new Blob([blob], { type: contentType })
            }
          }
          const stored = await uploadStudioFile(
            session.key,
            blob,
            'result',
            abort.current?.signal ?? new AbortController().signal
          )
          archived.push({
            id: asset.id,
            url: stored.url,
            objectKey: stored.objectKey,
            expiresAt: stored.expiresAt,
            mime: blob.type,
          })
        }
        assets = archived
      } catch {
        archiveIssue = 'archive_failed'
        if (mounted.current) setIssue(archiveIssue)
        const fallbacks: LiveAsset[] = []
        for (const asset of assets) {
          if (!asset.base64) {
            fallbacks.push(asset)
            continue
          }
          const bytes = Uint8Array.from(atob(asset.base64), (c) =>
            c.charCodeAt(0)
          )
          const blobId = asset.id ?? current.id
          try {
            await store.putBlob(
              session.owner,
              blobId,
              new Blob([bytes], { type: asset.mime }),
              { name: blobId, savedAt: Date.now() }
            )
            fallbacks.push({ id: asset.id, blobId, mime: asset.mime })
          } catch {
            fallbacks.push(asset)
          }
        }
        assets = fallbacks
      }
    }
    const next: LiveJob = {
      ...current,
      ...result,
      assets,
      taskId: result.taskId ?? current.taskId,
      issue: archiveIssue || undefined,
    }
    if (result.stage === 'ready') {
      next.readyAt = Date.now()
      const expirations = assets.flatMap((asset) =>
        asset.expiresAt ? [asset.expiresAt] : []
      )
      if (expirations.length) next.expiresAt = Math.min(...expirations)
    }
    await persist(next)
  }
  const submit = async (model: LiveModel, draft: LiveDraft) => {
    if (!session || abort.current) return
    if (!session.models.some((entry) => entry.id === model.id)) {
      setIssue('forbidden')
      return
    }
    const control = new AbortController()
    abort.current = control
    setBusy(true)
    setIssue('')
    const id = crypto.randomUUID()
    let current: LiveJob = {
      live: true,
      id,
      clientRequestId: id,
      owner: session.owner,
      kind: model.kind,
      modelId: model.id,
      prompt: draft.prompt,
      previewLayout: draft.ratio,
      duration: draft.duration,
      createdAt: Date.now(),
      stage: 'submission_unknown',
      assets: [],
      referenceMode: Boolean(draft.referenceUrl || draft.images?.length),
      generationMode:
        draft.mode ??
        (draft.referenceUrl || draft.images?.length ? 'image' : 'text'),
      referenceCount: draft.images?.length ?? 0,
      requestedSize: draft.size,
      requestedQuality: draft.quality,
      requestedFormat: draft.format,
      requestedBackground: draft.background,
      requestedModeration: draft.moderation,
      requestedGenerateAudio: draft.generateAudio,
      maskUsed: Boolean(draft.mask),
    }
    try {
      // Save the attempt before the only paid POST; an uncertain attempt is never auto-resubmitted.
      if (!(await persist(current))) return
      let prepared = draft
      if (
        draft.images?.length &&
        (draft.mode === 'image' || model.kind === 'video')
      ) {
        const referenceAssets = []
        for (const image of draft.images) {
          referenceAssets.push(
            await uploadStudioFile(
              session.key,
              image,
              'reference',
              control.signal
            )
          )
        }
        let maskAsset
        if (draft.mask) {
          maskAsset = await uploadStudioFile(
            session.key,
            draft.mask,
            'reference',
            control.signal
          )
        }
        current = {
          ...current,
          referenceAssets,
          maskAsset,
          referenceMode: true,
          expiresAt: Math.min(
            ...referenceAssets.map((asset) => asset.expiresAt),
            ...(maskAsset ? [maskAsset.expiresAt] : [])
          ),
        }
        // Record the cloud references before the paid request. If this save fails,
        // generation stops so a user never pays for an untraceable task.
        if (!(await persist(current))) return
        if (model.kind === 'video') {
          prepared = {
            ...draft,
            images: [],
            referenceUrl: referenceAssets[0].url,
          }
        }
      }
      const result = await submitLive(
        session.key,
        model,
        prepared,
        control.signal
      )
      await accept(current, result)
    } catch (error) {
      const code =
        error instanceof LiveError ? error.code : 'submission_unknown'
      await persist({
        ...current,
        stage: code === 'submission_unknown' ? 'submission_unknown' : 'failed',
        issue: code,
      })
      if (mounted.current) setIssue(code)
    } finally {
      abort.current = null
      if (mounted.current) setBusy(false)
    }
  }
  const resume = async (value: LiveJob) => {
    if (
      !session ||
      abort.current ||
      !value.taskId ||
      value.owner !== session.owner
    ) {
      return
    }
    const model = session.models.find((m) => m.id === value.modelId)
    if (!model) {
      setIssue('no_models')
      return
    }
    const control = new AbortController()
    abort.current = control
    setBusy(true)
    setIssue('')
    try {
      await accept(
        value,
        await queryLive(
          session.key,
          model,
          value.taskId,
          control.signal,
          fetch,
          value.referenceMode
        )
      )
    } catch {
      if (mounted.current) setIssue('query_failed')
    } finally {
      abort.current = null
      if (mounted.current) setBusy(false)
    }
  }
  const select = (value: LiveJob) => {
    if (!session || abort.current || value.owner !== session.owner) return
    setJob(value)
    setIssue(value.issue ?? '')
  }
  return { job, busy, issue, submit, resume, select }
}
