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

import i18next, { type i18n } from 'i18next'

import en from './locales/en.json'
import zh from './locales/zh.json'

export type StudioLocale = 'zh' | 'en'

export function createStudioI18n(locale: StudioLocale): i18n {
  const instance = i18next.createInstance()
  void instance.init({
    lng: locale,
    fallbackLng: 'en',
    keySeparator: false,
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
  })
  return instance
}
