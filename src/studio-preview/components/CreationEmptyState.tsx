// Copyright (C) 2023-2026 QuantumNous
// SPDX-License-Identifier: AGPL-3.0-or-later
import { ArrowUpRight, ImageIcon, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { MediaKind } from '../contracts'

export function CreationEmptyState(props: {
  kind: MediaKind
  onBrowsePrompts?: () => void
}) {
  const { t } = useTranslation()
  const Icon = props.kind === 'image' ? ImageIcon : Video
  return (
    <div className='studio-empty'>
      <div className='studio-state-icon' aria-hidden='true'>
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3>{t('Your next idea starts here')}</h3>
      <p>
        {t(
          'Write a prompt, or start with one from the library. Preview and download your result here.'
        )}
      </p>
      {props.onBrowsePrompts && (
        <button
          type='button'
          className='studio-secondary-button studio-empty-library'
          onClick={props.onBrowsePrompts}
        >
          {t(
            props.kind === 'image'
              ? 'Browse image prompts'
              : 'Browse video prompts'
          )}
          <ArrowUpRight size={16} aria-hidden='true' />
        </button>
      )}
    </div>
  )
}
