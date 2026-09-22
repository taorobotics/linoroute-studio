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

import { Check, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function StyleGuide() {
  const { t } = useTranslation()
  return (
    <details className='studio-style-guide'>
      <summary>
        <SlidersHorizontal size={14} aria-hidden='true' />
        {t('View the design system')}
        <span>{t('For visual review')}</span>
      </summary>
      <div className='studio-style-grid'>
        <section>
          <h3>{t('Type & hierarchy')}</h3>
          <strong className='studio-type-sample'>
            {t('Let the work speak.')}
          </strong>
          <p>Noto Sans SC · Inter · Outfit</p>
          <p>{t('Body 15 / Heading 28 / Weight 400–600')}</p>
        </section>
        <section>
          <h3>{t('Brand palette')}</h3>
          <div className='studio-swatches'>
            <span>#2864F0</span>
            <span>#071A36</span>
            <span>#F8FAFC</span>
          </div>
        </section>
        <section>
          <h3>{t('Controls & states')}</h3>
          <button className='studio-primary-button' type='button' disabled>
            {t('Disabled action')}
          </button>
          <p className='studio-file-status'>
            <Check size={14} />
            {t('Success state sample')}
          </p>
          <label>
            {t('Focus example')}
            <input placeholder={t('Click or press Tab to check focus')} />
          </label>
        </section>
      </div>
    </details>
  )
}
