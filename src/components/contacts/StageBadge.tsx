import { cn, hexToRgba } from '@/lib/utils'
import type { TenantStage } from '@/types'

interface StageBadgeProps {
  stage: string
  stages: TenantStage[]
  size?: 'sm' | 'md'
  className?: string
}

export function StageBadge({ stage, stages, size = 'sm', className }: StageBadgeProps) {
  const def = stages.find((s) => s.key === stage)

  if (!def) {
    return (
      <span className={cn(
        'inline-flex items-center font-medium border rounded-full bg-surface-800 text-surface-500 border-surface-700',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className,
      )}>
        {stage || '—'}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className,
      )}
      style={{
        color: def.color,
        backgroundColor: hexToRgba(def.color, 0.12),
        borderColor: hexToRgba(def.color, 0.3),
      }}
    >
      {def.label}
    </span>
  )
}
