import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EscopoDoCartao } from './EscopoDoCartao'
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
 * SCRUM-1104 (tela 1b) — "Funil de vendas": estoque ABERTO agora por etapa do
 * funil padrão do tenant (mesma semântica de `StageFunnelChart`, D2/935).
 *
 * K14 (release 2026-09-29): o cabeçalho dizia "mês atual", mas o estoque é
 * de agora. E a "conversão" era a razão entre estoques de etapas vizinhas —
 * número sem significado (dá 300% quando a etapa seguinte acumula). Agora é a
 * taxa real de transição que a analítica do funil já calcula
 * (`StageConversion`): dos que entraram na etapa, quantos foram para a
 * seguinte (na última etapa aberta, para o ganho). Sem entrada: "—".
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
    return <div className="bg-surface-800 border border-surface-700 rounded-lg h-full min-h-56 animate-pulse" />
  }

  if (!pipeline) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden h-full flex flex-col">
        {/* PL-C3-FAR-eixo10: h-10 fixo, não min-h-10 — mesma medida exata dos
            irmãos VolumeChart/FilaAgoraCard na mesma linha do grid (40px). */}
        <div className="flex items-center h-10 px-3.5 border-b border-surface-700">
          <p className="text-[13px] font-semibold text-surface-100">Funil de vendas</p>
          <span className="text-[11.5px] text-surface-500 ml-2">em aberto por etapa</span>
        <EscopoDoCartao className="ml-2">agora</EscopoDoCartao>
        </div>
        <EmptyState icon={Milestone} title="Nenhum funil configurado" className="py-8 flex-1 mx-3.5 mb-3.5 items-center justify-center text-center" />
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

  const topCount = Math.max(1, ...rows.map((r) => r.count))
  const wonIds = new Set(pipeline.stages.filter((s) => s.isWon).map((s) => s.id))
  /** Taxa real etapa → próxima (ou → ganho na última aberta); null sem entrada. */
  const conversaoDe = (i: number): number | null => {
    const conv = overview?.conversion.find((c) => c.fromStageId === rows[i].stage.id)
    if (!conv || conv.enteredCount === 0) return null
    const next = rows[i + 1]?.stage.id
    const alvo = conv.outcomes.filter((o) => (next ? o.toStageId === next : wonIds.has(o.toStageId)))
    return Math.round(alvo.reduce((n, o) => n + o.count, 0) / conv.enteredCount * 100)
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden h-full flex flex-col">
      {/* PL-C3-FAR-eixo10: h-10 fixo, mesma medida dos irmãos do grid. */}
      <div className="flex items-center h-10 px-3.5 border-b border-surface-700">
        <p className="text-[13px] font-semibold text-surface-100">Funil de vendas</p>
        <span className="text-[11.5px] text-surface-500 ml-2">em aberto por etapa</span>
        <EscopoDoCartao className="ml-2">agora</EscopoDoCartao>
        <Link
          to={`/pipelines/${pipeline.id}`}
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-accent-dark hover:text-brand-300 transition-colors"
        >
          Abrir funil <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Milestone} title="Sem etapas em aberto" className="py-8 flex-1 mx-3.5 mb-3.5 items-center justify-center text-center" />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* R2-DASH-10 (canvas 1b): grid 1.4fr 80px 120px 1.6fr 90px; cabeçalho
              h30 --sf2 11/600 --tx2; linhas h36 13px; números à direita. */}
          <div className="grid grid-cols-[1.4fr_80px_120px_1.6fr_90px] items-center h-[30px] px-3.5 border-b border-surface-700 bg-[var(--sf2)] text-[11px] font-semibold text-surface-400">
            <span>Etapa</span>
            <span className="text-right">Negócios</span>
            <span className="text-right">Valor</span>
            <span className="pl-4">Distribuição</span>
            <span className="text-right" title="Em todo o histórico do funil (não segue o período): dos negócios que entraram na etapa, quantos passaram para a seguinte (na última, quantos foram ganhos).">Avançam*</span>
          </div>
          {rows.map((row, i) => {
            const conversion = conversaoDe(i)
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
          {/* A nota desce para o pé do cartão quando a linha é mais alta que o funil. */}
          <p className="mt-auto px-3.5 py-2 border-t border-surface-700 text-[11px] text-surface-500">
            * Avançam: em todo o histórico do funil (não segue o período). Negócios e valor são de agora.
          </p>
        </div>
      )}
    </div>
  )
}
