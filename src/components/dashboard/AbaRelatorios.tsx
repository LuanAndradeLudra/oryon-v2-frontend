import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Settings2 } from 'lucide-react'

import { DateRangePicker }  from './DateRangePicker'
import { KpiGrid }          from './KpiGrid'
import { VolumeChart }      from './VolumeChart'
import { SalesFunnelCard }  from './SalesFunnelCard'
import { StatusDonut }      from './StatusDonut'
import { TagsChart }        from './TagsChart'
import { PeakHoursHeatmap } from './PeakHoursHeatmap'
import { AgentTable }       from './AgentTable'
import { ActivityFeed }     from './ActivityFeed'
import { AiInsightsSection } from './AiInsightsSection'
import { ErrorState } from '@/components/ui/ErrorState'
import { isFeatureVisible } from '@/config/featureFlags'
// import { MarketingFunnelSection } from './MarketingFunnelSection'
// Removido temporariamente — endpoint /api/analytics/marketing-funnel ainda nao
// existe no backend; trazer de volta quando o endpoint for implementado.

import type { DateRange } from '@/types/dashboard'
import { useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { useAuth } from '@/contexts/AuthContext'
import { ConnectedLineChip } from '@/components/layout/ConnectedLineChip'
import { usePrimaryConnectedLine } from '@/hooks/usePrimaryConnectedLine'
import { useRelatoriosDoPainel } from '@/hooks/useRelatoriosDoPainel'
import { ESCOPO, lerPeriodo, PERIODO_PADRAO, PERIODOS, periodoPorExtenso } from '@/lib/periodoDoPainel'
import { cn } from '@/lib/utils'
import type { AbaDoPainel } from '@/lib/abaDoPainel'
import { CabecalhoDoPainel } from './CabecalhoDoPainel'

// DASH-HEADER-01: "Terça, 15 set · atualizado há 20 s" — dia da semana curto
// capitalizado (date-fns EEEE dá "terça-feira" completo em pt-BR, não bate).
const WEEKDAYS_SHORT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatUpdatedSubtitle(lastUpdated: Date, now: Date): string {
  const dia = `${WEEKDAYS_SHORT[lastUpdated.getDay()]}, ${lastUpdated.getDate()} ${MESES_ABREV[lastUpdated.getMonth()]}`
  const diffSec = Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / 1000))
  const ago = diffSec < 60 ? `${diffSec} s` : diffSec < 3600 ? `${Math.floor(diffSec / 60)} min` : `${Math.floor(diffSec / 3600)} h`
  return `${dia} · atualizado há ${ago}`
}

function rotuloDo(p: DateRange): string {
  return PERIODOS.find((x) => x.value === p)?.label ?? p
}

interface Props {
  aba: AbaDoPainel
  onAba: (a: AbaDoPainel) => void
  celular?: boolean
}

/**
 * Aba "Relatórios" do Dashboard (PO 27/09: os gráficos do período saem da
 * operação ao vivo).
 *
 * Período (28/09): vive na URL (`?periodo=`, regra do PO de estado de tela) e
 * vai ao backend em `?range=` (ver useRelatoriosDoPainel). Trocar de período
 * refaz só as leituras que dependem dele; o dado anterior fica esmaecido até
 * o novo chegar. Cartão que não segue o período diz o próprio recorte.
 */
