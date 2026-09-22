/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Dialog } from '@base-ui/react/dialog'
import { Clock3, ImageIcon, Images, Trash2, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  DemoOwner,
  LocalFileInfo,
  LocalStore,
  MediaJob,
  MediaKind,
} from '../contracts'
import { DEMO_IMAGE_MODELS, DEMO_VIDEO_MODELS } from '../fixtures'
import { JOB_LABELS } from '../job-labels'
import { LocalFileLibrary } from './LocalFileLibrary'
import { LocalFilePanel } from './LocalFilePanel'

const modelLabel = (job: MediaJob) =>
  [...DEMO_IMAGE_MODELS, ...DEMO_VIDEO_MODELS].find(
    (model) => model.id === job.modelId
  )?.label ?? job.modelId

function WorkCard(props: {
  job: MediaJob
  store: LocalStore
  localFile?: LocalFileInfo
  filesUnavailable: boolean
  fileRevision: number
  now: number
  onReuse: (job: MediaJob) => void
  onDelete: (job: MediaJob) => Promise<void>
  focusAfterDelete: React.RefObject<HTMLHeadingElement | null>
}) {
  const { t, i18n } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const deleteLock = useRef(false)
  const [error, setError] = useState(false)
  const job = props.job
  const expired =
    !props.localFile &&
    job.stage === 'ready' &&
    (job.expiresAt === undefined || props.now >= job.expiresAt)
  const date = new Date(job.createdAt).toLocaleString(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
  const Icon = job.kind === 'image' ? ImageIcon : Video
  const knownModel = [...DEMO_IMAGE_MODELS, ...DEMO_VIDEO_MODELS].some(
    (model) => model.id === job.modelId
  )
  let availabilityLabel = JOB_LABELS[job.stage]
  if (expired && !props.filesUnavailable) {
    availabilityLabel = 'Demo preview expired'
  }
  if (props.localFile) availabilityLabel = 'Local file available'
  return (
    <article className='studio-work-card studio-panel'>
      <div className='studio-work-cover'>
        <Icon size={34} strokeWidth={1.3} aria-hidden='true' />
        {props.localFile && <span>{t('Local test file saved')}</span>}
      </div>
      <div className='studio-work-card-body'>
        <div className='studio-label-row'>
          <strong>{modelLabel(job)}</strong>
          <span className='studio-job-badge' data-stage={job.stage}>
            {t(availabilityLabel)}
          </span>
        </div>
        <p className='studio-work-prompt'>{job.prompt}</p>
        <span className='studio-work-date'>
          <Clock3 size={12} aria-hidden='true' />
          {date}
        </span>
        <div className='studio-inline-actions'>
          <Dialog.Root>
            <Dialog.Trigger className='studio-secondary-button'>
              {t('View details')}
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className='studio-modal-backdrop' />
              <Dialog.Popup className='studio-detail-dialog'>
                <div className='studio-drawer-heading'>
                  <Dialog.Title>{t('Record details')}</Dialog.Title>
                  <Dialog.Close
                    className='studio-icon-button'
                    aria-label={t('Close')}
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Description>
                  {t(
                    'Reuse replaces the target prompt, model and layout only. Check your reference files separately.'
                  )}
                </Dialog.Description>
                <dl className='studio-record-facts'>
                  <dt>{t('Model')}</dt>
                  <dd>{modelLabel(job)}</dd>
                  <dt>{t('Demo status')}</dt>
                  <dd>{t(JOB_LABELS[job.stage])}</dd>
                  <dt>{t('Created')}</dt>
                  <dd>{date}</dd>
                  <dt>{t('Layout preview')}</dt>
                  <dd>{job.previewLayout ?? '—'}</dd>
                </dl>
                <div className='studio-template-preview'>
                  <span>{t('Prompt')}</span>
                  <p>{job.prompt}</p>
                </div>
                {props.localFile && (
                  <p className='studio-reference-note'>
                    {t(
                      'This local file is independent of simulated preview expiry. Download a copy for safekeeping.'
                    )}
                  </p>
                )}
                {!props.localFile && (
                  <p className='studio-reference-note'>
                    {expired
                      ? t(
                          'The simulated seven-day preview has expired. The local prompt record is still available.'
                        )
                      : t(
                          'Seven-day expiry is simulated metadata only, not a cloud retention promise. No generated file is stored.'
                        )}
                  </p>
                )}
                {job.stage === 'ready' && job.assetId && (
                  <LocalFilePanel
                    key={`${job.assetId}:${props.fileRevision}`}
                    store={props.store}
                    owner={job.owner}
                    assetId={job.assetId}
                    kind={job.kind}
                    active
                    now={() => props.now}
                  />
                )}
                {!knownModel && (
                  <p className='studio-inline-error'>
                    {t('This model is no longer in the demo list.')}
                  </p>
                )}
                <button
                  className='studio-primary-button'
                  type='button'
                  disabled={!knownModel}
                  onClick={() => props.onReuse(job)}
                >
                  {t('Reuse settings')}
                </button>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
          <Dialog.Root>
            <Dialog.Trigger
              className='studio-icon-button'
              aria-label={t('Delete record')}
            >
              <Trash2 size={16} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className='studio-modal-backdrop' />
              <Dialog.Popup
                className='studio-detail-dialog'
                finalFocus={props.focusAfterDelete}
              >
                <div className='studio-drawer-heading'>
                  <Dialog.Title>{t('Delete this local record?')}</Dialog.Title>
                  <Dialog.Close
                    className='studio-icon-button'
                    aria-label={t('Close')}
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Description>
                  {t(
                    'Only this record under the current demo identity will be deleted. This cannot be undone.'
                  )}{' '}
                  {t(
                    'Saved files are not deleted. Find them in Local files below your records.'
                  )}
                </Dialog.Description>
                <p className='studio-work-prompt'>{job.prompt}</p>
                {error && (
                  <p role='alert' className='studio-inline-error'>
                    {t(
                      'Deletion failed. The record is still here; please try again.'
                    )}
                  </p>
                )}
                <div className='studio-inline-actions'>
                  <Dialog.Close
                    className='studio-secondary-button'
                    disabled={deleting}
                  >
                    {t('Cancel')}
                  </Dialog.Close>
                  <button
                    type='button'
                    className='studio-primary-button studio-danger-button'
                    disabled={deleting}
                    onClick={async () => {
                      if (deleteLock.current) return
                      deleteLock.current = true
                      setDeleting(true)
                      setError(false)
                      try {
                        await props.onDelete(job)
                      } catch {
                        setError(true)
                      } finally {
                        deleteLock.current = false
                        setDeleting(false)
                      }
                    }}
                  >
                    {t('Confirm deletion')}
                  </button>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </article>
  )
}

export function WorksWorkspace(props: {
  demoEnabled?: boolean
  owner: DemoOwner | null
  store: LocalStore
  now: () => number
  onChooseOwner: () => void
  onReuse: (job: MediaJob) => void
}) {
  const { t } = useTranslation()
  const [records, setRecords] = useState<MediaJob[]>([])
  const [files, setFiles] = useState<LocalFileInfo[]>([])
  const [filesUnavailable, setFilesUnavailable] = useState(false)
  const [fileRevision, setFileRevision] = useState(0)
  const [filter, setFilter] = useState<'all' | MediaKind>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [limit, setLimit] = useState(24)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let alive = true
    if (!props.owner) return
    void props.store
      .listBlobs(props.owner)
      .then((items) => {
        if (alive) {
          setFiles(items.sort((a, b) => b.savedAt - a.savedAt))
          setFilesUnavailable(false)
        }
      })
      .catch(() => {
        if (alive) setFilesUnavailable(true)
      })
    return () => {
      alive = false
    }
  }, [props.owner, props.store, revision])
  useEffect(() => {
    let alive = true
    if (!props.owner) return
    void props.store
      .list(props.owner)
      .then((items) => {
        if (alive) {
          setRecords(
            items
              .filter(
                (item): item is MediaJob =>
                  item.kind === 'image' || item.kind === 'video'
              )
              .sort((a, b) => b.createdAt - a.createdAt)
          )
          setLoading(false)
          setError(false)
        }
      })
      .catch(() => {
        if (alive) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [props.owner, props.store, revision])
  const visible = records.filter(
    (job) => filter === 'all' || job.kind === filter
  )
  return (
    <section className='studio-works'>
      <div className='studio-page-heading'>
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {t('My works')}
          </h1>
          <p>{t('A small archive for your next idea.')}</p>
        </div>
        {props.demoEnabled && (
          <span className='studio-result-label'>{t('Local demo records')}</span>
        )}
      </div>
      {props.demoEnabled && (
        <div className='studio-history-notice'>
          <Images size={18} aria-hidden='true' />
          <p>
            {t(
              'Only this browser stores the demo prompts and statuses. Clearing site data removes them; there is no cross-device sync or cloud backup.'
            )}
          </p>
        </div>
      )}
      {!props.owner ? (
        <div className='studio-works-empty studio-panel'>
          <Images size={36} strokeWidth={1.2} />
          <h2>
            {t(
              props.demoEnabled
                ? 'Choose a demo identity to view records'
                : 'Connect your key to view your works'
            )}
          </h2>
          <button
            type='button'
            className='studio-primary-button'
            onClick={props.onChooseOwner}
          >
            {t(
              props.demoEnabled
                ? 'Configure demo key'
                : 'Connect key to generate'
            )}
          </button>
        </div>
      ) : (
        <>
          <div className='studio-works-toolbar'>
            <button
              type='button'
              className='studio-text-button'
              onClick={() => setRevision((value) => value + 1)}
            >
              {t('Reload local records')}
            </button>
            <div
              className='studio-work-filters'
              role='group'
              aria-label={t('Filter works')}
            >
              {(['all', 'image', 'video'] as const).map((kind) => (
                <button
                  type='button'
                  key={kind}
                  aria-pressed={filter === kind}
                  onClick={() => {
                    setFilter(kind)
                    setLimit(24)
                  }}
                >
                  {t(
                    { all: 'All works', image: 'Images', video: 'Videos' }[kind]
                  )}
                </button>
              ))}
            </div>
            <span>{t('{{count}} records', { count: visible.length })}</span>
          </div>
          {loading && <p role='status'>{t('Loading local records')}</p>}
          {error && (
            <div role='alert' className='studio-inline-error'>
              <p>{t('Could not load local records. Try again.')}</p>
              <button
                type='button'
                className='studio-secondary-button'
                onClick={() => {
                  setLoading(true)
                  setError(false)
                  setRevision((value) => value + 1)
                }}
              >
                {t('Retry')}
              </button>
            </div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className='studio-works-empty studio-panel'>
              <Images size={36} strokeWidth={1.2} />
              <h2>{t('No local demo records yet')}</h2>
              <p>
                {t(
                  'Create an image or video demo to see its prompt and status here.'
                )}
              </p>
            </div>
          )}
          {!loading && !error && (
            <div className='studio-work-grid'>
              {visible.slice(0, limit).map((job) => (
                <WorkCard
                  key={job.id}
                  job={job}
                  store={props.store}
                  localFile={files.find((file) => file.id === job.assetId)}
                  filesUnavailable={filesUnavailable}
                  fileRevision={fileRevision}
                  now={props.now()}
                  onReuse={props.onReuse}
                  focusAfterDelete={heading}
                  onDelete={async (record) => {
                    if (!props.owner || record.owner !== props.owner) return
                    await props.store.remove(props.owner, record.id)
                    setRecords((items) =>
                      items.filter((item) => item.id !== record.id)
                    )
                    heading.current?.focus()
                  }}
                />
              ))}
            </div>
          )}
          {!loading && !error && visible.length > limit && (
            <button
              type='button'
              className='studio-secondary-button'
              onClick={() => setLimit((value) => value + 24)}
            >
              {t('Load more')}
            </button>
          )}
          <LocalFileLibrary
            files={files}
            owner={props.owner}
            store={props.store}
            now={props.now}
            unavailable={filesUnavailable}
            onDeleted={(id) => {
              setFiles((items) => items.filter((file) => file.id !== id))
              setFileRevision((value) => value + 1)
            }}
          />
        </>
      )}
    </section>
  )
}
