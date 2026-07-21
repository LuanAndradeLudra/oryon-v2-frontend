import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /**
   * Allow the tooltip to wrap onto multiple lines (max-w-xs). Default keeps
   * the original single-line behaviour so existing callers (sidebar tooltips,
   * dock icons) aren't affected. Use `wide` for sentence-length helper text
   * like the column descriptions in the Performance da Equipe table.
   */
  wide?: boolean
}

export function Tooltip({ content, children, side = 'right', wide = false }: TooltipProps) {
  const [show, setShow] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Position is recomputed on every show using the wrapper's current rect
  // so the tooltip lands correctly regardless of page scroll or layout
  // changes. We render via Portal into document.body so the tooltip never
  // gets clipped by an ancestor with `overflow:hidden` (e.g. the rounded
  // wrapper of the Performance da Equipe table).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!show || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    // Anchor positions relative to the viewport (position:fixed).
    // Tooltips are small; we don't try to flip on edge collisions yet — for
    // the dashboard table the `top` placement always has room.
    const positions = {
      top:    { top: rect.top - 8,                 left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + 8,              left: rect.left + rect.width / 2 },
      left:   { top: rect.top + rect.height / 2,   left: rect.left - 8 },
      right:  { top: rect.top + rect.height / 2,   left: rect.right + 8 },
    }
    setCoords(positions[side])
  }, [show, side])

  const transforms = {
    top:    '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left:   '-translate-x-full -translate-y-1/2',
    right:  '-translate-y-1/2',
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); setCoords(null) }}
      onFocus={() => setShow(true)}
      onBlur={() => { setShow(false); setCoords(null) }}
    >
      {children}
      {show && coords && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className={cn(
            'z-[9999] rounded-md px-2.5 py-1.5 overlay-surface border',
            'text-xs text-surface-100',
            'pointer-events-none',
            wide ? 'whitespace-normal max-w-xs leading-snug' : 'whitespace-nowrap',
            transforms[side],
          )}
        >
          {content}
        </div>,
        document.body,
      )}
    </div>
  )
}
