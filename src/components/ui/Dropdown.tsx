import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLayer } from '@/contexts/LayerContext'
import { usePosicaoFlutuante } from './posicaoFlutuante'

interface DropdownProps {
  open: boolean
  onClose: () => void
  anchor: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ open, onClose, anchor, children, align = 'left', className }: DropdownProps) {
  const semMovimento = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Lado, direção e altura pela janela (posicaoFlutuante.ts, a mesma régua da
  // lista do SelectMenu); a rolagem do próprio menu não recalcula.
  const pos = usePosicaoFlutuante(open, align, wrapRef, menuRef)
  // Mesma pilha compartilhada do Modal/Drawer (ver LayerContext): sem isto o
  // menu usava um z-index fixo (40/50) e ficava atrás de qualquer diálogo
  // aberto por cima dele (BASE_Z=60+), caso do seletor de catálogo dentro do
  // modal de "Novo negócio".
  const { zIndex } = useLayer(open, onClose)

  // Devolve o foco ao gatilho ao fechar (WCAG 2.4.3).
  const returnFocusToTrigger = () => {
    wrapRef.current?.querySelector<HTMLElement>('button, [tabindex], a[href]')?.focus()
  }

  // Ao abrir: move o foco para o primeiro item do menu.
  useEffect(() => {
    if (!open) return
    const t = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
    })
    return () => cancelAnimationFrame(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return
      onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // `stopPropagation` porque o Esc pertence ao menu ABERTO, não ao que
      // está atrás dele: o Modal escuta em `window` e o menu em `document`,
      // que dispara antes. Sem isto, fechar um seletor dentro de um diálogo
      // fechava o diálogo junto — e o operador perdia o que tinha digitado.
      e.stopPropagation()
      onClose()
      returnFocusToTrigger()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, onClose])

  // Navegação por setas entre os itens do menu.
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus() }
  }

  const menu =
    open && (
      // Wrapper posicionado com o zIndex da pilha compartilhada: o scrim e o
      // menu dentro dele só precisam de ordem relativa (DOM order já basta),
      // é o wrapper que decide se isto fica acima ou abaixo de um Modal/Drawer
      // aberto por cima ou por baixo dele.
      <div style={{ position: 'fixed', inset: 0, zIndex }}>
        <div className="overlay-scrim" aria-hidden />
        <motion.div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          // Entrada curta e vinda de cima: o menu nasce ancorado ao gatilho em
          // vez de aparecer inteiro. `scale` fica de fora de propósito —
          // o menu é posicionado por `fixed` com `top` calculado, e escalar
          // desloca o conteúdo em relação à âncora.
          initial={semMovimento ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.13, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            ...(pos.top !== undefined ? { top: pos.top } : {}),
            ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
            ...(pos.left !== undefined ? { left: pos.left } : {}),
            ...(pos.right !== undefined ? { right: pos.right } : {}),
            maxHeight: pos.maxHeight,
          }}
          className={cn(
            // DROP-01 (spec 1a): raio 8 + padding 4. Vidro por adesão (index.css).
            'overlay-surface overlay-vidro border rounded-lg p-1',
            // `overflow-y-auto` (e não `hidden`): com a altura limitada pela
            // janela, o que exceder precisa rolar DENTRO do menu.
            'min-w-[200px] overflow-x-hidden overflow-y-auto',
            className
          )}
        >
          {children}
        </motion.div>
      </div>
    )

  return (
    <div ref={wrapRef} className="relative">
      {anchor}
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

interface DropdownItemProps {
  onClick: () => void
  children: ReactNode
  icon?: React.ElementType
  danger?: boolean
  active?: boolean
  disabled?: boolean
  /** Atalho de teclado exibido à direita (DROP-04), ex.: "E", "⌘K". */
  shortcut?: string
  /** Tinta própria do item (ex.: status com sua cor) — vem por último e vence
   *  o hover/ativo neutros. */
  className?: string
}

// DROP-02/03/04 (spec 1a): item 30px, padding 8, raio 5, 13px em --tx; hover
// e foco em --rowhover (o destrutivo também — só a cor do texto muda).
export function DropdownItem({ onClick, children, icon: Icon, danger, active, disabled, shortcut, className }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 h-[30px] px-2 rounded-[5px] text-[13px] text-left transition-all',
        'focus-visible:outline-none focus-visible:bg-[var(--rowhover)] hover:bg-[var(--rowhover)]',
        danger
          ? 'text-danger'
          : active
            ? 'text-surface-100 bg-[var(--rowhover)]'
            : 'text-surface-100',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {children}
      {shortcut && <span className="ml-auto pl-3 text-2xs font-mono text-surface-500">{shortcut}</span>}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="h-px bg-surface-700 my-1" role="separator" />
}
