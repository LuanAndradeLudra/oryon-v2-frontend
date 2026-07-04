import { AlertTriangle, AlertCircle, Info, CheckCircle2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BannerVariant = 'warning' | 'danger' | 'info' | 'success' | 'neutral'

// Banner segue o mesmo mecanismo dos chips (.color-chip + --chip): fundo sólido
// (cor semântica escurecida) + texto branco, nos dois temas. Para "warning" usamos
// --color-warning (laranja) em vez do amber, que teria contraste ruim com branco.
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
    ? <Icon className="w-4 h-4 mt-px flex-shrink-0" />
    : icon === false
      ? null
      : <span className="mt-px flex-shrink-0">{icon}</span>
  return (
    <div
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
      className={cn('color-chip flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-snug', className)}
      style={{ ['--chip']: chip } as React.CSSProperties}
    >
      {iconNode}
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  )
}
