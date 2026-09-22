/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { ImageIcon, Video } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { LocalStore, MediaJob, MediaKind } from '../contracts'
import { CreationEmptyState } from './CreationEmptyState'
import { GenerationLoader } from './GenerationLoader'
import { LocalFilePanel } from './LocalFilePanel'
import type { VisualState } from './MediaWorkspace'

export function MediaResult(props: {
  kind: MediaKind
  state: VisualState
  active: boolean
  mobileResultVisible: boolean
  taskStatus?: ReactNode
  job?: MediaJob | null
  store: LocalStore
  now: () => number
  onBrowsePrompts?: () => void
}) {
  const { t } = useTranslation()
  const isImage = props.kind === 'image'
  const Icon = isImage ? ImageIcon : Video
  const ready = props.state === 'ready'
  const fileJob = props.job?.stage === 'ready' ? props.job : undefined
  let resultLabel = 'No result yet'
  if (fileJob) resultLabel = 'Local file test'
  else if (props.state === 'generating') resultLabel = 'In progress'
  else if (props.state === 'failed') resultLabel = 'Generation failed'

  return (
    <section
      className='studio-result studio-panel'
      aria-label={t('Creation result')}
    >
      <div className='studio-result-header'>
        <div>
          <h2>{t('Creation result')}</h2>
          {ready && <span className='studio-result-count'>01</span>}
        </div>
        <span className='studio-result-label'>{t(resultLabel)}</span>
      </div>
      {props.taskStatus}
      {ready && fileJob?.assetId && (
        <LocalFilePanel
          key={`${fileJob.owner}:${fileJob.assetId}`}
          store={props.store}
          owner={fileJob.owner}
          assetId={fileJob.assetId}
          kind={props.kind}
          allowImport
          active={props.active}
          mobileResultVisible={props.mobileResultVisible}
          now={props.now}
        />
      )}
      {!ready && (
        <div className='studio-result-placeholder'>
          {props.state === 'generating' && (
            <GenerationLoader kind={props.kind} mode='demo' />
          )}
          {props.state === 'empty' && (
            <CreationEmptyState
              kind={props.kind}
              onBrowsePrompts={props.onBrowsePrompts}
            />
          )}
          {props.state === 'failed' && (
            <div className='studio-empty'>
              <div className='studio-state-icon' aria-hidden='true'>
                <Icon size={34} strokeWidth={1.3} />
              </div>
              <h3>{t('Demo failed')}</h3>
              <p>
                {t(
                  'Your inputs are safe. Retry creates a separate demo attempt with the original prompt.'
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
