/*
Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { GripVertical } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

const DEFAULT_WIDTH = 340
const MIN_WIDTH = 300

export function SplitWorkspace(props: {
  controls: ReactNode
  result: ReactNode
  controlsId: string
  mobilePane: string
}) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; width: number; pointer: number } | null>(
    null
  )
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [maximum, setMaximum] = useState(620)
  const [dragging, setDragging] = useState(false)
  const actual = Math.min(width, maximum)

  useEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === 0) return
      setMaximum(
        Math.max(MIN_WIDTH, Math.min(620, entry.contentRect.width - 384))
      )
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  const resize = (value: number) =>
    setWidth(Math.max(MIN_WIDTH, Math.min(maximum, value)))
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  return (
    <div
      ref={container}
      className='studio-workspace-grid'
      data-mobile-pane={props.mobilePane}
      data-resizing={dragging || undefined}
      style={{ '--studio-settings-width': `${actual}px` } as CSSProperties}
    >
      {props.controls}
      <div
        className='studio-splitter'
        role='separator'
        tabIndex={0}
        aria-label={t('Resize creation panel')}
        aria-orientation='vertical'
        aria-controls={props.controlsId}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={maximum}
        aria-valuenow={actual}
        title={t('Drag to resize. Double-click to reset.')}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return
          event.preventDefault()
          event.currentTarget.focus()
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = {
            x: event.clientX,
            width: actual,
            pointer: event.pointerId,
          }
          setDragging(true)
        }}
        onPointerMove={(event) => {
          const current = drag.current
          if (current?.pointer === event.pointerId) {
            resize(current.width + event.clientX - current.x)
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 32 : 16
          const values: Record<string, number> = {
            ArrowLeft: actual - step,
            ArrowRight: actual + step,
            Home: MIN_WIDTH,
            End: maximum,
          }
          if (event.key in values) {
            event.preventDefault()
            resize(values[event.key])
          }
        }}
      >
        <span aria-hidden='true'>
          <GripVertical size={16} />
        </span>
      </div>
      {props.result}
    </div>
  )
}
