/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'

import { ReferenceImageInput } from '../components/ReferenceImageInput'
import { createStudioI18n } from '../i18n'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13])
const file = (name = 'ref.png') => new File([png], name, { type: 'image/png' })
function Harness(props: {
  disabled?: boolean
  maxFiles?: number
  allowMask?: boolean
}) {
  const [files, setFiles] = useState<File[]>([])
  const [mask, setMask] = useState<File>()
  const inputProps = {
    files,
    onChange: setFiles,
    disabled: Boolean(props.disabled),
    onBusyChange: () => undefined,
    maxFiles: props.maxFiles,
    allowMask: props.allowMask,
    mask,
    onMaskChange: setMask,
  }
  return (
    <I18nextProvider i18n={createStudioI18n('en')}>
      <ReferenceImageInput {...inputProps} />
    </I18nextProvider>
  )
}
afterEach(() => vi.unstubAllGlobals())
function decoder() {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 50, height: 80, close: vi.fn() }))
  )
}

it('rejects a disguised SVG even if the browser can decode it as an image', async () => {
  decoder()
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('Add reference images'), {
    target: {
      files: [
        new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'fake.png', {
          type: 'image/png',
        }),
      ],
    },
  })
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'cannot be decoded'
  )
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

it('supports drop and local paste, removes each image and releases its object URL', async () => {
  decoder()
  const revoked = vi.spyOn(URL, 'revokeObjectURL')
  render(<Harness />)
  const drop = screen.getByRole('button', {
    name: 'Click, drop or paste images here',
  })
  fireEvent.drop(drop, { dataTransfer: { files: [file('drop.png')] } })
  const image = await screen.findByRole('img', { name: 'drop.png' })
  await waitFor(() => expect(image).toHaveAttribute('src'))
  const url = image.getAttribute('src')
  fireEvent.paste(drop, { clipboardData: { files: [file('paste.png')] } })
  await screen.findByRole('button', { name: 'Remove paste.png' })
  fireEvent.click(screen.getByRole('button', { name: 'Remove drop.png' }))
  expect(
    screen.queryByRole('img', { name: 'drop.png' })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'paste.png' })).toBeVisible()
  expect(revoked).toHaveBeenCalledWith(url)
})

it.each(['count', 'size', 'type', 'empty'] as const)(
  'rejects %s violations without discarding accepted images',
  async (kind) => {
    decoder()
    render(<Harness />)
    const input = screen.getByLabelText('Add reference images')
    fireEvent.change(input, { target: { files: [file('keep.png')] } })
    await screen.findByRole('button', { name: 'Remove keep.png' })
    let files = [file('a.png'), file('b.png'), file('c.png'), file('d.png')]
    if (kind === 'size') {
      files = [
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
          type: 'image/png',
        }),
      ]
    }
    if (kind === 'type') {
      files = [new File(['gif'], 'a.gif', { type: 'image/gif' })]
    }
    if (kind === 'empty') files = [new File([], 'a.png', { type: 'image/png' })]
    fireEvent.change(input, { target: { files } })
    expect(await screen.findByRole('alert')).toHaveTextContent('up to 4')
    expect(screen.getAllByRole('img')).toHaveLength(1)
  }
)

it('rejects failed decoding and accepts a later valid file', async () => {
  vi.stubGlobal(
    'createImageBitmap',
    vi
      .fn()
      .mockRejectedValueOnce(new Error('broken'))
      .mockResolvedValue({ width: 1, height: 1, close: vi.fn() })
  )
  render(<Harness />)
  const input = screen.getByLabelText('Add reference images')
  fireEvent.change(input, { target: { files: [file()] } })
  await screen.findByRole('alert')
  fireEvent.change(input, { target: { files: [file('valid.png')] } })
  await screen.findByRole('button', { name: 'Remove valid.png' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('does not accept dropped files while disabled', () => {
  decoder()
  render(<Harness disabled />)
  fireEvent.drop(
    screen.getByRole('button', { name: 'Click, drop or paste images here' }),
    { dataTransfer: { files: [file()] } }
  )
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Add reference images')).toBeDisabled()
})

it('supports the GPT Image 2.5 limit and an optional same-size PNG mask', async () => {
  decoder()
  render(<Harness maxFiles={16} allowMask />)
  const references = Array.from({ length: 5 }, (_, index) =>
    file(`reference-${index}.png`)
  )
  fireEvent.change(screen.getByLabelText('Add reference images'), {
    target: { files: references },
  })
  await screen.findByText('5 / 16')
  fireEvent.change(screen.getByLabelText('Add mask image'), {
    target: { files: [file('mask.png')] },
  })
  expect(
    await screen.findByRole('button', { name: 'Remove mask.png' })
  ).toBeEnabled()
})
