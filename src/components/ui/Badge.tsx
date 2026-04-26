import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'pending' | 'open' | 'resolved' | 'abandoned' | 'unread'
  className?: string
}

const variants = {
  default: 'bg-surface-700 text-surface-200',
  pending: 'bg-status-pending-bg text-status-pending border border-status-pending-border',
  open: 'bg-status-open-bg text-status-open border border-status-open-border',
  resolved: 'bg-status-active-bg text-status-active border border-status-active-border',
  abandoned: 'bg-surface-700 text-surface-400',
  unread: 'bg-brand-500 text-surface-950',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
