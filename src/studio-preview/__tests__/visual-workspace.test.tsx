/*
Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

it.each([
  { label: 'Nano Banana Pro', logo: '/landing/model-logos/gemini.svg' },
  { label: 'GPT-image-2.5', logo: '/landing/model-logos/chatgpt.svg' },
])(
  'keeps $label selected with its logo and draft after switching workspaces',
  async ({ label, logo }) => {
    const user = userEvent.setup()
    render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: 'A ceramic bottle in sunlight' },
    })
    const picker = screen.getByRole('combobox', { name: 'Model' })
    await user.click(picker)
    await user.click(screen.getByRole('option', { name: label }))
    expect(picker).toHaveTextContent(label)
    expect(
      within(screen.getByRole('form', { name: 'Image controls' })).getByAltText(
        ''
      )
    ).toHaveAttribute('src', logo)
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
      'A ceramic bottle in sunlight'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
    expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
      'MiniMax H3'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Images' }))
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
      'A ceramic bottle in sunlight'
    )
    expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
      label
    )
  }
)

it('opens a branded model menu and keeps the chosen model visible', async () => {
  const user = userEvent.setup()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  const picker = screen.getByRole('combobox', { name: 'Model' })

  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await user.click(picker)

  const menu = await screen.findByRole('listbox')
  expect(
    within(menu).getByRole('option', { name: /GPT-image-2\.5/ })
  ).toHaveTextContent('OpenAI')
  await user.click(
    within(menu).getByRole('option', { name: /Nano Banana Pro/ })
  )

  expect(picker).toHaveTextContent('Nano Banana Pro')
  expect(picker).toHaveTextContent('Google')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it.each([
  { route: 'image' as const, sample: 'Image demonstration sample' },
  { route: 'video' as const, sample: 'Video demonstration sample' },
])(
  'starts the $route workspace without built-in sample artwork',
  ({ route, sample }) => {
    render(
      <StudioPreviewApp
        store={createMemoryStore()}
        locale='en'
        initialRoute={route}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Your next idea starts here' })
    ).toBeVisible()
    expect(screen.queryByLabelText(sample)).not.toBeInTheDocument()
    expect(screen.queryByText('Sample artwork')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Preview settings' })
    ).not.toBeInTheDocument()
  }
)

it.each([
  { route: 'image' as const, status: 'Image generation in progress' },
  { route: 'video' as const, status: 'Video generation in progress' },
])(
  'shows an immediate loading panel for $route generation',
  async ({ route, status }) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(
      <StudioPreviewApp
        store={createMemoryStore()}
        locale='en'
        initialOwner='demo-a'
        initialRoute={route}
      />
    )
    expect(
      screen.getByRole('button', { name: 'Preview generation' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Use a template' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply template' }))
    expect(
      screen.getByRole('button', { name: 'Preview generation' })
    ).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Preview generation' }))
    await screen.findByRole('button', { name: 'Simulate success' })
    expect(screen.getByRole('status', { name: status })).toBeVisible()
    expect(screen.getByText('Generating')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Preview generation' })
    ).toBeDisabled()
    expect(fetchSpy).not.toHaveBeenCalled()
  }
)

it('switches interface language without losing an edited prompt', async () => {
  const user = userEvent.setup()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: '手工陶瓷' },
  })
  await user.click(screen.getByRole('button', { name: 'Switch language' }))
  expect(screen.getByRole('textbox', { name: '提示词' })).toHaveValue(
    '手工陶瓷'
  )
  expect(
    screen.getByRole('heading', { name: '图片创作', level: 1 })
  ).toBeVisible()
})
