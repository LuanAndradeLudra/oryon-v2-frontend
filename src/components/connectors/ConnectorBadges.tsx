import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// README §3.10 / Fase B (spec/conectores.GAPS.md): os badges de estado do
// catálogo e do modal de detalhe são "fundo claro + texto colorido"
// (--okbg/--ok, --amberbg/--amber) — um padrão visual DIFERENTE do que
// `.color-chip` (index.css) produz (pill sólido escurecido + texto branco,
// pensado pra tags/etapas). Em vez de mudar `.color-chip` (primitivo
// compartilhado, usado em várias outras telas com o padrão sólido correto
// pra elas), estes 2 componentes ficam locais aos Conectores.

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
