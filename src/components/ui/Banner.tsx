import { AlertTriangle, AlertCircle, Info, CheckCircle2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BannerVariant = 'warning' | 'danger' | 'info' | 'success' | 'neutral'

// MODAL-03 (spec 1a): banner é SUAVE — fundo com 12% da cor semântica + texto
// na própria cor (antes era .color-chip cheio: fundo sólido + texto branco).
// `--chip` continua sendo a cor; o color-mix resolve por tema sozinho.
const VARIANT: Record<BannerVariant, { chip: string; Icon: LucideIcon }> = {
  warning: { chip: 'var(--color-warning)',     Icon: AlertTriangle },
  danger:  { chip: 'var(--color-danger)',      Icon: AlertCircle },
  info:    { chip: 'var(--color-info)',        Icon: Info },
  success: { chip: 'var(--color-success)',     Icon: CheckCircle2 },
  neutral: { chip: 'var(--color-status-muted)', Icon: Info },
}

interface BannerProps {
  variant?: BannerVariant
  /** true = ícone padrão da variante; false = sem ícone; ReactNode = ícone custom (ex.: spinner). */
  icon?: boolean | ReactNode
  /** Ação opcional à direita (botão/link), centralizada verticalmente. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Faixa de aviso/estado padronizada — cheia e theme-aware, igual aos chips. */
export function Banner({ variant = 'warning', icon = true, action, className, children }: BannerProps) {
  const { chip, Icon } = VARIANT[variant]
  const iconNode = icon === true
    ? <Icon className="w-3.5 h-3.5 mt-px flex-shrink-0" strokeWidth={2} />
    : icon === false
      ? null
      : <span className="mt-px flex-shrink-0">{icon}</span>
  return (
    <div
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-xs border px-2.5 py-[9px] text-xs leading-snug', className)}
      style={{
        ['--chip' as string]: chip,
        backgroundColor: 'color-mix(in srgb, var(--chip) 12%, transparent)',
        borderColor: 'color-mix(in srgb, var(--chip) 25%, transparent)',
        color: 'var(--chip)',
      } as React.CSSProperties}
    >
      {iconNode}
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  )
}
