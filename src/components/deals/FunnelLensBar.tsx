import { cn } from '@/lib/utils'
import { FUNNEL_LENSES, type FunnelLens } from '@/lib/funnelLenses'

interface FunnelLensBarProps {
  value: FunnelLens
  onChange: (lens: FunnelLens) => void
  counts: Record<FunnelLens, number>
  /** Sem usuário logado resolvido, "Meus" não tem como responder — some. */
  hasUser: boolean
}

/**
 * Faixa de lentes do funil (direção C). Uma escolha por vez — é um recorte,
 * não uma pilha de filtros; o recorte vale para o Quadro e para a Lista e mora
 * na URL (`?lente=`). Mesmo vocabulário dos chips da inbox (Opção A, PO 23/09):
 * selecionado em tinta invertida, os demais com fundo neutro, contagem ao lado.
 */
export function FunnelLensBar({ value, onChange, counts, hasUser }: FunnelLensBarProps) {
  return (
    <div
      role="group"
      aria-label="Recortes do funil"
      className="flex items-center gap-1.5 min-h-10 px-4 py-1.5 border-b border-surface-700 bg-board-bar flex-shrink-0 overflow-x-auto"
      data-testid="funnel-lens-bar"
    >
      {FUNNEL_LENSES.filter((l) => l.id !== 'meus' || hasUser).map((l) => {
        const active = value === l.id
        const n = counts[l.id]
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={active}
            title={l.hint}
            onClick={() => onChange(l.id)}
            data-testid={`funnel-lens-${l.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
              active
                ? 'border-transparent bg-[var(--ink-bg)] text-[var(--ink-fg)] hover:bg-[var(--ink-bg-hover)]'
                : 'border-surface-700 bg-surface-800 text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100',
            )}
          >
            {l.id === 'esfriando' && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-status-pending" />}
            {l.label}
            <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-surface-500')}>{n}</span>
          </button>
        )
      })}
    </div>
  )
}
