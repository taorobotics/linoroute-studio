/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  Bookmark,
  Check,
  Download,
  FileUp,
  HardDrive,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DemoOwner, LocalStore, MediaKind } from '../contracts'
import {
  downloadName,
  fileErrorMessage,
  formatBytes,
  RESULT_TYPES,
  validResultFile,
} from '../local-files'

interface FileValue {
  blob: Blob
  name: string
  saved: boolean
}

// Mounted under an owner/asset key: a late old read or write cannot update a new identity.
export function LocalFilePanel(props: {
  store: LocalStore
  owner: DemoOwner
  assetId: string
  kind: MediaKind
  allowImport?: boolean
  active: boolean
  mobileResultVisible?: boolean
  now: () => number
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<FileValue>()
  const [loading, setLoading] = useState(true)
  const [readError, setReadError] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(true)
  const [url, setUrl] = useState('')
  const [decodeError, setDecodeError] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    let alive = true
    if (!props.active) return
    void Promise.all([
      props.store.getBlob(props.owner, props.assetId),
      props.store.listBlobs(props.owner),
    ])
      .then(([blob, files]) => {
        if (!alive) return
        const info = files.find((file) => file.id === props.assetId)
        if (blob) {
          setValue({ blob, name: info?.name ?? props.assetId, saved: true })
        } else {
          setValue((previous) => (previous?.saved ? undefined : previous))
        }
        setLoading(false)
      })
      .catch(() => {
        if (alive) {
          setReadError(true)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [props.store, props.owner, props.assetId, props.active, revision])

  const blob = value?.blob
  useEffect(() => {
    if (!blob) return
    const next = URL.createObjectURL(blob)
    // eslint-disable-next-line react/set-state-in-effect -- Sync React with a revocable browser resource, not derived application state.
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  useEffect(() => {
    const media = video.current
    const narrow = matchMedia('(max-width: 760px)')
    const pause = () => {
      if (
        media &&
        !media.paused &&
        (!props.active ||
          document.hidden ||
          (narrow.matches && props.mobileResultVisible === false))
      ) {
        media.pause()
      }
    }
    pause()
    document.addEventListener('visibilitychange', pause)
    narrow.addEventListener('change', pause)
    return () => {
      document.removeEventListener('visibilitychange', pause)
      narrow.removeEventListener('change', pause)
      if (media && !media.paused) media.pause()
    }
  }, [url, props.active, props.mobileResultVisible])

  const select = (file?: File) => {
    if (!file || lock.current || value?.saved) return
    if (!validResultFile(file, props.kind)) {
      setError(
        props.kind === 'image'
          ? 'Choose a non-empty PNG, JPEG, WebP, GIF or AVIF image up to 20 MiB.'
          : 'Choose a non-empty MP4, WebM or MOV video up to 100 MiB.'
      )
      return
    }
    setError('')
    setDecodeError(false)
    setValue({ blob: file, name: downloadName(file.name), saved: false })
  }
  const save = async () => {
    if (!value || value.saved || lock.current) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      await props.store.putBlob(props.owner, props.assetId, value.blob, {
        name: value.name,
        savedAt: props.now(),
      })
      if (mounted.current) setValue({ ...value, saved: true })
    } catch (reason) {
      if (mounted.current) setError(fileErrorMessage(reason))
    } finally {
      lock.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <div className='studio-local-file' aria-label={t('Local result file')}>
      <div className='studio-local-file-heading'>
        <span className='studio-eyebrow'>{t('LOCAL FILE / TEST')}</span>
        <span className='studio-result-label'>
          {t('Your test file · Not AI-generated')}
        </span>
      </div>
      {loading && <p role='status'>{t('Reading local file')}</p>}
      {readError && (
        <div className='studio-inline-error' role='alert'>
          <p>
            {t('Could not read this local file. Retry before making changes.')}
          </p>
          <button
            type='button'
            className='studio-secondary-button'
            onClick={() => {
              setReadError(false)
              setLoading(true)
              setRevision((n) => n + 1)
            }}
          >
            {t('Retry')}
          </button>
        </div>
      )}
      {!loading && !readError && !value && (
        <div className='studio-file-empty'>
          <FileUp size={36} strokeWidth={1.3} aria-hidden='true' />
          <h3>
            {t(
              props.allowImport
                ? 'Try a file of your own'
                : 'No local file found'
            )}
          </h3>
          <p>
            {t(
              props.allowImport
                ? 'Import a test result to preview, save and download. This does not upload or generate anything.'
                : 'The file may have been removed or cleared by your browser. Your prompt record is separate.'
            )}
          </p>
        </div>
      )}
      {value && url && (
        <>
          <div className='studio-file-preview'>
            {props.kind === 'image' && (
              <img
                src={url}
                alt={value.name}
                onError={() => setDecodeError(true)}
              />
            )}
            {props.kind === 'video' && (
              <video
                ref={video}
                src={url}
                aria-label={value.name}
                controls
                playsInline
                preload='metadata'
                onError={() => setDecodeError(true)}
              />
            )}
          </div>
          <div className='studio-file-description'>
            <strong>{value.name}</strong>
            <span>
              {formatBytes(value.blob.size)} · {value.blob.type}
            </span>
          </div>
          {decodeError && (
            <p role='alert' className='studio-inline-error'>
              {t(
                'This browser could not preview the file. Download it to check its format or play it locally.'
              )}
            </p>
          )}
        </>
      )}
      {error && (
        <p role='alert' className='studio-inline-error'>
          {t(error)}
        </p>
      )}
      {!loading && !readError && (
        <div className='studio-file-toolbar'>
          <span className='studio-file-status' role='status'>
            {value?.saved ? <Check size={15} /> : <HardDrive size={15} />}
            {t(
              value?.saved
                ? 'Saved in this browser'
                : 'Not saved · This page only'
            )}
          </span>
          {props.allowImport && !value?.saved && (
            <>
              <input
                type='file'
                ref={input}
                className='studio-sr-only'
                tabIndex={-1}
                aria-label={t('Choose a test result file')}
                accept={RESULT_TYPES[props.kind].join(',')}
                disabled={saving}
                onChange={(event) => {
                  select(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <button
                type='button'
                className='studio-secondary-button'
                disabled={saving}
                onClick={() => input.current?.click()}
              >
                <FileUp size={15} />
                {t(value ? 'Choose another file' : 'Import test result')}
              </button>
            </>
          )}
          {value && !value.saved && (
            <button
              type='button'
              className='studio-secondary-button studio-file-save'
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <RefreshCw size={15} /> : <Bookmark size={15} />}
              {t(saving ? 'Saving file' : 'Keep in this browser')}
            </button>
          )}
          {value && url && (
            <a
              className='studio-secondary-button'
              href={url}
              download={downloadName(value.name)}
            >
              <Download size={15} />
              {t('Download file')}
            </a>
          )}
        </div>
      )}
      <p className='studio-file-note'>
        {t(
          'Files stay in this browser, not on our server. There is no automatic seven-day deletion or cross-device sync. Browser cleanup can erase them; download important files.'
        )}
      </p>
      {props.allowImport && !value?.saved && (
        <p className='studio-file-note'>
          {t(
            props.kind === 'image'
              ? 'Test limit: images up to 20 MiB. Use your own file; the built-in samples are preview-only.'
              : 'Test limit: videos up to 100 MiB. Playback depends on browser and codec support.'
          )}
        </p>
      )}
    </div>
  )
}
