import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownProps {
  open: boolean
  onClose: () => void
  anchor: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

function useDropdownPosition(open: boolean, align: 'left' | 'right', anchorRef: React.RefObject<HTMLDivElement | null>) {
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 })

  const update = () => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 6
    if (align === 'right') {
      setPos({ top: rect.bottom + gap, right: window.innerWidth - rect.right })
    } else {
      setPos({ top: rect.bottom + gap, left: rect.left })
    }
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
      if (e.key === 'Escape') { onClose(); returnFocusToTrigger() }
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
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'fixed',
            top: pos.top,
            ...(pos.left !== undefined ? { left: pos.left } : {}),
            ...(pos.right !== undefined ? { right: pos.right } : {}),
          }}
          className={cn(
            'z-50',
            'overlay-surface border rounded-xl',
            'min-w-[200px] overflow-hidden',
            className
          )}
        >
          {children}
        </div>
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
