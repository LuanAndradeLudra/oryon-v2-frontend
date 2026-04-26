import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  open: boolean
  onClose: () => void
  anchor: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ open, onClose, anchor, children, align = 'left', className }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      {anchor}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1.5 z-50',
            'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl',
            'min-w-[200px] overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
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
