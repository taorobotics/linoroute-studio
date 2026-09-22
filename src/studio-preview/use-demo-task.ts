/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useMemo, useRef, useState } from 'react'

import type { DemoOwner, LocalStore, MediaJob, MediaRequest } from './contracts'
import { createMockClient } from './mock-client'

export function useDemoTask(props: {
  owner: DemoOwner | null
  store: LocalStore
  now: () => number
}) {
  const client = useMemo(
    () =>
      props.owner
        ? createMockClient({
            owner: props.owner,
            store: props.store,
            now: props.now,
            id: () => crypto.randomUUID(),
          })
        : null,
    [props.owner, props.store, props.now]
  )
  const [job, setJob] = useState<MediaJob | null>(null)
  const current = useRef<MediaJob | null>(null)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const [error, setError] = useState(false)
  const retry = useRef<(() => Promise<void>) | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const remember = (value: MediaJob) => {
    current.current = value
    if (mounted.current) setJob(value)
  }
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError(false)
    retry.current = operation
    try {
      await operation()
      retry.current = null
    } catch {
      if (mounted.current) setError(true)
    } finally {
      locked.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const submit = (input: MediaRequest) => {
    if (!client) return
    void run(async () => remember(await client.submit(input)))
  }
  const complete = () => {
    if (!client || !current.current) return
    void run(async () => {
      // Advance explicitly; do not disguise a timer or fixed fixture as model generation.
      for (const [from, next] of [
        ['queued', 'running'],
        ['running', 'archiving'],
        ['archiving', 'ready'],
      ] as const) {
        if (!mounted.current) return
        if (current.current?.stage === from) {
          remember(await client.advance(current.current.id, next))
        }
      }
    })
  }
  const fail = () => {
    if (!client || !current.current) return
    const id = current.current.id
    void run(async () => remember(await client.advance(id, 'failed')))
  }
  const retryTask = () => {
    const previous = current.current
    if (previous?.stage !== 'failed') return
    submit({
      kind: previous.kind,
      modelId: previous.modelId,
      prompt: previous.prompt,
      previewLayout: previous.previewLayout,
      clientRequestId: crypto.randomUUID(),
    })
  }
  const reset = () => {
    if (locked.current) return
    current.current = null
    retry.current = null
    setJob(null)
    setError(false)
  }
  const pending = Boolean(
    job && ['queued', 'running', 'archiving'].includes(job.stage)
  )
  return {
    job,
    busy,
    pending,
    error,
    submit,
    complete,
    fail,
    retryTask,
    reset,
    retrySave: () => {
      if (retry.current) void run(retry.current)
    },
  }
}
