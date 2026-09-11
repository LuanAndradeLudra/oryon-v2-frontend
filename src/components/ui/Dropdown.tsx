import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DropdownProps {
  open: boolean
  onClose: () => void
  anchor: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

/**
 * Posição do menu: lado (`align`) + DIREÇÃO e ALTURA, decididas pela janela.
 *
 * Antes o menu abria sempre para baixo, com `top: rect.bottom`, e a altura era
 * a do conteúdo. Numa lista longa perto do rodapé — um catálogo de produtos, o
 * caso que expôs isto — ele vazava para fora da tela: as últimas opções ficavam
 * inalcançáveis, sem rolagem que as trouxesse de volta.
 *
 * Agora mede-se o espaço dos dois lados do gatilho. Se não couber embaixo e
 * houver mais espaço em cima, o menu VIRA para cima; de um jeito ou de outro, a
 * altura máxima é o espaço que existe de verdade, e o que passar disso rola
 * dentro do menu.
 *
 * Para cima o menu é ancorado por `bottom`, não por `top`: assim não é preciso
 * medir a altura do conteúdo antes de posicionar (o que exigiria um render
 * intermediário e faria o menu piscar no lugar errado).
 */
interface PosicaoMenu {
  top?: number
  bottom?: number
  left?: number
  right?: number
  maxHeight: number
}

function useDropdownPosition(open: boolean, align: 'left' | 'right', anchorRef: React.RefObject<HTMLDivElement | null>) {
  const [pos, setPos] = useState<PosicaoMenu>({ top: 0, left: 0, maxHeight: 320 })

  const update = () => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 6
    // Respiro contra a borda da janela — um menu colado no fim da tela parece
    // cortado mesmo quando não está.
    const margem = 12
    const espacoAbaixo = window.innerHeight - rect.bottom - gap - margem
    const espacoAcima = rect.top - gap - margem
    // Só vira para cima quando embaixo é apertado E em cima cabe mais. Abrir
    // para cima por qualquer motivo desorienta: o menu deve seguir o gatilho.
    const minimoUtil = 180
    const paraCima = espacoAbaixo < minimoUtil && espacoAcima > espacoAbaixo
    const lado = align === 'right'
      ? { right: window.innerWidth - rect.right }
      : { left: rect.left }
    setPos(paraCima
      ? { ...lado, bottom: window.innerHeight - rect.top + gap, maxHeight: Math.max(espacoAcima, 120) }
      : { ...lado, top: rect.bottom + gap, maxHeight: Math.max(espacoAbaixo, 120) })
  }

  useLayoutEffect(() => {
    if (!open) return
    update()
  }, [open, align])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, align])

  return pos
}

export function Dropdown({ open, onClose, anchor, children, align = 'left', className }: DropdownProps) {
  const semMovimento = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pos = useDropdownPosition(open, align, wrapRef)

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
      <>
        <div className="overlay-scrim z-40" aria-hidden />
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
            'z-50',
            'overlay-surface border rounded-xl',
            // `overflow-y-auto` (e não `hidden`): com a altura limitada pela
            // janela, o que exceder precisa rolar DENTRO do menu.
            'min-w-[200px] overflow-x-hidden overflow-y-auto',
            className
          )}
        >
          {children}
        </motion.div>
      </>
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
}

export function DropdownItem({ onClick, children, icon: Icon, danger, active, disabled }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-all',
        'focus-visible:outline-none focus-visible:bg-surface-700',
        danger
          ? 'text-danger hover:bg-danger/10'
          : active
            ? 'text-brand-300 bg-brand-600/10'
            : 'text-surface-200 hover:bg-surface-700',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="h-px bg-surface-700 my-1" role="separator" />
}
