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

import { expect, it } from 'vitest'

import { getAvailability } from '../retention'

it('expires at the exact deadline but preserves a local copy', () => {
  expect(getAvailability(1000, false, 999)).toBe('cloud')
  expect(getAvailability(1000, false, 1000)).toBe('expired')
  expect(getAvailability(1000, true, 1000)).toBe('local')
})

it('treats a missing remote deadline as expired without a local copy', () => {
  expect(getAvailability(undefined, false, 1000)).toBe('expired')
  expect(getAvailability(undefined, true, 1000)).toBe('local')
})
