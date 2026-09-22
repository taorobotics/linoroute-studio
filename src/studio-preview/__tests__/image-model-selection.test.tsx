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
import { connectLive } from '../live-client'
import type { LiveJob } from '../live-types'
import { createMemoryStore } from '../memory-store'

const ids = [
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare-c',
  'gpt-image-2.5-sunburst-c',
]
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

function relay(available = ids, result?: Promise<Response>) {
  const submitted: unknown[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/v1/models')) {
      return Response.json({ data: available.map((id) => ({ id })) })
    }
    if (String(url).endsWith('/api/pricing')) {
      return Response.json({
        data: available.map((model_name) => ({ model_name })),
      })
    }
    if (init?.method === 'POST') {
      submitted.push(JSON.parse(String(init.body)))
      return (
        result ??
        Response.json({
          data: [{ url: 'https://media.example.com/result.png' }],
        })
      )
    }
    throw new Error('Unexpected request')
  })
  return submitted
}

async function connect() {
  fireEvent.click(screen.getByRole('button', { name: 'Configure API key' }))
  fireEvent.change(screen.getByLabelText('API Key'), {
    target: { value: 'sk-selection-test-only' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect to LinoRoute' }))
  await screen.findByText('Live mode · Usage is billed')
}

async function chooseFamily(name = 'GPT-image-2.5') {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  await user.click(screen.getByRole('option', { name }))
}

it('groups GPT-image-2 billing aliases into one entry without a version selector', async () => {
  const submitted = relay(['gpt-image-2', 'gpt-image-2-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  expect(
    within(screen.getByRole('listbox')).getAllByRole('option')
  ).toHaveLength(1)
  await user.click(screen.getByRole('option', { name: 'GPT-image-2' }))
  expect(
    screen.queryByRole('group', { name: 'Version' })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(screen.getByText('gpt-image-2-c', { exact: true })).toBeVisible()
  expect(submitted).toHaveLength(0)
})

it.each([
  ['Per request', 'gpt-image-2-c', '2:3'],
  ['By tokens', 'gpt-image-2', '2:3'],
])(
  'GPT-image-2 %s confirms and submits %s with a supported ratio',
  async (billing, modelId, ratio) => {
    const submitted = relay(['gpt-image-2', 'gpt-image-2-c'])
    const store = createMemoryStore()
    render(<StudioPreviewApp store={store} locale='en' />)
    await connect()
    fireEvent.click(screen.getByRole('radio', { name: billing }))
    fireEvent.click(screen.getByRole('button', { name: ratio }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: 'A portrait of a ceramic vase' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate with LinoRoute' })
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(billing)
    expect(dialog).toHaveTextContent(modelId)
    expect(dialog).not.toHaveTextContent('Version')
    expect(submitted).toHaveLength(0)
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm and generate' })
    )
    await screen.findByRole('img', { name: 'Generated image' })
    expect(submitted).toEqual([
      expect.objectContaining({
        model: modelId,
        size: ratio === '1:1' ? '1024x1024' : '1024x1536',
      }),
    ])
    fireEvent.click(screen.getByRole('button', { name: 'My works' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Open task' }))
    expect(screen.getByRole('radio', { name: billing })).toBeChecked()
    expect(screen.getByText(modelId, { exact: true })).toBeVisible()
  }
)

it('switching GPT-image-2 billing preserves a mutually supported portrait ratio and the prompt', async () => {
  relay(['gpt-image-2', 'gpt-image-2-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  fireEvent.click(screen.getByRole('button', { name: '2:3' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'Keep my vase' },
  })
  fireEvent.click(screen.getByRole('radio', { name: 'Per request' }))
  expect(screen.getByRole('button', { name: '2:3' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
    'Keep my vase'
  )
})

it('remembers GPT-image-2 and GPT-image-2.5 independently across switching and remount', async () => {
  relay([...ids, 'gpt-image-2', 'gpt-image-2-c'])
  const first = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'Sunburst' }))
  await chooseFamily('GPT-image-2')
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  await chooseFamily()
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  await chooseFamily('GPT-image-2')
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  first.unmount()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent(
    'GPT-image-2'
  )
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(
    screen.queryByRole('group', { name: 'Version' })
  ).not.toBeInTheDocument()
  expect(JSON.stringify({ ...localStorage })).not.toContain(
    'sk-selection-test-only'
  )
})

it('shows only authorized GPT-image-2 billing options and explains an unavailable saved choice', async () => {
  relay(['gpt-image-2', 'gpt-image-2-c'])
  const first = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  first.unmount()
  const submitted = relay(['gpt-image-2-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeDisabled()
  expect(
    screen.getByText(
      'Your saved option is unavailable for this key. Review the available selection before generating.'
    )
  ).toBeVisible()
  expect(submitted).toHaveLength(0)
})

it('defaults to token billing when it is the only authorized GPT-image-2 option', async () => {
  const submitted = relay(['gpt-image-2'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeDisabled()
  expect(screen.getByText('gpt-image-2', { exact: true })).toBeVisible()
  expect(submitted).toHaveLength(0)
})

it('locks GPT-image-2 billing while generation is pending', async () => {
  let complete!: (response: Response) => void
  const response = new Promise<Response>((resolve) => {
    complete = resolve
  })
  const submitted = relay(['gpt-image-2', 'gpt-image-2-c'], response)
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A white vase' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await waitFor(() => expect(submitted).toHaveLength(1))
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeDisabled()
  expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled()
  complete(
    Response.json({ data: [{ url: 'https://media.example.com/result.png' }] })
  )
  await screen.findByRole('img', { name: 'Generated image' })
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeEnabled()
})

it('keeps an explicitly selected GPT-image-2 billing draft on first connection without overwriting saved live preferences', async () => {
  const submitted = relay(['gpt-image-2', 'gpt-image-2-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  expect(screen.getByText('gpt-image-2', { exact: true })).toBeVisible()
  await chooseFamily('Nano Banana Pro')
  await chooseFamily('GPT-image-2')
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  await connect()
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(localStorage.getItem('linoroute-studio:gpt2:live')).toBeNull()
  expect(submitted).toHaveLength(0)
})

it('groups four available GPT-image-2.5 models into one entry and defaults to per-request billing', async () => {
  const submitted = relay()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Model' }))
  expect(
    within(screen.getByRole('listbox')).getAllByRole('option')
  ).toHaveLength(1)
  await user.click(screen.getByRole('option', { name: 'GPT-image-2.5' }))
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(
    screen.getByText('gpt-image-2.5-flare-c', { exact: true })
  ).toBeVisible()
  expect(submitted).toHaveLength(0)
})

it.each([
  ['Flare', 'Per request', 'gpt-image-2.5-flare-c'],
  ['Sunburst', 'Per request', 'gpt-image-2.5-sunburst-c'],
  ['Flare', 'By tokens', 'gpt-image-2.5-flare'],
  ['Sunburst', 'By tokens', 'gpt-image-2.5-sunburst'],
])(
  'confirms %s / %s and submits and saves the exact gateway ID %s',
  async (version, billing, modelId) => {
    const submitted = relay()
    const store = createMemoryStore()
    const save = vi.spyOn(store, 'put')
    render(<StudioPreviewApp store={store} locale='en' />)
    await connect()
    fireEvent.click(screen.getByRole('radio', { name: version }))
    fireEvent.click(screen.getByRole('radio', { name: billing }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: 'A ceramic cup' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate with LinoRoute' })
    )
    const confirmation = screen.getByRole('dialog')
    expect(confirmation).toHaveTextContent(version)
    expect(confirmation).toHaveTextContent(billing)
    expect(confirmation).toHaveTextContent(modelId)
    expect(submitted).toHaveLength(0)
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Confirm and generate' })
    )
    await screen.findByRole('img', { name: 'Generated image' })
    expect(submitted).toEqual([expect.objectContaining({ model: modelId })])
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({
      modelId,
      stage: 'ready',
    })
  }
)

it('restores the chosen version and billing after remount and does not store the key', async () => {
  relay()
  const first = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'Sunburst' }))
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  first.unmount()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(JSON.stringify({ ...localStorage })).not.toContain(
    'sk-selection-test-only'
  )
})

it('uses the available per-request option with a visible notice when a saved model loses access', async () => {
  relay()
  const first = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'Sunburst' }))
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  first.unmount()
  const submitted = relay(['gpt-image-2.5-flare-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(
    screen.getByText(
      'Your saved option is unavailable for this key. Review the available selection before generating.'
    )
  ).toBeVisible()
  expect(submitted).toHaveLength(0)
})

it('keeps both versions reachable when their available billing modes differ and explains the switch', async () => {
  relay(['gpt-image-2.5-flare-c', 'gpt-image-2.5-sunburst'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'Sunburst' }))
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeDisabled()
  expect(
    screen.getByText(
      'Billing changed to an available option for this version. Review it before generating.'
    )
  ).toBeVisible()
})

it('locks version and billing while generation is pending', async () => {
  let complete!: (response: Response) => void
  const response = new Promise<Response>((resolve) => {
    complete = resolve
  })
  relay(ids, response)
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
    target: { value: 'A ceramic cup' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate' }))
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: 'By tokens' })).toBeDisabled()
  )
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeDisabled()
  complete(
    Response.json({ data: [{ url: 'https://media.example.com/result.png' }] })
  )
  await screen.findByRole('img', { name: 'Generated image' })
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeEnabled()
})

it('previews the same choices without a key, remembers them and keeps them separate from live mode', async () => {
  const submitted = relay()
  const first = render(
    <StudioPreviewApp store={createMemoryStore()} locale='en' />
  )
  await chooseFamily()
  fireEvent.click(screen.getByRole('radio', { name: 'Sunburst' }))
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  await chooseFamily('Nano Banana Pro')
  await chooseFamily()
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeChecked()
  first.unmount()
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  await connect()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(submitted).toHaveLength(0)
})

it('translates version and billing controls into Chinese', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: '模型' }))
  await user.click(screen.getByRole('option', { name: 'GPT-image-2.5' }))
  expect(screen.getByRole('group', { name: '版本' })).toBeVisible()
  expect(screen.getByRole('group', { name: '计费方式' })).toBeVisible()
  expect(screen.getByRole('radio', { name: '按次计费' })).toBeChecked()
})

it('blocks regeneration of an unavailable historical model instead of silently substituting another model', async () => {
  const submitted = relay(['gpt-image-2.5-flare-c'])
  const store = createMemoryStore()
  const session = await connectLive(
    'sk-selection-test-only',
    new AbortController().signal
  )
  const job: LiveJob = {
    id: 'old-sunburst',
    clientRequestId: 'old-sunburst',
    owner: session.owner,
    modelId: 'gpt-image-2.5-sunburst',
    prompt: 'A saved cup',
    kind: 'image',
    live: true,
    stage: 'ready',
    assets: [],
    duration: 5,
    createdAt: 1,
  }
  await store.put(job)
  render(<StudioPreviewApp store={store} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'My works' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Open task' }))
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeDisabled()
  expect(
    screen.getByText(
      'This saved model is no longer available for this key. Select a model before generating.'
    )
  ).toBeVisible()
  await chooseFamily()
  expect(
    screen.getByRole('button', { name: 'Generate with LinoRoute' })
  ).toBeEnabled()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
  expect(submitted).toHaveLength(0)
})

it('ignores a corrupt preference rather than accepting an unknown model', async () => {
  localStorage.setItem('linoroute-studio:gpt25:live', 'unknown-paid-model')
  relay(['gpt-image-2.5-sunburst-c'])
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  expect(screen.getByRole('radio', { name: 'Sunburst' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Per request' })).toBeChecked()
})

it('can change billing when browser preference storage is blocked', async () => {
  relay()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  render(<StudioPreviewApp store={createMemoryStore()} locale='en' />)
  await connect()
  fireEvent.click(screen.getByRole('radio', { name: 'By tokens' }))
  expect(screen.getByRole('radio', { name: 'By tokens' })).toBeChecked()
  expect(screen.getByText('gpt-image-2.5-flare', { exact: true })).toBeVisible()
})
