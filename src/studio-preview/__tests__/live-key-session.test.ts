/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, expect, it } from 'vitest'

import {
  forgetRememberedLiveKey,
  readRememberedLiveKey,
  rememberLiveKey,
} from '../live-key-session'

const STORAGE_KEY = 'linoroute-studio:live-api-key:v1'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

it('persists the API key in browser storage after the tab is closed', () => {
  rememberLiveKey('sk-persisted-test')

  expect(localStorage.getItem(STORAGE_KEY)).toBe('sk-persisted-test')

  sessionStorage.clear()
  expect(readRememberedLiveKey()).toBe('sk-persisted-test')
})

it('removes the persisted API key when the user disconnects', () => {
  rememberLiveKey('sk-persisted-test')

  forgetRememberedLiveKey()

  expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  expect(readRememberedLiveKey()).toBeNull()
})
