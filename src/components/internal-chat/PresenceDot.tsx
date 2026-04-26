import { cn } from '@/lib/utils'
import type { UserPresenceStatus } from '@/types'

const STATUS_COLOR: Record<UserPresenceStatus, string> = {
  online:  'bg-emerald-400',
  away:    'bg-amber-400',
  busy:    'bg-red-400',
  offline: 'bg-surface-600',
}

interface PresenceDotProps {
  status: UserPresenceStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PresenceDot({ status, size = 'sm', className }: PresenceDotProps) {
  return (
    <span
      className={cn(
        'rounded-full flex-shrink-0 ring-2 ring-surface-900',
        STATUS_COLOR[status],
        size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5',
        className,
      )}
    />
  )
}
