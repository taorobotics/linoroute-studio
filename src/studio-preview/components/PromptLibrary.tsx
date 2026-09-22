/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import { Dialog } from '@base-ui/react/dialog'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
  ImageOff,
  LoaderCircle,
  Maximize2,
  Play,
  RotateCcw,
  Search,
  Video,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaKind } from '../contracts'
import {
  getPromptSource,
  loadImagePromptCatalog,
  loadVideoPromptCatalog,
  PROMPT_SOURCES,
  type CuratedPrompt,
  type ImagePromptCatalogItem,
  type ImagePromptModel,
  type VideoPromptCatalogItem,
  type VideoPromptModel,
} from '../prompt-library-data'

// Seven complete rows in the three-column gallery.
const PAGE_SIZE = 21
const IMAGE_SOURCE_IDS = new Set([
  'awesome-gpt-image-2',
  'youmind-nano-banana-pro',
])
const IMAGE_MODELS: ImagePromptModel[] = [
  'GPT Image 2.5',
  'GPT Image 2',
  'Nano Banana Pro',
]
const VIDEO_SOURCE_IDS = new Set(['awesome-video-prompts'])
const VIDEO_MODELS: VideoPromptModel[] = [
  'MiniMax H3',
  'Seedance 2.0',
  'Seedance 2.0 Fast',
  'Kling Video 3.0',
  'Kling Video 3.0 Omni',
  'Veo 3.1',
  'Veo 3.1 Fast',
  'Grok Imagine Video',
]

type CatalogPrompt = ImagePromptCatalogItem | VideoPromptCatalogItem
type PromptModel = ImagePromptModel | VideoPromptModel
type PageToken = number | 'ellipsis-left' | 'ellipsis-right'

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages]
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis-left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }
  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    totalPages,
  ]
}

function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }
  const field = document.createElement('textarea')
  field.value = value
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()
  return Promise.resolve()
}

function isImageCatalogItem(
  item: CuratedPrompt | CatalogPrompt
): item is ImagePromptCatalogItem {
  return 'imageUrl' in item
}

function isVideoCatalogItem(
  item: CuratedPrompt | CatalogPrompt
): item is VideoPromptCatalogItem {
  return 'videoUrl' in item
}

function isCatalogItem(
  item: CuratedPrompt | CatalogPrompt
): item is CatalogPrompt {
  return isImageCatalogItem(item) || isVideoCatalogItem(item)
}

function supportsModel(item: CatalogPrompt, model: PromptModel): boolean {
  return (item.models as readonly PromptModel[]).includes(model)
}

function getPromptItemId(item: CatalogPrompt): string {
  return `${item.sourceId}:${item.id}`
}

function PromptPreviewImage(props: {
  item: ImagePromptCatalogItem
  alt: string
  unavailableLabel: string
  previewLabel: string
  viewLabel: string
  onPreview: () => void
}) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className='studio-prompt-visual'>
      {failed ? (
        <span
          className='studio-prompt-image-fallback'
          role='img'
          aria-label={props.unavailableLabel}
        >
          <ImageOff size={25} aria-hidden='true' />
          {props.unavailableLabel}
        </span>
      ) : (
        <button
          type='button'
          className='studio-prompt-image-button'
          aria-label={props.previewLabel}
          onClick={props.onPreview}
        >
          <img
            src={props.item.imageUrl}
            alt={props.alt}
            loading='lazy'
            decoding='async'
            referrerPolicy='no-referrer'
            onError={() => setFailed(true)}
          />
          <span className='studio-prompt-image-hint' aria-hidden='true'>
            <Maximize2 size={15} strokeWidth={1.9} />
            {props.viewLabel}
          </span>
        </button>
      )}
      <figcaption>
        {props.item.models.map((model) => (
          <span key={model}>{model}</span>
        ))}
      </figcaption>
    </figure>
  )
}

