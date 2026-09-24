import type { ReactNode } from 'react'
import { cn, tintaDaEtapa } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import type { DemoDeal, DemoStage } from '../demoData'
import { StageDealCard } from './StageDealCard'
import { StageEnter } from '../StageMotion'

/**
 * Coluna e quadro do funil — ESPELHAM `deals/DealsBoard.tsx`:
 *   • cabeçalho da coluna ← :212-262 (h-7, border-b-2 na cor crua da etapa, título
 *     12.5/700 na `tintaDaEtapa`, contagem 11.5/600 e soma 11.5 à direita)
 *   • lista de cards      ← :271-278 (flex-col gap-2)
 *   • slot vazio          ← :303-321 (tracejado 1px, raio 8, 88px; Perdido em perigo)
 *   • coluna terminal     ← :515-520 (empilhada à direita, borda tracejada --bd2)
 *   • colunas abertas     ← :207 (250px, gap 10)
 * `data-stage-target` em cada coluna é o alvo do cursor ao arrastar.
 */
interface ColumnProps {
  stage: DemoStage
  deals: DemoDeal[]
  liftedId?: string | null
  /** Id do card que carrega `data-stage-target` (alvo do cursor). */
  targetDealId?: string | null
  /** Card que acabou de entrar nesta coluna (animação de entrada). */
  enteringId?: string | null
  /** Largura fixa (aberta) ou flexível (terminal). */
  className?: string
  columnTarget?: string
}

export function StageKanbanColumn({ stage, deals, liftedId, targetDealId, enteringId, className, columnTarget }: ColumnProps) {
  const terminal = !!stage.terminal
  const total = deals.reduce((sum, d) => sum + d.amountCents, 0)
  return (
    <div
      data-stage-target={columnTarget}
      className={cn(terminal ? 'flex flex-col flex-1 min-h-0' : 'flex flex-col w-[250px] flex-shrink-0', stage.terminal === 'lost' && 'mt-2', className)}
    >
      <div
        className={cn('flex items-center justify-between gap-[7px] h-7 px-1 mb-2 border-b-2', stage.terminal === 'lost' && 'rounded-t-[4px]')}
        style={{ borderColor: stage.color, ...(stage.terminal === 'lost' ? { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' } : null) }}
      >
        <div className="flex items-center gap-[7px] min-w-0">
          <span
            className={cn('text-[12.5px] font-bold truncate', terminal && (stage.terminal === 'won' ? 'text-success' : 'text-danger'))}
            style={terminal ? undefined : { color: tintaDaEtapa(stage.color) }}
          >
            {stage.label}
          </span>
          <span className="text-[11.5px] font-semibold text-surface-500 tabular-nums">{deals.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {total > 0 && <span className="text-[11.5px] text-surface-400 tabular-nums whitespace-nowrap">{formatBRL(total)}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 pb-4 min-h-[80px]">
        {deals.length === 0 ? (
          terminal && stage.terminal === 'won' ? (
            <div className="border border-surface-700 rounded-lg bg-surface-900 px-3 py-2.5 text-xs text-surface-400 leading-[1.5]">
              Solte aqui para marcar como <b className="font-bold text-surface-100">Ganho</b>. Etapas terminais pedem motivo.
            </div>
          ) : (
            <div
              className={cn(
                'border border-dashed rounded-lg h-[88px] flex items-center justify-center px-3 text-center',
                terminal && stage.terminal === 'lost'
                  ? 'border-danger bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]'
                  : 'border-[var(--bd2)] bg-surface-900',
              )}
            >
              <span className="text-xs text-surface-500">
                {terminal ? `Solte aqui para marcar como ${stage.label}` : 'Nenhum negócio'}
              </span>
            </div>
          )
        ) : (
          deals.map((d) => {
            const card = <StageDealCard deal={d} lifted={liftedId === d.id} targetId={targetDealId === d.id ? `deal-${d.id}` : undefined} />
            return enteringId === d.id ? <StageEnter key={d.id}>{card}</StageEnter> : <div key={d.id}>{card}</div>
          })
        )}
      </div>
    </div>
  )
}

/** Faixa de contexto do funil (mesma gramática de `board-context-strip`, :465-490). */
export function StageBoardStrip({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-surface-700 bg-board-bar flex-shrink-0 px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-surface-500">
      {children}
    </div>
  )
}

/** Coluna terminal (Ganho/Perdido empilhados) — :515-520. */
export function StageTerminalColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[180px] min-h-0 border-l border-dashed border-[var(--bd2)] pl-[10px]">
      {children}
    </div>
  )
}
