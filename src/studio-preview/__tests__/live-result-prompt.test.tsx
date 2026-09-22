/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'

import { LiveWorkspace } from '../components/LiveWorkspace'
import type { MediaKind } from '../contracts'
import { LIVE_MODELS } from '../live-models'
import type { LiveJob, LiveSession } from '../live-types'
import { createMemoryStore } from '../memory-store'

it.each<MediaKind>(['image', 'video'])(
  'does not repeat the %s prompt below the result, while preserving the editable draft and saved history',
  async (kind) => {
    const session: LiveSession = {
      key: 'result-display-test-only',
      owner: 'live:result-display',
      models: LIVE_MODELS,
    }
    const job: LiveJob = {
      id: 'saved-result',
      clientRequestId: 'saved-result',
      live: true,
      owner: session.owner,
      kind,
      modelId:
        kind === 'image'
          ? 'gpt-image-2.5-sunburst'
          : 'doubao-seedance-2-5-260628',
      generationMode: 'text',
      prompt:
        'A blue ceramic cup in warm sunlight. Preserve the delicate texture and soft shadows.',
      stage: 'ready',
      assets: [
        {
          url:
            kind === 'image'
              ? 'https://media.example.com/result.png'
              : 'https://media.example.com/result.mp4',
        },
      ],
      createdAt: 100,
      duration: 5,
    }
    const store = createMemoryStore()
    await store.put(job)
    const props = { kind, session, store, active: true }
    const view = render(<LiveWorkspace {...props} />)
    view.rerender(<LiveWorkspace {...props} openJob={{ job, nonce: 1 }} />)
    const result = screen.getByRole('region', { name: 'Generation result' })
    expect(within(result).queryByText(job.prompt)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(
      job.prompt
    )
    expect(
      within(result).getByRole('link', { name: 'Open original / download' })
    ).toHaveAttribute('href', job.assets[0].url)
    const media =
      kind === 'image'
        ? within(result).getByRole('img', { name: 'Generated image' })
        : within(result).getByLabelText('Generated video')
    expect(media).toHaveAttribute('src', job.assets[0].url)
    expect(await store.list(session.owner)).toEqual([job])
  }
)
