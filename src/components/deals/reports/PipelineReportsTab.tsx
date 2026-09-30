import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Wallet, Scale3d, Trophy, Percent, Timer } from 'lucide-react'
import { pipelineAnalyticsApi, usersApi } from '@/services/api'
import { REPORT_PERIODS, reportPeriodRange, type ReportPeriod } from '@/lib/reportPeriods'
import type { OwnerFilter } from '@/lib/boardFilters'
import { BoardFilterBar } from '@/components/deals/BoardFilterBar'
import { StageFlowTable } from './StageFlowTable'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { isMoneyBucket } from '@/types/pipelineAnalytics'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import type { Pipeline, User } from '@/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StageFunnelChart } from './StageFunnelChart'
import { WonLostReasonChart } from './WonLostReasonChart'
import { WonLostTimeSeriesChart } from './WonLostTimeSeriesChart'
import { OwnerRankingChart } from './OwnerRankingChart'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}



function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-surface-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-surface-50 tabular-nums font-display">{value}</div>
      {/* PL-C2-CAR-3 (P8): piso de 12px pra texto informativo — este hint
          estava em 11px. */}
      {hint && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  )
}

/**
 * Relatórios do funil (D2 · SCRUM-935) — consome `GET /analytics/pipelines/:id/overview`
 * (D1/934, já mesclado). Cards de resumo, funil por etapa, ganho×perdido por
 * motivo, série temporal e ranking por dono, com filtros de período e dono.
 * Sem números fictícios (P14): tudo aqui vem da resposta real do backend —
 * estado vazio honesto quando o período não tem dados.
 */
interface PipelineReportsTabProps {
  pipeline: Pipeline
  /**
   * Período e responsável CONTROLADOS por quem mostra (a página guarda os
   * dois na URL; o responsável é o MESMO `?resp=` do quadro, então filtrar
   * lá e abrir Relatórios mantém o recorte). Ausentes = estado local.
   */
  period?: ReportPeriod
  onPeriodChange?: (p: ReportPeriod) => void
  owner?: OwnerFilter
  onOwnerChange?: (o: OwnerFilter) => void
  /** Barra única do funil: a página entrega o início (visão) e o fim (Etapas). */
  toolbarLead?: ReactNode
  toolbarTrail?: ReactNode
}

