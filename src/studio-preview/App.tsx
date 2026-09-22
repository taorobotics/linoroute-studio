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

import { Popover } from '@base-ui/react/popover'
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Ellipsis,
  ImageIcon,
  Images,
  KeyRound,
  Languages,
  Library,
  Video,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'

import { SITE_BRAND } from '../config/branding'
import { KeyDialog } from './components/KeyDialog'
import { LiveHistory } from './components/LiveHistory'
import { LiveWorkspace } from './components/LiveWorkspace'
import { MediaWorkspace } from './components/MediaWorkspace'
import { PromptLibrary } from './components/PromptLibrary'
import { WorksWorkspace } from './components/WorksWorkspace'
import type {
  DemoOwner,
  LocalStore,
  MediaJob,
  PromptSeed,
  StudioRoute,
} from './contracts'
import { createStudioI18n, type StudioLocale } from './i18n'
import { connectLive } from './live-client'
import {
  forgetRememberedLiveKey,
  readRememberedLiveKey,
  rememberLiveKey,
} from './live-key-session'
import { LiveError, type LiveJob, type LiveSession } from './live-types'

import './studio.css'
import './atelier.css'
import './live.css'
import './prompt-library.css'

export interface StudioPreviewProps {
  store: LocalStore
  initialRoute?: StudioRoute
  initialOwner?: DemoOwner | null
  /** Opt-in test harness only; normal entry points never enable simulated jobs. */
  demoEnabled?: boolean
  locale?: StudioLocale
  now?: () => number
  storageStatus?: 'checking' | 'durable' | 'memory'
}

const ROUTES = [
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'image-prompts', label: 'Image prompts', icon: Library },
  { id: 'video-prompts', label: 'Video prompts', icon: BookOpen },
  { id: 'works', label: 'My works', icon: Images },
] as const

const PLATFORM_LINKS = [
  { label: 'LinoRoute home', href: 'https://linoroute.com/' },
  { label: 'Model marketplace', href: 'https://linoroute.com/pricing' },
  { label: 'Console', href: 'https://linoroute.com/console' },
] as const

