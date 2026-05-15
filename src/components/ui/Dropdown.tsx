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

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return
      onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, onClose])

  const menu =
    open && (
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: pos.top,
          ...(pos.left !== undefined ? { left: pos.left } : {}),
          ...(pos.right !== undefined ? { right: pos.right } : {}),
        }}
        className={cn(
          'z-50',
          'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl',
          'min-w-[200px] overflow-hidden',
          className
        )}
      >
        {children}
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
}

export function DropdownItem({ onClick, children, icon: Icon, danger, active, disabled }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-all',
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
  return <div className="h-px bg-surface-700 my-1" />
}
