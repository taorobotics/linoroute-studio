/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Dialog } from '@base-ui/react/dialog'
import { FileImage, Film, HardDrive, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DemoOwner, LocalFileInfo, LocalStore } from '../contracts'
import { formatBytes } from '../local-files'
import { LocalFilePanel } from './LocalFilePanel'

function FileRow(props: {
  file: LocalFileInfo
  store: LocalStore
  now: () => number
  onDelete: (id: string) => Promise<void>
  finalFocus: React.RefObject<HTMLHeadingElement | null>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const lock = useRef(false)
  const kind = props.file.type.startsWith('video/') ? 'video' : 'image'
  const Icon = kind === 'video' ? Film : FileImage
  return (
    <li className='studio-file-row'>
      <span className='studio-file-type-icon'>
        <Icon size={20} aria-hidden='true' />
      </span>
      <div className='studio-file-row-label'>
        <strong>{props.file.name}</strong>
        <span>
          {formatBytes(props.file.size)} · {t('Test file')}
        </span>
      </div>
      <Dialog.Root>
        <Dialog.Trigger
          className='studio-secondary-button'
          aria-label={t('View file {{name}}', { name: props.file.name })}
        >
          {t('View file')}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className='studio-modal-backdrop' />
          <Dialog.Popup className='studio-detail-dialog studio-file-dialog'>
            <div className='studio-drawer-heading'>
              <Dialog.Title>{t('Local file')}</Dialog.Title>
              <Dialog.Close
                className='studio-icon-button'
                aria-label={t('Close')}
              >
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              {t('Saved separately from your prompt record. No cloud backup.')}
            </Dialog.Description>
            <LocalFilePanel
              store={props.store}
              owner={props.file.owner}
              assetId={props.file.id}
              kind={kind}
              active
              now={props.now}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root>
        <Dialog.Trigger
          className='studio-icon-button'
          aria-label={t('Delete file {{name}}', { name: props.file.name })}
        >
          <Trash2 size={16} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className='studio-modal-backdrop' />
          <Dialog.Popup
            className='studio-detail-dialog'
            finalFocus={props.finalFocus}
          >
            <div className='studio-drawer-heading'>
              <Dialog.Title>{t('Delete this browser file?')}</Dialog.Title>
              <Dialog.Close
                className='studio-icon-button'
                aria-label={t('Close')}
              >
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              {t(
                'Only this saved browser file will be removed. Prompt records and files already downloaded to your device will remain. This cannot be undone.'
              )}
            </Dialog.Description>
            <p className='studio-work-prompt'>
              {props.file.name} · {formatBytes(props.file.size)}
            </p>
            {error && (
              <p role='alert' className='studio-inline-error'>
                {t('File deletion failed. Nothing was removed; please retry.')}
              </p>
            )}
            <div className='studio-inline-actions'>
              <Dialog.Close className='studio-secondary-button' disabled={busy}>
                {t('Cancel')}
              </Dialog.Close>
              <button
                type='button'
                disabled={busy}
                className='studio-primary-button studio-danger-button'
                onClick={async () => {
                  if (lock.current) return
                  lock.current = true
                  setBusy(true)
                  setError(false)
                  try {
                    await props.onDelete(props.file.id)
                  } catch {
                    setError(true)
                  } finally {
                    lock.current = false
                    setBusy(false)
                  }
                }}
              >
                {t('Delete file only')}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </li>
  )
}

export function LocalFileLibrary(props: {
  files: LocalFileInfo[]
  owner: DemoOwner
  store: LocalStore
  now: () => number
  onDeleted: (id: string) => void
  unavailable: boolean
}) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  const [estimate, setEstimate] = useState<StorageEstimate>()
  const [revision, setRevision] = useState(0)
  const [limit, setLimit] = useState(12)
  const total = props.files.reduce((sum, file) => sum + file.size, 0)
  useEffect(() => {
    let alive = true
    if (navigator.storage?.estimate) {
      void navigator.storage
        .estimate()
        .then((info) => {
          if (alive) setEstimate(info)
        })
        .catch(() => {
          if (alive) setEstimate(undefined)
        })
    }
    return () => {
      alive = false
    }
  }, [revision, total])
  return (
    <section
      className='studio-file-library studio-panel'
      aria-label={t('Local files')}
    >
      <div className='studio-file-library-heading'>
        <div>
          <h2 ref={heading} tabIndex={-1}>
            <HardDrive size={19} aria-hidden='true' />
            {t('Local files')}
          </h2>
          <p>
            {t(
              'Deleting a record does not delete its file. Manage retained files here.'
            )}
          </p>
        </div>
        <span className='studio-storage-total'>
          {props.unavailable ? '—' : formatBytes(total)}
        </span>
      </div>
      <div className='studio-storage-meter'>
        <p>
          {estimate?.usage !== undefined && estimate.quota !== undefined
            ? t(
                'Browser estimate for this entire site: {{used}} used of {{quota}}. Shared with other site data, not reserved space.',
                {
                  used: formatBytes(estimate.usage),
                  quota: formatBytes(estimate.quota),
                }
              )
            : t(
                'This browser does not provide a storage estimate. A save can still fail if space runs out.'
              )}
        </p>
        <button
          type='button'
          className='studio-text-button'
          onClick={() => setRevision((n) => n + 1)}
        >
          {t('Refresh estimate')}
        </button>
      </div>
      {props.unavailable && (
        <p className='studio-inline-error' role='alert'>
          {t(
            'Could not read the file list. Reload local records to retry; existing files have not been deleted.'
          )}
        </p>
      )}
      {!props.unavailable && props.files.length === 0 && (
        <p className='studio-file-note'>
          {t(
            'No saved files yet. Complete a demo and import a test result to try browser storage.'
          )}
        </p>
      )}
      {!props.unavailable && (
        <ul className='studio-file-list'>
          {props.files.slice(0, limit).map((file) => (
            <FileRow
              key={file.id}
              file={file}
              store={props.store}
              now={props.now}
              finalFocus={heading}
              onDelete={async (id) => {
                await props.store.removeBlob(props.owner, id)
                props.onDeleted(id)
                heading.current?.focus()
              }}
            />
          ))}
        </ul>
      )}
      {!props.unavailable && props.files.length > limit && (
        <button
          type='button'
          className='studio-secondary-button'
          onClick={() => setLimit((n) => n + 12)}
        >
          {t('Load more files')}
        </button>
      )}
      <p className='studio-file-note'>
        {t(
          'The total above covers this demo identity only. Clearing site data can remove all identities. Download important files before cleanup.'
        )}
      </p>
    </section>
  )
}
