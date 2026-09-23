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
    const previewLabel =
      locale === 'zh' ? `查看大图：${title}` : `Open image preview: ${title}`
    fireEvent.click(
      within(featured).getByRole('button', {
        name: previewLabel,
      })
    )
    const dialog = await screen.findByRole('dialog', {
      name: locale === 'zh' ? `图片预览：${title}` : `Image preview: ${title}`,
    })
    expect(within(dialog).getByText('Source terms')).toHaveAttribute(
      'href',
      'https://www.aiwind.org/terms'
    )
  }
)

it('finds the adapted CHINA case and transfers its prompt to creation', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)
  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  await screen.findByRole('article', { name: 'CHINA 中国味道 · 美食立体字' })
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'CHINA' },
  })
  const featured = screen.getByRole('article', {
    name: 'CHINA 中国味道 · 美食立体字',
  })
  fireEvent.click(
    within(featured).getByRole('button', {
      name: '查看大图：CHINA 中国味道 · 美食立体字',
    })
  )
  const dialog = await screen.findByRole('dialog', {
    name: '图片预览：CHINA 中国味道 · 美食立体字',
  })
  fireEvent.click(within(dialog).getByRole('button', { name: '用于图片创作' }))
  const prompt = screen.getByRole('textbox', {
    name: '提示词',
  }) as HTMLTextAreaElement
  expect(prompt.value).toContain('CHINA')
})

it('shows the second generated batch with its OSS preview', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)
  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: '日落飞行 · 橘猫的城市冒险' },
  })
  const newCase = await screen.findByRole('article', {
    name: '日落飞行 · 橘猫的城市冒险',
  })
  expect(within(newCase).getByRole('img')).toHaveAttribute(
    'src',
    'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-golden-hour-cat-flight.png'
  )
  fireEvent.click(
    within(newCase).getByRole('button', {
      name: '查看大图：日落飞行 · 橘猫的城市冒险',
    })
  )
  expect(
    await screen.findByRole('dialog', {
      name: '图片预览：日落飞行 · 橘猫的城市冒险',
    })
  ).toBeVisible()
})
