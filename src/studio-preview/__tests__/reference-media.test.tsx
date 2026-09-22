/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:local-test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
const show = (video = false) =>
  render(
    <StudioPreviewApp
      demoEnabled
      store={createMemoryStore()}
      locale='en'
      initialRoute={video ? 'video' : 'image'}
    />
  )
const input = () =>
  within(screen.getByRole('form', { name: /controls/ })).getByLabelText(
    'Choose reference files'
  )
const choose = (files: File[]) =>
  fireEvent.change(input(), { target: { files } })

it('previews selected local images, preserves them across navigation and releases removed URLs', () => {
  const view = show()
  choose([new File(['image'], 'stone.png', { type: 'image/png' })])
  expect(screen.getByRole('img', { name: 'stone.png' })).toHaveAttribute(
    'src',
    'blob:local-test'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Images' }))
  expect(screen.getByText('stone.png')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Remove stone.png' }))
  expect(screen.queryByText('stone.png')).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-test')
  choose([new File(['image'], 'other.png', { type: 'image/png' })])
  view.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
})

it('shows a readable warning when an accepted image cannot be decoded', () => {
  show()
  choose([new File(['not an image'], 'broken.png', { type: 'image/png' })])
  fireEvent.error(screen.getByRole('img', { name: 'broken.png' }))
  expect(screen.getByRole('alert')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Remove broken.png' })
  ).toBeEnabled()
})

it.each([
  ['active.svg', 'image/svg+xml', 3],
  ['clip.mp4', 'video/mp4', 3],
  ['empty.png', 'image/png', 0],
  ['large.png', 'image/png', 21 * 1024 * 1024],
])(
  'rejects unsafe, incompatible, empty or oversized input: %s',
  (name, type, size) => {
    show()
    const file = new File(['x'], String(name), { type: String(type) })
    Object.defineProperty(file, 'size', { value: size })
    choose([file])
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some files were not added'
    )
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  }
)

it('accepts video/audio reference drops only in video mode and limits the batch to six files', () => {
  show(true)
  const zone = screen.getByRole('group', { name: 'Local reference media' })
  fireEvent.drop(zone, {
    dataTransfer: {
      files: [
        new File(['x'], 'motion.mp4', { type: 'video/mp4' }),
        new File(['x'], 'sound.wav', { type: 'audio/wav' }),
        ...Array.from(
          { length: 5 },
          (_, i) => new File(['x'], `ref${i}.png`, { type: 'image/png' })
        ),
      ],
    },
  })
  expect(screen.getByText('motion.mp4')).toBeVisible()
  expect(screen.getByText('sound.wav')).toBeVisible()
  expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(6)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Some files were not added'
  )
})

it('opens a template drawer, confirms replacement, and Escape preserves the draft and restores focus', async () => {
  const user = userEvent.setup()
  show()
  const prompt = screen.getByRole('textbox', { name: 'Prompt' })
  fireEvent.change(prompt, { target: { value: 'Keep my draft' } })
  const trigger = screen.getByRole('button', { name: 'Use a template' })
  await user.click(trigger)
  const drawer = screen.getByRole('dialog', { name: 'Prompt templates' })
  expect(
    within(drawer).getAllByRole('button', { name: /Select template:/ })
  ).toHaveLength(3)
  await user.click(
    within(drawer).getByRole('button', { name: 'Apply template' })
  )
  expect(screen.getByText('Replace your current prompt?')).toBeVisible()
  expect(prompt).toHaveValue('Keep my draft')
  await user.click(screen.getByRole('button', { name: 'Replace prompt' }))
  expect(prompt).not.toHaveValue('Keep my draft')
  await user.click(trigger)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
