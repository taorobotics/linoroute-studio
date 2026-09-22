/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const referenceIds = new WeakMap<File, string>()
function referenceIdentity(file: File): string {
  let id = referenceIds.get(file)
  if (!id) {
    id = crypto.randomUUID()
    referenceIds.set(file, id)
  }
  return id
}

function ReferenceThumbnail(props: {
  file: File
  disabled: boolean
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(props.file)
    if (image.current) image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [props.file])
  return (
    <li>
      <img ref={image} alt={props.file.name} />
      <span title={props.file.name}>{props.file.name}</span>
      <button
        type='button'
        disabled={props.disabled}
        onClick={props.onRemove}
        aria-label={t('Remove {{name}}', { name: props.file.name })}
      >
        <X size={14} aria-hidden='true' />
      </button>
    </li>
  )
}

interface ImageDimensions {
  width: number
  height: number
}

async function decodeReference(file: File): Promise<ImageDimensions> {
  const header = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => resolve(new Uint8Array(reader.result as ArrayBuffer)),
      { once: true }
    )
    reader.addEventListener(
      'error',
      () => reject(new Error('unreadable file')),
      { once: true }
    )
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, index) => header[index] === byte
  )
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  const webp =
    String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
  const matches =
    (file.type === 'image/png' && png) ||
    (file.type === 'image/jpeg' && jpeg) ||
    (file.type === 'image/webp' && webp)
  if (!matches) throw new Error('invalid image signature')
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    const valid =
      dimensions.width > 0 &&
      dimensions.height > 0 &&
      dimensions.width * dimensions.height <= 40_000_000
    bitmap.close()
    if (!valid) throw new Error('invalid image')
    return dimensions
  }
  // Safari fallback. The owned URL is always released, including failed decoding.
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const img = new Image()
      const timer = window.setTimeout(() => {
        img.src = ''
        reject(new Error('timeout'))
      }, 15000)
      img.addEventListener(
        'load',
        () => {
          window.clearTimeout(timer)
          if (
            img.naturalWidth &&
            img.naturalHeight &&
            img.naturalWidth * img.naturalHeight <= 40_000_000
          ) {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
          } else reject(new Error('invalid image'))
        },
        { once: true }
      )
      img.addEventListener(
        'error',
        () => {
          window.clearTimeout(timer)
          reject(new Error('invalid image'))
        },
        { once: true }
      )
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ReferenceImageInput(props: {
  files: File[]
  onChange: (files: File[]) => void
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  label?: string
  inputLabel?: string
  maxFiles?: number
  allowMask?: boolean
  mask?: File
  onMaskChange?: (file?: File) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const maskId = useId()
  const input = useRef<HTMLInputElement>(null)
  const maskInput = useRef<HTMLInputElement>(null)
  const ticket = useRef(0)
  const [issue, setIssue] = useState('')
  const [checking, setChecking] = useState(false)
  const maxFiles = props.maxFiles ?? 4
  const locked = props.disabled || checking
  useEffect(
    () => () => {
      ticket.current++
    },
    []
  )
  const addFiles = async (selected: File[]) => {
    if (locked || !selected.length) return
    if (
      props.files.length + selected.length > maxFiles ||
      selected.some(
        (file) =>
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          !file.size ||
          file.size > 5 * 1024 * 1024
      )
    ) {
      setIssue(
        'Choose up to {{count}} PNG, JPEG or WebP images, no larger than 5 MB each.'
      )
      return
    }
    const current = ++ticket.current
    setChecking(true)
    props.onBusyChange(true)
    setIssue('')
    try {
      for (const file of selected) await decodeReference(file)
      if (ticket.current === current) {
        props.onChange([...props.files, ...selected])
      }
    } catch {
      if (ticket.current === current) {
        setIssue(
          'This image cannot be decoded or exceeds 40 megapixels. Choose another file.'
        )
      }
    } finally {
      if (ticket.current === current) {
        setChecking(false)
        props.onBusyChange(false)
      }
    }
  }
  const addMask = async (selected?: File) => {
    if (locked || !props.allowMask || !props.files[0] || !selected) return
    if (
      selected.type !== 'image/png' ||
      !selected.size ||
      selected.size > 5 * 1024 * 1024
    ) {
      setIssue('Choose a non-empty PNG mask no larger than 5 MB.')
      return
    }
    const current = ++ticket.current
    setChecking(true)
    props.onBusyChange(true)
    setIssue('')
    try {
      const [maskDimensions, referenceDimensions] = await Promise.all([
        decodeReference(selected),
        decodeReference(props.files[0]),
      ])
      if (
        maskDimensions.width !== referenceDimensions.width ||
        maskDimensions.height !== referenceDimensions.height
      ) {
        throw new Error('mask dimensions do not match')
      }
      if (ticket.current === current) props.onMaskChange?.(selected)
    } catch {
      if (ticket.current === current) {
        setIssue('The mask must match the first reference image dimensions.')
      }
    } finally {
      if (ticket.current === current) {
        setChecking(false)
        props.onBusyChange(false)
      }
    }
  }
  return (
    <div className='studio-reference-images'>
      <label htmlFor={id}>
        {props.label ?? t('Reference images')}{' '}
        <small>
          {props.files.length} / {maxFiles}
        </small>
      </label>
      <input
        ref={input}
        id={id}
        type='file'
        multiple={maxFiles > 1}
        accept='image/png,image/jpeg,image/webp'
        aria-label={props.inputLabel ?? t('Add reference images')}
        disabled={locked}
        className='studio-file-input'
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          void addFiles(files)
        }}
      />
      <button
        type='button'
        className='studio-image-drop'
        disabled={locked}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = locked ? 'none' : 'copy'
        }}
        onDrop={(event) => {
          event.preventDefault()
          void addFiles([...event.dataTransfer.files])
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length) {
            event.preventDefault()
            void addFiles([...event.clipboardData.files])
          }
        }}
      >
        <ImagePlus size={24} aria-hidden='true' />
        <span>
          {t(
            checking ? 'Checking images…' : 'Click, drop or paste images here'
          )}
        </span>
      </button>
      {!!props.files.length && (
        <ul className='studio-reference-thumbnails'>
          {props.files.map((file, index) => (
            <ReferenceThumbnail
              key={referenceIdentity(file)}
              file={file}
              disabled={locked}
              onRemove={() => {
                props.onChange(
                  props.files.filter((_, position) => position !== index)
                )
                props.onMaskChange?.(undefined)
                setIssue('')
              }}
            />
          ))}
        </ul>
      )}
      {props.allowMask && !!props.files.length && (
        <div className='studio-mask-input'>
          <div className='studio-label-row'>
            <label htmlFor={maskId}>{t('Mask image (optional)')}</label>
            <small>{t('PNG')}</small>
          </div>
          <input
            ref={maskInput}
            id={maskId}
            type='file'
            accept='image/png'
            aria-label={t('Add mask image')}
            disabled={locked}
            className='studio-file-input'
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void addMask(file)
            }}
          />
          {props.mask ? (
            <ul className='studio-reference-thumbnails' data-compact='true'>
              <ReferenceThumbnail
                file={props.mask}
                disabled={locked}
                onRemove={() => {
                  props.onMaskChange?.(undefined)
                  setIssue('')
                }}
              />
            </ul>
          ) : (
            <button
              type='button'
              className='studio-mask-picker'
              disabled={locked}
              onClick={() => maskInput.current?.click()}
            >
              <ImagePlus size={18} aria-hidden='true' />
              {t('Choose mask')}
            </button>
          )}
          <p className='studio-reference-note'>
            {t(
              'Transparent areas are edited. Use a PNG mask matching the first reference image.'
            )}
          </p>
        </div>
      )}
      {issue && (
        <p role='alert' className='studio-inline-error'>
          {t(issue, { count: maxFiles })}
        </p>
      )}
      <p className='studio-reference-note'>
        {t(
          'Up to {{count}} PNG, JPEG or WebP images, 5 MB each. Sent only after confirmation.',
          { count: maxFiles }
        )}
      </p>
    </div>
  )
}
