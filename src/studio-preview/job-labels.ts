/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import type { JobStage } from './contracts'

export const JOB_LABELS: Record<JobStage, string> = {
  queued: 'Demo task waiting',
  running: 'Demo task running',
  archiving: 'Saving demo record',
  ready: 'Demo completed',
  failed: 'Demo failed',
  submission_unknown: 'Demo status unknown',
  archive_failed: 'Demo save failed',
  cancelled: 'Demo cancelled',
}
