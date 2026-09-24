import { DealSummary } from '@/components/deals/DealSummary'
import { formatBRL } from '@/utils/money'
import { HERO_PIPELINE, NOOP, heroDeal } from './heroRealData'
import type { HeroState } from './heroStory'

/**
 * A seção NEGÓCIOS do painel do contato, para o Hero.
 *
 * Por que não é o `ContactPanelDeals` de produção: aquele componente é uma
 * máquina de rede (`useContactPipelines` → `dealsApi.list` + socket) e, sem o
 * flag `FF_MULTI_PIPELINE` que vem do `/auth/me`, ele renderiza `null`. Numa
 * página pública o painel ficaria justamente sem a parte que a história
 * precisa mostrar.
 *
 * O que se reaproveita, então, é a CAMADA DE APRESENTAÇÃO — `DealSummary` na
 * densidade `row`, o mesmo componente que o `ContactPanelDeals` usa, com zero
 * import de rede — dentro do mesmo invólucro (`panel-divider`, cabeçalho
 * "Negócios · N", faixa "Em aberto/Ganho"). Nada aqui é uma reimplementação
 * divergente do negócio: é a mesma peça visual com dados controlados.
 *
 * A faixa de dinheiro segue a regra da casa: só aparece em funil de VENDA, e
 * "Ganho" fica em R$ 0,00 porque a IA não fecha venda — o teto do produto está
 * visível na própria tela, não só no roteiro.
 */
export function HeroPanelDeals({ at }: { at: HeroState }) {
  const deal = heroDeal(at)

  return (
    <div data-shot="painel-negocio" className="panel-divider px-4 py-2.5 border-t border-surface-700" data-testid="panel-pipelines">
      <div className="flex items-center justify-between h-6 mb-1">
        <p className="text-[10px] text-surface-500 uppercase tracking-[.14em] font-bold flex items-center gap-1.5">
          Negócios
          <span>· 1</span>
        </p>
      </div>

      {/* Só "Em aberto".
          O painel de produção mostra "Em aberto" e "Ganho" lado a lado. Aqui o
          segundo seria um zero permanente — a IA não fecha venda, então nunca
          há ganho nesta história —, e um contador zerado não prova esse teto,
          só ocupa metade da faixa com ruído. Foi achado em revisão. */}
      <div className="mb-2">
        <div className="bg-[var(--sf2)] border border-surface-700 rounded-xs px-2.5 py-1.5">
          <p className="text-[9px] text-surface-500 uppercase tracking-wide">Em aberto</p>
          <p className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(deal.amountCents)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <DealSummary
          density="row"
          deal={deal}
          pipeline={HERO_PIPELINE}
          contactName={deal.contact?.displayName ?? ''}
          moveOpen={false}
          onToggleMove={NOOP}
          onMove={NOOP}
          onOpen={NOOP}
          testIdPrefix="panel-pipeline"
          testIdKey={HERO_PIPELINE.id}
        />
      </div>
    </div>
  )
}
