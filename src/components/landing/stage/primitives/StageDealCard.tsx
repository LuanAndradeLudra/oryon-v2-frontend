import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import type { DemoDeal } from '../demoData'

/**
 * Card de negócio (funil de venda) — ESPELHA `deals/DealsBoard.tsx`:
 *   • container ← :337 (borda 1px, raio 8, padding 10x12, bg surface-900)
 *   • em arraste ← :340 (única sombra fora de overlay + rotate -1.5deg)
 *   • corpo ← `SalesCardBody` :663-729: título 13/600, contato 12px, rodapé com
 *     valor 13/700 · chip IA (âmbar) · previsão (CalendarClock) · tempo à direita
 *     ("parado N d" em cor de perigo) · avatar do dono 18px (`OwnerAvatar` :639-648)
 * Sem o card real: ele traz Dropdowns, drag&drop, useAuth e mutações.
 */
interface Props {
  deal: DemoDeal
  /** Segurado pelo cursor (estado de arraste). */
  lifted?: boolean
  /** `data-stage-target` do card (alvo do cursor). */
  targetId?: string
}

export function StageDealCard({ deal, lifted = false, targetId }: Props) {
  return (
    <div
      data-stage-target={targetId}
      className={cn(
        'relative rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5',
        lifted && 'opacity-95 shadow-[var(--shadow-overlay)] rotate-[-1.5deg] border-[var(--bd2)]',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-[13px] font-semibold leading-[1.3] text-surface-100 truncate flex-1">{deal.title}</span>
      </div>
      <div className="flex items-center gap-1 text-[12px] text-surface-400 w-full">
        <span className="truncate flex-1">{deal.contact}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="text-[13px] font-bold text-surface-100">{formatBRL(deal.amountCents)}</span>
        {deal.byAi && (
          <span className="inline-flex items-center h-4 px-[5px] rounded-[5px] text-[10px] font-bold text-accent-amber bg-accent-amber/[.12]">IA</span>
        )}
        {deal.forecast && (
          <span className="inline-flex items-center gap-[3px] text-[11px] text-surface-400">
            <CalendarClock className="w-3 h-3" /> {deal.forecast}
          </span>
        )}
        {deal.time && (
          <span className={cn('ml-auto text-[11px] whitespace-nowrap', deal.stuck ? 'text-danger font-semibold' : 'text-surface-500')}>
            {deal.stuck ? `parado ${deal.time}` : deal.time}
          </span>
        )}
        <span className={cn('inline-flex', !deal.time && 'ml-auto')}>
          {deal.owner ? (
            <span className="w-[18px] h-[18px] rounded-[30%] avatar-operador flex items-center justify-center text-[8px] font-bold flex-shrink-0">
              {deal.owner}
            </span>
          ) : (
            <span className="w-[18px] h-[18px] rounded-[30%] border border-dashed border-[var(--bd2)] flex-shrink-0" aria-hidden />
          )}
        </span>
      </div>
    </div>
  )
}
