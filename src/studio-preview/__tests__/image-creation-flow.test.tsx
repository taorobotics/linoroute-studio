/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13])

function setup() {
  localStorage.setItem('linoroute-studio:gpt25:demo', 'gpt-image-2.5-flare-c')
  localStorage.setItem('linoroute-studio:image-family:demo', 'gpt25')
  // Image decoding and network are browser/external boundaries; the form and client stay real.
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 64, height: 96, close: vi.fn() }))
  )
  const sent: [string, RequestInit][] = []
  const transport = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, init) => {
      const target = String(url)
      const ids = [
        'gpt-image-2.5-flare',
        'gpt-image-2.5-sunburst',
        'gpt-image-2.5-flare-c',
        'gemini-3-pro-image-preview',
      ]
      if (target.endsWith('/v1/models')) {
        return Response.json({ data: ids.map((id) => ({ id })) })
      }
      if (target.endsWith('/api/pricing')) {
        return Response.json({
          data: ids.map((model_name) => ({ model_name })),
        })
      }
      if (target === '/studio-storage/v1/uploads') {
        const purpose = JSON.parse(String(init?.body)).purpose
        return Response.json({
          uploadUrl: `https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/${purpose}/test.png?signature=put`,
          readUrl: `https://linoroute.oss-cn-guangzhou.aliyuncs.com/studio/${purpose}/test.png?signature=get`,
          objectKey: `studio/${purpose}/test.png`,
          expiresAt: Date.now() + 604_800_000,
        })
      }
      if (target.includes('aliyuncs.com') && target.includes('signature=put')) {
        return new Response(null, { status: 200 })
      }
      if (target === 'https://example.com/result.png') {
        return new Response(png, {
          headers: { 'Content-Type': 'image/png' },
        })
      }
      if (!init) throw new Error('Missing request')
      sent.push([target, init])
      return Response.json({
        data: [{ url: 'https://example.com/result.png' }],
      })
    })
  const store = createMemoryStore()
  const saved = vi.spyOn(store, 'put')
  render(<StudioPreviewApp store={store} locale='en' />)
  return { sent, transport, saved }
}

async function connect() {
  fireEvent.click(screen.getByRole('button', { name: 'Configure API key' }))
  fireEvent.change(screen.getByLabelText('API Key'), {
    target: { value: 'sk-local-test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect to LinoRoute' }))
  await screen.findByText('Live mode · Usage is billed')
}

it('keeps anonymous image draft through key connection and submits only after confirmation', async () => {
  const { sent, transport, saved } = setup()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Image to image' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'Replace the background' },
  })
  fireEvent.change(screen.getByLabelText('Add reference images'), {
    target: { files: [new File([png], 'portrait.png', { type: 'image/png' })] },
  })
  await screen.findByRole('button', { name: 'Remove portrait.png' })
  expect(transport).not.toHaveBeenCalled()
  await connect()
  expect(screen.getByRole('radio', { name: 'Image to image' })).toBeChecked()
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Replace the background'
  )
  expect(
    screen.getByRole('button', { name: 'Remove portrait.png' })
  ).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('Image to image')).toBeVisible()
  expect(dialog.getByText('1024 × 1024')).toBeVisible()
  expect(sent).toHaveLength(0)
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByRole('img', { name: 'Generated image' })
  expect(sent).toHaveLength(1)
  expect(sent[0][0]).toBe('/studio-api/v1/images/edits')
  expect((sent[0][1].body as FormData).getAll('image')).toHaveLength(1)
  expect(saved.mock.calls.at(-1)?.[0]).toMatchObject({
    generationMode: 'image',
    referenceCount: 1,
    requestedSize: '1024x1024',
  })
  expect(JSON.stringify(saved.mock.calls)).not.toContain('portrait.png')
  fireEvent.click(screen.getByRole('button', { name: 'My works' }))
  expect(await screen.findByRole('article')).toHaveTextContent('Image to image')
  fireEvent.click(screen.getByRole('button', { name: 'Open task' }))
  expect(screen.getByRole('radio', { name: 'Image to image' })).toBeChecked()
  expect(
    screen.queryByRole('button', { name: 'Remove portrait.png' })
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeDisabled()
})