function StudioShell(props: StudioPreviewProps) {
  const { t, i18n } = useTranslation()
  const demoEnabled = props.demoEnabled ?? Boolean(props.initialOwner)
  const [route, setRoute] = useState<StudioRoute>(props.initialRoute ?? 'image')
  const [owner, setOwner] = useState<DemoOwner | null>(
    demoEnabled ? (props.initialOwner ?? null) : null
  )
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [live, setLive] = useState<LiveSession | null>(null)
  const [openLiveJob, setOpenLiveJob] = useState<{
    job: LiveJob
    nonce: number
  }>()
  const [workspaceSession, setWorkspaceSession] = useState(0)
  const [reuse, setReuse] = useState<{ job: MediaJob; nonce: number }>()
  const [promptSeed, setPromptSeed] = useState<PromptSeed>()
  const restoreController = useRef<AbortController | null>(null)
  const now = props.now ?? Date.now
  const chooseOwner = () => setKeyDialogOpen(true)
  let ownerLabel = 'Configure API key'
  if (owner) ownerLabel = owner === 'demo-a' ? 'Demo A' : 'Demo B'
  if (live) ownerLabel = 'API connected'

  useEffect(() => {
    if (demoEnabled) return
    const key = readRememberedLiveKey()
    if (!key) return

    const controller = new AbortController()
    restoreController.current = controller
    void connectLive(key, controller.signal)
      .then((session) => {
        if (controller.signal.aborted) return
        setOwner(null)
        setLive(session)
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          error instanceof LiveError &&
          ['unauthorized', 'forbidden', 'no_models'].includes(error.code)
        ) {
          forgetRememberedLiveKey()
        }
      })
      .finally(() => {
        if (restoreController.current === controller) {
          restoreController.current = null
        }
      })

    return () => controller.abort()
  }, [demoEnabled])

  return (
    <div className='lr-studio'>
      <a className='studio-skip' href='#studio-main'>
        {t('Skip to workspace')}
      </a>
      <header className='studio-topbar'>
        <a
          className='studio-brand'
          href='https://linoroute.com/'
          target='_blank'
          rel='noopener noreferrer'
        >
          <img src={SITE_BRAND.logo} width='30' height='34' alt='' />
          <span className='studio-brand-copy'>
            <span>LinoRoute</span>
            <span className='studio-product-name'>{t('Creative studio')}</span>
          </span>
        </a>
        <nav
          className='studio-workspace-nav'
          aria-label={t('Creative studio')}
          onFocusCapture={(event) => {
            if (event.target !== event.currentTarget) {
              event.target.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
                behavior: 'instant',
              })
            }
          }}
        >
          {ROUTES.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type='button'
                className='studio-nav-item'
                data-separated={
                  item.id === 'image-prompts' || item.id === 'works'
                }
                aria-pressed={route === item.id}
                onClick={() => setRoute(item.id)}
              >
                <Icon size={19} strokeWidth={1.7} aria-hidden='true' />
                <span>{t(item.label)}</span>
              </button>
            )
          })}
          <a
            className='studio-nav-item studio-platform-link'
            href='https://seedancekit.com/'
            target='_blank'
            rel='noopener noreferrer'
            aria-label={t(
              'Seedance prompts · SeedanceKit (opens in a new tab)'
            )}
            title={t('Seedance prompts · SeedanceKit (opens in a new tab)')}
          >
            <span>{t('Seedance prompts')}</span>
            <ArrowUpRight size={15} aria-hidden='true' />
          </a>
          {PLATFORM_LINKS.map((item, index) => (
            <a
              key={item.href}
              className='studio-nav-item studio-platform-link'
              data-separated={index === 0}
              href={item.href}
              target='_blank'
              rel='noopener noreferrer'
              title={t('Opens in a new tab')}
            >
              <span>{t(item.label)}</span>
              <ArrowUpRight size={15} aria-hidden='true' />
            </a>
          ))}
        </nav>
        <div className='studio-topbar-actions'>
          {(live || demoEnabled) && (
            <span
              className='studio-demo-label'
              data-mode={live ? 'live' : 'demo'}
            >
              <span />
              {t(
                live ? 'Live mode · Usage is billed' : 'Demo mode · No charges'
              )}
            </span>
          )}
          <button
            type='button'
            className='studio-icon-button'
            aria-label={t('Switch language')}
            onClick={() =>
              void i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
            }
          >
            <Languages size={19} aria-hidden='true' />
          </button>
          <Popover.Root>
            <Popover.Trigger
              className='studio-icon-button studio-resources-trigger'
              aria-label={t('Resources')}
              title={t('Resources')}
            >
              <Ellipsis size={20} aria-hidden='true' />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                className='studio-resources-positioner'
                align='end'
                sideOffset={10}
                collisionPadding={12}
              >
                <Popover.Popup className='studio-resources-popup'>
                  <Popover.Title className='studio-resources-title'>
                    {t('Resources')}
                  </Popover.Title>
                  {[
                    ...PLATFORM_LINKS,
                    {
                      label: 'API docs',
                      href: 'https://ninoroute.com/tutorials/00-intro',
                    },
                    {
                      label: 'Source and licenses',
                      href: '/source.html',
                    },
                  ].map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {t(label)}
                      <ArrowUpRight size={15} aria-hidden='true' />
                    </a>
                  ))}
                  <div className='studio-preview-note'>
                    <span className='studio-note-dot' />
                    <strong>{t('Creative studio')}</strong>
                    <p>
                      {t('Images, video and open-source prompt libraries.')}
                    </p>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <button
            className='studio-key-button'
            type='button'
            aria-label={t(ownerLabel)}
            onClick={() => setKeyDialogOpen(true)}
          >
            <KeyRound size={16} aria-hidden='true' />
            <span>{t(ownerLabel)}</span>
          </button>
        </div>
      </header>
      <div className='studio-layout'>
        <main className='studio-main' id='studio-main' tabIndex={-1}>
          {props.storageStatus === 'memory' && (
            <div className='studio-warning' role='status'>
              <AlertTriangle size={18} aria-hidden='true' />
              {t(
                'Browser storage is unavailable. Closing this page will lose unsaved records.'
              )}
            </div>
          )}
          <div hidden={route !== 'image'}>
            {live || !demoEnabled ? (
              <LiveWorkspace
                key={workspaceSession}
                kind='image'
                active={route === 'image'}
                session={live}
                onChooseKey={chooseOwner}
                onBrowsePrompts={() => setRoute('image-prompts')}
                store={props.store}
                openJob={openLiveJob}
                promptSeed={
                  promptSeed?.kind === 'image' ? promptSeed : undefined
                }
              />
            ) : (
              <MediaWorkspace
                key={workspaceSession}
                kind='image'
                demoEnabled={demoEnabled}
                active={route === 'image'}
                owner={owner}
                onBrowsePrompts={() => setRoute('image-prompts')}
                store={props.store}
                now={now}
                onChooseOwner={chooseOwner}
                reuse={reuse}
                promptSeed={
                  promptSeed?.kind === 'image' ? promptSeed : undefined
                }
              />
            )}
          </div>
          <div hidden={route !== 'video'}>
            {live ? (
              <LiveWorkspace
                key={workspaceSession}
                kind='video'
                active={route === 'video'}
                session={live}
                onBrowsePrompts={() => setRoute('video-prompts')}
                store={props.store}
                openJob={openLiveJob}
                promptSeed={
                  promptSeed?.kind === 'video' ? promptSeed : undefined
                }
              />
            ) : (
              <MediaWorkspace
                key={workspaceSession}
                kind='video'
                demoEnabled={demoEnabled}
                active={route === 'video'}
                owner={owner}
                onBrowsePrompts={() => setRoute('video-prompts')}
                store={props.store}
                now={now}
                onChooseOwner={chooseOwner}
                reuse={reuse}
                promptSeed={
                  promptSeed?.kind === 'video' ? promptSeed : undefined
                }
              />
            )}
          </div>
          {route === 'image-prompts' && (
            <PromptLibrary
              kind='image'
              onUse={(prompt) => {
                setPromptSeed((current) => ({
                  kind: 'image',
                  prompt,
                  nonce: (current?.nonce ?? 0) + 1,
                }))
                setRoute('image')
              }}
            />
          )}
          {route === 'video-prompts' && (
            <PromptLibrary
              kind='video'
              onUse={(prompt) => {
                setPromptSeed((current) => ({
                  kind: 'video',
                  prompt,
                  nonce: (current?.nonce ?? 0) + 1,
                }))
                setRoute('video')
              }}
            />
          )}
          {route === 'works' &&
            (live ? (
              <LiveHistory
                session={live}
                store={props.store}
                onOpen={(job) => {
                  setOpenLiveJob({ job, nonce: Date.now() })
                  setRoute(job.kind)
                }}
              />
            ) : (
              <WorksWorkspace
                key={owner ?? 'none'}
                demoEnabled={demoEnabled}
                owner={owner}
                store={props.store}
                now={now}
                onChooseOwner={chooseOwner}
                onReuse={(job) => {
                  setReuse({ job, nonce: Date.now() })
                  setRoute(job.kind)
                }}
              />
            ))}
        </main>
      </div>
      {keyDialogOpen && (
        <KeyDialog
          demoEnabled={demoEnabled}
          connected={Boolean(live)}
          onConnect={(session) => {
            restoreController.current?.abort()
            restoreController.current = null
            rememberLiveKey(session.key)
            if (live || demoEnabled) setWorkspaceSession((value) => value + 1)
            setOwner(null)
            setLive(session)
            setReuse(undefined)
            setOpenLiveJob(undefined)
          }}
          onClose={() => setKeyDialogOpen(false)}
          onSelect={(value) => {
            restoreController.current?.abort()
            restoreController.current = null
            forgetRememberedLiveKey()
            if (live) setWorkspaceSession((session) => session + 1)
            setLive(null)
            setOpenLiveJob(undefined)
            if (owner !== null && value !== owner) {
              setWorkspaceSession((session) => session + 1)
            }
            setOwner(value)
            setReuse(undefined)
          }}
        />
      )}
    </div>
  )
}

export function StudioPreviewApp(props: StudioPreviewProps) {
  const i18n = useMemo(
    () => createStudioI18n(props.locale ?? 'en'),
    [props.locale]
  )
  return (
    <I18nextProvider i18n={i18n}>
      <StudioShell {...props} />
    </I18nextProvider>
  )
}
