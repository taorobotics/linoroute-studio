/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Image, Type, Volume2 } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { VideoResolution } from '../video-output-specs'

export function VideoGenerationMode(props: {
  mode: 'text' | 'image'
  disabled: boolean
  onChange: (mode: 'text' | 'image') => void
}) {
  const { t } = useTranslation()
  const id = useId()

  return (
    <div className='studio-video-mode'>
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
                  <Image size={16} aria-hidden='true' />
                )}
                <strong>
                  {t(mode === 'text' ? 'Text to video' : 'Image to video')}
                </strong>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

export function VideoResolutionSettings(props: {
  options: readonly VideoResolution[]
  value: string
  disabled: boolean
  economicalDefault: string
  onChange: (value: VideoResolution) => void
}) {
  const { t } = useTranslation()
  const id = useId()

  return (
    <div className='studio-video-resolution'>
      <fieldset disabled={props.disabled}>
        <legend>{t('Resolution')}</legend>
        <div
          className='studio-compact-options'
          data-columns={props.options.length === 3 ? '3' : '4'}
        >
          {props.options.map((resolution) => (
            <label key={resolution}>
              <input
                type='radio'
                name={id}
                checked={props.value === resolution}
                onChange={() => props.onChange(resolution)}
              />
              <span>{resolution.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className='studio-reference-note'>
        {t(
          'Higher resolutions cost more. {{resolution}} is selected by default for economical testing.',
          { resolution: props.economicalDefault.toUpperCase() }
        )}
      </p>
    </div>
  )
}

export function VideoAudioSettings(props: {
  enabled: boolean
  disabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <div className='studio-video-audio'>
      <label>
        <span className='studio-video-audio-copy'>
          <Volume2 size={17} aria-hidden='true' />
          <span>
            <strong>{t('Generate synchronized audio')}</strong>
            <small>{t('Create native audio together with the video.')}</small>
          </span>
        </span>
        <input
          type='checkbox'
          aria-label={t('Generate synchronized audio')}
          checked={props.enabled}
          disabled={props.disabled}
          onChange={(event) => props.onChange(event.target.checked)}
        />
      </label>
    </div>
  )
}
