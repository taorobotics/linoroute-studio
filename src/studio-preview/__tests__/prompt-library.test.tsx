/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'

import { StudioPreviewApp } from '../App'
import { createMemoryStore } from '../memory-store'

it.each([
  ['zh', '视频提示词库', '图片提示词库', 'Seedance 提示词', '新标签页'],
  ['en', 'Video prompts', 'Image prompts', 'Seedance prompts', 'new tab'],
] as const)(
  'keeps the safe Seedance external link in the top navigation across workspaces (%s)',
  async (locale, videoTab, imageTab, linkLabel, newTabLabel) => {
    const user = userEvent.setup()
    render(<StudioPreviewApp store={createMemoryStore()} locale={locale} />)
    const header = screen.getByRole('banner')
    const navigation = within(header).getByRole('navigation')
    const link = within(navigation).getByRole('link', { name: /SeedanceKit/ })
    expect(link).toHaveTextContent(linkLabel)
    expect(link).toHaveAttribute('href', 'https://seedancekit.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName(expect.stringContaining(newTabLabel))
    await user.click(screen.getByRole('button', { name: videoTab }))
    expect(link).toBeVisible()
    expect(screen.getAllByRole('link', { name: /SeedanceKit/ })).toHaveLength(1)
    expect(
      within(screen.getByRole('main')).queryByRole('link', {
        name: /SeedanceKit/,
      })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Awesome Video Prompts/ })
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: imageTab }))
    expect(link).toBeVisible()
    expect(screen.getAllByRole('link', { name: /SeedanceKit/ })).toHaveLength(1)
  }
)

it('shows licensed image cases and sends a selected prompt to image creation', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  expect(screen.getByRole('heading', { name: '图片提示词库' })).toBeVisible()
  expect(screen.getByText('精选案例 · 可追溯来源')).toBeVisible()
  expect(
    screen.getByRole('link', { name: /awesome-gpt-image-2/ })
  ).toHaveAttribute(
    'href',
    'https://github.com/freestylefly/awesome-gpt-image-2'
  )
  expect(screen.getAllByText('MIT').length).toBeGreaterThan(0)

  const card = await screen.findByRole('article', {
    name: '幼儿词汇拆解学习卡',
  })
  expect(card).toBeVisible()
  expect(
    within(card).getByRole('img', { name: '幼儿词汇拆解学习卡' })
  ).toHaveAttribute('loading', 'lazy')
  expect(within(card).getByText('GPT Image 2.5')).toBeVisible()
  expect(within(card).getByText('GPT Image 2')).toBeVisible()

  fireEvent.click(
    within(card).getByRole('button', { name: '查看大图：幼儿词汇拆解学习卡' })
  )
  const dialog = await screen.findByRole('dialog', {
    name: '图片预览：幼儿词汇拆解学习卡',
  })
  expect(
    within(dialog).getByRole('link', { name: '查看原始案例' })
  ).toHaveAttribute('href', expect.stringContaining('github.com'))
  fireEvent.click(within(dialog).getByRole('button', { name: '用于图片创作' }))
  expect(screen.getByRole('heading', { name: '图片创作' })).toBeVisible()
  expect(
    (screen.getByRole('textbox', { name: '提示词' }) as HTMLTextAreaElement)
      .value
  ).toContain('preschool/kindergarten')
})

