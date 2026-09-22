/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LocalStore } from '../contracts'
import { LIVE_MODELS } from '../live-models'
import type { LiveJob, LiveSession } from '../live-types'

const IMAGE_MODE_LABELS = { image: 'Image to image', text: 'Text to image' }

export function LiveHistory(props: {
  session: LiveSession
  store: LocalStore
  onOpen: (job: LiveJob) => void
}) {
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<LiveJob[]>([])
  const [issue, setIssue] = useState(false)
  useEffect(() => {
    let mounted = true
    void props.store
      .list(props.session.owner)
      .then((records) => {
        if (mounted) {
          setJobs(
            records
              .filter((r): r is LiveJob => 'live' in r && r.live === true)
              .sort((a, b) => b.createdAt - a.createdAt)
          )
        }
      })
      .catch(() => {
        if (mounted) setIssue(true)
      })
    return () => {
      mounted = false
    }
  }, [props.store, props.session.owner])
  return (
    <section className='studio-live-history'>
      <h1>{t('My works')}</h1>
      <p>
        {t(
          'History is local to this browser and key. Uploaded references and archived results use your OSS and expire after seven days.'
        )}
      </p>
      {issue && <p role='alert'>{t('Unable to read browser history.')}</p>}
      {!issue && jobs.length === 0 && (
        <p>{t('No real generations saved for this key yet.')}</p>
      )}
      <div className='studio-live-history-grid'>
        {jobs.map((job) => (
          <article className='studio-panel' key={job.id}>
            <strong>
              {LIVE_MODELS.find((m) => m.id === job.modelId)?.label ??
                job.modelId}
            </strong>
            <p>{job.prompt}</p>
            {job.kind === 'image' && (
              <p>
                {t(
                  job.generationMode
                    ? IMAGE_MODE_LABELS[job.generationMode]
                    : 'Creation mode not recorded'
                )}
                {job.requestedSize && (
                  <>
                    {' '}
                    ·{' '}
                    {job.requestedSize === 'auto'
                      ? t('Automatic')
                      : job.requestedSize.replace('x', ' × ')}
                  </>
                )}
              </p>
            )}
            <small>{new Date(job.createdAt).toLocaleString()}</small>
            <p>
              {t(job.stage === 'ready' ? 'Generation completed' : 'Saved task')}
            </p>
            <button
              className='studio-secondary-button'
              type='button'
              onClick={() => props.onOpen(job)}
            >
              {t('Open task')}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