function PromptPreviewVideo(props: {
  item: VideoPromptCatalogItem
  alt: string
  playLabel: string
  unavailableLabel: string
}) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  let preview: React.ReactNode

  if (failed) {
    preview = (
      <span
        className='studio-prompt-image-fallback'
        role='img'
        aria-label={props.unavailableLabel}
      >
        <ImageOff size={25} aria-hidden='true' />
        {props.unavailableLabel}
      </span>
    )
  } else if (playing) {
    preview = (
      <video
        src={props.item.videoUrl}
        poster={props.item.videoPosterUrl}
        aria-label={props.alt}
        controls
        autoPlay
        muted
        loop
        playsInline
        preload='metadata'
        onError={() => setFailed(true)}
      />
    )
  } else {
    preview = (
      <>
        <img
          src={props.item.videoPosterUrl}
          alt={props.alt}
          loading='lazy'
          decoding='async'
          referrerPolicy='no-referrer'
          onError={() => setFailed(true)}
        />
        <button
          type='button'
          className='studio-prompt-play'
          aria-label={props.playLabel}
          onClick={() => setPlaying(true)}
        >
          <Play size={21} fill='currentColor' aria-hidden='true' />
        </button>
      </>
    )
  }

  return (
    <figure className='studio-prompt-visual studio-prompt-video-visual'>
      {preview}
      <figcaption>
        {props.item.models.map((model) => (
          <span key={model}>{model}</span>
        ))}
      </figcaption>
    </figure>
  )
}

