import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'pending' | 'open' | 'resolved' | 'abandoned' | 'unread'
  className?: string
}

// Status variants render as colored chips (.color-chip): dark = tint + colored
// text, light = filled (darkened color + near-white text). The color comes from
// the same status tokens used everywhere else, via the --chip variable.
const CHIP_VAR: Partial<Record<NonNullable<BadgeProps['variant']>, string>> = {
  pending:   'var(--color-cstatus-pending)',
  open:      'var(--color-status-open)',
  resolved:  'var(--color-cstatus-resolved)',
  abandoned: 'var(--color-status-muted)',
}

const plainVariants: Record<string, string> = {
  default: 'bg-surface-700 text-surface-200',
  unread:  'bg-brand-500 text-surface-950',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const base = 'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium'
  const chip = CHIP_VAR[variant]

  if (chip) {
    return (
      <span
        className={cn(base, 'border color-chip', className)}
        style={{ ['--chip']: chip } as React.CSSProperties}
      >
        {children}
      </span>
    )
  }

  return (
    <span className={cn(base, plainVariants[variant] ?? plainVariants.default, className)}>
      {children}
    </span>
  )
}
