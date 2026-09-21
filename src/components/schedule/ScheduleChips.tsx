import { cn } from '@/lib/utils'
import { STATUS_CHIP_VAR, STATUS_LABEL, type ScheduleEventStatus } from './scheduleMock'

// Chip de STATUS = suave (`.color-chip-soft`, mock 2d); só etiquetas são cheias.
const chipVar = (v: string) => ({ ['--chip']: v }) as React.CSSProperties

export function ScheduleStatusChip({ status, className }: { status: ScheduleEventStatus; className?: string }) {
  return (
    <span
      className={cn('color-chip-soft inline-flex items-center rounded-xs border px-1.5 py-px font-semibold', className)}
      style={chipVar(STATUS_CHIP_VAR[status])}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ScheduleOriginChip({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn('color-chip-soft inline-flex items-center rounded-xs border px-1.5 py-px font-medium', className)}
      style={chipVar('var(--color-warning)')}
    >
      {children}
    </span>
  )
}