it('image mode needs a reference, while switching to text excludes the retained files', async () => {
  const { sent } = setup()
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A cup' },
  })
  fireEvent.click(screen.getByRole('radio', { name: 'Image to image' }))
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Add reference images'), {
    target: { files: [new File([png], 'cup.png', { type: 'image/png' })] },
  })
  await screen.findByRole('button', { name: 'Remove cup.png' })
  fireEvent.click(screen.getByRole('radio', { name: 'Text to image' }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByRole('img', { name: 'Generated image' })
  expect(sent[0][0]).toBe('/studio-api/v1/images/generations')
})

it('switching to per-request keeps portrait ratio but replaces the experimental pixel size', () => {
  setup()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  fireEvent.click(screen.getByRole('button', { name: '9:16' }))
  expect(
    screen.getByText(
      'Choose a size explicitly. This ratio only has an experimental 4K preset.'
    )
  ).toBeVisible()
  expect(screen.getByRole('radio', { name: /2160 × 3840/ })).not.toBeChecked()
  fireEvent.click(screen.getByRole('radio', { name: /2160 × 3840/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'Per request' }))
  expect(
    screen.queryByRole('radio', { name: /2160 × 3840/ })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /1152 × 2048/ })).toBeChecked()
  expect(screen.getByRole('button', { name: '9:16' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(
    screen.getByText(
      'Output settings changed to match this model. Review them before generating.'
    )
  ).toBeVisible()
})

it('per-request widescreen shows actual-size caveat before confirmation and keeps the selected billing ID', async () => {
  const { sent } = setup()
  fireEvent.click(screen.getByRole('button', { name: '16:9' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A cup on a table' },
  })
  const caveat =
    'Per-request models use this size as an aspect-ratio reference. Actual image dimensions may differ.'
  expect(screen.getByText(caveat)).toBeVisible()
  expect(screen.getByRole('group', { name: 'Requested size' })).toBeVisible()
  await connect()
  expect(screen.getByRole('button', { name: '16:9' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText(caveat)).toBeVisible()
  expect(dialog.getByText('2048 × 1152')).toBeVisible()
  expect(sent).toHaveLength(0)
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByRole('img', { name: 'Generated image' })
  expect(sent).toHaveLength(1)
  expect(JSON.parse(String(sent[0][1].body))).toMatchObject({
    model: 'gpt-image-2.5-flare-c',
    size: '2048x1152',
    n: 1,
  })
})

it('disconnect removes reference files from the new anonymous session', async () => {
  setup()
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Image to image' }))
  fireEvent.change(screen.getByLabelText('Add reference images'), {
    target: { files: [new File([png], 'private.png', { type: 'image/png' })] },
  })
  await screen.findByRole('button', { name: 'Remove private.png' })
  fireEvent.click(screen.getByRole('button', { name: 'API connected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect API key' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Remove private.png' })
    ).not.toBeInTheDocument()
  )
})

it('Nano 4K survives connection, is disclosed before payment, and is kept in history', async () => {
  const { sent, saved } = setup()
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  await user.click(screen.getByRole('option', { name: 'Nano Banana Pro' }))
  fireEvent.click(screen.getByRole('radio', { name: '4K' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A ceramic cup' },
  })
  await connect()
  expect(screen.getByRole('radio', { name: '4K' })).toBeChecked()
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('4K')).toBeVisible()
  expect(
    dialog.getByText(
      '4K may take longer and cost more. Review the resolution and billing before confirming.'
    )
  ).toBeVisible()
  expect(sent).toHaveLength(0)
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm and generate' }))
  await screen.findByRole('img', { name: 'Generated image' })
  expect(sent).toHaveLength(1)
  expect(
    JSON.parse(String(sent[0][1].body)).generationConfig.imageConfig
  ).toEqual({ aspectRatio: '1:1', imageSize: '4K' })
  expect(
    saved.mock.calls.some(
      ([job]) => 'requestedSize' in job && job.requestedSize === '4K'
    )
  ).toBe(true)
})