export function PipelineReportsTab({ pipeline, period: periodProp, onPeriodChange, owner: ownerProp, onOwnerChange, toolbarLead, toolbarTrail }: PipelineReportsTabProps) {
  const isProcess = pipelineKindOf(pipeline) === 'process'
  const [periodLocal, setPeriodLocal] = useState<ReportPeriod>('last7')
  const period = periodProp ?? periodLocal
  const setPeriod = onPeriodChange ?? setPeriodLocal
  const [ownerLocal, setOwnerLocal] = useState<OwnerFilter>('all')
  const ownerFilter = ownerProp ?? ownerLocal
  const setOwnerFilter = onOwnerChange ?? setOwnerLocal
  const [users, setUsers] = useState<User[]>([])
  const [overview, setOverview] = useState<PipelineOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data)).catch(() => setUsers([]))
  }, [])

  const range = useMemo(() => reportPeriodRange(period), [period])
  // O quadro chama "sem responsável" de `none`; a analítica, de `unassigned`.
  const ownerUserId = ownerFilter === 'all' ? undefined : ownerFilter === 'none' ? 'unassigned' : ownerFilter

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    pipelineAnalyticsApi
      .overview(pipeline.id, { from: range.startDate, to: range.endDate, ownerUserId })
      .then((res) => { if (alive) setOverview(res.data) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [pipeline.id, range.startDate, range.endDate, ownerUserId])

  // Uma barra só (antes eram duas: a do funil e, embaixo, a dos filtros da
  // aba), com o MESMO chip de responsável do quadro.
  const barra = (
    <BoardFilterBar users={users} owner={ownerFilter} onOwnerChange={setOwnerFilter} lead={toolbarLead} trail={toolbarTrail}>
      <SegmentedControl label="Período" size="sm" value={period} onChange={setPeriod} options={REPORT_PERIODS} />
    </BoardFilterBar>
  )

  if (error) {
    return (
      <>
      {barra}
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400 py-16">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os relatórios deste funil.</p>
      </div>
      </>
    )
  }

  const won = overview?.closed.won.total
  const lost = overview?.closed.lost.total
  const closedTotal = (won?.count ?? 0) + (lost?.count ?? 0)
  const winRate = closedTotal > 0 ? (won!.count / closedTotal) * 100 : null
  const openBucket = overview?.totalOpen
  const cycle = overview?.cycle.closedCohort

  return (
    <>
    {barra}
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

      {loading || !overview ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: isProcess ? 3 : 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-800/40 animate-pulse" aria-hidden />
          ))}
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {/* PL-C2-CAR-3 (P6): este card é o único que NÃO obedece o filtro
                de Período — é a contagem atual, não a do período escolhido
                (tipo do backend já documenta: "Em aberto, HOJE — não
                filtrado pelo período"). Trocar pra "Ontem"/"7 dias" e ver o
                número de aberto igual, sem explicação, lia como filtro
                quebrado. O hint agora diz isso, em vez de repetir o valor
                (funil de processo mostrava "X negócios" duas vezes: no valor
                e no hint, com "hoje" sugerindo um recorte que não existe). */}
            <StatCard
              icon={Wallet}
              label="Em aberto"
              value={
                isMoneyBucket(openBucket!)
                  ? brl(openBucket!.amountCents)
                  : `${openBucket!.count} ${openBucket!.count === 1 ? 'negócio' : 'negócios'}`
              }
              hint={
                isMoneyBucket(openBucket!)
                  ? `${openBucket!.count} negócio${openBucket!.count === 1 ? '' : 's'} · não filtra por período`
                  : 'Não filtra por período'
              }
            />
            {!isProcess && isMoneyBucket(openBucket!) && (
              <StatCard icon={Scale3d} label="Ponderado" value={brl(openBucket!.weightedAmountCents)} hint="Valor × probabilidade da etapa" />
            )}
            <StatCard
              icon={Trophy}
              label={isProcess ? 'Concluído no período' : 'Ganho no período'}
              value={
                !isProcess && won?.amountCents !== undefined
                  ? brl(won.amountCents)
                  : `${won?.count ?? 0} ${(won?.count ?? 0) === 1 ? 'negócio' : 'negócios'}`
              }
            />
            <StatCard
              icon={Percent}
              label="Conversão geral"
              value={winRate === null ? '—' : `${winRate.toFixed(0)}%`}
              hint={winRate === null ? 'Nenhum negócio fechado no período' : `${won?.count ?? 0} de ${closedTotal} fechados`}
            />
            <StatCard
              icon={Timer}
              label="Ciclo médio"
              value={cycle?.avgDaysToClose == null ? '—' : `${cycle.avgDaysToClose.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`}
              hint={cycle && cycle.closedCount > 0 ? `${cycle.closedCount} fechado${cycle.closedCount === 1 ? '' : 's'} no período` : 'Sem fechamentos no período'}
            />
          </div>

          <StageFunnelChart stages={overview.stages} />
          <StageFlowTable conversion={overview.conversion ?? []} durations={overview.cycle.perStageCohort ?? []} />
          <WonLostReasonChart won={overview.closed.won.byReason} lost={overview.closed.lost.byReason} />
          <WonLostTimeSeriesChart
            pipelineId={pipeline.id}
            from={range.startDate ?? null}
            to={range.endDate ?? null}
            ownerUserId={ownerUserId}
          />
          <OwnerRankingChart byOwner={overview.byOwner} />
        </>
      )}
    </div>
    </>
  )
}
