/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  GPT_IMAGE_FAMILIES,
  gptImageOption,
  preferredGptImageModel,
  readGptImagePreference,
  rememberGptImagePreference,
  type ImageModelOption,
  type SelectionMode,
} from '../gpt-image-selection'
import { StudioModelSelect } from './StudioModelSelect'

import '../image-model-selection.css'

export function StudioImageModelSelect(props: {
  id: string
  value: string
  options: readonly ImageModelOption[]
  mode: SelectionMode
  showPreviewNote?: boolean
  disabled?: boolean
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const selected = props.options.find((model) => model.id === props.value)
  const choice = gptImageOption(selected)
  const family = props.options.filter(
    (model) => choice && gptImageOption(model)?.family === choice.family
  )
  const [notice, setNotice] = useState(() => {
    const saved = choice && readGptImagePreference(props.mode, choice.family)
    if (
      saved &&
      !family.some((model) => gptImageOption(model)?.apiId === saved)
    ) {
      return 'Your saved option is unavailable for this key. Review the available selection before generating.'
    }
    return ''
  })
  const options: ImageModelOption[] = []
  for (const model of props.options) {
    const option = gptImageOption(model)
    if (!option) options.push(model)
    else {
      const entry = GPT_IMAGE_FAMILIES[option.family]
      if (!options.some((model) => model.id === entry.id)) options.push(entry)
    }
  }
  // A historical model that has lost access must not appear to be a different model.
  if (!selected && props.value) {
    options.unshift({ id: props.value, label: t('Unavailable model') })
  }
  const select = (model: ImageModelOption | undefined, nextNotice = '') => {
    if (!model || props.disabled) return
    rememberGptImagePreference(model, props.mode)
    setNotice(nextNotice)
    props.onChange(model.id)
  }

  return (
    <>
      <StudioModelSelect
        id={props.id}
        ariaLabel={t('Model')}
        kind='image'
        value={choice ? GPT_IMAGE_FAMILIES[choice.family].id : props.value}
        options={options}
        disabled={props.disabled}
        onChange={(value) => {
          const familyId = (['gpt2', 'gpt25'] as const).find(
            (id) => GPT_IMAGE_FAMILIES[id].id === value
          )
          if (!familyId) {
            select(props.options.find((model) => model.id === value))
            return
          }
          const saved = readGptImagePreference(props.mode, familyId)
          const next = preferredGptImageModel(props.options, familyId, saved)
          select(
            next,
            saved && gptImageOption(next)?.apiId !== saved
              ? 'Your saved option is unavailable for this key. Review the available selection before generating.'
              : ''
          )
        }}
      />
      {choice && (
        <div className='studio-model-config'>
          {choice.version && (
            <fieldset disabled={props.disabled}>
              <legend>{t('Version')}</legend>
              <div className='studio-model-choice-row'>
                {(['Flare', 'Sunburst'] as const).map((version) => {
                  const available = family.filter(
                    (model) => gptImageOption(model)?.version === version
                  )
                  const description =
                    version === 'Flare' ? 'Balanced & fast' : 'Fine detail'
                  return (
                    <label key={version} className='studio-model-choice'>
                      <input
                        type='radio'
                        name={`${props.id}-version`}
                        aria-label={version}
                        aria-describedby={`${props.id}-${version}-description`}
                        checked={choice.version === version}
                        disabled={!available.length}
                        onChange={() => {
                          const next =
                            available.find(
                              (model) =>
                                gptImageOption(model)?.billing ===
                                choice.billing
                            ) ??
                            preferredGptImageModel(available, choice.family)
                          select(
                            next,
                            gptImageOption(next)?.billing !== choice.billing
                              ? 'Billing changed to an available option for this version. Review it before generating.'
                              : ''
                          )
                        }}
                      />
                      <span>
                        <strong>{version}</strong>
                        <small id={`${props.id}-${version}-description`}>
                          {available.length ? t(description) : t('Unavailable')}
                        </small>
                      </span>
                      <Check
                        className='studio-choice-check'
                        size={14}
                        strokeWidth={2.5}
                        aria-hidden='true'
                      />
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
          <fieldset disabled={props.disabled}>
            <legend>{t('Billing method')}</legend>
            <div className='studio-model-choice-row'>
              {(['Per request', 'By tokens'] as const).map((billing) => {
                const next = family.find((model) => {
                  const option = gptImageOption(model)
                  return (
                    option?.version === choice.version &&
                    option.billing === billing
                  )
                })
                return (
                  <label
                    key={billing}
                    className='studio-model-choice studio-model-billing-choice'
                  >
                    <input
                      type='radio'
                      name={`${props.id}-billing`}
                      aria-label={t(billing)}
                      checked={choice.billing === billing}
                      disabled={!next}
                      onChange={() => select(next)}
                    />
                    <span>
                      <strong>{t(billing)}</strong>
                      {!next && <small>{t('Unavailable')}</small>}
                    </span>
                    <Check
                      className='studio-choice-check'
                      size={14}
                      strokeWidth={2.5}
                      aria-hidden='true'
                    />
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className='studio-model-selection-summary' aria-live='polite'>
            <strong>
              {choice.version && (
                <>
                  {choice.version} <span>·</span>{' '}
                </>
              )}
              {t(choice.billing)}
            </strong>
            <code>{choice.apiId}</code>
          </div>
          <p className='studio-model-billing-help'>
            {t(
              choice.billing === 'Per request'
                ? 'Billed per request under the current model and group rules.'
                : 'Billed by input and output token usage under the current model and group rules.'
            )}
          </p>
          {props.mode === 'demo' && props.showPreviewNote !== false && (
            <p className='studio-model-billing-help'>
              {t(
                'Preview choices only. Connect your key to check availability and generate.'
              )}
            </p>
          )}
        </div>
      )}
      {notice && (
        <p className='studio-model-selection-notice' role='status'>
          {t(notice)}
        </p>
      )}
    </>
  )
}
