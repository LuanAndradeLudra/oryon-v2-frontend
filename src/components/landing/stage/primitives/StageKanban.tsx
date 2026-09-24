import type { ReactNode } from 'react'
import { cn, tintaDaEtapa } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import type { DemoDeal, DemoStage } from '../demoData'
import { StageDealCard } from './StageDealCard'

/**
 * Coluna e quadro do funil — ESPELHAM `deals/DealsBoard.tsx`:
 *   • cabeçalho da coluna ← :212-262 (h-7, border-b-2 na cor crua da etapa, título
 *     12.5/700 na `tintaDaEtapa`, contagem 11.5/600 e soma 11.5 à direita)
 *   • lista de cards      ← :271-278 (flex-col gap-2)
 *   • slot vazio          ← :303-321 (tracejado 1px, raio 8, 88px; Perdido em perigo)
 *   • coluna terminal     ← :515-520 (empilhada à direita, borda tracejada --bd2)
 *   • colunas abertas     ← :207 (250px, gap 10)
 */
interface ColumnProps {
  stage: DemoStage
  deals: DemoDeal[]
  /** Id do negócio que a cena acompanha (ganha `.ambient-bob` no card). */
  focusDealId?: string | null
  className?: string
}

export function StageKanbanColumn({ stage, deals, focusDealId, className }: ColumnProps) {
  const terminal = !!stage.terminal
  const total = deals.reduce((sum, d) => sum + d.amountCents, 0)
  return (
    <div
      className={cn(
        terminal ? 'flex flex-col flex-1 min-h-0' : 'flex flex-col w-[125px] lg:w-[250px] flex-shrink-0',
        stage.terminal === 'lost' && 'mt-1 lg:mt-2',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-[3.5px] lg:gap-[7px] h-[14px] lg:h-7 px-0.5 lg:px-1 mb-1 lg:mb-2 border-b border-[1px] lg:border-b-2',
          stage.terminal === 'lost' && 'rounded-t-[2px] lg:rounded-t-[4px]',
        )}
        style={{ borderColor: stage.color, ...(stage.terminal === 'lost' ? { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' } : null) }}
      >
        <div className="flex items-center gap-[3.5px] lg:gap-[7px] min-w-0">
          <span
            className={cn('text-[6px] lg:text-[12.5px] font-bold truncate', terminal && (stage.terminal === 'won' ? 'text-success' : 'text-danger'))}
            style={terminal ? undefined : { color: tintaDaEtapa(stage.color) }}
          >
            {stage.label}
          </span>
          <span className="text-[5.5px] lg:text-[11.5px] font-semibold text-surface-500 tabular-nums">{deals.length}</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          {total > 0 && <span className="text-[11.5px] text-surface-400 tabular-nums whitespace-nowrap">{formatBRL(total)}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1 lg:gap-2 flex-1 pb-1 lg:pb-4 min-h-[40px] lg:min-h-[80px]">
        {deals.length === 0 ? (
          terminal && stage.terminal === 'won' ? (
            <div className="border border-[0.5px] lg:border-[1px] border-surface-700 rounded-[4px] lg:rounded-lg bg-surface-900 px-1.5 py-1 lg:px-3 lg:py-2.5 text-[5px] lg:text-xs text-surface-400 leading-[1.5]">
              <span className="hidden lg:inline">Solte aqui para marcar como </span><b className="font-bold text-surface-100">Ganho</b><span className="hidden lg:inline">. Etapas terminais pedem motivo.</span>
            </div>
          ) : (
            <div
              className={cn(
                'border border-dashed border-[0.5px] lg:border-[1px] rounded-[4px] lg:rounded-lg h-[44px] lg:h-[88px] flex items-center justify-center px-1 lg:px-3 text-center',
                terminal && stage.terminal === 'lost'
                  ? 'border-danger bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]'
                  : 'border-[var(--bd2)] bg-surface-900',
              )}
            >
              <span className="text-[5px] lg:text-xs text-surface-500">
                {terminal ? stage.label : 'Nenhum negócio'}
              </span>
            </div>
          )
        ) : (
          deals.map((d) => <StageDealCard key={d.id} deal={d} focus={focusDealId === d.id} />)
        )}
      </div>
    </div>
  )
}

/** Faixa de contexto do funil (mesma gramática de `board-context-strip`, :465-490). */
export function StageBoardStrip({ children }: { children: ReactNode }) {
  return (
    <div className="hidden lg:flex border-b border-surface-700 bg-board-bar flex-shrink-0 px-4 py-2 flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-surface-500">
      {children}
    </div>
  )
}

/** Coluna terminal (Ganho/Perdido empilhados) — :515-520. */
export function StageTerminalColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 lg:gap-2 flex-1 min-w-[90px] lg:min-w-[180px] min-h-0 border-l border-dashed border-[0.5px] lg:border-[1px] border-[var(--bd2)] pl-[5px] lg:pl-[10px]">
      {children}
    </div>
  )
}
