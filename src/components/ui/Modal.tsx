import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Banner, type BannerVariant } from './Banner'

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
          {/* Backdrop — blur sutil separa o modal do contexto sem apagá-lo */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

          {/* Panel — flex column with capped height so the body scrolls
              while the header/footer stay pinned. */}
          <motion.div
            className={cn(
              'relative z-10 bg-surface-900 overlay-frame border rounded-2xl w-full max-w-lg',
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
              <h2 className="text-base font-display font-semibold text-surface-50">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all cursor-pointer"
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

/**
 * Alcance real da ação — "QUANTO/QUEM" ela afeta, antes de confirmar.
 * Achado de várias revisões: cada tela que precisava disso escrevia o
 * texto na mão dentro de `description`, sem nenhuma estrutura nem
 * destaque visual — confirmar "excluir 12 contatos" tinha a MESMA
 * aparência de confirmar "excluir 1 contato". `count`, quando fizer
 * sentido ter um número em destaque, fica separado de `label` (que
 * continua sendo a frase inteira, com ou sem o número já embutido — os
 * dois usos são válidos, ver exemplos no componente).
 */
export interface ConfirmModalImpact {
  /** Frase do alcance — ex: "3 contatos selecionados" ou "Template será enviado para João Silva". */
  label: string
  /** Opcional: número pra destacar separado do texto (ex.: count=12, label="contatos serão excluídos permanentemente"). */
  count?: number
  /** neutral = informativo; warning/danger = ação sensível ou irreversível. Default: 'neutral'. */
  tone?: 'neutral' | 'warning' | 'danger'
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  /** Alcance real da ação, renderizado como bloco destacado acima da descrição — ver `ConfirmModalImpact`. */
  impact?: ConfirmModalImpact
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description, impact,
  confirmLabel = 'Confirmar', danger = false, loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      {impact && (
        <Banner variant={(impact.tone ?? 'neutral') as BannerVariant} className="mb-4">
          <p className="leading-snug">
            {typeof impact.count === 'number' && (
              <span className="font-display text-base font-bold mr-1.5 tabular-nums">
                {impact.count}
              </span>
            )}
            {impact.label}
          </p>
        </Banner>
      )}
      <p className="text-sm text-surface-400 mb-5">{description}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
