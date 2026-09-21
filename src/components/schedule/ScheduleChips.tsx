import { cn } from '@/lib/utils'
import { STATUS_LABEL, type ScheduleEventStatus } from './scheduleMock'

// Chip SOFT (fundo claro + texto colorido + borda) — é o que o mock 2d
// desenha (Confirmado / Aguardando confirmação / Origem). `.color-chip` do
// index.css é sólido (fundo escurecido + texto branco), por isso não serve aqui.
const TONE: Record<ScheduleEventStatus | 'origin', string> = {
  confirmado: 'bg-status-active-bg text-status-active border-status-active-border',
  aguardando: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  cancelado: 'bg-danger/10 text-danger border-danger/25',
  origin: 'bg-status-pending-bg text-status-pending border-status-pending-border',
}

export function ScheduleStatusChip({ status, className }: { status: ScheduleEventStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-xs border px-1.5 py-px font-semibold', TONE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ScheduleOriginChip({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-xs border px-1.5 py-px font-medium', TONE.origin, className)}>
      {children}
    </span>
  )
}