it('opens images at their original aspect ratio and browses the current page', async () => {
  const user = userEvent.setup()
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  const firstCard = await screen.findByRole('article', {
    name: 'CHINA 中国味道 · 美食立体字',
  })
  const firstImage = within(firstCard).getByRole('img', {
    name: 'CHINA 中国味道 · 美食立体字',
  })
  const openPreview = within(firstCard).getByRole('button', {
    name: '查看大图：CHINA 中国味道 · 美食立体字',
  })

  await user.click(openPreview)
  const dialog = await screen.findByRole('dialog', {
    name: '图片预览：CHINA 中国味道 · 美食立体字',
  })
  expect(
    within(dialog).getByRole('img', { name: 'CHINA 中国味道 · 美食立体字' })
  ).toHaveAttribute('src', firstImage.getAttribute('src'))
  expect(
    within(dialog).getByRole('button', { name: '上一张图片' })
  ).toBeDisabled()

  await user.click(within(dialog).getByRole('button', { name: '下一张图片' }))
  expect(
    await screen.findByRole('dialog', {
      name: '图片预览：植物高级定制 · 卷心菜礼帽',
    })
  ).toBeVisible()

  await user.click(within(dialog).getByRole('button', { name: '关闭图片预览' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(openPreview).toHaveFocus()
})

it('filters the visual gallery by model and paginates the results', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  await screen.findByRole('article', { name: '幼儿词汇拆解学习卡' })

  expect(screen.getAllByRole('article')).toHaveLength(21)
  expect(screen.getByText(/270 个精选案例/)).toBeVisible()
  expect(
    screen.queryByRole('combobox', { name: '每页数量' })
  ).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Nano Banana Pro' }))
  expect(
    await screen.findByRole('article', {
      name: '带肖像和中英文定制的宽引言卡',
    })
  ).toBeVisible()
  expect(
    screen.queryByRole('article', { name: '幼儿词汇拆解学习卡' })
  ).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
  expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  expect(screen.getAllByRole('article')).toHaveLength(21)
})

it('shows playable sourced video cases and sends a prompt to video creation', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '视频提示词库' }))
  expect(screen.getByRole('heading', { name: '视频提示词库' })).toBeVisible()
  expect(
    screen.getByRole('link', { name: /Awesome Video Prompts/ })
  ).toHaveAttribute('href', 'https://github.com/ilkerzg/awesome-video-prompts')

  const card = await screen.findByRole('article', { name: 'Car Sketch 3D' })
  expect(
    within(card).getByRole('img', { name: 'Car Sketch 3D' })
  ).toHaveAttribute('loading', 'lazy')
  expect(within(card).getAllByText('Seedance 2.0').length).toBeGreaterThan(0)
  expect(
    within(card).getByRole('link', { name: '查看原始案例' })
  ).toHaveAttribute('href', expect.stringContaining('github.com'))

  fireEvent.click(within(card).getByRole('button', { name: '播放视频预览' }))
  expect(within(card).getByLabelText('Car Sketch 3D')).toHaveAttribute(
    'src',
    expect.stringMatching(/^https:\/\/.+\.mp4$/)
  )

  fireEvent.click(within(card).getByRole('button', { name: '用于视频创作' }))
  expect(screen.getByRole('heading', { name: '视频创作' })).toBeVisible()
  expect(
    (screen.getByRole('textbox', { name: '提示词' }) as HTMLTextAreaElement)
      .value
  ).toContain('A car sketch on paper. The camera pushes in.')
})

it('fills seven three-card rows and navigates video cases with numbered pages only', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '视频提示词库' }))
  await screen.findByRole('article', { name: 'Car Sketch 3D' })

  expect(screen.getAllByRole('article')).toHaveLength(21)
  expect(screen.getByText(/159 个精选案例/)).toBeVisible()
  expect(screen.getByRole('navigation', { name: '分页导航' })).toBeVisible()
  expect(
    screen.queryByRole('combobox', { name: '每页数量' })
  ).not.toBeInTheDocument()
  expect(screen.queryByText(/显示第 .* 条，共 .* 条/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '第 1 页' })).toHaveTextContent(
    /^1$/
  )
  expect(screen.getByRole('button', { name: '第 1 页' })).toHaveAttribute(
    'aria-current',
    'page'
  )

  fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
  expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  expect(
    screen.queryByRole('article', { name: 'Car Sketch 3D' })
  ).not.toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(21)
  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(
    'Dandelion Journey Multishot'
  )

  fireEvent.click(screen.getByRole('button', { name: '第 8 页' }))
  expect(screen.getAllByRole('article')).toHaveLength(12)
  expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: '第 1 页' }))
  expect(screen.getAllByRole('article')).toHaveLength(21)
  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(
    'Car Sketch 3D'
  )

  fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))

  fireEvent.click(screen.getByRole('button', { name: 'MiniMax H3' }))
  expect(
    await screen.findByRole('article', { name: 'Whisky Macro' })
  ).toBeVisible()
  expect(screen.getByRole('button', { name: '第 1 页' })).toHaveAttribute(
    'aria-current',
    'page'
  )

  expect(screen.getAllByRole('article')).toHaveLength(21)
})

it('keeps a selected prompt category when the interface language changes', async () => {
  render(<StudioPreviewApp store={createMemoryStore()} locale='zh' />)

  fireEvent.click(screen.getByRole('button', { name: '图片提示词库' }))
  await screen.findByRole('article', { name: '幼儿词汇拆解学习卡' })
  fireEvent.click(screen.getByRole('button', { name: '产品电商' }))
  fireEvent.click(screen.getByRole('button', { name: '切换语言' }))

  expect(
    screen.getByRole('article', { name: '旅行纪念珐琅徽章' })
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Products & E-commerce' })
  ).toHaveAttribute('aria-pressed', 'true')
})
