import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'

export type DrawerSide = 'left' | 'right' | 'bottom'

interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: DrawerSide
  children: ReactNode
  className?: string
  dismissible?: boolean
  ariaLabel?: string
}

const SIDE_VARIANTS = {
  left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
  right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
} as const

const SIDE_PANEL = {
  left: 'top-0 left-0 bottom-0 h-full w-96 max-w-[85vw] border-r',
  right: 'top-0 right-0 bottom-0 h-full w-96 max-w-[85vw] border-l',
  bottom: 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl border-t',
} as const

const CLOSE_OFFSET_PX = 100
const CLOSE_VELOCITY = 500

export function Drawer({
  open,
  onClose,
  side = 'left',
  children,
  className,
  dismissible = true,
  ariaLabel = 'Drawer',
}: DrawerProps) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    window.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose, dismissible])

  if (typeof document === 'undefined') return null

  const variants = SIDE_VARIANTS[side]
  const panelPos = SIDE_PANEL[side]

  // Drag-to-close: only enabled for bottom drawer (universal mobile gesture).
  // Left/right drawers stay click/escape-only — horizontal drag conflicts with
  // scrollable content inside the panel (chat lists, scrollable forms).
  const dragProps =
    side === 'bottom' && dismissible
      ? {
          drag: 'y' as const,
          dragConstraints: { top: 0, bottom: 0 },
          dragElastic: { top: 0, bottom: 0.4 },
          dragMomentum: false,
          onDragEnd: (_: unknown, info: PanInfo) => {
            if (info.offset.y > CLOSE_OFFSET_PX || info.velocity.y > CLOSE_VELOCITY) {
              onClose()
            }
          },
        }
      : {}

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60]"
          onClick={dismissible ? onClose : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className={cn(
              'absolute z-10 bg-surface-900 overlay-frame flex flex-col overflow-hidden',
              panelPos,
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            {...dragProps}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
