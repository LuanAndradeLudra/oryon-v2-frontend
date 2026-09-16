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
  // SCRUM-1097 — spec/1a-primitivos.md CARD-01/08/09/10 (valores do HTML do
  // canvas): container `1px --bd, raio 8, fundo --sf, sem sombra`;
  // `elevated` = borda de ênfase `--bd2` (só a borda — NÃO troca o fundo);
  // clicável hover = `--rowhover` + borda de ênfase; `glow` = única exceção
  // de sombra fora de overlay, reservada ao card de IA.
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface-800 border rounded-lg',
        elevated ? 'border-[var(--bd2)]' : 'border-surface-700',
        !noPadding && 'p-3.5',
        glow && 'shadow-[0_6px_20px_rgba(20,184,166,.35)] border-brand-700/50',
        onClick && 'cursor-pointer transition-all duration-150 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)]',
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
