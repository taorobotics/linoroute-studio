/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  ArrowUpRight,
  Clock3,
  ImageIcon,
  Images,
  Play,
  Video,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { JobStage, LocalStore, MediaKind } from '../contracts'
import { safeMediaUrl } from '../live-client'
import { LIVE_MODELS } from '../live-models'
import type { LiveJob, LiveSession } from '../live-types'

import '../history.css'

const STAGE_LABELS: Record<JobStage, string> = {
  ready: 'Generation completed',
  failed: 'Generation failed',
  running: 'Generating',
  queued: 'Queued',
  archiving: 'Saving result',
  archive_failed: 'Archive failed',
  submission_unknown: 'Submission not confirmed',
  cancelled: 'Cancelled',
}

function WorkPreview(props: { job: LiveJob; store: LocalStore }) {
  const { t } = useTranslation()
  const { job, store } = props
  const asset = job.assets[0]
  const [blobUrl, setBlobUrl] = useState('')
  const [failed, setFailed] = useState(false)
  const [openedAt] = useState(() => Date.now())
  const hasResult = ['ready', 'archiving', 'archive_failed'].includes(job.stage)
  const expiresAt = asset?.expiresAt ?? job.expiresAt
  const expired =
    !asset?.blobId &&
    !asset?.base64 &&
    expiresAt !== undefined &&
    expiresAt <= openedAt
  useEffect(() => {
    if (!hasResult || !asset?.blobId) return
    let mounted = true
    let owned = ''
    void store
      .getBlob(job.owner, asset.blobId)
      .then((blob) => {
        if (!mounted) return
        if (!blob) {
          setFailed(true)
          return
        }
        owned = URL.createObjectURL(blob)
        setBlobUrl(owned)
      })
      .catch(() => {
        if (mounted) setFailed(true)
      })
    return () => {
      mounted = false
      if (owned) URL.revokeObjectURL(owned)
    }
  }, [store, job.owner, asset?.blobId, hasResult])

  let src = safeMediaUrl(asset?.url) ?? ''
  if (asset?.blobId) src = blobUrl
  else if (
    asset?.base64 &&
    ['image/png', 'image/jpeg', 'image/webp'].includes(asset.mime ?? '')
  ) {
    src = `data:${asset.mime};base64,${asset.base64}`
  }
  const showMedia = hasResult && !!src && !expired && !failed
  let placeholder = STAGE_LABELS[job.stage]
  if (hasResult) {
    placeholder = expired ? 'Preview expired' : 'Preview unavailable'
  }
  if (hasResult && asset?.blobId && !blobUrl && !failed) {
    placeholder = 'Loading preview…'
  }
  const Icon = job.kind === 'image' ? ImageIcon : Video
  return (
    <span className='studio-history-cover'>
      {showMedia && job.kind === 'image' && (
        <img
          src={src}
          alt={t('Work image preview')}
          loading='lazy'
          decoding='async'
          referrerPolicy='no-referrer'
          onError={() => setFailed(true)}
        />
      )}
      {showMedia && job.kind === 'video' && (
        <>
          <video
            src={src}
            aria-label={t('Work video preview')}
            muted
            playsInline
            preload='metadata'
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              if (Number.isFinite(video.duration) && video.duration > 0) {
                video.currentTime = Math.min(0.1, video.duration / 2)
              }
            }}
            onError={() => setFailed(true)}
          />
          <span className='studio-history-play' aria-hidden='true'>
            <Play size={22} fill='currentColor' />
          </span>
        </>
      )}
      {!showMedia && (
        <span className='studio-history-placeholder'>
          <Icon size={32} strokeWidth={1.3} aria-hidden='true' />
          <span>{t(placeholder)}</span>
          <small>{t('Prompt and settings are still available.')}</small>
        </span>
      )}
      <span className='studio-history-kind'>
        <Icon size={13} aria-hidden='true' />
        {t(job.kind === 'image' ? 'Image work' : 'Video work')}
      </span>
      {job.assets.length > 1 && (
        <span className='studio-history-count'>{job.assets.length}</span>
      )}
    </span>
  )
}

