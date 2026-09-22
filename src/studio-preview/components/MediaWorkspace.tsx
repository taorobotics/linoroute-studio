/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  DemoOwner,
  LocalStore,
  MediaDraft,
  MediaJob,
  MediaKind,
  PromptSeed,
} from '../contracts'
import { DEMO_IMAGE_MODELS, DEMO_VIDEO_MODELS } from '../fixtures'
import { initialImageModelId } from '../gpt-image-selection'
import { useDemoTask } from '../use-demo-task'
import { MediaControls } from './MediaControls'
import { MediaResult } from './MediaResult'
import { SplitWorkspace } from './SplitWorkspace'
import { TaskStatus } from './TaskStatus'

export type VisualState = 'empty' | 'generating' | 'ready' | 'failed'

export function MediaWorkspace(props: {
  kind: MediaKind
  demoEnabled?: boolean
  active: boolean
  owner: DemoOwner | null
  store: LocalStore
  now: () => number
  onChooseOwner: () => void
  reuse?: { job: MediaJob; nonce: number }
  promptSeed?: PromptSeed
  onBrowsePrompts?: () => void
}) {
  const { t } = useTranslation()
  const controlsId = useId()
  const [mobilePane, setMobilePane] = useState('create')
  const isImage = props.kind === 'image'
  const [draft, setDraft] = useState<MediaDraft>(() => ({
    modelId: isImage
      ? initialImageModelId(DEMO_IMAGE_MODELS, 'demo')
      : DEMO_VIDEO_MODELS[0].id,
    prompt: '',
    previewLayout: '3:2',
  }))
  const task = useDemoTask(props)
  const [previousReuse, setPreviousReuse] = useState(props.reuse)
  if (previousReuse !== props.reuse) {
    setPreviousReuse(props.reuse)
    const job = props.reuse?.job
    if (job && job.kind === props.kind && job.owner === props.owner) {
      setDraft({
        modelId: job.modelId,
        prompt: job.prompt,
        previewLayout: job.previewLayout ?? '3:2',
      })
      setMobilePane('create')
    }
  }
  const [previousPromptSeed, setPreviousPromptSeed] = useState(props.promptSeed)
  if (previousPromptSeed !== props.promptSeed) {
    setPreviousPromptSeed(props.promptSeed)
    if (props.promptSeed?.kind === props.kind) {
      setDraft((current) => ({
        ...current,
        prompt: props.promptSeed?.prompt ?? '',
      }))
      setMobilePane('create')
    }
  }
  const submit = () => {
    if (!props.demoEnabled || !props.owner) {
      props.onChooseOwner()
      return
    }
    task.submit({
      kind: props.kind,
      ...draft,
      clientRequestId: crypto.randomUUID(),
    })
    setMobilePane('result')
  }
  let visualState: VisualState = 'empty'
  if (task.busy || task.pending) visualState = 'generating'
  if (task.job?.stage === 'ready') visualState = 'ready'
  if (task.job?.stage === 'failed') visualState = 'failed'

  return (
    <section className='studio-workspace'>
      <div
        className='studio-mobile-switch'
        role='group'
        aria-label={t('Workspace view')}
      >
        <button
          type='button'
          aria-pressed={mobilePane === 'create'}
          onClick={() => setMobilePane('create')}
        >
          {t('Create')}
        </button>
        <button
          type='button'
          aria-pressed={mobilePane === 'result'}
          onClick={() => setMobilePane('result')}
        >
          {t('Result')}
        </button>
      </div>
      <SplitWorkspace
        mobilePane={mobilePane}
        controlsId={controlsId}
        controls={
          <MediaControls
            demoEnabled={props.demoEnabled}
            id={controlsId}
            active={props.active && mobilePane === 'create'}
            draft={draft}
            onChange={setDraft}
            kind={props.kind}
            generating={task.busy || task.pending || task.error}
            onPreview={submit}
          />
        }
        result={
          <MediaResult
            job={task.job}
            store={props.store}
            now={props.now}
            kind={props.kind}
            state={visualState}
            onBrowsePrompts={props.onBrowsePrompts}
            taskStatus={
              (task.job || task.error) && (
                <TaskStatus
                  job={task.job}
                  busy={task.busy}
                  error={task.error}
                  onComplete={task.complete}
                  onFail={task.fail}
                  onRetry={task.retryTask}
                  onRetrySave={task.retrySave}
                />
              )
            }
            active={props.active}
            mobileResultVisible={mobilePane === 'result'}
          />
        }
      />
    </section>
  )
}