export function PromptLibrary(props: {
  kind: MediaKind
  onUse: (prompt: string) => void
}) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.toLowerCase().startsWith('zh')
  const isImage = props.kind === 'image'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [model, setModel] = useState<'all' | PromptModel>('all')
  const [copiedId, setCopiedId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [previewedId, setPreviewedId] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [imagePrompts, setImagePrompts] = useState<ImagePromptCatalogItem[]>([])
  const [videoPrompts, setVideoPrompts] = useState<VideoPromptCatalogItem[]>([])
  const [catalogState, setCatalogState] = useState<
    'loading' | 'ready' | 'failed'
  >('loading')
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (catalogState !== 'loading') return
    const loader = isImage ? loadImagePromptCatalog() : loadVideoPromptCatalog()
    void loader.then(
      (items) => {
        if (isImage) {
          setImagePrompts(items as ImagePromptCatalogItem[])
        } else {
          setVideoPrompts(items as VideoPromptCatalogItem[])
        }
        setCatalogState('ready')
      },
      () => setCatalogState('failed')
    )
  }, [catalogState, isImage])

  const prompts = useMemo<CatalogPrompt[]>(
    () => (isImage ? imagePrompts : videoPrompts),
    [imagePrompts, isImage, videoPrompts]
  )
  const categories = useMemo(() => {
    const labels = new Map(
      prompts.map((item) => [
        item.categoryEn,
        isZh ? item.categoryZh : item.categoryEn,
      ])
    )
    return [
      { id: 'all', label: t('All prompts') },
      ...[...labels].map(([id, label]) => ({ id, label })),
    ]
  }, [isZh, prompts, t])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = prompts.filter((item) => {
    if (category !== 'all' && category !== item.categoryEn) return false
    if (
      model !== 'all' &&
      (!isCatalogItem(item) || !supportsModel(item, model))
    ) {
      return false
    }
    if (!normalizedQuery) return true
    const values = isZh
      ? [
          item.titleZh,
          item.descriptionZh,
          item.promptZh,
          ...item.tagsZh,
          getPromptSource(item.sourceId).name,
        ]
      : [
          item.titleEn,
          item.descriptionEn,
          item.promptEn,
          ...item.tagsEn,
          getPromptSource(item.sourceId).name,
        ]
    if (isCatalogItem(item)) {
      values.push(...item.models, item.creatorName)
    }
    if (isVideoCatalogItem(item)) {
      values.push(item.generationModel, item.originalSourceLabel)
    }
    return values.join(' ').toLocaleLowerCase().includes(normalizedQuery)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1))
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE
  const visiblePrompts = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const visibleImages = visiblePrompts.filter(isImageCatalogItem)
  const previewIndex = visibleImages.findIndex(
    (item) => getPromptItemId(item) === previewedId
  )
  const previewItem = previewIndex >= 0 ? visibleImages[previewIndex] : null
  const pageTokens = getPageTokens(safeCurrentPage, totalPages)
  const sourceIds = isImage ? IMAGE_SOURCE_IDS : VIDEO_SOURCE_IDS
  const sources = PROMPT_SOURCES.filter((source) => sourceIds.has(source.id))
  const promptModels = isImage ? IMAGE_MODELS : VIDEO_MODELS
  const Icon = isImage ? ImageIcon : Video

  const goToPage = (nextPage: number) => {
    if (nextPage === safeCurrentPage || nextPage < 1 || nextPage > totalPages) {
      return
    }
    setCurrentPage(nextPage)
    setExpandedId('')
    setPreviewedId('')
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches
      gridRef.current?.scrollIntoView?.({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <section className='studio-prompt-library'>
      <header className='studio-library-hero'>
        <div className='studio-library-heading'>
          <span className='studio-library-kicker'>
            <Icon size={16} strokeWidth={1.8} aria-hidden='true' />
            {t('Open-source curation · Traceable sources')}
          </span>
          <h1>
            {t(isImage ? 'Image prompt library' : 'Video prompt library')}
          </h1>
          <p>
            {t(
              isImage
                ? 'Browse real example images with reusable prompts, model compatibility and source attribution.'
                : 'Browse playable example videos with reusable prompts, studio-model compatibility and complete source attribution.'
            )}
          </p>
        </div>
        <label className='studio-library-search'>
          <Search size={18} aria-hidden='true' />
          <span className='studio-sr-only'>
            {t(isImage ? 'Search image prompts' : 'Search video prompts')}
          </span>
          <input
            type='search'
            value={query}
            aria-label={t(
              isImage ? 'Search image prompts' : 'Search video prompts'
            )}
            placeholder={t('Search by scene, style or subject')}
            onChange={(event) => {
              setQuery(event.target.value)
              setCurrentPage(1)
              setExpandedId('')
              setPreviewedId('')
            }}
          />
          <kbd>{filtered.length}</kbd>
        </label>
      </header>

      <div
        className='studio-library-sources'
        aria-label={t('Open-source sources')}
      >
        <span>{t('Licensed sources · Exact case links retained')}</span>
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target='_blank'
            rel='noopener noreferrer'
          >
            {source.name}
            <small>{source.license}</small>
            <ExternalLink size={13} aria-hidden='true' />
          </a>
        ))}
      </div>

      <div className='studio-library-model-row'>
        <span>{t('Compatible models')}</span>
        <div
          role='group'
          aria-label={t(isImage ? 'Image models' : 'Video models')}
        >
          <button
            type='button'
            aria-pressed={model === 'all'}
            onClick={() => {
              setModel('all')
              setCurrentPage(1)
              setExpandedId('')
              setPreviewedId('')
            }}
          >
            {t('All models')}
          </button>
          {promptModels.map((item) => (
            <button
              key={item}
              type='button'
              aria-pressed={model === item}
              onClick={() => {
                setModel(item)
                setCurrentPage(1)
                setExpandedId('')
                setPreviewedId('')
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className='studio-library-toolbar'>
        <div
          className='studio-library-filters'
          role='group'
          aria-label={t('Prompt categories')}
        >
          {categories.map((option) => (
            <button
              key={option.id}
              type='button'
              aria-pressed={category === option.id}
              onClick={() => {
                setCategory(option.id)
                setCurrentPage(1)
                setExpandedId('')
                setPreviewedId('')
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p>
          {t('{{count}} curated cases', {
            count: filtered.length,
          })}
        </p>
      </div>

      {catalogState === 'loading' ? (
        <div className='studio-library-loading' role='status'>
          <LoaderCircle size={24} aria-hidden='true' />
          <span>
            {t(
              isImage
                ? 'Loading licensed image cases'
                : 'Loading licensed video cases'
            )}
          </span>
        </div>
      ) : null}

      {catalogState === 'failed' ? (
        <div className='studio-library-empty' role='status'>
          <ImageOff size={24} aria-hidden='true' />
          <h2>
            {t(
              isImage
                ? 'The image catalog could not be loaded'
                : 'The video catalog could not be loaded'
            )}
          </h2>
          <p>
            {t(
              'Your creation workspace is unaffected. Retry the catalog only.'
            )}
          </p>
          <button type='button' onClick={() => setCatalogState('loading')}>
            <RotateCcw size={15} aria-hidden='true' />
            {t('Retry catalog')}
          </button>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div
          ref={gridRef}
          className='studio-library-grid'
          data-kind={props.kind}
        >
          {visiblePrompts.map((item, index) => {
            const title = isZh ? item.titleZh : item.titleEn
            const description = isZh ? item.descriptionZh : item.descriptionEn
            const prompt = isZh ? item.promptZh : item.promptEn
            const tags = isZh ? item.tagsZh : item.tagsEn
            const itemCategory = isZh ? item.categoryZh : item.categoryEn
            const source = getPromptSource(item.sourceId)
            const itemInstanceId = `${item.sourceId}:${item.id}:${pageStart + index}`
            const isExpanded = expandedId === itemInstanceId
            return (
              <article
                key={itemInstanceId}
                className='studio-prompt-card'
                data-tone={item.tone}
                data-visual={isCatalogItem(item) ? 'true' : 'false'}
                aria-label={title}
              >
                {isImageCatalogItem(item) ? (
                  <PromptPreviewImage
                    item={item}
                    alt={isZh ? item.imageAltZh : item.imageAltEn}
                    unavailableLabel={t('Preview unavailable')}
                    previewLabel={t('Open image preview: {{title}}', {
                      title,
                    })}
                    viewLabel={t('View full image')}
                    onPreview={() => {
                      setPreviewedId(getPromptItemId(item))
                      setPreviewOpen(true)
                    }}
                  />
                ) : null}
                {isVideoCatalogItem(item) ? (
                  <PromptPreviewVideo
                    item={item}
                    alt={isZh ? item.videoAltZh : item.videoAltEn}
                    playLabel={t('Play video preview')}
                    unavailableLabel={t('Preview unavailable')}
                  />
                ) : null}
                <div className='studio-prompt-card-body'>
                  <div className='studio-prompt-card-index'>
                    <span>
                      {String(pageStart + index + 1).padStart(2, '0')}
                    </span>
                    <span>{itemCategory}</span>
                  </div>
                  <h2>{title}</h2>
                  <p className='studio-prompt-description'>{description}</p>
                  <blockquote data-expanded={isExpanded ? 'true' : 'false'}>
                    {prompt}
                  </blockquote>
                  {isCatalogItem(item) && prompt.length > 220 ? (
                    <button
                      type='button'
                      className='studio-prompt-expand'
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedId(isExpanded ? '' : itemInstanceId)
                      }
                    >
                      {t(isExpanded ? 'Collapse prompt' : 'Expand full prompt')}
                      <ChevronDown size={14} aria-hidden='true' />
                    </button>
                  ) : null}
                  <div className='studio-prompt-tags'>
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className='studio-prompt-attribution'>
                    <span>
                      {t('Source')}: <strong>{source.name}</strong>
                    </span>
                    {isCatalogItem(item) ? (
                      <a
                        href={item.sourceCaseUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={t('View original case')}
                      >
                        {t('Original case')}
                        <ExternalLink size={12} aria-hidden='true' />
                      </a>
                    ) : null}
                    <a
                      href={source.licenseUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={t('View {{license}} license for {{title}}', {
                        license: source.license,
                        title,
                      })}
                    >
                      {source.license}
                    </a>
                  </div>
                  {isCatalogItem(item) ? (
                    <p className='studio-prompt-creator'>
                      {isVideoCatalogItem(item) ? (
                        <>
                          {t('Generated with')}:{' '}
                          <strong>{item.generationModel}</strong>
                          <span aria-hidden='true'> · </span>
                        </>
                      ) : null}
                      {t('Original author')}:{' '}
                      <a
                        href={item.creatorUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {item.creatorName}
                      </a>
                      {isVideoCatalogItem(item) ? (
                        <>
                          <span aria-hidden='true'> · </span>
                          {t('Source record')}: {item.originalSourceLabel}
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <div className='studio-prompt-actions'>
                    <button
                      type='button'
                      className='studio-prompt-copy'
                      onClick={() => {
                        void copyText(prompt).then(() => {
                          setCopiedId(itemInstanceId)
                          window.setTimeout(() => setCopiedId(''), 1600)
                        })
                      }}
                    >
                      {copiedId === itemInstanceId ? (
                        <Check size={16} aria-hidden='true' />
                      ) : (
                        <Copy size={16} aria-hidden='true' />
                      )}
                      {t(
                        copiedId === itemInstanceId ? 'Copied' : 'Copy prompt'
                      )}
                    </button>
                    <button
                      type='button'
                      className='studio-prompt-use'
                      onClick={() => props.onUse(prompt)}
                    >
                      {t(
                        isImage
                          ? 'Use for image creation'
                          : 'Use for video creation'
                      )}
                      <ArrowRight size={16} aria-hidden='true' />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {filtered.length === 0 && catalogState === 'ready' ? (
        <div className='studio-library-empty' role='status'>
          <Search size={24} aria-hidden='true' />
          <h2>{t('No matching prompts')}</h2>
          <p>{t('Try another keyword or choose all prompts.')}</p>
          <button
            type='button'
            onClick={() => {
              setQuery('')
              setCategory('all')
              setModel('all')
              setCurrentPage(1)
              setPreviewedId('')
            }}
          >
            {t('Clear filters')}
          </button>
        </div>
      ) : null}

      {filtered.length > 0 && catalogState === 'ready' ? (
        <div className='studio-library-pagination-bar'>
          <nav
            className='studio-library-pagination'
            aria-label={t('Pagination navigation')}
          >
            <button
              type='button'
              className='studio-page-arrow'
              aria-label={t('Previous page')}
              disabled={safeCurrentPage === 1}
              onClick={() => goToPage(safeCurrentPage - 1)}
            >
              <ChevronLeft size={17} aria-hidden='true' />
            </button>
            {pageTokens.map((token) =>
              typeof token === 'number' ? (
                <button
                  key={token}
                  type='button'
                  className='studio-page-number'
                  aria-label={t('Page {{page}}', { page: token })}
                  aria-current={token === safeCurrentPage ? 'page' : undefined}
                  onClick={() => goToPage(token)}
                >
                  {token}
                </button>
              ) : (
                <span
                  key={token}
                  className='studio-page-ellipsis'
                  aria-hidden='true'
                >
                  ···
                </span>
              )
            )}
            <button
              type='button'
              className='studio-page-arrow'
              aria-label={t('Next page')}
              disabled={safeCurrentPage === totalPages}
              onClick={() => goToPage(safeCurrentPage + 1)}
            >
              <ChevronRight size={17} aria-hidden='true' />
            </button>
          </nav>
        </div>
      ) : null}

      <Dialog.Root
        open={previewOpen && Boolean(previewItem)}
        onOpenChange={setPreviewOpen}
        onOpenChangeComplete={(open) => {
          if (!open) setPreviewedId('')
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className='studio-image-preview-backdrop' />
          {/* The popup must survive its exit animation to release the backdrop. */}
          <Dialog.Popup className='studio-image-preview-dialog'>
            {previewItem ? (
              <>
                <Dialog.Title className='studio-sr-only'>
                  {t('Image preview: {{title}}', {
                    title: isZh ? previewItem.titleZh : previewItem.titleEn,
                  })}
                </Dialog.Title>
                <Dialog.Description className='studio-sr-only'>
                  {t(
                    'The full image is displayed at its original aspect ratio.'
                  )}
                </Dialog.Description>

                <div className='studio-image-preview-topbar'>
                  <span>
                    {t('Image {{current}} of {{total}}', {
                      current: previewIndex + 1,
                      total: visibleImages.length,
                    })}
                  </span>
                  <Dialog.Close
                    className='studio-image-preview-close'
                    aria-label={t('Close image preview')}
                  >
                    <X size={19} aria-hidden='true' />
                  </Dialog.Close>
                </div>

                <div className='studio-image-preview-stage'>
                  <img
                    src={previewItem.imageUrl}
                    alt={isZh ? previewItem.imageAltZh : previewItem.imageAltEn}
                    referrerPolicy='no-referrer'
                  />
                </div>

                <footer className='studio-image-preview-footer'>
                  <div className='studio-image-preview-caption'>
                    <strong>
                      {isZh ? previewItem.titleZh : previewItem.titleEn}
                    </strong>
                    <span>
                      {isZh ? previewItem.categoryZh : previewItem.categoryEn}
                    </span>
                  </div>
                  <div className='studio-image-preview-nav'>
                    <button
                      type='button'
                      aria-label={t('Previous image')}
                      disabled={previewIndex <= 0}
                      onClick={() => {
                        const previousItem = visibleImages[previewIndex - 1]
                        if (previousItem) {
                          setPreviewedId(getPromptItemId(previousItem))
                        }
                      }}
                    >
                      <ChevronLeft size={17} aria-hidden='true' />
                      {t('Previous')}
                    </button>
                    <button
                      type='button'
                      aria-label={t('Next image')}
                      disabled={previewIndex >= visibleImages.length - 1}
                      onClick={() => {
                        const nextItem = visibleImages[previewIndex + 1]
                        if (nextItem) setPreviewedId(getPromptItemId(nextItem))
                      }}
                    >
                      {t('Next')}
                      <ChevronRight size={17} aria-hidden='true' />
                    </button>
                  </div>
                </footer>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <p className='studio-library-disclaimer'>
        {t(
          isImage
            ? 'Images and prompts are shown from attributed open-source catalogs. Check publicity, trademark and model-provider rules before commercial use.'
            : 'Videos and prompts are shown from an attributed open-source gallery. Compatibility labels are recommendations, not claims about the model that generated each video. Review publicity, trademark and provider rules before commercial use.'
        )}
      </p>
    </section>
  )
}
