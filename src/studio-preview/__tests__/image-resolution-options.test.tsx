/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { expect, it, vi } from 'vitest'

import {
  ImageOutputSettings,
  ImageRequestSettings,
} from '../components/ImageCreationSettings'
import { createStudioI18n } from '../i18n'
import { LIVE_MODELS } from '../live-models'

function fixtureModel(id: string) {
  const model = LIVE_MODELS.find((entry) => entry.id === id)
  if (!model) throw new Error('Missing fixture model')
  return model
}

it('GPT 2 per-request exposes documented landscape and portrait sizes alongside verified tiers', () => {
  const onChange = vi.fn()
  const model = fixtureModel('gpt-image-2-c')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        ratio='1:1'
        size='1024x1024'
        disabled={false}
        onChange={onChange}
      />
    </I18nextProvider>
  )
  fireEvent.click(screen.getByRole('radio', { name: /2048 × 2048.*2K/ }))
  expect(onChange).toHaveBeenLastCalledWith('1:1', '2048x2048')
  fireEvent.click(screen.getByRole('button', { name: '3:2' }))
  expect(onChange).toHaveBeenLastCalledWith('3:2', '1536x1024')
  fireEvent.click(screen.getByRole('button', { name: '2:3' }))
  expect(onChange).toHaveBeenLastCalledWith('2:3', '1024x1536')
  fireEvent.click(screen.getByRole('button', { name: '16:9' }))
  expect(onChange).toHaveBeenLastCalledWith('16:9', '')
})

it('Nano Banana Pro exposes three native resolution tiers and keeps its default at 1K', () => {
  const onChange = vi.fn()
  const model = fixtureModel('gemini-3-pro-image-preview')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        ratio='1:1'
        size='1K'
        disabled={false}
        onChange={onChange}
      />
    </I18nextProvider>
  )
  expect(screen.getByRole('radio', { name: '1K' })).toBeChecked()
  expect(screen.getAllByRole('radio')).toHaveLength(3)
  fireEvent.click(screen.getByRole('radio', { name: '4K' }))
  expect(onChange).toHaveBeenCalledWith('1:1', '4K')
})

it('GPT 2.5 per-request never advertises a true 2K or 4K tier', () => {
  const model = fixtureModel('gpt-image-2.5-flare-c')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        ratio='16:9'
        size='2048x1152'
        disabled={false}
        onChange={vi.fn()}
      />
    </I18nextProvider>
  )
  expect(screen.getByText('Requested size')).toBeInTheDocument()
  expect(screen.queryByRole('radio', { name: /2K|4K/ })).not.toBeInTheDocument()
})

it('Nano retains the explicitly chosen resolution when changing aspect ratio', () => {
  const onChange = vi.fn()
  const model = fixtureModel('gemini-3-pro-image-preview')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        ratio='1:1'
        size='4K'
        disabled={false}
        onChange={onChange}
      />
    </I18nextProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: '16:9' }))
  expect(onChange).toHaveBeenCalledWith('16:9', '4K')
})

it.each(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'])(
  '%s labels its documented 1K and 2K square sizes',
  (id) => {
    const model = fixtureModel(id)
    render(
      <I18nextProvider i18n={createStudioI18n('en')}>
        <ImageOutputSettings
          model={model}
          ratio='1:1'
          size='1024x1024'
          disabled={false}
          onChange={vi.fn()}
        />
      </I18nextProvider>
    )
    expect(screen.getByRole('radio', { name: /1024 × 1024.*1K/ })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: /2048 × 2048.*2K/ })
    ).not.toBeChecked()
  }
)

it('GPT Image 2 text generation exposes every documented size, including auto', () => {
  const model = fixtureModel('gpt-image-2')
  const onChange = vi.fn()
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        mode='text'
        ratio='1:1'
        size='1024x1024'
        disabled={false}
        onChange={onChange}
      />
    </I18nextProvider>
  )

  expect(screen.getByRole('radio', { name: /1024 × 1024.*1K/ })).toBeChecked()
  expect(screen.getByRole('radio', { name: /2048 × 2048.*2K/ })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: '16:9' }))
  expect(onChange).toHaveBeenCalledWith('16:9', '2048x1152')
  fireEvent.click(screen.getByRole('button', { name: '9:16' }))
  expect(onChange).toHaveBeenCalledWith('9:16', '')
  fireEvent.click(screen.getByRole('button', { name: 'Automatic' }))
  expect(onChange).toHaveBeenCalledWith('auto', 'auto')
})

it('GPT Image 2 editing offers explicit output canvases plus automatic sizing', () => {
  const model = fixtureModel('gpt-image-2')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageOutputSettings
        model={model}
        mode='image'
        ratio='3:2'
        size='1536x1024'
        disabled={false}
        onChange={vi.fn()}
      />
    </I18nextProvider>
  )

  expect(screen.getByRole('radio', { name: /1536 × 1024.*1K/ })).toBeChecked()
  expect(screen.queryByRole('button', { name: '16:9' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Automatic' })).toBeEnabled()
  expect(
    screen.getByText(/size controls the generated canvas/i)
  ).toBeInTheDocument()
})

it('GPT Image 2 exposes complete quality and generation-format controls with one output', () => {
  const model = fixtureModel('gpt-image-2')
  render(
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ImageRequestSettings
        model={model}
        mode='text'
        quality='auto'
        format='png'
        disabled={false}
        onQualityChange={vi.fn()}
        onFormatChange={vi.fn()}
      />
    </I18nextProvider>
  )

  expect(
    screen.getByRole('group', { name: 'Image quality' })
  ).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Automatic' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Low' })).toBeEnabled()
  expect(screen.getByRole('radio', { name: 'Medium' })).toBeEnabled()
  expect(screen.getByRole('radio', { name: 'High' })).toBeEnabled()
  expect(
    screen.getByRole('group', { name: 'Image format' })
  ).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'PNG' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'JPEG' })).toBeEnabled()
  expect(screen.getByRole('radio', { name: 'WebP' })).toBeEnabled()
  expect(screen.getByText('1 image')).toBeInTheDocument()
})

it.each(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'])(
  '%s exposes the documented quality, format, background and moderation controls for editing',
  (id) => {
    const model = fixtureModel(id)
    const onFormatChange = vi.fn()
    const onBackgroundChange = vi.fn()
    const props = {
      model,
      mode: 'image' as const,
      quality: 'auto' as const,
      format: 'jpeg' as const,
      background: 'auto' as const,
      moderation: 'auto' as const,
      disabled: false,
      onQualityChange: vi.fn(),
      onFormatChange,
      onBackgroundChange,
      onModerationChange: vi.fn(),
    }
    render(
      <I18nextProvider i18n={createStudioI18n('en')}>
        <ImageRequestSettings {...props} />
      </I18nextProvider>
    )

    const quality = screen.getByRole('group', { name: 'Image quality' })
    expect(within(quality).getAllByRole('radio')).toHaveLength(6)
    expect(
      within(quality).getByRole('radio', { name: 'Extra high' })
    ).toBeEnabled()
    expect(
      within(quality).getByRole('radio', { name: 'Maximum' })
    ).toBeEnabled()
    expect(screen.getByRole('radio', { name: 'JPEG' })).toBeChecked()
    expect(
      screen.getByRole('group', { name: 'Background' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Content moderation' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Transparent' }))
    expect(onBackgroundChange).toHaveBeenCalledWith('transparent')
    expect(onFormatChange).toHaveBeenCalledWith('png')
    expect(screen.getByText('1 image')).toBeInTheDocument()
  }
)
