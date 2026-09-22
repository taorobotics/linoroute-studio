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

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

it.each(['image', 'video', 'works'] as const)(
  'keeps design-review controls out of the normal %s workspace',
  (initialRoute) => {
    render(
      <StudioPreviewApp
        store={createMemoryStore()}
        locale='en'
        initialRoute={initialRoute}
      />
    )
    expect(screen.queryByText('View the design system')).not.toBeInTheDocument()
    expect(screen.queryByText('For visual review')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Configure API key',
      })
    ).toBeEnabled()
  }
)

it.each(['zh', 'en'] as const)(
  'displays GPT-image-2 in the %s demo picker',
  (locale) => {
    render(<StudioPreviewApp store={createMemoryStore()} locale={locale} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('GPT-image-2')
  }
)

it('starts in a clearly labelled demo with no network calls', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')

  try {
    render(
      <StudioPreviewApp demoEnabled store={createMemoryStore()} locale='en' />
    )

    expect(screen.getByText('Demo mode · No charges')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Images' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Videos' })).toBeVisible()
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  } finally {
    fetchSpy.mockRestore()
  }
})

it.each(['zh', 'en'] as const)(
  'uses full video model names in the %s picker and preserves the existing selections',
  async (locale) => {
    const user = userEvent.setup()
    render(<StudioPreviewApp store={createMemoryStore()} locale={locale} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: locale === 'zh' ? '视频创作' : 'Videos',
      })
    )
    const picker = screen.getByRole('combobox', {
      name: locale === 'zh' ? '模型' : 'Model',
    })
    for (const label of [
      'MiniMax H3',
      'Seedance 2.5',
      'Seedance 2.0',
      'Seedance 2.0 Fast',
      'Kling Video 3.0',
      'Veo 3.1',
      'Gemini Omni',
      'Grok Imagine Video',
    ]) {
      await user.click(picker)
      await user.click(screen.getByRole('option', { name: label }))
      expect(picker).toHaveTextContent(label)
    }
  }
)

it('can still select a no-charge demo identity from the connection dialog', () => {
  render(
    <StudioPreviewApp demoEnabled store={createMemoryStore()} locale='en' />
  )

  fireEvent.click(screen.getByRole('button', { name: 'Configure API key' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')

  fireEvent.click(screen.getByRole('button', { name: 'Use Demo A' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('Demo A')).toBeVisible()
})

it('keeps workspace navigation in the header and preserves drafts when switching', () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)

  const navigation = within(screen.getByRole('banner')).getByRole(
    'navigation',
    {
      name: 'Creative studio',
    }
  )
  const images = within(navigation).getByRole('button', { name: 'Images' })
  const videos = within(navigation).getByRole('button', { name: 'Videos' })
  expect(images).toHaveAttribute('aria-pressed', 'true')
  expect(
    within(navigation).queryByRole('button', { name: 'Chat' })
  ).not.toBeInTheDocument()
  expect(
    within(navigation).getByRole('button', { name: 'Image prompts' })
  ).toBeEnabled()
  expect(
    within(navigation).getByRole('button', { name: 'Video prompts' })
  ).toBeEnabled()
  expect(
    within(navigation).getByRole('button', { name: 'My works' })
  ).toBeEnabled()
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'Keep this image draft' },
  })
  fireEvent.click(videos)
  expect(videos).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('heading', { name: 'Video creation' })).toBeVisible()
  fireEvent.click(images)
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Keep this image draft'
  )
})

it.each(['zh', 'en'] as const)(
  'exposes main-site destinations directly in the %s navigation without replacing the studio',
  (locale) => {
    render(<StudioPreviewApp store={createMemoryStore()} locale={locale} />)
    const navigation = within(screen.getByRole('banner')).getByRole(
      'navigation'
    )
    const destinations = [
      [
        locale === 'zh' ? 'LinoRoute 主站' : 'LinoRoute.com',
        'https://linoroute.com/',
      ],
      [
        locale === 'zh' ? '模型广场' : 'Model marketplace',
        'https://linoroute.com/pricing',
      ],
      [locale === 'zh' ? '控制台' : 'Console', 'https://linoroute.com/console'],
    ]

    for (const [name, href] of destinations) {
      const link = within(navigation).getByRole('link', { name })
      expect(link).toBeVisible()
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  }
)

it('preserves existing platform links in the header resources popover', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)

  const trigger = within(screen.getByRole('banner')).getByRole('button', {
    name: 'Resources',
  })
  fireEvent.click(trigger)
  const resources = within(
    await screen.findByRole('dialog', { name: 'Resources' })
  )
  expect(
    resources.getByRole('link', { name: 'Model marketplace' })
  ).toHaveAttribute('href', 'https://linoroute.com/pricing')
  expect(resources.getByRole('link', { name: 'Console' })).toHaveAttribute(
    'href',
    'https://linoroute.com/console'
  )
  expect(resources.getByRole('link', { name: 'API docs' })).toHaveAttribute(
    'href',
    'https://ninoroute.com/tutorials/00-intro'
  )
})

it('keeps a visible warning when durable browser storage is unavailable', () => {
  render(
    <StudioPreviewApp
      store={createMemoryStore()}
      locale='en'
      storageStatus='memory'
    />
  )

  expect(
    screen.getByText(
      'Browser storage is unavailable. Closing this page will lose unsaved records.'
    )
  ).toBeVisible()
})
