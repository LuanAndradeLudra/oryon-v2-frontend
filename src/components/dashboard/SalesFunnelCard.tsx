import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Milestone } from 'lucide-react'
import { pipelinesApi, pipelineAnalyticsApi } from '@/services/api'
import { isMoneyBucket } from '@/types/pipelineAnalytics'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import type { Pipeline, PipelineStage } from '@/types'
import { cn, tintaDaEtapa } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface FunnelRow {
  stage: PipelineStage
  count: number
  amountCents: number | null
}

/**
 * SCRUM-1104 (tela 1b) — "Funil de vendas": estoque ABERTO de hoje por etapa
 * do funil padrão do tenant (mesma semântica de `StageFunnelChart`, D2/935).
 * Conversão aqui é a razão simples entre o estoque de etapas adjacentes (não
 * a taxa histórica de transição de `StageConversion`) — é o que o mock pede
 * e o que dá pra calcular sem período.
 */
export function SalesFunnelCard() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [overview, setOverview] = useState<PipelineOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    pipelinesApi.list()
      .then(async ({ data: pipelines }) => {
        const active = pipelines.filter((p) => !p.isArchived)
        const main = active.find((p) => p.isDefault) ?? active[0] ?? null
        if (!main) { if (!cancelled) setLoading(false); return }
        if (!cancelled) setPipeline(main)
        const { data } = await pipelineAnalyticsApi.overview(main.id)
        if (!cancelled) setOverview(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="bg-surface-800 border border-surface-700 rounded-lg h-56 animate-pulse" />
  }

  if (!pipeline) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
        <div className="flex items-center min-h-10 px-3.5 border-b border-surface-700">
          <p className="text-[13px] font-semibold text-surface-100">Funil de vendas</p>
          <span className="text-[11.5px] text-surface-500 ml-2">por etapa · mês atual</span>
        </div>
        <EmptyState icon={Milestone} title="Nenhum funil configurado" className="py-8" />
      </div>
    )
  }

  const openStages = pipeline.stages
    .filter((s) => !s.isWon && !s.isLost)
    .sort((a, b) => a.order - b.order)

  const rows: FunnelRow[] = openStages.map((stage) => {
    const stageOverview = overview?.stages.find((s) => s.stageId === stage.id)
    const bucket = stageOverview?.open
    return {
      stage,
      count: bucket?.count ?? 0,
      amountCents: bucket && isMoneyBucket(bucket) ? bucket.amountCents : null,
    }
  })

  const topCount = rows[0]?.count || 1

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
      <div className="flex items-center min-h-10 px-3.5 border-b border-surface-700">
        <p className="text-[13px] font-semibold text-surface-100">Funil de vendas</p>
        <span className="text-[11.5px] text-surface-500 ml-2">por etapa · mês atual</span>
        <Link
          to={`/pipelines/${pipeline.id}`}
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-accent-dark hover:text-brand-300 transition-colors"
        >
          Abrir funil <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Milestone} title="Sem etapas em aberto" className="py-8" />
      ) : (
        <div>
          {/* R2-DASH-10 (canvas 1b): grid 1.4fr 80px 120px 1.6fr 90px; cabeçalho
              h30 --sf2 11/600 --tx2; linhas h36 13px; números à direita. */}
          <div className="grid grid-cols-[1.4fr_80px_120px_1.6fr_90px] items-center h-[30px] px-3.5 border-b border-surface-700 bg-[var(--sf2)] text-[11px] font-semibold text-surface-400">
            <span>Etapa</span>
            <span className="text-right">Negócios</span>
            <span className="text-right">Valor</span>
            <span className="pl-4">Distribuição</span>
            <span className="text-right">Conversão</span>
          </div>
          {rows.map((row, i) => {
            const prevCount = i > 0 ? rows[i - 1].count : null
            const conversion = prevCount ? Math.round((row.count / prevCount) * 100) : null
            const width = Math.min(100, Math.round((row.count / topCount) * 100))
            return (
              <div
                key={row.stage.id}
                className="grid grid-cols-[1.4fr_80px_120px_1.6fr_90px] items-center h-9 px-3.5 border-b border-surface-700 last:border-b-0 text-[13px]"
              >
                <span className="flex items-center gap-2 font-medium min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tintaDaEtapa(row.stage.color) }} />
                  <span className="truncate">{row.stage.label}</span>
                </span>
                <span className="text-right tabular-nums">{row.count}</span>
                <span className="text-right tabular-nums">{row.amountCents !== null ? brl(row.amountCents) : '—'}</span>
                <span className="pl-4">
                  <span className="block h-1.5 rounded-[3px] bg-[var(--sf2)] overflow-hidden">
                    <span
                      className="block h-full opacity-[.85]"
                      style={{ width: `${width}%`, backgroundColor: row.stage.color }}
                    />
                  </span>
                </span>
                <span className={cn('text-right tabular-nums', conversion === null && 'text-surface-400')}>
                  {conversion !== null ? `${conversion}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
