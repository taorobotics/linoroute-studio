/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Check, Images, Scan, Type } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import {
  GPT25_PER_REQUEST_IDS,
  imageOutputOptions,
  imageRequestOptions,
  supportsImageEditing,
  type ImageBackground,
  type ImageFormat,
  type ImageGenerationMode as GenerationMode,
  type ImageModeration,
  type ImageQuality,
} from '../image-output-specs'
import type { LiveModel } from '../live-types'

export function ImageGenerationMode(props: {
  mode: 'text' | 'image'
  onChange: (mode: 'text' | 'image') => void
  model?: LiveModel
  disabled: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className='studio-image-mode'>
      <fieldset disabled={props.disabled}>
        <legend>{t('Creation mode')}</legend>
        <div className='studio-model-choice-row studio-mode-choices'>
          {(['text', 'image'] as const).map((mode) => (
            <label
              className='studio-model-choice studio-model-billing-choice'
              key={mode}
            >
              <input
                type='radio'
                name={id}
                checked={props.mode === mode}
                onChange={() => props.onChange(mode)}
              />
              <span>
                {mode === 'text' ? (
                  <Type size={16} aria-hidden='true' />
                ) : (
                  <Images size={16} aria-hidden='true' />
                )}
                <strong>
                  {t(mode === 'text' ? 'Text to image' : 'Image to image')}
                </strong>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {props.mode === 'image' && !supportsImageEditing(props.model) && (
        <p className='studio-model-selection-notice' role='status'>
          {t(
            'Image editing is not confirmed for this billing option. Choose a documented by-token model or Nano Banana Pro; billing will not switch automatically.'
          )}
        </p>
      )}
    </div>
  )
}

export function ImageOutputSettings(props: {
  model: LiveModel
  mode?: GenerationMode
  ratio: string
  size: string
  disabled: boolean
  onChange: (ratio: string, size: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const mode = props.mode ?? 'text'
  const options = imageOutputOptions(props.model, mode)
  const ratios = [...new Set(options.map((entry) => entry.ratio))]
  const nativeResolution = props.model.id === 'gemini-3-pro-image-preview'
  const approximateSize = GPT25_PER_REQUEST_IDS.includes(props.model.id)
  const sizes = options.filter((entry) => entry.ratio === props.ratio)
  const experimental = sizes.find(
    (entry) => entry.size === props.size
  )?.experimental
  return (
    <div className='studio-image-output'>
      <fieldset className='studio-ratios' disabled={props.disabled}>
        <legend>{t('Aspect ratio')}</legend>
        <div>
          {ratios.map((ratio) => {
            const [width, height] = ratio.split(':').map(Number)
            const frameWidth = 20 * Math.min(1, width / height)
            const frameHeight = 20 * Math.min(1, height / width)
            return (
              <button
                type='button'
                key={ratio}
                aria-pressed={props.ratio === ratio}
                onClick={() =>
                  props.onChange(
                    ratio,
                    options.find(
                      (entry) =>
                        nativeResolution &&
                        entry.ratio === ratio &&
                        entry.size === props.size
                    )?.size ??
                      options.find(
                        (entry) => entry.ratio === ratio && !entry.experimental
                      )?.size ??
                      ''
                  )
                }
              >
                {ratio === 'auto' ? (
                  <Scan size={24} strokeWidth={1.5} aria-hidden='true' />
                ) : (
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    aria-hidden='true'
                  >
                    <rect
                      x={(24 - frameWidth) / 2}
                      y={(24 - frameHeight) / 2}
                      width={frameWidth}
                      height={frameHeight}
                      rx='2'
                      stroke='currentColor'
                      strokeWidth='1.5'
                    />
                  </svg>
                )}
                <span>{ratio === 'auto' ? t('Automatic') : ratio}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      {!!sizes.length && (
        <fieldset className='studio-size-options' disabled={props.disabled}>
          <legend>
            {t(approximateSize ? 'Requested size' : 'Output size')}
          </legend>
          <div
            className='studio-model-choice-row'
            data-native-resolution={nativeResolution}
          >
            {sizes.map((option) => (
              <label
                className='studio-model-choice studio-model-billing-choice'
                data-experimental={option.experimental || undefined}
                key={option.size}
              >
                <input
                  type='radio'
                  name={id}
                  checked={props.size === option.size}
                  onChange={() => props.onChange(props.ratio, option.size)}
                />
                <span>
                  <strong>
                    {option.size === 'auto'
                      ? t('Automatic')
                      : option.size.replace('x', ' × ')}
                  </strong>
                  {option.experimental && (
                    <small>{t('4K · Experimental')}</small>
                  )}
                  {option.tier && !option.experimental && (
                    <small>{option.tier}</small>
                  )}
                </span>
                <Check
                  className='studio-choice-check'
                  size={14}
                  strokeWidth={2.5}
                  aria-hidden='true'
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!props.size && sizes.length > 0 && (
        <p role='status' className='studio-model-selection-notice'>
          {t(
            'Choose a size explicitly. This ratio only has an experimental 4K preset.'
          )}
        </p>
      )}
      {approximateSize && (
        <p className='studio-reference-note'>
          {t(
            'Per-request models use this size as an aspect-ratio reference. Actual image dimensions may differ.'
          )}
        </p>
      )}
      {props.model.id === 'gpt-image-2-c' && (
        <p className='studio-reference-note'>
          {t(
            '2K and 4K require an eligible GPT Image 2 group. Your key permissions and billing group remain unchanged.'
          )}
        </p>
      )}
      {props.model.id === 'gpt-image-2' && (
        <p className='studio-reference-note'>
          {t(
            mode === 'image'
              ? 'In image-to-image mode, size controls the generated canvas. Choose Automatic to let the model decide from the reference image and prompt.'
              : '2K and 4K are documented request sizes. The upstream may normalize final pixels; charges follow the active LinoRoute route.'
          )}
        </p>
      )}
      {props.model.id === 'gemini-3-pro-image-preview' && (
        <p className='studio-reference-note'>
          {t(
            'Resolution and aspect ratio are independent. At 1:1, 1K / 2K / 4K correspond to 1024 / 2048 / 4096 pixels per side. Other ratios have different dimensions.'
          )}
        </p>
      )}
      {props.size === '4K' && (
        <p className='studio-model-selection-notice' role='status'>
          {t(
            '4K may take longer and cost more. Review the resolution and billing before confirming.'
          )}
        </p>
      )}
      {experimental && (
        <p className='studio-model-selection-notice' role='status'>
          {t(
            'Experimental 4K may take longer and cost more. Review the size and billing before confirming.'
          )}
        </p>
      )}
      {props.size === 'auto' && (
        <p className='studio-reference-note'>
          {t(
            'The model chooses the output size. Final dimensions and charges may vary.'
          )}
        </p>
      )}
    </div>
  )
}

const qualityLabels: Record<ImageQuality, string> = {
  auto: 'Automatic',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Maximum',
}

const formatLabels: Record<ImageFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
}

const backgroundLabels: Record<ImageBackground, string> = {
  auto: 'Automatic',
  opaque: 'Opaque',
  transparent: 'Transparent',
}

const moderationLabels: Record<ImageModeration, string> = {
  auto: 'Automatic',
  low: 'Low',
}

export function ImageRequestSettings(props: {
  model: LiveModel
  mode: GenerationMode
  quality: ImageQuality
  format: ImageFormat
  background?: ImageBackground
  moderation?: ImageModeration
  disabled: boolean
  onQualityChange: (quality: ImageQuality) => void
  onFormatChange: (format: ImageFormat) => void
  onBackgroundChange?: (background: ImageBackground) => void
  onModerationChange?: (moderation: ImageModeration) => void
}) {
  const { t } = useTranslation()
  const qualityId = useId()
  const formatId = useId()
  const backgroundId = useId()
  const moderationId = useId()
  const options = imageRequestOptions(props.model, props.mode)
  if (!options) return null

  return (
    <div className='studio-image-request-settings'>
      <fieldset disabled={props.disabled}>
        <legend>{t('Image quality')}</legend>
        <div className='studio-compact-options'>
          {options.qualities.map((quality) => (
            <label key={quality}>
              <input
                type='radio'
                name={qualityId}
                checked={props.quality === quality}
                onChange={() => props.onQualityChange(quality)}
              />
              <span>{t(qualityLabels[quality])}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {!!options.formats.length && (
        <fieldset disabled={props.disabled}>
          <legend>{t('Image format')}</legend>
          <div className='studio-compact-options' data-columns='3'>
            {options.formats.map((format) => (
              <label key={format}>
                <input
                  type='radio'
                  name={formatId}
                  checked={props.format === format}
                  disabled={
                    props.disabled ||
                    (props.background === 'transparent' && format === 'jpeg')
                  }
                  onChange={() => props.onFormatChange(format)}
                />
                <span>{formatLabels[format]}</span>
              </label>
            ))}
          </div>
          <p className='studio-reference-note'>
            {t(
              'The selected format is sent to the upstream. Downloads use the actual returned format if it differs.'
            )}
          </p>
        </fieldset>
      )}
      {(!!options.backgrounds.length || !!options.moderations.length) && (
        <details className='studio-image-advanced-options' open>
          <summary>{t('Advanced image settings')}</summary>
          {!!options.backgrounds.length && (
            <fieldset disabled={props.disabled}>
              <legend>{t('Background')}</legend>
              <div className='studio-compact-options' data-columns='3'>
                {options.backgrounds.map((background) => (
                  <label key={background}>
                    <input
                      type='radio'
                      name={backgroundId}
                      checked={props.background === background}
                      onChange={() => {
                        if (
                          background === 'transparent' &&
                          props.format === 'jpeg'
                        ) {
                          props.onFormatChange('png')
                        }
                        props.onBackgroundChange?.(background)
                      }}
                    />
                    <span>{t(backgroundLabels[background])}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {!!options.moderations.length && (
            <fieldset disabled={props.disabled}>
              <legend>{t('Content moderation')}</legend>
              <div className='studio-compact-options' data-columns='2'>
                {options.moderations.map((moderation) => (
                  <label key={moderation}>
                    <input
                      type='radio'
                      name={moderationId}
                      checked={props.moderation === moderation}
                      onChange={() => props.onModerationChange?.(moderation)}
                    />
                    <span>{t(moderationLabels[moderation])}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </details>
      )}
      <div className='studio-fixed-output-count'>
        <span>{t('Image count')}</span>
        <strong>{t('1 image')}</strong>
      </div>
    </div>
  )
}
