/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Select } from '@base-ui/react/select'
import ByteDanceColor from '@lobehub/icons/es/ByteDance/components/Color'
import KlingColor from '@lobehub/icons/es/Kling/components/Color'
import MinimaxColor from '@lobehub/icons/es/Minimax/components/Color'
import { Check, ChevronDown, Video } from 'lucide-react'

import type { MediaKind } from '../contracts'

interface StudioModelOption {
  id: string
  label: string
}

interface ProviderIdentity {
  name: string
  logo?: string
  mark?: string
  tone: string
}

function providerFor(label: string): ProviderIdentity {
  const normalized = label.toLowerCase()
  if (normalized.includes('gpt')) {
    return {
      name: 'OpenAI',
      logo: '/landing/model-logos/chatgpt.svg',
      tone: 'openai',
    }
  }
  if (
    normalized.includes('nano banana') ||
    normalized.includes('gemini') ||
    normalized.includes('veo')
  ) {
    return {
      name: normalized.includes('veo') ? 'Google DeepMind' : 'Google',
      logo: '/landing/model-logos/gemini.svg',
      tone: 'google',
    }
  }
  if (normalized.includes('grok')) {
    return {
      name: 'xAI',
      logo: '/landing/model-logos/grok.svg',
      tone: 'xai',
    }
  }
  if (normalized.includes('seedance')) {
    return { name: 'ByteDance', tone: 'seedance' }
  }
  if (normalized.includes('kling')) {
    return { name: 'Kuaishou', tone: 'kling' }
  }
  if (normalized.includes('h3') || normalized.includes('minimax')) {
    return { name: 'MiniMax', tone: 'minimax' }
  }
  return { name: 'LinoRoute', mark: 'AI', tone: 'default' }
}

function ModelMark(props: { provider: ProviderIdentity; kind: MediaKind }) {
  let mark = <Video size={20} aria-hidden='true' />
  if (props.provider.logo) {
    mark = <img src={props.provider.logo} alt='' width='22' height='22' />
  } else if (props.provider.mark) {
    mark = <span aria-hidden='true'>{props.provider.mark}</span>
  } else if (props.provider.tone === 'minimax') {
    mark = <MinimaxColor size={24} aria-hidden='true' />
  } else if (props.provider.tone === 'seedance') {
    mark = <ByteDanceColor size={24} aria-hidden='true' />
  } else if (props.provider.tone === 'kling') {
    mark = <KlingColor size={24} aria-hidden='true' />
  }

  return (
    <span className='lr-model-mark' data-tone={props.provider.tone}>
      {mark}
      <span className='studio-sr-only'>{props.kind}</span>
    </span>
  )
}

export function StudioModelSelect(props: {
  id: string
  ariaLabel: string
  kind: MediaKind
  value: string
  options: readonly StudioModelOption[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const selected =
    props.options.find((option) => option.id === props.value) ??
    props.options[0]
  const selectedProvider = providerFor(selected?.label ?? '')

  return (
    <Select.Root
      value={props.value}
      disabled={props.disabled}
      onValueChange={(value) => {
        if (value) props.onChange(String(value))
      }}
    >
      <Select.Trigger
        id={props.id}
        className='lr-model-trigger'
        aria-label={props.ariaLabel}
      >
        <ModelMark provider={selectedProvider} kind={props.kind} />
        <Select.Value>
          {() => (
            <span className='lr-model-current'>
              <strong>{selected?.label}</strong>
              <small>{selectedProvider.name}</small>
            </span>
          )}
        </Select.Value>
        <Select.Icon className='lr-model-chevron'>
          <ChevronDown size={17} aria-hidden='true' />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className='lr-model-positioner'
          side='bottom'
          sideOffset={8}
          align='start'
        >
          <Select.Popup className='lr-model-popup'>
            <Select.List className='lr-model-list'>
              {props.options.map((option) => {
                const provider = providerFor(option.label)
                return (
                  <Select.Item
                    className='lr-model-option'
                    value={option.id}
                    label={option.label}
                    aria-label={option.label}
                    key={option.id}
                  >
                    <ModelMark provider={provider} kind={props.kind} />
                    <Select.ItemText className='lr-model-option-copy'>
                      <strong>{option.label}</strong>
                      <small>{provider.name}</small>
                    </Select.ItemText>
                    <Select.ItemIndicator className='lr-model-check'>
                      <Check size={16} strokeWidth={2.4} aria-hidden='true' />
                    </Select.ItemIndicator>
                  </Select.Item>
                )
              })}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
