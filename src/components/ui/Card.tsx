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
  // SCRUM-1097: elevação de card é borda, não sombra — `elevated` sobe pra
  // borda de ênfase (surface-600) em vez de ganhar sombra. `glow` continua
  // com sombra: é a única exceção reservada a card de destaque/IA.
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface-800 border rounded-lg',
        elevated ? 'border-surface-600' : 'border-surface-700',
        !noPadding && 'p-3.5',
        glow && 'shadow-[0_6px_20px_rgba(20,184,166,.35)] border-brand-700/50',
        onClick && 'cursor-pointer transition-all duration-150 hover:border-surface-600',
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
    <div className={cn('flex items-center justify-between gap-3 min-h-10 pb-2.5 mb-3 border-b border-surface-700', className)}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-surface-100 truncate">{title}</div>
        {description && (
          <div className="text-xs text-surface-400 mt-0.5">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
