import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Wallet, Scale3d, Trophy, Percent, Timer } from 'lucide-react'
import { pipelineAnalyticsApi, usersApi } from '@/services/api'
import { resolveRange, type DateRangePreset } from '@/lib/dateRange'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { isMoneyBucket } from '@/types/pipelineAnalytics'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import type { Pipeline, User } from '@/types'
import { cn } from '@/lib/utils'
import { StageFunnelChart } from './StageFunnelChart'
import { WonLostReasonChart } from './WonLostReasonChart'
import { WonLostTimeSeriesChart } from './WonLostTimeSeriesChart'
import { OwnerRankingChart } from './OwnerRankingChart'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIOD_OPTIONS: { value: DateRangePreset | 'all'; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'all', label: 'Todo o período' },
]

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-surface-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-surface-50 tabular-nums font-display">{value}</div>
      {hint && <p className="text-[11px] text-surface-500">{hint}</p>}
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
export function PipelineReportsTab({ pipeline }: { pipeline: Pipeline }) {
  const isProcess = pipelineKindOf(pipeline) === 'process'
  const [period, setPeriod] = useState<DateRangePreset | 'all'>('last7')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [overview, setOverview] = useState<PipelineOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data)).catch(() => setUsers([]))
  }, [])

  const range = useMemo(
    () => (period === 'all' ? { startDate: undefined, endDate: undefined } : resolveRange(period)),
    [period],
  )
  const ownerUserId = ownerFilter === 'all' ? undefined : ownerFilter

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400 py-16">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os relatórios deste funil.</p>
      </div>
    )
  }

  const won = overview?.closed.won.total
  const lost = overview?.closed.lost.total
  const closedTotal = (won?.count ?? 0) + (lost?.count ?? 0)
  const winRate = closedTotal > 0 ? (won!.count / closedTotal) * 100 : null
  const openBucket = overview?.totalOpen
  const cycle = overview?.cycle.closedCohort

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl bg-surface-900 border border-surface-800 p-0.5 gap-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                period === opt.value ? 'bg-brand-600 text-surface-950' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filtrar por dono"
          className="text-xs px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-800 text-surface-300 focus:outline-none focus:border-brand-500"
        >
          <option value="all">Todos os donos</option>
          <option value="unassigned">Sem dono</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName ?? ''}</option>
          ))}
        </select>
      </div>

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
            <StatCard
              icon={Wallet}
              label="Em aberto"
              value={
                isMoneyBucket(openBucket!)
                  ? brl(openBucket!.amountCents)
                  : `${openBucket!.count} ${openBucket!.count === 1 ? 'negócio' : 'negócios'}`
              }
              hint={`${openBucket!.count} negócio${openBucket!.count === 1 ? '' : 's'} hoje`}
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
              value={cycle?.avgDaysToClose == null ? '—' : `${cycle.avgDaysToClose.toFixed(1)} dias`}
              hint={cycle && cycle.closedCount > 0 ? `${cycle.closedCount} fechado${cycle.closedCount === 1 ? '' : 's'} no período` : 'Sem fechamentos no período'}
            />
          </div>

          <StageFunnelChart stages={overview.stages} />
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
  )
}
