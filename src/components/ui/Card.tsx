import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  /** Eleva o card com sombra mais pronunciada */
  elevated?: boolean
  /** Adiciona glow teal — reservado para cards de destaque / IA */
  glow?: boolean
  /** Remove padding interno */
  noPadding?: boolean
  onClick?: () => void
}

export function Card({ children, className, elevated, glow, noPadding, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface-800 border border-surface-700 rounded-2xl',
        !noPadding && 'p-4',
        elevated
          ? 'shadow-[0_8px_24px_rgba(15,23,42,.08)]'
          : 'shadow-[0_1px_3px_rgba(15,23,42,.06)]',
        glow && 'shadow-[0_6px_20px_rgba(20,184,166,.35)] border-brand-700/50',
        onClick && 'cursor-pointer transition-all duration-150 hover:border-surface-600 hover:shadow-[0_4px_16px_rgba(15,23,42,.10)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-surface-100">{title}</div>
        {description && (
          <div className="text-xs text-surface-400 mt-0.5">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
