import { cn } from '@/lib/utils'
import type { AgentConfig } from '@/services/agentsApi'
import { ROTULO_STATUS } from './salvamentoContexto'

/**
 * Chip de status do agente — um só para a lista e para a página (antes havia
 * duas cópias). Mesma receita do `Badge` suave: 12% da cor, texto na cor.
 */
const COR: Record<AgentConfig['status'], string | null> = {
  active: 'var(--color-status-active)',
  paused: 'var(--color-status-pending)',
  draft: null,
}

export function StatusDoAgente({ status, className }: { status: AgentConfig['status']; className?: string }) {
  const cor = COR[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-5 px-[7px] rounded-xs text-2xs font-semibold whitespace-nowrap border',
        !cor && 'bg-[var(--sf2)] border-surface-700 text-surface-400',
        className,
      )}
      style={cor ? {
        backgroundColor: `color-mix(in srgb, ${cor} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${cor} 25%, transparent)`,
        color: cor,
      } : undefined}
    >
      {status === 'active' && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />}
      {ROTULO_STATUS[status]}
    </span>
  )
}
