/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Dialog } from '@base-ui/react/dialog'
import { Check, WandSparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaKind } from '../contracts'

const TEMPLATES = {
  image: [
    [
      'Product in sunlight',
      'A perfume bottle in warm afternoon light, natural stone and folded paper birds. Editorial product photography, soft shadows, no text.',
    ],
    [
      'Ceramic still life',
      'A handmade ceramic cup on a linen tablecloth, soft window light, warm neutral colors, delicate glaze texture, uncluttered composition, no text.',
    ],
    [
      'Quiet architecture',
      'A serene gallery with curved white walls, one sculptural chair and long afternoon shadows. Architectural photography, natural materials, no people or text.',
    ],
  ],
  video: [
    [
      'City after dark',
      'Slowly drift across a quiet night skyline. Keep the movement gentle, with soft light and a cinematic atmosphere.',
    ],
    [
      'Product orbit',
      'A slow, steady camera orbit around a perfume bottle on natural stone. Keep the product shape consistent, let warm light move across the glass, no sudden cuts or text.',
    ],
    [
      'A breath of nature',
      'A gentle breeze moves through meadow grass beside a still lake at sunrise. Slow camera push, natural colors, continuous motion, peaceful atmosphere, no text.',
    ],
  ],
} as const

export function TemplateDrawer(props: {
  kind: MediaKind
  prompt: string
  onApply: (text: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const templates = TEMPLATES[props.kind]
  const apply = () => {
    props.onApply(t(templates[selected][1]))
    setOpen(false)
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        setConfirm(false)
      }}
    >
      <Dialog.Trigger className='studio-text-button' type='button'>
        <WandSparkles size={14} aria-hidden='true' />
        {t('Use a template')}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className='studio-modal-backdrop' />
        <Dialog.Popup className='studio-template-drawer'>
          <div className='studio-drawer-heading'>
            <div>
              <span className='studio-eyebrow'>
                {t('A starting point for your idea')}
              </span>
              <Dialog.Title>{t('Prompt templates')}</Dialog.Title>
            </div>
            <Dialog.Close
              className='studio-icon-button'
              aria-label={t('Close')}
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description>
            {t(
              'Original demo templates. Applying a template changes only your prompt; it does not generate or charge.'
            )}
          </Dialog.Description>
          <div className='studio-template-options'>
            {templates.map(([title], index) => (
              <button
                key={title}
                type='button'
                aria-pressed={selected === index}
                aria-label={t('Select template: {{name}}', { name: t(title) })}
                onClick={() => {
                  setSelected(index)
                  setConfirm(false)
                }}
              >
                <span className='studio-template-number'>0{index + 1}</span>
                <strong>{t(title)}</strong>
                {selected === index && <Check size={18} aria-hidden='true' />}
              </button>
            ))}
          </div>
          <div className='studio-template-preview'>
            <span>{t('Prompt')}</span>
            <p>{t(templates[selected][1])}</p>
          </div>
          <div className='studio-drawer-footer'>
            {confirm ? (
              <>
                <p role='status'>{t('Replace your current prompt?')}</p>
                <div className='studio-inline-actions'>
                  <button
                    type='button'
                    className='studio-secondary-button'
                    onClick={() => setConfirm(false)}
                  >
                    {t('Keep draft')}
                  </button>
                  <button
                    type='button'
                    className='studio-primary-button'
                    onClick={apply}
                  >
                    {t('Replace prompt')}
                  </button>
                </div>
              </>
            ) : (
              <button
                type='button'
                className='studio-primary-button'
                onClick={() => {
                  if (props.prompt.trim()) setConfirm(true)
                  else apply()
                }}
              >
                <WandSparkles size={17} aria-hidden='true' />
                {t('Apply template')}
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
