import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Badges de estado do catálogo/modal (README §3.10): chip de STATUS = suave,
// via `.color-chip-soft` + `--chip` (só etiquetas usam `.color-chip` cheio).

interface StatusChipProps {
  label: string
  tone: 'success' | 'warning'
  icon?: React.ReactNode
  className?: string
}

export function ConnectorStatusChip({ label, tone, icon, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-1.5 py-px text-[10.5px] font-semibold flex-shrink-0',
        tone === 'success'
          ? 'bg-status-active-bg text-status-active border-status-active-border'
          : 'bg-status-pending-bg text-status-pending border-status-pending-border',
        className,
      )}
    >
      {icon}
      {label}
    </span>
  )
}

export function ConnectorComingSoonChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border border-surface-700 bg-[var(--sf2)] px-1.5 py-px text-[10.5px] font-semibold text-surface-400 flex-shrink-0',
        className,
      )}
    >
      <Clock className="w-2.5 h-2.5" />
      Em breve
    </span>
  )
}
