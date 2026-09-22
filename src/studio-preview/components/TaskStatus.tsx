/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { CheckCircle2, CircleDashed, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { MediaJob } from '../contracts'
import { JOB_LABELS } from '../job-labels'

export function TaskStatus(props: {
  job: MediaJob | null
  busy: boolean
  error: boolean
  onComplete: () => void
  onFail: () => void
  onRetry: () => void
  onRetrySave: () => void
}) {
  const { t } = useTranslation()
  const stage = props.job?.stage
  const pending = stage === 'queued' || stage === 'running'
  return (
    <div className='studio-task-status'>
      {props.job && (
        <>
          <div className='studio-task-heading' role='status'>
            {stage === 'ready' ? (
              <CheckCircle2 size={17} aria-hidden='true' />
            ) : (
              <CircleDashed size={17} aria-hidden='true' />
            )}
            <strong>{t(JOB_LABELS[props.job.stage])}</strong>
            <span>{t('Local demo record')}</span>
          </div>
          <p>
            {t(
              'This is a local demo, not a model request. Test result files can be saved separately in this browser.'
            )}
          </p>
          <div className='studio-inline-actions'>
            {(pending || stage === 'archiving') && (
              <button
                type='button'
                className='studio-secondary-button'
                disabled={props.busy || props.error}
                onClick={props.onComplete}
              >
                {t('Simulate success')}
              </button>
            )}
            {pending && (
              <button
                type='button'
                className='studio-text-button'
                disabled={props.busy || props.error}
                onClick={props.onFail}
              >
                {t('Simulate failure')}
              </button>
            )}
            {stage === 'failed' && (
              <button
                type='button'
                className='studio-secondary-button'
                disabled={props.busy || props.error}
                onClick={props.onRetry}
              >
                <RotateCcw size={14} aria-hidden='true' />
                {t('Retry demo task')}
              </button>
            )}
          </div>
        </>
      )}
      {props.error && (
        <div className='studio-inline-error' role='alert'>
          <p>
            {t(
              'Could not save this demo operation. Your prompt is unchanged; retry when browser storage is available.'
            )}
          </p>
          <button
            className='studio-text-button'
            type='button'
            disabled={props.busy}
            onClick={props.onRetrySave}
          >
            {t('Retry save')}
          </button>
        </div>
      )}
    </div>
  )
}