function WorkCard(props: {
  job: LiveJob
  store: LocalStore
  onOpen: (job: LiveJob) => void
}) {
  const { t, i18n } = useTranslation()
  const { job } = props
  const label =
    LIVE_MODELS.find((m) => m.id === job.modelId)?.label ?? job.modelId
  const prompt = job.prompt.replaceAll(/\s+/g, ' ').trim()
  const excerpt = prompt.length > 180 ? `${prompt.slice(0, 180)}…` : prompt
  const date = new Date(job.createdAt).toLocaleString(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
  const imageMode =
    job.generationMode === 'image' ? 'Image to image' : 'Text to image'
  const videoMode =
    job.referenceMode || job.generationMode === 'image'
      ? 'Image to video'
      : 'Text to video'
  let detail = t(job.kind === 'image' ? imageMode : videoMode)
  if (job.kind === 'image' && !job.generationMode) detail = t('Image work')
  if (job.requestedSize) {
    const sizeLabel =
      job.requestedSize === 'auto'
        ? t('Automatic')
        : job.requestedSize.replace('x', ' × ')
    detail = `${detail} · ${sizeLabel}`
  }
  return (
    <article className='studio-history-card' aria-label={label}>
      <button
        type='button'
        className='studio-history-open'
        aria-label={t('Open task')}
        onClick={() => props.onOpen(job)}
      >
        <WorkPreview job={job} store={props.store} />
        <span className='studio-history-body'>
          <span className='studio-history-meta'>
            <span>{detail}</span>
            <span className='studio-history-status' data-stage={job.stage}>
              {t(STAGE_LABELS[job.stage])}
            </span>
          </span>
          <strong className='studio-history-model'>{label}</strong>
          <span className='studio-history-prompt'>{excerpt}</span>
          <span className='studio-history-footer'>
            <span>
              <Clock3 size={12} aria-hidden='true' />
              <time dateTime={new Date(job.createdAt).toISOString()}>
                {date}
              </time>
            </span>
            <span className='studio-history-action'>
              {t('View work')}
              <ArrowUpRight size={14} aria-hidden='true' />
            </span>
          </span>
        </span>
      </button>
    </article>
  )
}

export function LiveHistory(props: {
  session: LiveSession
  store: LocalStore
  onOpen: (job: LiveJob) => void
}) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<{
    owner: string
    jobs: LiveJob[]
    issue: boolean
  }>({ owner: '', jobs: [], issue: false })
  const [kind, setKind] = useState<'all' | MediaKind>('all')
  const owner = props.session.owner
  const pending = loaded.owner !== owner
  const jobs = pending ? [] : loaded.jobs
  const issue = !pending && loaded.issue
  useEffect(() => {
    let mounted = true
    let timer: number | undefined
    const load = () => {
      void props.store
        .list(owner)
        .then((records) => {
          if (!mounted) return
          const jobs = records
            .filter(
              (r): r is LiveJob =>
                r.owner === owner && 'live' in r && r.live === true
            )
            .sort((a, b) => b.createdAt - a.createdAt)
          setLoaded({ owner, issue: false, jobs })
          // Read local updates from the background task; never submit or query
          // the upstream here. Stop refreshing once all saved jobs are settled.
          if (
            jobs.some((job) =>
              ['queued', 'running', 'archiving'].includes(job.stage)
            )
          ) {
            timer = window.setTimeout(load, 4000)
          }
        })
        .catch(() => {
          if (mounted) setLoaded({ owner, jobs: [], issue: true })
        })
    }
    load()
    return () => {
      mounted = false
      window.clearTimeout(timer)
    }
  }, [props.store, owner])
  const visible = jobs.filter((job) => kind === 'all' || job.kind === kind)
  return (
    <section className='studio-live-history'>
      <header className='studio-history-heading'>
        <div>
          <h1>{t('My works')}</h1>
          <p>{t('Your ideas, brought to life.')}</p>
        </div>
        <div
          className='studio-history-filters'
          role='group'
          aria-label={t('Filter works')}
        >
          {(['all', 'image', 'video'] as const).map((value) => {
            const count = jobs.filter(
              (job) => value === 'all' || job.kind === value
            ).length
            const labels = {
              all: 'All works',
              image: 'Image works',
              video: 'Video works',
            }
            return (
              <button
                key={value}
                type='button'
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
              >
                {t(labels[value])}
                <span>{count}</span>
              </button>
            )
          })}
        </div>
      </header>
      <p className='studio-history-note'>
        {t(
          'History is local to this browser and key. Uploaded references and archived results use your OSS and expire after seven days.'
        )}
      </p>
      {issue && <p role='alert'>{t('Unable to read browser history.')}</p>}
      {pending && <p role='status'>{t('Loading works…')}</p>}
      {!issue && !pending && visible.length === 0 && (
        <div className='studio-history-empty'>
          <Images size={32} aria-hidden='true' />
          <p>
            {t(
              jobs.length === 0
                ? 'No real generations saved for this key yet.'
                : 'No works in this category yet.'
            )}
          </p>
        </div>
      )}
      <div className='studio-live-history-grid'>
        {visible.map((job) => (
          <WorkCard
            key={`${owner}:${job.id}`}
            job={job}
            store={props.store}
            onOpen={props.onOpen}
          />
        ))}
      </div>
    </section>
  )
}
