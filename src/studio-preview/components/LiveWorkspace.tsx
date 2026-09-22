/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { Dialog } from '@base-ui/react/dialog'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LocalStore, MediaKind, PromptSeed } from '../contracts'
import {
  GPT_IMAGE_FAMILIES,
  gptImageOption,
  initialImageModelId,
} from '../gpt-image-selection'
import {
  GPT25_PER_REQUEST_IDS,
  imageOutputOptions,
  imagePromptLimit,
  imageReferenceLimit,
  imageRequestOptions,
  supportsImageEditing,
  supportsImageMask,
  type ImageBackground,
  type ImageFormat,
  type ImageModeration,
  type ImageQuality,
} from '../image-output-specs'
import { LIVE_MODELS } from '../live-models'
import type { LiveJob, LiveModel, LiveSession } from '../live-types'
import { useLiveTask } from '../use-live-task'
import {
  defaultVideoDuration,
  defaultVideoResolution,
  isSeedance25,
  isVideoResolution,
  supportsGeneratedAudio,
  supportsVideoGenerationModes,
  videoResolutionOptions,
} from '../video-output-specs'
import {
  ImageGenerationMode,
  ImageOutputSettings,
  ImageRequestSettings,
} from './ImageCreationSettings'
import { LiveResultPanel } from './LiveResult'
import { ReferenceImageInput } from './ReferenceImageInput'
import { SplitWorkspace } from './SplitWorkspace'
import { StudioImageModelSelect } from './StudioImageModelSelect'
import { StudioModelSelect } from './StudioModelSelect'
import { TemplateDrawer } from './TemplateDrawer'
import {
  VideoAudioSettings,
  VideoGenerationMode,
  VideoResolutionSettings,
} from './VideoCreationSettings'

const ANONYMOUS_MODELS = [
  ...LIVE_MODELS.filter(
    (model) => model.id === 'gpt-image-2-c' || model.id === 'gpt-image-2'
  ),
  ...LIVE_MODELS.filter(
    (model) => model.id !== 'gpt-image-2-c' && model.id !== 'gpt-image-2'
  ),
]

const qualityLabelsForConfirmation: Record<ImageQuality, string> = {
  auto: 'Automatic',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Maximum',
}

const backgroundLabelsForConfirmation: Record<ImageBackground, string> = {
  auto: 'Automatic',
  opaque: 'Opaque',
  transparent: 'Transparent',
}

const moderationLabelsForConfirmation: Record<ImageModeration, string> = {
  auto: 'Automatic',
  low: 'Low',
}

function defaultWorkspaceSize(
  model?: LiveModel,
  mode: 'text' | 'image' = 'text'
): string {
  return (
    defaultVideoResolution(model) ??
    imageOutputOptions(model, mode)[0]?.size ??
    ''
  )
}

