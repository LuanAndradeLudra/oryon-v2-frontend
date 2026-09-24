import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { StageRail } from '../primitives/StageRail'
import { StageConvRow } from '../primitives/StageConvRow'
import { DEMO_EXISTING } from '../demoData'
import { HERO, type HeroFrameKey } from './heroData'

/**
 * A composição do Hero — UMA peça só, quatro planos (storyboard §3), cujo
 * ESTADO muda por `frame` (não cinco telas independentes). Primeiro
 * entregável: SEM MOTOR — cada frame é servido estático (opacity/escala já
 * calculadas, sem transição). Os primitivos do palco (`StageRail`,
 * `StageConvRow`) entram como VOCABULÁRIO visual (raio, densidade, avatar);
 * a bolha e o cabeçalho do chat são próprios daqui, não `StageBubble`/
 * `StageChatHeader` — aqueles têm o `.reveal` de entrada embutido, que um
 * quadro estático não deve disparar.
 *
 * P0 shell (rail + sliver da lista, recortado, opaco baixo, nunca foco) ·
 * P1 conversa (nunca some — recua em opacidade) · P2 execução (ficha ·
 * consulta · linha da etiqueta) · P3 resultado (card do negócio + etapa).
 */
export function HeroComposition({ frame }: { frame: HeroFrameKey }) {
  const p1Dominant = frame === 'demanda' || frame === 'resultado'
  const p1Opacity = frame === 'demanda' ? 'opacity-100' : frame === 'contexto' ? 'opacity-70' : frame === 'consulta' ? 'opacity-55' : frame === 'acao' ? 'opacity-45' : 'opacity-100'
  const p1Basis = p1Dominant ? 'lg:basis-[46%]' : 'lg:basis-[30%]'
  const showP2 = frame !== 'demanda'
  const showP3 = frame === 'acao' || frame === 'resultado'

  return (
    <>
      {/* P0 — shell recortado: rail + 2 linhas da lista, sem contato ativo. */}
      <div className="hidden lg:flex flex-none w-[130px] opacity-45 border-r border-surface-700 overflow-hidden">
        <StageRail active="inbox" />
        <div className="flex-1 overflow-hidden">
          {DEMO_EXISTING.slice(0, 2).map((c) => <StageConvRow key={c.id} conversation={c} />)}
        </div>
      </div>

      {/* P1 — a conversa: NUNCA some, só recua. */}
      <div className={cn('flex flex-col min-w-0 border-r border-surface-700 bg-surface-900 transition-none', p1Basis, p1Opacity)}>
        <div className="h-[52px] flex-none flex items-center gap-2.5 px-4 border-b border-surface-700 bg-surface-800">
          <Avatar name={HERO.person} size="30" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[13.5px] font-bold text-surface-100 truncate leading-tight">{HERO.person}</h2>
            <p className="text-[11.5px] text-surface-400 truncate">{HERO.company} · {HERO.line}</p>
          </div>
          <span className="inline-flex items-center gap-1 h-[17px] px-1.5 rounded-[5px] text-[10px] font-bold text-surface-200 bg-surface-700 flex-shrink-0">
            <Bot className="w-2.5 h-2.5" /> {HERO.agent}
          </span>
        </div>
        <div className="flex-1 min-h-0 px-4 py-4 flex flex-col justify-end gap-3">
          <div className="flex items-end gap-2">
            <Avatar name={HERO.person} size="xs" />
            <div className="max-w-[80%] rounded-[10px] rounded-bl-[3px] px-3 py-2 bubble-in-elevate bg-bubble-in text-[color:var(--color-bubble-in-fg,#f1f5f9)]">
              <p className="text-sm leading-[1.45]">{HERO.demand}</p>
              <span className="block mt-1 text-[10.5px] text-surface-500">{HERO.time}</span>
            </div>
          </div>
          {frame === 'resultado' && (
            <div className="flex items-end gap-2 flex-row-reverse">
              <div className="w-6 h-6 rounded-[30%] avatar-operador flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <div
                className="max-w-[80%] rounded-[10px] rounded-br-[3px] px-3 py-2 bubble-out-surface bg-bubble-out text-bubble-out-fg"
                style={{ boxShadow: 'var(--bubble-shadow-soft)' }}
              >
                <p className="text-sm leading-[1.45]">{HERO.response}</p>
                <span className="block mt-1 text-[10.5px] text-bubble-out-time">{HERO.time}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P2/P3 — execução e resultado, lado direito. */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 p-4 bg-surface-800 overflow-hidden">
        {showP2 && (
          <div className={cn(!showP3 && 'flex-1 flex flex-col justify-center')}>
            {frame === 'contexto' && (
              <div className="rounded-lg border border-surface-700 bg-surface-900 p-3.5">
                <p className="text-[11px] font-semibold text-surface-400 mb-1.5">Ficha do contato</p>
                <p className="text-[13px] font-semibold text-surface-100">{HERO.company}</p>
                <p className="text-xs text-surface-400 mt-0.5">{HERO.ficha.clienteDesde}</p>
                <p className="text-xs text-surface-400">negócio aberto: <b className="text-surface-200">{HERO.ficha.negocioAberto}</b></p>
                <p className="text-xs text-surface-400">{HERO.ficha.conversasAnteriores} conversas anteriores</p>
              </div>
            )}
            {frame === 'consulta' && (
              <>
                <p className="text-[10px] text-surface-500 mb-2">Consultando catálogo do agente</p>
                <div className="rounded-lg border border-surface-700 bg-surface-900 p-4">
                  <p className="text-[15px] font-display font-bold text-surface-50">{HERO.catalogItem.name}</p>
                  <p className="text-sm text-brand-400 font-semibold mt-1">{HERO.catalogItem.price}</p>
                </div>
                <p className="text-[11px] text-surface-500 mt-2">{HERO.company} · {HERO.ficha.negocioAberto}</p>
              </>
            )}
            {(frame === 'acao' || frame === 'resultado') && (
              <p className={cn('text-xs text-surface-400', frame === 'resultado' && 'opacity-60')}>
                Etiqueta <span className="text-surface-200 font-semibold">"{HERO.tag}"</span> aplicada ao contato
              </p>
            )}
          </div>
        )}

        {showP3 && (
          <div className="rounded-lg border border-surface-700 bg-surface-900 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={HERO.person} size="2xs" />
              <p className="text-[13px] font-semibold text-surface-100 truncate flex-1">{HERO.deal.title}</p>
            </div>
            <p className="text-xs text-surface-400">{HERO.deal.qty} licenças · <span className="text-surface-100 font-bold">{HERO.deal.total}</span></p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px]">
              <span className={cn('px-1.5 py-0.5 rounded-[5px]', frame === 'acao' ? 'bg-surface-800 text-surface-500 line-through' : 'bg-surface-800 text-surface-500')}>{HERO.stageFrom}</span>
              <span className="text-surface-600">→</span>
              <span className="px-1.5 py-0.5 rounded-[5px] font-semibold text-accent-amber bg-accent-amber/[.12]">{HERO.stageTo}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
