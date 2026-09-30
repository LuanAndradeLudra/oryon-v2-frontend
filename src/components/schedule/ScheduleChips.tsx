import { cn } from '@/lib/utils'
import { STATUS_CHIP_VAR, STATUS_LABEL, type ScheduleEventStatus } from './scheduleMock'

// Chip de STATUS = suave (`.color-chip-soft`, mock 2d); só etiquetas são cheias.
const chipVar = (v: string) => ({ ['--chip']: v }) as React.CSSProperties

export function ScheduleStatusChip({ status, label, className }: { status: ScheduleEventStatus; label?: string; className?: string }) {
  return (
    <span
      className={cn('color-chip-soft inline-flex items-center h-[18px] rounded-[5px] border px-1.5 text-[10.5px] font-bold', className)}
      style={chipVar(STATUS_CHIP_VAR[status])}
    >
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}

export function ScheduleOriginChip({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn('color-chip-soft inline-flex items-center h-[18px] rounded-[5px] border px-1.5 text-[10.5px] font-bold', className)}
      style={chipVar('var(--color-warning)')}
    >
      {children}
    </span>
  )
}