export function AbaRelatorios({ aba, onAba, celular = false }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const periodo = lerPeriodo(searchParams.get('periodo'))
  const setPeriodo = (p: DateRange) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (p === PERIODO_PADRAO) next.delete('periodo')
      else next.set('periodo', p)
      return next
    }, { replace: true })
  }

  const { user } = useAuth()
  // Atividade da empresa (GET /activity-feed) é só de administrador.
  const podeVerAtividade = ['admin', 'business_admin', 'super_admin'].includes(user?.role ?? '')
  const r = useRelatoriosDoPainel(periodo, podeVerAtividade)
  const [now, setNow] = useState(() => new Date())
  const [personalizando, setPersonalizando] = useState(false)
  const primaryLine = usePrimaryConnectedLine()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5000)
    return () => clearInterval(id)
  }, [])

  // Linha da aba: Personalizar (os indicadores do topo) · período · atualizar.
  const acoes = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPersonalizando(true)}
        disabled={!r.snapshot}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bd2)] text-xs font-semibold text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-50 disabled:pointer-events-none transition-colors"
        title="Escolher e ordenar os indicadores do topo"
      >
        <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Personalizar</span>
        <span className="sr-only sm:hidden">Personalizar indicadores</span>
      </button>
      <DateRangePicker value={periodo} onChange={setPeriodo} />
      <button
        type="button"
        onClick={r.recarregar}
        className="w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
        title="Atualizar"
        aria-label="Atualizar"
      >
        <RefreshCw className={cn('w-3.5 h-3.5', (r.carregando || r.atualizando) && 'animate-spin')} />
      </button>
    </div>
  )

  // DASH-HEADER-01: subtítulo dinâmico "Terça, 15 set · atualizado há Ns".
  useRegisterTopBarSubtitle(
    <>
      {r.atualizadoEm ? formatUpdatedSubtitle(r.atualizadoEm, now) : 'Carregando…'}
      {primaryLine.connected && (
        <span className="ml-3"><ConnectedLineChip>WhatsApp conectado</ConnectedLineChip></span>
      )}
    </>,
    [r.atualizadoEm, now, primaryLine.connected],
  )

  const cabecalho = <CabecalhoDoPainel aba={aba} onAba={onAba} direita={acoes} />

  if (r.carregando) {
    return (
      <div className="space-y-3.5" aria-busy="true" aria-label="Carregando os relatórios">
        {cabecalho}
        <div className="h-[104px] bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: celular ? 4 : 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
      </div>
    )
  }

  // PL-C2-FAR-2: falha sem dado nenhum = tela de erro, nunca um snapshot zerado.
  if (!r.snapshot) {
    return (
      <div className="space-y-3.5">
        {cabecalho}
        <ErrorState onRetry={r.recarregar} />
      </div>
    )
  }

  const snapshot = r.snapshot
  // Falhou o período pedido, mas há um anterior bom: ele fica, e o aviso diz
  // de qual período são os números à vista.
  const mostrandoOutro = r.erro && r.periodoCarregado && r.periodoCarregado !== periodo

  return (
    <div className="space-y-3.5">
      {cabecalho}

      {snapshot.escopo === 'minhas' && (
        <p role="note" className="text-[12.5px] text-surface-400">
          Números das suas conversas. A visão da empresa inteira é de administradores e supervisores.
        </p>
      )}

      {r.erro && (
        <div role="status" className="flex items-center gap-3 px-3.5 py-2 rounded-lg border border-status-pending-border bg-status-pending-bg text-[12.5px] text-status-pending">
          <span className="flex-1">
            Não foi possível carregar {periodoPorExtenso(periodo)}.
            {mostrandoOutro ? ` Mostrando ${rotuloDo(r.periodoCarregado!)}.` : ' Mostrando a última leitura.'}
          </span>
          <button type="button" onClick={r.recarregar} className="font-semibold underline underline-offset-2">Tentar de novo</button>
        </div>
      )}

      <div
        className={cn('space-y-3.5 transition-opacity', r.atualizando && 'opacity-60')}
        aria-busy={r.atualizando || undefined}
      >
        <KpiGrid metrics={snapshot.kpis} customizerOpen={personalizando} onCustomizerClose={() => setPersonalizando(false)} podeEditarMetas={podeVerAtividade} onMetasSalvas={r.recarregar} />

        {/* Seção desligada por padrão (flag dashboardAiInsights) — não
            montar evita a chamada generateDashboardInsights() e o gasto
            de tokens. */}
        {isFeatureVisible('dashboardAiInsights') && (
          <AiInsightsSection kpis={snapshot.kpis} />
        )}

        {/* PO 01/10: os cartões lado a lado têm a MESMA altura (antes
            `items-start` deixava o volume e o funil mais baixos que os
            vizinhos, com um vão embaixo). Cada cartão é `h-full`. */}
        <div className="grid grid-cols-12 gap-3.5 items-stretch">
          <div className="col-span-12 xl:col-span-8">
            <VolumeChart data={snapshot.volumeChart} range={r.periodoCarregado ?? periodo} />
          </div>
          <div className="col-span-12 xl:col-span-4">
            {/* Revisão 30/09 (C5): ativas/pendentes de agora; resolvidas/arquivadas do período. */}
            <StatusDonut data={snapshot.statusDistribution} periodo={periodoPorExtenso(r.periodoCarregado ?? periodo)} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3.5 items-stretch">
          <div className={cn('col-span-12', podeVerAtividade && 'xl:col-span-8')}>
            <SalesFunnelCard />
          </div>
          {podeVerAtividade && (
            <div className="col-span-12 xl:col-span-4">
              {/* A atividade já diz a própria janela ("Últimas 4 horas"). */}
              <ActivityFeed events={r.atividade} />
            </div>
          )}
        </div>

        {/* D4: o gráfico de CSAT saiu (sem pesquisa de satisfação no backend). */}
        <TagsChart data={snapshot.tagVolumes} />

        <PeakHoursHeatmap data={snapshot.heatmap} />

        <AgentTable agents={snapshot.agentMetrics} />
      </div>

      {/* <MarketingFunnelSection dateRange={periodo} /> — endpoint backend nao existe ainda */}
    </div>
  )
}
