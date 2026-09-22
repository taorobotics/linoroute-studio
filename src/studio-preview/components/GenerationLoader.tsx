/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import { Check, ImageIcon, LoaderCircle, Sparkles, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { MediaKind } from '../contracts'

export function GenerationLoader(props: {
  kind: MediaKind
  mode: 'demo' | 'live'
}) {
  const { t } = useTranslation()
  const isImage = props.kind === 'image'
  const MediaIcon = isImage ? ImageIcon : Video

  return (
    <div
      className='studio-generation-loader'
      role='status'
      aria-live='polite'
      aria-label={t(
        isImage
          ? 'Image generation in progress'
          : 'Video generation in progress'
      )}
    >
      <div className='studio-generation-visual' aria-hidden='true'>
        <div className='studio-generation-orbit'>
          <span />
          <span />
          <span />
          <div className='studio-generation-core'>
            <MediaIcon size={30} strokeWidth={1.45} />
            <Sparkles
              className='studio-generation-spark'
              size={16}
              strokeWidth={1.7}
            />
          </div>
        </div>
        <div className='studio-generation-skeleton'>
          <span />
          <span />
          <span />
        </div>
      </div>

      <span className='studio-eyebrow'>{t('CREATING')}</span>
      <h3>
        {t(
          isImage
            ? 'Your image is being created'
            : 'Your video is being created'
        )}
      </h3>
      <p>
        {t(
          props.mode === 'live'
            ? 'LinoRoute is processing this request. Keep this page open until the result is ready.'
            : 'This local preview is simulating the generation flow. No model is running and no balance is used.'
        )}
      </p>

      <div className='studio-generation-steps' aria-hidden='true'>
        <span className='is-complete'>
          <Check size={13} />
          {t('Submitted')}
        </span>
        <strong>
          <LoaderCircle size={14} />
          {t('Generating')}
        </strong>
        <span>{t('Ready')}</span>
      </div>
      <div className='studio-generation-progress' aria-hidden='true'>
        <span />
      </div>
    </div>
  )
}
