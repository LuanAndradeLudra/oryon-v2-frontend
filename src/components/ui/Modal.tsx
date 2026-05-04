import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /**
   * Optional footer rendered as a sticky bar below the scrollable body. When
   * present, action buttons (Cancel / Confirm / etc.) remain visible no
   * matter how long the body content gets — the body is the only scrolling
   * region. Pair with a fixed-height className (e.g. `h-[85vh]`) to keep
   * the modal's overall size constant while reading long content.
   */
  footer?: ReactNode
  /**
   * When true, the body is laid out as a flex column with no scroll of its
   * own — the consumer is expected to give one child `flex-1 min-h-0
   * overflow-y-auto`. Use this whenever the body already contains a
   * scrollable area (e.g. PromptArtifact in fillHeight mode); otherwise you
   * end up with two nested scrollbars.
   */
  fillHeight?: boolean
  className?: string
}

/**
 * Generic centered modal. Two non-obvious decisions worth keeping:
 *
 * 1. Renders through createPortal into document.body. Without the portal,
 *    the modal sits inside whatever ancestor opened it — and any ancestor
 *    that uses `transform` / `filter` (Framer Motion does this implicitly)
 *    redefines the containing block for position:fixed children, so the
 *    backdrop ends up clipped to the parent's box instead of covering the
 *    whole viewport. The agent-builder wizard hit exactly this trap.
 *
 * 2. Panel is `max-h-[90vh] flex flex-col` with the body scrolling
 *    independently. Large content (e.g. the 6k-char system prompt review)
 *    used to push the footer off-screen, hiding the action buttons.
 */
export function Modal({ open, onClose, title, children, footer, fillHeight, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    // Lock body scroll while a modal is open so the page underneath doesn't
    // jiggle when the user scrolls the modal contents.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  // SSR-safe guard: createPortal needs a DOM target, which doesn't exist
  // during server rendering. Vite's dev server is CSR-only so this is just
  // belt-and-suspenders for any future static prerender experiments.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // z-[60] keeps modals above any full-screen overlay (e.g. the
          // agent-builder wizard at z-50). Combined with the portal target
          // of <body>, no ancestor stacking context can clip this.
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Panel — flex column with capped height so the body scrolls
              while the header/footer stay pinned. */}
          <motion.div
            className={cn(
              'relative z-10 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-sm',
              'flex flex-col max-h-[90vh] overflow-hidden',
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <h2 className="text-sm font-semibold text-surface-50">{title}</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body. Two layout modes:
                  - default: body itself scrolls (overflow-y-auto)
                  - fillHeight: body is a flex column with no scroll; the
                    consumer manages scrolling on a single inner child. This
                    avoids the nested-scrollbar trap when the body already
                    contains its own scrollable area (e.g. PromptArtifact).
                Footer presence trims bottom padding because the footer's
                own border + padding provide the visual breathing room. */}
            <div className={cn(
              'px-5',
              footer ? 'py-4' : 'pt-4 pb-6',
              fillHeight
                ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
                : 'overflow-y-auto flex-1 min-h-0',
            )}>
              {children}
            </div>
            {footer && (
              <div className="px-5 py-4 border-t border-surface-800 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', danger = false, loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-surface-400 mb-5">{description}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            danger
              ? 'bg-danger text-white hover:bg-red-600'
              : 'bg-brand-600 text-surface-950 hover:bg-brand-500',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {loading ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
