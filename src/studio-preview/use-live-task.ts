/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useRef, useState } from 'react'

import type { LocalStore } from './contracts'
import { queryLive, safeMediaUrl, submitLive } from './live-client'
import {
  LiveError,
  RETRYABLE_QUERY_ISSUES,
  type LiveAsset,
  type LiveDraft,
  type LiveJob,
  type LiveModel,
  type LiveResult,
  type LiveSession,
} from './live-types'
import {
  copyStudioFile,
  uploadStudioFile,
  type StudioStoredObject,
} from './oss-storage'

const archiveMediaTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])

function archiveMime(
  kind: LiveJob['kind'],
  declared: string | undefined,
  url?: string
) {
  const contentType = declared?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (archiveMediaTypes.has(contentType)) return contentType
  try {
    const pathname = new URL(url ?? '').pathname.toLowerCase()
    if (pathname.endsWith('.webm')) return 'video/webm'
    if (pathname.endsWith('.mov') || pathname.endsWith('.qt')) {
      return 'video/quicktime'
    }
    if (pathname.endsWith('.mp4')) return 'video/mp4'
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'image/jpeg'
    }
    if (pathname.endsWith('.webp')) return 'image/webp'
  } catch {
    // Fall through to the media kind when the upstream URL has no extension.
  }
  return kind === 'video' ? 'video/mp4' : 'image/png'
}

export function useLiveTask(session: LiveSession | null, store: LocalStore) {
  const [job, setJob] = useState<LiveJob | null>(null)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState('')
  const [issueDetail, setIssueDetail] = useState('')
  const [queryFailures, setQueryFailures] = useState(0)
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
        for (const [index, asset] of assets.entries()) {
          let blob: Blob
          if (asset.base64) {
            const bytes = Uint8Array.from(atob(asset.base64), (c) =>
              c.charCodeAt(0)
            )
            blob = new Blob([bytes], {
              type: archiveMime(current.kind, asset.mime, asset.url),
            })
          } else {
            const source = safeMediaUrl(asset.url)
            if (!source) throw new LiveError('archive_failed')
            let stored: StudioStoredObject
            try {
              stored = await copyStudioFile(
                session.key,
                source,
                archiveMime(current.kind, asset.mime, source),
                `${current.id}-${index}`,
                abort.current?.signal ?? new AbortController().signal
              )
            } catch {
              // Keep a browser-side fallback for providers that are reachable
              // from the browser but not from the signer service.
              const downloaded = await fetch(source, {
                credentials: 'omit',
                cache: 'no-store',
                // Video CDNs commonly redirect a short-lived URL once before
                // serving the bytes. Follow that redirect, but keep the final
                // media URL out of the DOM unless it is still HTTPS.
                redirect: 'follow',
                signal: abort.current?.signal,
              })
              if (!downloaded.ok) throw new LiveError('archive_failed')
              const finalUrl = downloaded.url || source
              if (!safeMediaUrl(finalUrl)) {
                throw new LiveError('archive_failed')
              }
              const payload = await downloaded.blob()
              blob = new Blob([payload], {
                // Some video providers return application/octet-stream (or no
                // type at all), while OSS tickets require an allowed media MIME.
                type: archiveMime(
                  current.kind,
                  downloaded.headers.get('Content-Type') ?? payload.type,
                  finalUrl
                ),
              })
              stored = await uploadStudioFile(
                session.key,
                blob,
                'result',
                abort.current?.signal ?? new AbortController().signal
              )
            }
            archived.push({
              id: asset.id,
              url: stored.url,
              objectKey: stored.objectKey,
              expiresAt: stored.expiresAt,
              mime: archiveMime(current.kind, asset.mime, source),
            })
            continue
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
    setIssueDetail('')
    setQueryFailures(0)
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
          const referenceUrls = referenceAssets.map((asset) => asset.url)
          prepared = {
            ...draft,
            images: [],
            referenceUrl: referenceUrls[0],
            referenceUrls,
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
        issueDetail: error instanceof LiveError ? error.detail : undefined,
      })
      if (mounted.current) {
        setIssue(code)
        setIssueDetail(error instanceof LiveError ? (error.detail ?? '') : '')
      }
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
    setIssueDetail('')
    // Only a read-only status lookup times out/retries. Never replay a paid POST.
    const timeout = window.setTimeout(() => control.abort(), 30_000)
    try {
      const result = await queryLive(
        session.key,
        model,
        value.taskId,
        control.signal,
        fetch,
        value.referenceMode
      )
      window.clearTimeout(timeout)
      if (mounted.current) setQueryFailures(0)
      await accept(value, result)
    } catch (error) {
      const code = error instanceof LiveError ? error.code : 'query_failed'
      const detail = error instanceof LiveError ? (error.detail ?? '') : ''
      const terminal = !RETRYABLE_QUERY_ISSUES.includes(code)
      if (terminal && (value.stage === 'queued' || value.stage === 'running')) {
        // A definitive query rejection (for example a model/path mismatch)
        // must not leave the workspace permanently locked in the pending
        // state. Mark this paid attempt failed, then let the user edit and
        // submit a new request without refreshing the page.
        await persist({
          ...value,
          stage: 'failed',
          issue: code,
          issueDetail: detail || undefined,
        })
      }
      if (mounted.current) {
        setIssue(code)
        setIssueDetail(detail)
        setQueryFailures((count) => Math.min(count + 1, 3))
      }
    } finally {
      window.clearTimeout(timeout)
      abort.current = null
      if (mounted.current) setBusy(false)
    }
  }
  const select = (value: LiveJob) => {
    if (!session || abort.current || value.owner !== session.owner) return
    setJob(value)
    setIssue(value.issue ?? '')
    setIssueDetail(value.issueDetail ?? '')
    setQueryFailures(0)
  }
  const resumeRef = useRef(resume)
  useEffect(() => {
    resumeRef.current = resume
  })
  useEffect(() => {
    if (
      !session ||
      !job?.taskId ||
      job.owner !== session.owner ||
      !['queued', 'running'].includes(job.stage) ||
      busy ||
      (issue && !RETRYABLE_QUERY_ISSUES.includes(issue))
    ) {
      return
    }
    const check = () => {
      if (!document.hidden && navigator.onLine !== false) {
        void resumeRef.current(job)
      }
    }
    // No attempt limit: long-running videos continue until the upstream finishes.
    // Back off temporary failures, and catch up when the browser returns online.
    const delay = Math.min(30_000, 4000 * 2 ** queryFailures)
    const timer = window.setTimeout(check, delay)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [job, busy, issue, queryFailures, session])
  return { job, busy, issue, issueDetail, submit, resume, select }
}
