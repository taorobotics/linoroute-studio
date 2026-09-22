/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaKind } from '../contracts'

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]
const VIDEO_TYPES = [
  ...IMAGE_TYPES,
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/ogg',
]
interface Reference {
  id: string
  file: File
  url: string
}

export function ReferenceMedia(props: { kind: MediaKind; active: boolean }) {
  const { t } = useTranslation()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const current = useRef<Reference[]>([])
  const [files, setFiles] = useState<Reference[]>([])
  const [error, setError] = useState(false)
  const [over, setOver] = useState(false)
  const types = props.kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES

  useEffect(
    () => () => {
      for (const item of current.current) URL.revokeObjectURL(item.url)
    },
    []
  )
  useEffect(() => {
    if (!props.active) {
      container.current?.querySelectorAll('video,audio').forEach((media) => {
        const element = media as HTMLMediaElement
        if (!element.paused) element.pause()
      })
    }
  }, [props.active])

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...current.current]
    let rejected = false
    for (const file of incoming) {
      if (
        next.length >= 6 ||
        !types.includes(file.type) ||
        !file.size ||
        file.size > 20 * 1024 * 1024
      ) {
        rejected = true
        continue
      }
      try {
        next.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        })
      } catch {
        rejected = true
      }
    }
    current.current = next
    setFiles(next)
    setError(rejected)
  }

  return (
    <div
      ref={container}
      className='studio-references'
      role='group'
      aria-label={t('Local reference media')}
      data-dragging={over || undefined}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        addFiles(event.dataTransfer.files)
      }}
    >
      <input
        ref={input}
        id={inputId}
        type='file'
        multiple
        hidden
        accept={types.join(',')}
        aria-label={t('Choose reference files')}
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <button
        className='studio-upload'
        type='button'
        onClick={() => input.current?.click()}
      >
        <span className='studio-upload-icon'>
          <ImagePlus size={21} aria-hidden='true' />
        </span>
        <span>
          <strong>{t('Add reference media')}</strong>
          <small>{t('Choose files or drop them here')}</small>
        </span>
        <span className='studio-reference-count'>{files.length}/6</span>
      </button>
      {error && (
        <p className='studio-inline-error' role='alert'>
          {t(
            'Some files were not added. Check the format, size and six-file limit.'
          )}
        </p>
      )}
      <div className='studio-reference-list'>
        {files.map((item) => (
          <div key={item.id} className='studio-reference-item'>
            {item.file.type.startsWith('image/') && (
              <img
                src={item.url}
                alt={item.file.name}
                onError={() => setError(true)}
              />
            )}
            {item.file.type.startsWith('video/') && (
              <video
                src={item.url}
                controls
                playsInline
                preload='metadata'
                aria-label={item.file.name}
              />
            )}
            {item.file.type.startsWith('audio/') && (
              <audio
                src={item.url}
                controls
                preload='metadata'
                aria-label={item.file.name}
              />
            )}
            <div>
              <span title={item.file.name}>{item.file.name}</span>
              <button
                type='button'
                className='studio-icon-button'
                aria-label={t('Remove {{name}}', { name: item.file.name })}
                onClick={() => {
                  const next = current.current.filter(
                    (ref) => ref.id !== item.id
                  )
                  current.current = next
                  setFiles(next)
                  URL.revokeObjectURL(item.url)
                }}
              >
                <X size={15} aria-hidden='true' />
              </button>
            </div>
          </div>
        ))}
      </div>
      <details className='studio-reference-details'>
        <summary>{t('File guidelines')}</summary>
        <p className='studio-reference-note'>
          {props.kind === 'image'
            ? t('Images only · Up to 6 files, 20 MB each')
            : t('Images, video or audio · Up to 6 files, 20 MB each')}
        </p>
        <p className='studio-reference-note'>
          {t(
            'Page-only preview. Nothing is uploaded; refreshing clears reference files. Playback depends on your browser codec support.'
          )}
        </p>
      </details>
    </div>
  )
}
