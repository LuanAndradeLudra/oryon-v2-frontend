import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { HERO, type HeroMobileMoment } from './heroData'

/**
 * Composição PRÓPRIA do mobile (storyboard §6) — não os 5 frames encolhidos.
 * Três momentos: demanda → execução → resultado. P0 sai; P1 e P2/P3 nunca
 * disputam a tela ao mesmo tempo como dois painéis (a exceção é o resultado,
 * onde a resposta e o card do negócio empilham como UM momento — a ligação
 * entre os dois é o próprio ponto do frame). Texto essencial >= 14px (aqui:
 * nome, demanda, resposta, título do card, valor); metadado pode ser menor.
 *
 * INTERPRETAÇÃO A CONFIRMAR (marcada no relatório ao Maestro): "execução"
 * mobile condensa contexto+consulta+ação do desktop num painel só, já que 3
 * momentos não comportam a granularidade de 5 — se o PO quiser um 4º momento
 * (ex.: separar consulta de ação), é uma mudança pequena aqui.
 */
export function HeroMobileComposition({ moment }: { moment: HeroMobileMoment }) {
  if (moment === 'demanda') {
    return (
      <div className="flex flex-col h-full bg-surface-900">
        <div className="h-14 flex-none flex items-center gap-2.5 px-4 border-b border-surface-700 bg-surface-800">
          <Avatar name={HERO.person} size="36" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-surface-100 truncate leading-tight">{HERO.person}</h2>
            <p className="text-[13px] text-surface-400 truncate">{HERO.company}</p>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 flex flex-col justify-end">
          <div className="flex items-end gap-2">
            <Avatar name={HERO.person} size="sm" />
            <div className="max-w-[85%] rounded-[10px] rounded-bl-[3px] px-3.5 py-2.5 bubble-in-elevate bg-bubble-in text-[color:var(--color-bubble-in-fg,#f1f5f9)]">
              <p className="text-[15px] leading-[1.45]">{HERO.demand}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (moment === 'execucao') {
    return (
      <div className="flex flex-col h-full bg-surface-800 p-4 justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 self-start h-6 px-2 rounded-full text-[13px] font-semibold text-surface-200 bg-surface-700">
          <Bot className="w-3.5 h-3.5" /> {HERO.agent}
        </span>
        <div className="rounded-lg border border-surface-700 bg-surface-900 p-4">
          <p className="text-[11px] text-surface-500 mb-1.5">Consultou o catálogo</p>
          <p className="text-[16px] font-display font-bold text-surface-50">{HERO.catalogItem.name}</p>
          <p className="text-[15px] text-brand-400 font-semibold mt-1">{HERO.catalogItem.price}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[14px]">
          <span className="px-1.5 py-0.5 rounded-[5px] bg-surface-700 text-surface-400">{HERO.stageFrom}</span>
          <span className="text-surface-600">→</span>
          <span className="px-1.5 py-0.5 rounded-[5px] font-semibold text-accent-amber bg-accent-amber/[.12]">{HERO.stageTo}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 p-4 justify-center gap-3">
      <div className="flex items-end gap-2 flex-row-reverse">
        <div className="w-7 h-7 rounded-[30%] avatar-operador flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="max-w-[85%] rounded-[10px] rounded-br-[3px] px-3.5 py-2.5 bubble-out-surface bg-bubble-out text-bubble-out-fg" style={{ boxShadow: 'var(--bubble-shadow-soft)' }}>
          <p className="text-[15px] leading-[1.45]">{HERO.response}</p>
        </div>
      </div>
      <div className={cn('rounded-lg border border-surface-700 bg-surface-800 p-3.5')}>
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar name={HERO.person} size="2xs" />
          <p className="text-[14px] font-semibold text-surface-100 truncate flex-1">{HERO.company}</p>
        </div>
        <p className="text-[14px] text-surface-300">{HERO.deal.qty} licenças · <b className="text-surface-50">{HERO.deal.total}</b></p>
        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-[5px] text-[12px] font-semibold text-accent-amber bg-accent-amber/[.12]">{HERO.stageTo}</span>
      </div>
    </div>
  )
}
