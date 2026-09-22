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

export type DemoOwner = 'demo-a' | 'demo-b' | `live:${string}`
export type StudioRoute =
  | 'image'
  | 'video'
  | 'image-prompts'
  | 'video-prompts'
  | 'works'
export type MediaKind = 'image' | 'video'
export interface PromptSeed {
  kind: MediaKind
  prompt: string
  nonce: number
}
export interface MediaDraft {
  modelId: string
  prompt: string
  previewLayout: string
}
export type JobStage =
  | 'queued'
  | 'running'
  | 'archiving'
  | 'ready'
  | 'failed'
  | 'submission_unknown'
  | 'archive_failed'
  | 'cancelled'

export interface MediaJob {
  kind: MediaKind
  id: string
  owner: DemoOwner
  clientRequestId: string
  modelId: string
  prompt: string
  stage: JobStage
  previewLayout?: string
  createdAt: number
  readyAt?: number
  expiresAt?: number
  assetId?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  complete: boolean
}

export interface ChatRecord {
  kind: 'chat'
  id: string
  owner: DemoOwner
  title: string
  messages: ChatMessage[]
}

export interface PromptRecord {
  kind: 'prompt'
  id: string
  owner: DemoOwner
  title: string
  text: string
}

export type LocalRecord = MediaJob | ChatRecord | PromptRecord

export interface LocalFileInfo {
  id: string
  owner: DemoOwner
  name: string
  type: string
  size: number
  savedAt: number
}

export interface FileDetails {
  name: string
  savedAt: number
}

export interface LocalStore {
  put(record: LocalRecord): Promise<void>
  list(owner: DemoOwner): Promise<LocalRecord[]>
  remove(owner: DemoOwner, id: string): Promise<void>
  putBlob(
    owner: DemoOwner,
    assetId: string,
    blob: Blob,
    details?: FileDetails
  ): Promise<void>
  listBlobs(owner: DemoOwner): Promise<LocalFileInfo[]>
  getBlob(owner: DemoOwner, assetId: string): Promise<Blob | undefined>
  removeBlob(owner: DemoOwner, assetId: string): Promise<void>
  clear(owner: DemoOwner): Promise<void>
}

export interface MediaRequest {
  kind: MediaKind
  clientRequestId: string
  modelId: string
  prompt: string
  previewLayout?: string
}

export interface MockClient {
  submit(input: MediaRequest): Promise<MediaJob>
  advance(id: string, next: JobStage): Promise<MediaJob>
  retryArchive(id: string): Promise<MediaJob>
}

export interface MockOptions {
  owner: DemoOwner
  store: LocalStore
  now: () => number
  id: () => string
}

export type MediaAvailability = 'cloud' | 'local' | 'expired'
