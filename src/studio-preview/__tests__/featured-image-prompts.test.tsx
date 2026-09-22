/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

it.each([
  ['zh', '图片提示词库', 'CHINA 中国味道 · 美食立体字'],
  ['en', 'Image prompts', 'CHINA · Sculpted food typography'],
] as const)(
  'features CHINA first when opening the image gallery (%s)',
  async (locale, tab, title) => {
    render(<StudioPreviewApp store={createMemoryStore()} locale={locale} />)
    fireEvent.click(screen.getByRole('button', { name: tab }))
    const featured = await screen.findByRole('article', { name: title })
    expect(screen.getAllByRole('article')[0]).toBe(featured)
    expect(within(featured).getByRole('img')).toHaveAttribute(
      'src',
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260922-china-food-type.png'
    )
    expect(within(featured).getByText('Source terms')).toHaveAttribute(
      'href',
      'https://www.aiwind.org/terms'
    )
  }
)

it('finds all ten adapted cases and transfers the CHINA prompt to creation', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)
  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  await screen.findByRole('article', { name: 'CHINA 中国味道 · 美食立体字' })
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'AiWind' },
  })
  expect(screen.getAllByRole('article')).toHaveLength(10)
  const featured = screen.getAllByRole('article')[0]
  expect(within(featured).getByText(/imagegen/)).toBeVisible()
  fireEvent.click(
    within(featured).getByRole('button', { name: '用于图片创作' })
  )
  const prompt = screen.getByRole('textbox', {
    name: '提示词',
  }) as HTMLTextAreaElement
  expect(prompt.value).toContain('CHINA')
})
