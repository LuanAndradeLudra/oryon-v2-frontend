import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'pending' | 'open' | 'resolved' | 'abandoned' | 'danger' | 'unread'
  className?: string
}

// spec/1a-primitivos.md BADGE-04..09 (SCRUM-1097): chip de status de sistema é
// SUAVE — fundo com 12% da cor + texto na cor, 20px, 11/600, raio 6px. A cor
// vem dos mesmos tokens de status via `--chip`; o color-mix resolve por tema.
// (Antes: .color-chip cheio — fundo escurecido + texto branco.)
const CHIP_VAR: Partial<Record<NonNullable<BadgeProps['variant']>, string>> = {
  pending:   'var(--color-cstatus-pending)',
  open:      'var(--color-status-open)',
  resolved:  'var(--color-cstatus-resolved)',
  abandoned: 'var(--color-status-muted)',
  danger:    'var(--color-danger)',
}

const BASE = 'inline-flex items-center justify-center h-5 px-[7px] rounded-xs text-[11px] font-semibold whitespace-nowrap'

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  // BADGE-09: contador não-lido é outro componente — disco 18px, 10.5/700.
  if (variant === 'unread') {
    return (
      <span className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full bg-brand-500 text-[var(--color-btn-primary-fg)] text-[10.5px] font-bold tabular-nums',
        className,
      )}>
        {children}
      </span>
    )
  }

  const chip = CHIP_VAR[variant]
  if (chip) {
    return (
      <span
        className={cn(BASE, 'border', className)}
        style={{
          ['--chip' as string]: chip,
          backgroundColor: 'color-mix(in srgb, var(--chip) 12%, transparent)',
          borderColor: 'color-mix(in srgb, var(--chip) 25%, transparent)',
          color: 'var(--chip)',
        } as React.CSSProperties}
      >
        {children}
      </span>
    )
  }

  // BADGE-06: neutro = superfície-2 + hairline + --tx2.
  return (
    <span className={cn(BASE, 'bg-[var(--sf2)] border border-surface-700 text-surface-400', className)}>
      {children}
    </span>
  )
}
