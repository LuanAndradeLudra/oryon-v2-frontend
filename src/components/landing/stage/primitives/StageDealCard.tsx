import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import type { DemoDeal } from '../demoData'
import { useStageAmbient } from '../stageContext'

/**
 * Card de negócio (funil de venda) — ESPELHA `deals/DealsBoard.tsx`:
 *   • container ← :337 (borda 1px, raio 8, padding 10x12, bg surface-900)
 *   • corpo ← `SalesCardBody` :663-729: título 13/600, contato 12px, rodapé com
 *     valor 13/700 · chip IA (âmbar) · previsão (CalendarClock) · tempo à direita
 *     ("parado N d" em cor de perigo) · avatar do dono 18px (`OwnerAvatar` :639-648)
 * `.ambient-bob` no card em foco (o negócio que a cena acompanha) — respiração
 * sutil, não arraste simulado. Sem o card real: ele traz Dropdowns, drag&drop,
 * useAuth e mutações.
 */
interface Props {
  deal: DemoDeal
  /** O negócio que a cena acompanha — ganha `.ambient-bob`. */
  focus?: boolean
}

export function StageDealCard({ deal, focus = false }: Props) {
  const ambient = useStageAmbient()
  return (
    <div
      className={cn(
        'relative rounded-[4px] lg:rounded-lg border border-[0.5px] lg:border-[1px] border-surface-700 bg-surface-900 px-1.5 py-1 lg:px-3 lg:py-2.5',
        ambient && focus && 'ambient-bob',
      )}
    >
      <div className="flex items-start gap-0.5 lg:gap-1.5">
        <span className="text-[5.5px] lg:text-[13px] leading-[7px] lg:leading-[1.3] font-semibold text-surface-100 truncate flex-1">{deal.title}</span>
      </div>
      <div className="flex items-center gap-0.5 lg:gap-1 text-[5px] lg:text-[12px] text-surface-400 w-full">
        <span className="truncate flex-1">{deal.contact}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-0.5 lg:gap-1.5">
        <span className="text-[5.5px] lg:text-[13px] font-bold text-surface-100">{formatBRL(deal.amountCents)}</span>
        {deal.byAi && (
          <span className="inline-flex items-center h-[6px] lg:h-4 px-[2px] lg:px-[5px] rounded-[2px] lg:rounded-[5px] text-[4px] lg:text-[10px] font-bold text-accent-amber bg-accent-amber/[.12]">IA</span>
        )}
        {deal.forecast && (
          <span className="hidden lg:inline-flex items-center gap-[3px] text-[11px] text-surface-400">
            <CalendarClock className="w-3 h-3" /> {deal.forecast}
          </span>
        )}
        {deal.time && (
          <span className={cn('ml-auto text-[4.5px] lg:text-[11px] whitespace-nowrap', deal.stuck ? 'text-danger font-semibold' : 'text-surface-500')}>
            {deal.stuck ? `parado ${deal.time}` : deal.time}
          </span>
        )}
        <span className={cn('hidden lg:inline-flex', !deal.time && 'ml-auto')}>
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
