import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Milestone } from 'lucide-react'
import { pipelinesApi, pipelineAnalyticsApi } from '@/services/api'
import { isMoneyBucket } from '@/types/pipelineAnalytics'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import type { Pipeline, PipelineStage } from '@/types'
import { tintaDaEtapa } from '@/lib/utils'
import { CardHeader } from '@/components/ui/Card'
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
    return <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 h-56 animate-pulse" />
  }

  if (!pipeline) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
        <CardHeader title="Funil de vendas" description="por etapa · mês atual" />
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
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
      <CardHeader
        title="Funil de vendas"
        description="por etapa · mês atual"
        action={
          <Link
            to={`/pipelines/${pipeline.id}`}
            className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Abrir funil <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={Milestone} title="Sem etapas em aberto" className="py-8" />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
              <th className="text-left pb-2 font-semibold">Etapa</th>
              <th className="text-right pb-2 font-semibold">Negócios</th>
              <th className="text-right pb-2 font-semibold">Valor</th>
              <th className="text-left pb-2 pl-4 font-semibold">Distribuição</th>
              <th className="text-right pb-2 font-semibold">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const prevCount = i > 0 ? rows[i - 1].count : null
              const conversion = prevCount ? Math.round((row.count / prevCount) * 100) : null
              const width = Math.min(100, Math.round((row.count / topCount) * 100))
              return (
                <tr key={row.stage.id} className="border-t border-surface-800/60">
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tintaDaEtapa(row.stage.color) }}
                      />
                      <span className="text-[13px] font-medium text-surface-200 truncate">{row.stage.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-[13px] tabular-nums text-surface-200">{row.count}</td>
                  <td className="py-2.5 text-right text-[13px] tabular-nums text-surface-300">
                    {row.amountCents !== null ? brl(row.amountCents) : '—'}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: tintaDaEtapa(row.stage.color, 0.85) }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-[13px] tabular-nums text-surface-400">
                    {conversion !== null ? `${conversion}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
