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

import {
  ChevronDown,
  ArrowRight,
  Info,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Sparkles,
} from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaDraft, MediaKind } from '../contracts'
import { DEMO_IMAGE_MODELS, DEMO_VIDEO_MODELS } from '../fixtures'
import { ReferenceMedia } from './ReferenceMedia'
import { StudioImageModelSelect } from './StudioImageModelSelect'
import { StudioModelSelect } from './StudioModelSelect'
import { TemplateDrawer } from './TemplateDrawer'

export function MediaControls(props: {
  id?: string
  demoEnabled?: boolean
  kind: MediaKind
  generating: boolean
  active: boolean
  draft: MediaDraft
  onChange: (draft: MediaDraft) => void
  onPreview: () => void
}) {
  const { t } = useTranslation()
  const fieldId = useId()
  const isImage = props.kind === 'image'
  const models = isImage ? DEMO_IMAGE_MODELS : DEMO_VIDEO_MODELS
  const { modelId: model, prompt, previewLayout: ratio } = props.draft
  const setModel = (modelId: string) =>
    props.onChange({ ...props.draft, modelId })
  const setPrompt = (value: string) =>
    props.onChange({ ...props.draft, prompt: value })
  const setRatio = (previewLayout: string) =>
    props.onChange({ ...props.draft, previewLayout })
  const example = isImage
    ? 'A perfume bottle in warm afternoon light, natural stone and folded paper birds. Editorial product photography, soft shadows, no text.'
    : 'Slowly drift across a quiet night skyline. Keep the movement gentle, with soft light and a cinematic atmosphere.'
  const canPreview =
    !props.generating && (!props.demoEnabled || prompt.trim().length > 0)
  let actionLabel = 'Connect key to generate'
  if (props.demoEnabled) {
    actionLabel = isImage
      ? 'Preview image generation'
      : 'Preview video generation'
  }

  return (
    <form
      id={props.id}
      className='studio-controls studio-panel'
      aria-label={isImage ? t('Image controls') : t('Video controls')}
      onSubmit={(event) => {
        event.preventDefault()
        if (canPreview) props.onPreview()
      }}
    >
      <div className='studio-controls-body'>
        <div className='studio-control-heading'>
          <h1>{isImage ? t('Image creation') : t('Video creation')}</h1>
          <p>
            {isImage
              ? t('Give your ideas a little more room.')
              : t('From a moment of inspiration to a moving story.')}
          </p>
        </div>
        <div className='studio-field'>
          <label htmlFor={`${fieldId}-model`}>{t('Model')}</label>
          {isImage ? (
            <StudioImageModelSelect
              id={`${fieldId}-model`}
              mode='demo'
              showPreviewNote={Boolean(props.demoEnabled)}
              value={model}
              options={models}
              disabled={props.generating}
              onChange={setModel}
            />
          ) : (
            <StudioModelSelect
              id={`${fieldId}-model`}
              ariaLabel={t('Model')}
              kind={props.kind}
              value={model}
              options={models}
              disabled={props.generating}
              onChange={setModel}
            />
          )}
        </div>
        <div className='studio-field'>
          <div className='studio-label-row'>
            <label htmlFor={`${fieldId}-prompt`}>{t('Prompt')}</label>
            <TemplateDrawer
              kind={props.kind}
              prompt={prompt}
              onApply={setPrompt}
            />
          </div>
          <div className='studio-prompt-box'>
            <textarea
              id={`${fieldId}-prompt`}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={4000}
              placeholder={t(example)}
            />
            <span className='studio-prompt-count' aria-hidden='true'>
              {prompt.length.toLocaleString()} / 4,000
            </span>
          </div>
        </div>
        {props.demoEnabled && (
          <>
            <div className='studio-field'>
              <div className='studio-label-row'>
                <span>{t('Reference media')}</span>
                <span className='studio-optional'>{t('Optional')}</span>
              </div>
              <ReferenceMedia kind={props.kind} active={props.active} />
            </div>
            <fieldset className='studio-ratios'>
              <legend>
                {t('Layout preview')}
                <span>{t('Visual only')}</span>
              </legend>
              <div>
                {['1:1', '3:2', '9:16'].map((value) => (
                  <button
                    key={value}
                    aria-pressed={ratio === value}
                    onClick={() => setRatio(value)}
                    type='button'
                  >
                    {value === '1:1' && <Square size={17} aria-hidden='true' />}
                    {value === '3:2' && (
                      <RectangleHorizontal size={18} aria-hidden='true' />
                    )}
                    {value === '9:16' && (
                      <RectangleVertical size={17} aria-hidden='true' />
                    )}
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <details className='studio-advanced'>
              <summary>
                {t('Advanced settings')}
                <ChevronDown size={15} aria-hidden='true' />
              </summary>
              <p>
                {t(
                  'Supported sizes, duration and quality will follow each verified model. These controls are design samples, not API parameters.'
                )}
              </p>
            </details>
          </>
        )}
        {!props.demoEnabled && (
          <p className='studio-reference-note'>
            {t(
              'Connect your key to load available models and generation settings.'
            )}
          </p>
        )}
      </div>
      <div className='studio-generate-area'>
        <button
          className='studio-primary-button'
          type='submit'
          disabled={!canPreview}
          aria-label={t(props.demoEnabled ? 'Preview generation' : actionLabel)}
        >
          <Sparkles size={17} aria-hidden='true' />
          {t(actionLabel)}
          <ArrowRight size={18} aria-hidden='true' />
        </button>
        {props.demoEnabled && (
          <p>
            <Info size={14} aria-hidden='true' />
            {t('Local preview. No credits used.')}
          </p>
        )}
      </div>
    </form>
  )
}
