/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

it('offers corresponding source and licenses from the resources menu', async () => {
  const user = userEvent.setup()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await user.click(screen.getByRole('button', { name: 'Resources' }))
  expect(
    await screen.findByRole('link', { name: 'Source and licenses' })
  ).toHaveAttribute('href', '/source.html')
})

it.each(['image', 'video', 'works'] as const)(
  'opens the real key dialog from %s without demo identities or simulated requests',
  (initialRoute) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = createMemoryStore()
    const put = vi.spyOn(store, 'put')
    render(
      <StudioPreviewApp store={store} locale='en' initialRoute={initialRoute} />
    )
    expect(screen.queryByText('Demo mode · No charges')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Local preview. No credits used.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Local demo records')).not.toBeInTheDocument()
    const action = within(screen.getByRole('main')).getByRole('button', {
      name: 'Connect key to generate',
    })
    expect(action).toBeEnabled()
    fireEvent.click(action)
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText('API Key')).toHaveAttribute('type', 'password')
    expect(
      dialog.getByRole('note', { name: 'API Key storage notice' })
    ).toBeVisible()
    expect(
      dialog.queryByRole('button', { name: 'Use Demo A' })
    ).not.toBeInTheDocument()
    expect(
      dialog.queryByRole('button', { name: 'Use Demo B' })
    ).not.toBeInTheDocument()
    expect(
      dialog.queryByRole('button', { name: 'Preview an invalid key' })
    ).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  }
)

it('uses brand artwork for every video model in both the menu and selected state', async () => {
  const user = userEvent.setup()
  render(
    <StudioPreviewApp
      store={createMemoryStore()}
      locale='en'
      initialRoute='video'
    />
  )
  const picker = screen.getByRole('combobox', { name: 'Model' })
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
    const option = screen.getByRole('option', { name: label })
    expect(
      option.querySelector('.lr-model-mark img, .lr-model-mark svg path')
    ).not.toBeNull()
    await user.click(option)
    expect(picker).toHaveTextContent(label)
    expect(
      picker.querySelector('.lr-model-mark img, .lr-model-mark svg path')
    ).not.toBeNull()
  }
})
