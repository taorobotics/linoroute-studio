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

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { StudioPreviewApp } from './App'
import type { LocalStore } from './contracts'
import { createResilientLocalStore } from './resilient-store'

const rootElement = document.querySelector<HTMLElement>('#root')
if (!rootElement) throw new Error('Studio preview root element not found')

const root = ReactDOM.createRoot(rootElement)
let storageStatus: 'checking' | 'durable' | 'memory' = 'checking'

function renderPreview(): void {
  root.render(
    <StrictMode>
      <StudioPreviewApp store={store} storageStatus={storageStatus} />
    </StrictMode>
  )
}

function updateStorageStatus(nextStatus: 'durable' | 'memory'): void {
  storageStatus = nextStatus
  queueMicrotask(renderPreview)
}

const store: LocalStore = createResilientLocalStore({
  onReady: () => {
    updateStorageStatus('durable')
  },
  onFallback: () => {
    updateStorageStatus('memory')
  },
})
renderPreview()
