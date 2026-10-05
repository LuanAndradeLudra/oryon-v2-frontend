import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Banner, type BannerVariant } from './Banner'
import { useLayer } from '@/contexts/LayerContext'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Título. Aceita nós para cabeçalhos com ícone e linha de contexto.
   *  Quando vem string, o Modal aplica a tipografia padrão. */
  title: ReactNode
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
  /**
   * Substitui o recuo padrão do corpo. Use `p-0` quando o conteúdo precisar
   * encostar nas bordas — uma faixa de largura inteira sob o cabeçalho, uma
   * coluna com fundo próprio. Aí o consumidor passa a ser o dono de todo o
   * espaçamento interno.
   */
  bodyClassName?: string
  /** `alertdialog` para confirmações que interrompem (ConfirmModal). */
  role?: 'dialog' | 'alertdialog'
  /** Rótulo acessível quando `title` não é string (cabeçalho com nós). */
  'aria-label'?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
export function Modal({
  open, onClose, title, children, footer, fillHeight, className, bodyClassName,
  role = 'dialog', 'aria-label': ariaLabel,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  // Registro central de camadas (ver LayerContext.tsx) — decide o z-index
  // pela posição real na pilha de overlays abertos, e garante que Esc feche
  // só o overlay do topo mesmo com um Modal empilhado sobre um Drawer (ou
  // vice-versa), em vez de cada overlay reagir ao Esc por conta própria.
  const { zIndex } = useLayer(open, onClose)

  useEffect(() => {
    if (!open) return
    // Lock body scroll while a modal is open so the page underneath doesn't
    // jiggle when the user scrolls the modal contents.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foco entra no diálogo (AUDITORIA-A11Y-CAMADAS.md: ~82 diálogos sem foco
    // inicial nem devolução): prioridade para `data-autofocus` (ConfirmModal
    // aponta para Cancelar quando é destrutivo), senão o 1º focável que não
    // seja o X de fechar, senão o próprio painel. Ao fechar, devolve ao
    // elemento que abriu — mesma receita do Drawer.
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]')
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.getAttribute('aria-label') !== 'Fechar')
      ;(preferred ?? focusables[0] ?? panel).focus({ preventScroll: true })
    })
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  // Trap de foco: Tab/Shift+Tab circulam dentro do painel. Esc fica com o
  // LayerContext (fecha só o overlay do topo).
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) { e.preventDefault(); return }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
  }

  // SSR-safe guard: createPortal needs a DOM target, which doesn't exist
  // during server rendering. Vite's dev server is CSR-only so this is just
  // belt-and-suspenders for any future static prerender experiments.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // zIndex vem do LayerContext — sobe conforme a posição real na
          // pilha de overlays abertos, em vez de um valor fixo. Combined
          // with the portal target of <body>, no ancestor stacking context
          // can clip this.
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* MODAL-07 (spec 1a): scrim = token --scrim (rgba(15,23,42,.18) claro /
              rgba(0,0,0,.4) escuro), sem blur. */}
          <div className="absolute inset-0 bg-[var(--color-scrim-soft)]" />

          {/* Panel — flex column with capped height so the body scrolls
              while the header/footer stay pinned. MODAL-01: fundo --sf. */}
          <motion.div
            ref={panelRef}
            role={role}
            aria-modal="true"
            aria-labelledby={typeof title === 'string' ? titleId : undefined}
            aria-label={typeof title === 'string' ? undefined : ariaLabel}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={cn(
              'relative z-10 bg-surface-800 overlay-frame border rounded-2xl w-full max-w-lg outline-none',
              'flex flex-col max-h-[90vh] overflow-hidden',
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Header — MODAL-02: padding 16 18 0, SEM hairline; título 15/700 -.01em. */}
            <div className="flex items-start justify-between gap-3 px-[18px] pt-4 pb-0 flex-shrink-0">
              {typeof title === 'string'
                ? <h2 id={titleId} className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">{title}</h2>
                : title}
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 transition-all cursor-pointer"
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
              // MODAL-06: corpo 14 18.
              'px-[18px]',
              footer ? 'py-3.5' : 'pt-3.5 pb-[18px]',
              fillHeight
                ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
                : 'overflow-y-auto flex-1 min-h-0',
              bodyClassName,
            )}>
              {children}
            </div>
            {footer && (
              <div className="px-[18px] pt-3.5 pb-4 border-t border-surface-700 flex-shrink-0">
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
  /** Rótulo da recusa quando "Cancelar" mente — ex.: "Continuar editando". */
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}

const NOOP = () => {}

export function ConfirmModal({
  open, onClose, onConfirm, title, description, impact,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, loading = false,
}: ConfirmModalProps) {
  // Enquanto confirma (loading) o diálogo não pode ser dispensado por Esc ou
  // scrim — fechar no meio deixava a ação sem feedback (achado da auditoria).
  const close = loading ? NOOP : onClose
  return (
    <Modal open={open} onClose={close} title={title} className="max-w-[400px]" role="alertdialog">
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
      {/* MODAL-02/05: descrição 12.5px; "Cancelar" é neutral, não ghost. */}
      <p className="text-[12.5px] text-surface-400 mt-1 mb-4">{description}</p>
      <div className="flex gap-2 justify-end">
        {/* Foco inicial: Cancelar quando destrutivo (Enter não apaga nada por
            acidente); Confirmar nos demais. */}
        <Button variant="neutral" onClick={onClose} disabled={loading} data-autofocus={danger ? '' : undefined}>{cancelLabel}</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          data-autofocus={danger ? undefined : ''}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