export function LiveWorkspace(props: {
  kind: MediaKind
  active: boolean
  session: LiveSession | null
  onChooseKey?: () => void
  store: LocalStore
  openJob?: { job: LiveJob; nonce: number }
  promptSeed?: PromptSeed
  onBrowsePrompts?: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const selectionMode = props.session ? 'live' : 'demo'
  const models = (props.session?.models ?? ANONYMOUS_MODELS).filter(
    (m) => m.kind === props.kind
  )
  const [modelId, setModelId] = useState(() =>
    props.kind === 'image'
      ? initialImageModelId(models, selectionMode)
      : (models[0]?.id ?? '')
  )
  const model = models.find((m) => m.id === modelId)
  const seedance25 = isSeedance25(model)
  const configurableVideo = supportsVideoGenerationModes(model)
  const videoResolutions = videoResolutionOptions(model)
  const imageChoice = gptImageOption(model)
  const approximateSize = GPT25_PER_REQUEST_IDS.includes(modelId)
  const [prompt, setPrompt] = useState('')
  const [ratio, setRatio] = useState(model?.ratios[0] ?? '1:1')
  const [size, setSize] = useState(() => defaultWorkspaceSize(model))
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [quality, setQuality] = useState<ImageQuality>(
    () => imageRequestOptions(model)?.defaultQuality ?? 'auto'
  )
  const [format, setFormat] = useState<ImageFormat>(
    () => imageRequestOptions(model)?.defaultFormat ?? 'png'
  )
  const [background, setBackground] = useState<ImageBackground>(
    () => imageRequestOptions(model)?.defaultBackground ?? 'auto'
  )
  const [moderation, setModeration] = useState<ImageModeration>(
    () => imageRequestOptions(model)?.defaultModeration ?? 'auto'
  )
  const [outputNotice, setOutputNotice] = useState('')
  const [modelChosen, setModelChosen] = useState(false)
  const [duration, setDuration] = useState(defaultVideoDuration(model))
  const [generateAudio, setGenerateAudio] = useState(
    supportsGeneratedAudio(model)
  )
  const [images, setImages] = useState<File[]>([])
  const [mask, setMask] = useState<File>()
  const [checkingFiles, setCheckingFiles] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [pane, setPane] = useState('create')
  const polls = useRef(0)
  const task = useLiveTask(props.session, props.store)
  const [previousSession, setPreviousSession] = useState(props.session)
  if (previousSession !== props.session) {
    setPreviousSession(props.session)
    // First connection keeps the anonymous draft. A changed/disconnected key is
    // remounted by App so files/results never move between credential namespaces.
    const available = models.some((entry) => entry.id === modelId)
    if (props.session && (!modelChosen || !available)) {
      const nextId =
        props.kind === 'image'
          ? initialImageModelId(models, 'live')
          : (models[0]?.id ?? '')
      const next = models.find((entry) => entry.id === nextId)
      if (nextId !== modelId) {
        setModelId(nextId)
        setRatio(next?.ratios[0] ?? '1:1')
        setSize(defaultWorkspaceSize(next))
        setQuality(imageRequestOptions(next)?.defaultQuality ?? 'auto')
        setFormat(imageRequestOptions(next)?.defaultFormat ?? 'png')
        setBackground(imageRequestOptions(next)?.defaultBackground ?? 'auto')
        setModeration(imageRequestOptions(next)?.defaultModeration ?? 'auto')
        setDuration(defaultVideoDuration(next))
        setGenerateAudio(supportsGeneratedAudio(next))
        setMask(undefined)
        setOutputNotice(
          available
            ? 'Output settings changed to match this model. Review them before generating.'
            : 'Your selected model is unavailable for this key. Review the replacement model and output settings before generating.'
        )
      }
    }
  }
  const [previousJob, setPreviousJob] = useState(props.openJob)
  if (previousJob !== props.openJob) {
    setPreviousJob(props.openJob)
    const job = props.openJob?.job
    if (job && job.kind === props.kind && job.owner === props.session?.owner) {
      task.select(job)
      setPane('result')
      setModelId(job.modelId)
      setPrompt(job.prompt)
      const next = models.find((m) => m.id === job.modelId)
      setRatio(
        next?.ratios.includes(job.previewLayout ?? '')
          ? (job.previewLayout ?? next?.ratios[0] ?? '1:1')
          : (next?.ratios[0] ?? '1:1')
      )
      setDuration(
        next?.durations?.includes(job.duration)
          ? job.duration
          : defaultVideoDuration(next)
      )
      setGenerateAudio(
        supportsGeneratedAudio(next)
          ? (job.requestedGenerateAudio ?? true)
          : false
      )
      setImages([])
      setMask(undefined)
      const nextMode = job.generationMode ?? 'text'
      setMode(nextMode)
      const output = imageOutputOptions(next, nextMode)
      let restoredSize =
        output.find(
          (entry) =>
            entry.size === job.requestedSize &&
            entry.ratio === job.previewLayout
        )?.size ??
        output.find(
          (entry) => entry.ratio === job.previewLayout && !entry.experimental
        )?.size ??
        output[0]?.size ??
        ''
      if (videoResolutionOptions(next).length) {
        restoredSize = isVideoResolution(next, job.requestedSize)
          ? job.requestedSize
          : (defaultVideoResolution(next) ?? '')
      }
      setSize(restoredSize)
      const requestOptions = imageRequestOptions(next, nextMode)
      setQuality(
        requestOptions?.qualities.includes(job.requestedQuality ?? 'auto')
          ? (job.requestedQuality ?? 'auto')
          : (requestOptions?.defaultQuality ?? 'auto')
      )
      setFormat(
        requestOptions?.formats.includes(job.requestedFormat ?? 'png')
          ? (job.requestedFormat ?? 'png')
          : (requestOptions?.defaultFormat ?? 'png')
      )
      setBackground(
        requestOptions?.backgrounds.includes(job.requestedBackground ?? 'auto')
          ? (job.requestedBackground ?? 'auto')
          : (requestOptions?.defaultBackground ?? 'auto')
      )
      setModeration(
        requestOptions?.moderations.includes(job.requestedModeration ?? 'auto')
          ? (job.requestedModeration ?? 'auto')
          : (requestOptions?.defaultModeration ?? 'auto')
      )
      setOutputNotice(
        job.generationMode === 'image'
          ? 'Choose reference images again before generating. Source files are not kept in history.'
          : ''
      )
    }
  }
  const [previousPromptSeed, setPreviousPromptSeed] = useState(props.promptSeed)
  if (previousPromptSeed !== props.promptSeed) {
    setPreviousPromptSeed(props.promptSeed)
    if (props.promptSeed?.kind === props.kind) {
      setPrompt(props.promptSeed.prompt)
      setPane('create')
    }
  }
  useEffect(() => {
    if (
      !props.active ||
      task.busy ||
      task.issue ||
      task.job?.stage !== 'running' ||
      polls.current >= 150
    ) {
      return
    }
    const job = task.job
    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        polls.current++
        void task.resume(job)
      }
    }, 4000)
    const visible = () => {
      if (!document.hidden && polls.current < 150) void task.resume(job)
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [props.active, task])
  const pending = task.busy || task.job?.stage === 'running'
  const disabled = pending || confirmation || checkingFiles
  const promptLimit = imagePromptLimit(model)
  const outputs = imageOutputOptions(model, mode)
  const requestOptions = imageRequestOptions(model, mode)
  const validOutput =
    (videoResolutions.length > 0 && isVideoResolution(model, size)) ||
    (!videoResolutions.length &&
      (!outputs.length ||
        outputs.some((entry) => entry.ratio === ratio && entry.size === size)))
  const validReference =
    props.kind === 'image'
      ? mode === 'text' || (supportsImageEditing(model) && images.length > 0)
      : !configurableVideo || mode === 'text' || images.length === 1
  const validRequest =
    !requestOptions ||
    (requestOptions.qualities.includes(quality) &&
      (!requestOptions.formats.length ||
        requestOptions.formats.includes(format)) &&
      (!requestOptions.backgrounds.length ||
        requestOptions.backgrounds.includes(background)) &&
      (!requestOptions.moderations.length ||
        requestOptions.moderations.includes(moderation)) &&
      !(background === 'transparent' && format === 'jpeg'))
  const canGenerate =
    !!model &&
    !!prompt.trim() &&
    prompt.length <= promptLimit &&
    validOutput &&
    validReference &&
    validRequest &&
    !disabled
  const selectModel = (value: string) => {
    const next = models.find((m) => m.id === value)
    if (!next || pending) return
    setModelChosen(true)
    setModelId(value)
    const nextRatio = next.ratios.includes(ratio) ? ratio : next.ratios[0]
    const nextOutputs = imageOutputOptions(next, mode)
    const retained = nextOutputs.find(
      (entry) => entry.ratio === nextRatio && entry.size === size
    )
    const nextOutput =
      retained ??
      nextOutputs.find(
        (entry) => entry.ratio === nextRatio && !entry.experimental
      ) ??
      nextOutputs.find((entry) => !entry.experimental)
    let nextSize = nextOutput?.size ?? ''
    if (videoResolutionOptions(next).length) {
      nextSize = isVideoResolution(next, size)
        ? size
        : (defaultVideoResolution(next) ?? '')
    }
    setRatio(nextOutput?.ratio ?? nextRatio)
    setSize(nextSize)
    const nextRequest = imageRequestOptions(next, mode)
    setQuality((current) =>
      nextRequest?.qualities.includes(current)
        ? current
        : (nextRequest?.defaultQuality ?? 'auto')
    )
    setFormat((current) =>
      nextRequest?.formats.includes(current)
        ? current
        : (nextRequest?.defaultFormat ?? 'png')
    )
    setBackground((current) =>
      nextRequest?.backgrounds.includes(current)
        ? current
        : (nextRequest?.defaultBackground ?? 'auto')
    )
    setModeration((current) =>
      nextRequest?.moderations.includes(current)
        ? current
        : (nextRequest?.defaultModeration ?? 'auto')
    )
    if (!supportsImageMask(next)) setMask(undefined)
    if (props.kind === 'video') setImages([])
    setGenerateAudio(supportsGeneratedAudio(next))
    setOutputNotice(
      nextRatio !== ratio || nextSize !== size
        ? 'Output settings changed to match this model. Review them before generating.'
        : ''
    )
    setDuration((current) =>
      next.durations?.includes(current) ? current : defaultVideoDuration(next)
    )
  }
  const selectImageMode = (nextMode: 'text' | 'image') => {
    if (!model || disabled) return
    const nextOutputs = imageOutputOptions(model, nextMode)
    const retained = nextOutputs.find(
      (entry) => entry.ratio === ratio && entry.size === size
    )
    const fallback =
      retained ??
      nextOutputs.find((entry) => !entry.experimental) ??
      nextOutputs[0]
    setMode(nextMode)
    setRatio(fallback?.ratio ?? model.ratios[0] ?? '1:1')
    setSize(fallback?.size ?? '')
    const nextRequest = imageRequestOptions(model, nextMode)
    setQuality((current) =>
      nextRequest?.qualities.includes(current)
        ? current
        : (nextRequest?.defaultQuality ?? 'auto')
    )
    setFormat((current) =>
      nextRequest?.formats.includes(current)
        ? current
        : (nextRequest?.defaultFormat ?? 'png')
    )
    setBackground((current) =>
      nextRequest?.backgrounds.includes(current)
        ? current
        : (nextRequest?.defaultBackground ?? 'auto')
    )
    setModeration((current) =>
      nextRequest?.moderations.includes(current)
        ? current
        : (nextRequest?.defaultModeration ?? 'auto')
    )
    setOutputNotice('')
  }
  const selectVideoMode = (nextMode: 'text' | 'image') => {
    if (!configurableVideo || disabled) return
    setMode(nextMode)
    if (nextMode === 'text') setImages([])
  }
  const showImageReference = props.kind === 'image' && mode === 'image'
  const showVideoReference =
    props.kind === 'video' && (!configurableVideo || mode === 'image')
  return (
    <section className='studio-workspace studio-live-workspace'>
      <div
        className='studio-mobile-switch'
        role='group'
        aria-label={t('Workspace view')}
      >
        {['create', 'result'].map((value) => (
          <button
            key={value}
            type='button'
            aria-pressed={pane === value}
            onClick={() => setPane(value)}
          >
            {t(value === 'create' ? 'Create' : 'Result')}
          </button>
        ))}
      </div>
      <SplitWorkspace
        controlsId={id}
        mobilePane={pane}
        controls={
          <form
            id={id}
            className='studio-controls studio-panel'
            aria-label={t(
              props.kind === 'image' ? 'Image controls' : 'Video controls'
            )}
            onSubmit={(event) => {
              event.preventDefault()
              if (!props.session) {
                props.onChooseKey?.()
                return
              }
              if (canGenerate) {
                setConfirmation(true)
              }
            }}
          >
            <div className='studio-controls-body'>
              <div className='studio-control-heading'>
                <h1>
                  {t(
                    props.kind === 'image' ? 'Image creation' : 'Video creation'
                  )}
                </h1>
                <p>
                  {t(
                    props.session
                      ? 'Connected to your LinoRoute models.'
                      : 'Give your ideas a little more room.'
                  )}
                </p>
              </div>
              {!model && (
                <p role='status'>
                  {t(
                    modelId
                      ? 'This saved model is no longer available for this key. Select a model before generating.'
                      : 'This key has no connected models for this workspace.'
                  )}
                </p>
              )}
              <div className='studio-field'>
                <label htmlFor={`${id}-model`}>{t('Model')}</label>
                {props.kind === 'image' ? (
                  <StudioImageModelSelect
                    key={props.session ? 'connected' : 'anonymous'}
                    id={`${id}-model`}
                    mode={props.session ? 'live' : 'demo'}
                    showPreviewNote={false}
                    value={modelId}
                    options={models}
                    disabled={disabled || !models.length}
                    onChange={selectModel}
                  />
                ) : (
                  <StudioModelSelect
                    id={`${id}-model`}
                    ariaLabel={t('Model')}
                    kind={props.kind}
                    value={modelId}
                    options={models}
                    disabled={disabled || !models.length}
                    onChange={selectModel}
                  />
                )}
                {model && !imageChoice && (
                  <small className='studio-live-model-id'>{model.id}</small>
                )}
              </div>
              {props.kind === 'image' && (
                <ImageGenerationMode
                  mode={mode}
                  model={model}
                  disabled={disabled}
                  onChange={selectImageMode}
                />
              )}
              {props.kind === 'video' && configurableVideo && (
                <VideoGenerationMode
                  mode={mode}
                  disabled={disabled}
                  onChange={selectVideoMode}
                />
              )}
              <div className='studio-field'>
                <div className='studio-label-row'>
                  <label htmlFor={`${id}-prompt`}>{t('Prompt')}</label>
                  <TemplateDrawer
                    kind={props.kind}
                    prompt={prompt}
                    onApply={(value) => {
                      if (!disabled) setPrompt(value)
                    }}
                  />
                </div>
                <div className='studio-prompt-box'>
                  <textarea
                    id={`${id}-prompt`}
                    value={prompt}
                    maxLength={promptLimit}
                    disabled={disabled}
                    placeholder={t('Describe what you want to create…')}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                  <span className='studio-prompt-count'>
                    {prompt.length} / {promptLimit.toLocaleString()}
                  </span>
                </div>
              </div>
              {prompt.length > promptLimit && (
                <p className='studio-inline-error' role='alert'>
                  {t(
                    'This model allows at most {{count}} prompt characters. Shorten the prompt before generating.',
                    { count: promptLimit }
                  )}
                </p>
              )}
              <div className='studio-field'>
                {showImageReference && (
                  <ReferenceImageInput
                    files={images}
                    onChange={(next) => {
                      setImages(next)
                      setMask(undefined)
                    }}
                    maxFiles={imageReferenceLimit(model)}
                    allowMask={supportsImageMask(model)}
                    mask={mask}
                    onMaskChange={setMask}
                    disabled={
                      pending || confirmation || !supportsImageEditing(model)
                    }
                    onBusyChange={setCheckingFiles}
                  />
                )}
                {showVideoReference && (
                  <>
                    <ReferenceImageInput
                      files={images}
                      onChange={(next) => setImages(next.slice(0, 1))}
                      label={t('First-frame image (optional)')}
                      inputLabel={t('Choose first-frame image')}
                      maxFiles={1}
                      allowMask={false}
                      disabled={disabled}
                      onBusyChange={setCheckingFiles}
                    />
                    <p className='studio-reference-note'>
                      {t(
                        'The selected first-frame image is uploaded to your private OSS before the paid video request. You do not need to paste a link.'
                      )}
                    </p>
                  </>
                )}
              </div>
              {props.kind === 'image' && model && (
                <ImageOutputSettings
                  model={model}
                  mode={mode}
                  ratio={ratio}
                  size={size}
                  disabled={disabled}
                  onChange={(nextRatio, nextSize) => {
                    setRatio(nextRatio)
                    setSize(nextSize)
                    setOutputNotice('')
                  }}
                />
              )}
              {props.kind === 'video' && videoResolutions.length > 0 && (
                <VideoResolutionSettings
                  options={videoResolutions}
                  value={size}
                  disabled={disabled}
                  economicalDefault={defaultVideoResolution(model) ?? ''}
                  onChange={(value) => setSize(value)}
                />
              )}
              {props.kind === 'video' && seedance25 && (
                <VideoAudioSettings
                  enabled={generateAudio}
                  disabled={disabled}
                  onChange={setGenerateAudio}
                />
              )}
              {props.kind === 'image' && model && (
                <ImageRequestSettings
                  model={model}
                  mode={mode}
                  quality={quality}
                  format={format}
                  background={background}
                  moderation={moderation}
                  disabled={disabled}
                  onQualityChange={setQuality}
                  onFormatChange={setFormat}
                  onBackgroundChange={setBackground}
                  onModerationChange={setModeration}
                />
              )}
              {outputNotice && (
                <p className='studio-model-selection-notice' role='status'>
                  {t(outputNotice)}
                </p>
              )}
              {props.kind === 'video' && (
                <fieldset className='studio-ratios' disabled={disabled}>
                  <legend>{t('Aspect ratio')}</legend>
                  <div>
                    {model?.ratios.map((value) => (
                      <button
                        key={value}
                        type='button'
                        aria-pressed={ratio === value}
                        onClick={() => setRatio(value)}
                      >
                        {value === 'adaptive' ? t('Adaptive') : value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {model?.durations && (
                <div className='studio-field'>
                  <label htmlFor={`${id}-duration`}>
                    {t('Duration (seconds)')}
                  </label>
                  <select
                    id={`${id}-duration`}
                    value={duration}
                    disabled={disabled}
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                  >
                    {model.durations.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {model?.protocol === 'vod' && (
                <p className='studio-reference-note'>
                  {t(
                    'MiniMax H3 supports text-to-video and image-to-video at 768P, 1080P, 2K or 4K. Upstream media links may expire; download important results promptly.'
                  )}
                </p>
              )}
              {seedance25 && (
                <p className='studio-reference-note'>
                  {t(
                    'Seedance 2.5 supports text-to-video and first-frame image-to-video, up to 30 seconds. 480P is the economical default.'
                  )}
                </p>
              )}
              <p className='studio-reference-note'>
                {t(
                  'Model access does not guarantee channel capacity. Prices, groups and final charges are set by LinoRoute.'
                )}
              </p>
              <a
                href='https://linoroute.com/pricing'
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('View current model prices')}
              </a>
            </div>
            <div className='studio-generate-area'>
              <button
                type='submit'
                className='studio-primary-button'
                disabled={
                  props.session ? !canGenerate : pending || checkingFiles
                }
              >
                <Sparkles size={17} />
                {t(
                  props.session
                    ? 'Generate with LinoRoute'
                    : 'Connect key to generate'
                )}
                <ArrowRight size={18} />
              </button>
              {props.session && (
                <p>{t('Real API · Charged to the entered key')}</p>
              )}
            </div>
          </form>
        }
        result={
          <LiveResultPanel
            kind={props.kind}
            job={task.job}
            store={props.store}
            busy={task.busy}
            issue={task.issue}
            onBrowsePrompts={props.onBrowsePrompts}
            active={props.active && pane === 'result'}
            onResume={() => {
              polls.current = 0
              if (task.job) void task.resume(task.job)
            }}
          />
        }
      />
      <Dialog.Root open={confirmation} onOpenChange={setConfirmation}>
        <Dialog.Portal>
          <Dialog.Backdrop className='studio-modal-backdrop' />
          <Dialog.Popup className='studio-detail-dialog'>
            <Dialog.Title>{t('Confirm paid generation')}</Dialog.Title>
            <Dialog.Description>
              {t(
                'This sends your prompt and references to LinoRoute and may deduct your balance in USD. Closing the page does not cancel upstream charges. Continue?'
              )}
            </Dialog.Description>
            <dl className='studio-record-facts'>
              <dt>{t('Model')}</dt>
              <dd>
                {imageChoice
                  ? GPT_IMAGE_FAMILIES[imageChoice.family].label
                  : model?.label}
              </dd>
              {imageChoice && (
                <>
                  {imageChoice.version && (
                    <>
                      <dt>{t('Version')}</dt>
                      <dd>{imageChoice.version}</dd>
                    </>
                  )}
                  <dt>{t('Billing method')}</dt>
                  <dd>{t(imageChoice.billing)}</dd>
                  <dt>{t('API model ID')}</dt>
                  <dd>{model?.id}</dd>
                </>
              )}
              <dt>{t('Aspect ratio')}</dt>
              <dd>{ratio === 'auto' ? t('Automatic') : ratio}</dd>
              {props.kind === 'image' && (
                <>
                  <dt>{t('Creation mode')}</dt>
                  <dd>
                    {t(mode === 'text' ? 'Text to image' : 'Image to image')}
                  </dd>
                  <dt>{t('Reference images')}</dt>
                  <dd>{mode === 'image' ? images.length : 0}</dd>
                  {mode === 'image' && supportsImageMask(model) && (
                    <>
                      <dt>{t('Mask image')}</dt>
                      <dd>{t(mask ? 'Included' : 'Not included')}</dd>
                    </>
                  )}
                  {requestOptions && (
                    <>
                      <dt>{t('Image quality')}</dt>
                      <dd>{t(qualityLabelsForConfirmation[quality])}</dd>
                      {!!requestOptions.formats.length && (
                        <>
                          <dt>{t('Image format')}</dt>
                          <dd>{format.toUpperCase()}</dd>
                        </>
                      )}
                      {!!requestOptions.backgrounds.length && (
                        <>
                          <dt>{t('Background')}</dt>
                          <dd>
                            {t(backgroundLabelsForConfirmation[background])}
                          </dd>
                        </>
                      )}
                      {!!requestOptions.moderations.length && (
                        <>
                          <dt>{t('Content moderation')}</dt>
                          <dd>
                            {t(moderationLabelsForConfirmation[moderation])}
                          </dd>
                        </>
                      )}
                      <dt>{t('Image count')}</dt>
                      <dd>{t('1 image')}</dd>
                    </>
                  )}
                  {!!size && (
                    <>
                      <dt>
                        {t(approximateSize ? 'Requested size' : 'Output size')}
                      </dt>
                      <dd>
                        {size === 'auto'
                          ? t('Automatic')
                          : size.replace('x', ' × ')}
                      </dd>
                    </>
                  )}
                </>
              )}
              {props.kind === 'video' && (
                <>
                  {configurableVideo && (
                    <>
                      <dt>{t('Creation mode')}</dt>
                      <dd>
                        {t(
                          mode === 'text' ? 'Text to video' : 'Image to video'
                        )}
                      </dd>
                      <dt>{t('Resolution')}</dt>
                      <dd>{size.toUpperCase()}</dd>
                      {mode === 'image' && (
                        <>
                          <dt>{t('First-frame image')}</dt>
                          <dd>{t('Included')}</dd>
                        </>
                      )}
                      {seedance25 && (
                        <>
                          <dt>{t('Synchronized audio')}</dt>
                          <dd>{t(generateAudio ? 'On' : 'Off')}</dd>
                        </>
                      )}
                    </>
                  )}
                  <dt>{t('Duration (seconds)')}</dt>
                  <dd>{duration}</dd>
                </>
              )}
            </dl>
            {approximateSize && (
              <p className='studio-reference-note'>
                {t(
                  'Per-request models use this size as an aspect-ratio reference. Actual image dimensions may differ.'
                )}
              </p>
            )}
            {outputs.find((entry) => entry.size === size)?.experimental && (
              <p className='studio-model-selection-notice'>
                {t(
                  'Experimental 4K may take longer and cost more. Review the size and billing before confirming.'
                )}
              </p>
            )}
            {props.kind === 'image' && size === '4K' && (
              <p className='studio-model-selection-notice'>
                {t(
                  '4K may take longer and cost more. Review the resolution and billing before confirming.'
                )}
              </p>
            )}
            <div className='studio-inline-actions'>
              <Dialog.Close className='studio-secondary-button'>
                {t('Cancel')}
              </Dialog.Close>
              <button
                type='button'
                className='studio-primary-button'
                disabled={pending}
                onClick={() => {
                  if (!model || !props.session || pending) return
                  setConfirmation(false)
                  setPane('result')
                  polls.current = 0
                  void task.submit(model, {
                    prompt,
                    ratio,
                    duration,
                    mode:
                      props.kind === 'image' || configurableVideo
                        ? mode
                        : undefined,
                    size:
                      props.kind === 'image' || configurableVideo
                        ? size || undefined
                        : undefined,
                    generateAudio: seedance25 ? generateAudio : undefined,
                    quality: props.kind === 'image' ? quality : undefined,
                    format: props.kind === 'image' ? format : undefined,
                    background: props.kind === 'image' ? background : undefined,
                    moderation: props.kind === 'image' ? moderation : undefined,
                    images:
                      props.kind === 'image' && mode === 'text' ? [] : images,
                    mask:
                      props.kind === 'image' && mode === 'image'
                        ? mask
                        : undefined,
                  })
                }}
              >
                {t('Confirm and generate')}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
