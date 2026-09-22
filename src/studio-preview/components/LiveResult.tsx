import { Video, Download } from 'lucide-react'
/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LocalStore, MediaKind } from '../contracts'
import { safeMediaUrl } from '../live-client'
import { LIVE_ERRORS, type LiveAsset, type LiveJob } from '../live-types'
import { CreationEmptyState } from './CreationEmptyState'
import { GenerationLoader } from './GenerationLoader'

function ResultAsset(props: {
  asset: LiveAsset
  job: LiveJob
  store: LocalStore
  active: boolean
}) {
  const { t } = useTranslation()
  const [blobSrc, setSrc] = useState('')
  let src = safeMediaUrl(props.asset.url) ?? ''
  if (props.asset.blobId) src = blobSrc
  else if (
    props.asset.base64 &&
    ['image/png', 'image/jpeg', 'image/webp'].includes(props.asset.mime ?? '')
  ) {
    src = `data:${props.asset.mime};base64,${props.asset.base64}`
  }
  const [issue, setIssue] = useState('')
  const [dimensions, setDimensions] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    let dead = false,
      owned = ''
    const asset = props.asset
    if (asset.blobId) {
      void props.store
        .getBlob(props.job.owner, asset.blobId)
        .then((blob) => {
          if (dead) return
          if (!blob) {
            setIssue('The browser file is missing.')
            return
          }
          owned = URL.createObjectURL(blob)
          setSrc(owned)
        })
        .catch(() => {
          if (!dead) setIssue('The browser file is missing.')
        })
    }
    return () => {
      dead = true
      if (owned) URL.revokeObjectURL(owned)
    }
  }, [props.asset, props.job.owner, props.store])
  useEffect(() => {
    const pause = () => {
      if (!props.active || document.hidden) video.current?.pause()
    }
    pause()
    document.addEventListener('visibilitychange', pause)
    return () => document.removeEventListener('visibilitychange', pause)
  }, [props.active])
  return (
    <div className='studio-live-asset'>
      {src &&
        (props.job.kind === 'image' ? (
          <img
            src={src}
            alt={t('Generated image')}
            referrerPolicy='no-referrer'
            onLoad={(event) =>
              setDimensions(
                `${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`
              )
            }
            onError={() =>
              setIssue(
                'This upstream link has expired or cannot be loaded. Download your results promptly.'
              )
            }
          />
        ) : (
          <video
            ref={video}
            src={src}
            controls
            playsInline
            preload='metadata'
            aria-label={t('Generated video')}
            onError={() =>
              setIssue(
                'This upstream link has expired or cannot be loaded. Download your results promptly.'
              )
            }
          />
        ))}
      {dimensions && (
        <small>
          {t('Actual image size')}: {dimensions}
        </small>
      )}
      {src && (
        <a
          className='studio-secondary-button'
          href={src}
          target='_blank'
          rel='noopener noreferrer'
          download={props.asset.url ? undefined : props.job.id}
          referrerPolicy='no-referrer'
        >
          <Download size={15} />
          {t(props.asset.url ? 'Open original / download' : 'Download file')}
        </a>
      )}
      {issue && (
        <p className='studio-inline-error' role='alert'>
          {t(issue)}
        </p>
      )}
    </div>
  )
}

export function LiveResultPanel(props: {
  kind: MediaKind
  job: LiveJob | null
  store: LocalStore
  busy: boolean
  issue: string
  active: boolean
  onResume: () => void
  onBrowsePrompts?: () => void
}) {
  const { t } = useTranslation()
  const job = props.job
  const generating =
    !props.issue &&
    (props.busy || job?.stage === 'running' || job?.stage === 'archiving')
  let label = 'Generation result'
  if (props.busy) label = 'Sending / checking with LinoRoute…'
  else if (job?.stage === 'archiving') {
    label = 'Saving result to your OSS…'
  } else if (job?.stage === 'running') {
    label = 'The upstream is generating your video'
  } else if (job?.stage === 'ready') label = 'Generation completed'
  else if (job?.stage === 'failed') label = 'Generation failed'
  else if (job?.stage === 'submission_unknown') {
    label = 'Submission not confirmed'
  }
  return (
    <section
      className='studio-result studio-panel studio-live-result'
      aria-label={t('Generation result')}
    >
      <div className='studio-result-heading'>
        <h2>{t(label)}</h2>
        {job && <span className='studio-job-badge'>{t('Live API')}</span>}
      </div>
      {props.issue && (
        <p role='alert' className='studio-inline-error'>
          {t(LIVE_ERRORS[props.issue] ?? LIVE_ERRORS.query_failed)}
        </p>
      )}
      {job?.stage === 'failed' && !props.issue && (
        <p role='alert' className='studio-inline-error'>
          {t(LIVE_ERRORS.failed)}
        </p>
      )}
      {generating && (
        <div className='studio-result-placeholder'>
          <GenerationLoader kind={props.kind} mode='live' />
        </div>
      )}
      {!job && !generating && (
        <div className='studio-result-placeholder'>
          <CreationEmptyState
            kind={props.kind}
            onBrowsePrompts={props.onBrowsePrompts}
          />
        </div>
      )}
      {job?.taskId && (
        <div className='studio-live-task-id'>
          <span>{t('Task ID')}</span>
          <code>{job.taskId}</code>
          {job.stage === 'running' && (
            <button
              type='button'
              className='studio-secondary-button'
              disabled={props.busy}
              onClick={props.onResume}
            >
              {t('Resume status check')}
            </button>
          )}
        </div>
      )}
      {job?.stage === 'running' && !props.issue && (
        <p className='studio-reference-note'>
          <Video size={16} />
          {t(
            'Automatic checks run while this tab is visible. You can reopen this task from My works after reconnecting with the same key.'
          )}
        </p>
      )}
      {job?.stage === 'ready' &&
        job.assets.map((asset) => (
          <ResultAsset
            key={asset.id ?? asset.blobId ?? asset.url ?? job.id}
            asset={asset}
            job={job}
            store={props.store}
            active={props.active}
          />
        ))}
      {job && !generating && <p className='studio-live-prompt'>{job.prompt}</p>}
      {job?.requestedSize && !generating && (
        <p className='studio-reference-note'>
          {t('Requested output size')}:{' '}
          {job.requestedSize === 'auto'
            ? t('Automatic')
            : job.requestedSize.replace('x', ' × ')}
        </p>
      )}
      <p className='studio-reference-note'>
        {t(
          'History is local to this browser and key. Uploaded references and archived results use your OSS and expire after seven days.'
        )}
      </p>
    </section>
  )
}
