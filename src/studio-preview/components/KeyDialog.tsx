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

import { Dialog } from '@base-ui/react/dialog'
import { KeyRound, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DemoOwner } from '../contracts'
import { connectLive } from '../live-client'
import { LIVE_ERRORS, LiveError, type LiveSession } from '../live-types'

export function KeyDialog(props: {
  onClose: () => void
  onSelect: (owner: DemoOwner | null) => void
  onConnect: (session: LiveSession) => void
  connected: boolean
  demoEnabled?: boolean
}) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const selectOwner = (owner: DemoOwner | null) => {
    props.onSelect(owner)
    props.onClose()
  }
  return (
    <Dialog.Root
      defaultOpen
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className='studio-modal-backdrop' />
        <Dialog.Popup className='studio-key-dialog'>
          <Dialog.Close
            className='studio-icon-button studio-dialog-close'
            aria-label={t('Close')}
          >
            <X size={20} />
          </Dialog.Close>
          <span className='studio-state-icon'>
            <KeyRound size={25} aria-hidden='true' />
          </span>
          <Dialog.Title>{t('Connect your LinoRoute key')}</Dialog.Title>
          <Dialog.Description>
            {t(
              'Connect to read your available models. Generation is billed separately according to the selected model.'
            )}
          </Dialog.Description>
          <form
            className='studio-live-key-form'
            onSubmit={async (event) => {
              event.preventDefault()
              if (controller.current || !key.trim()) return
              const abort = new AbortController()
              controller.current = abort
              setBusy(true)
              setIssue('')
              try {
                const session = await connectLive(key, abort.signal)
                if (abort.signal.aborted) return
                setKey('')
                props.onConnect(session)
                props.onClose()
              } catch (error) {
                if (!abort.signal.aborted) {
                  setIssue(
                    error instanceof LiveError ? error.code : 'query_failed'
                  )
                }
              } finally {
                if (!abort.signal.aborted) {
                  setBusy(false)
                  controller.current = null
                }
              }
            }}
          >
            <label htmlFor='studio-live-key'>{t('API Key')}</label>
            <input
              id='studio-live-key'
              type='password'
              value={key}
              autoComplete='off'
              spellCheck={false}
              maxLength={512}
              onChange={(event) => setKey(event.target.value)}
              disabled={busy}
            />
            <aside
              role='note'
              aria-label={t('API Key storage notice')}
              className='studio-key-storage-note'
            >
              <span className='studio-key-storage-icon'>
                <ShieldCheck size={17} aria-hidden='true' />
              </span>
              <div>
                <strong>{t('API Key storage notice')}</strong>
                <ul>
                  <li>{t('Stored in this tab session, not in cookies.')}</li>
                  <li>
                    {t(
                      'Refreshing keeps it; closing the tab or disconnecting clears it.'
                    )}
                  </li>
                  <li>
                    {t(
                      'The server does not retain it; it is forwarded only when making a request.'
                    )}
                  </li>
                </ul>
              </div>
            </aside>
            {issue && (
              <p role='alert' className='studio-inline-error'>
                {t(LIVE_ERRORS[issue] ?? LIVE_ERRORS.query_failed)}
              </p>
            )}
            <button
              className='studio-primary-button'
              type='submit'
              disabled={busy || !key.trim()}
            >
              {t(busy ? 'Reading available models…' : 'Connect to LinoRoute')}
            </button>
            <a
              href='https://linoroute.com/console'
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('Get a key in the console')}
            </a>
          </form>
          {props.connected && (
            <button
              className='studio-secondary-button'
              type='button'
              disabled={busy}
              onClick={() => selectOwner(null)}
            >
              {t('Disconnect API key')}
            </button>
          )}
          <p className='studio-reference-note'>
            {t(
              'Switching keys stops local tracking, not upstream tasks or charges. Existing records remain in this browser.'
            )}
          </p>
          {props.demoEnabled && (
            <div className='studio-key-options'>
              <button
                className='studio-primary-button'
                onClick={() => selectOwner('demo-a')}
                type='button'
                disabled={busy}
              >
                {t('Use Demo A')}
              </button>
              <button
                className='studio-secondary-button'
                onClick={() => selectOwner('demo-b')}
                type='button'
                disabled={busy}
              >
                {t('Use Demo B')}
              </button>
              <button
                className='studio-text-button'
                onClick={() => selectOwner(null)}
                type='button'
                disabled={busy}
              >
                {t('Preview an invalid key')}
              </button>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
