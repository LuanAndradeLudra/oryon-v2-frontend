import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { chartTooltipProps } from '@/components/dashboard/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { LineChart as LineChartIcon } from 'lucide-react'
import { pipelineAnalyticsApi } from '@/services/api'

interface Props {
  pipelineId: string
  /** `null` = sem período aplicado ("Todo o período") — sem um intervalo
   *  fechado não há como recortar buckets sem inventar uma janela; a série
   *  fica indisponível em vez de mostrar um recorte silenciosamente errado. */
  from: string | null
  to: string | null
  ownerUserId?: string
}

interface Bucket {
  label: string
  won: number
  lost: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_BUCKETS = 12

/**
 * D2 (SCRUM-935) — série temporal de ganho × perdido. `GET /analytics/pipelines/:id/overview`
 * (D1/934) não devolve uma série pronta — só agregados do período inteiro —
 * então esta série é construída chamando o MESMO endpoint real uma vez por
 * fatia do período (até 12 fatias, diária se o período cabe em ~12 dias,
 * semanal senão). Cada ponto é uma leitura real do backend, nunca um valor
 * interpolado ou mockado (P14).
 */
export function WonLostTimeSeriesChart({ pipelineId, from, to, ownerUserId }: Props) {
  const C = useChartColors()
  const [buckets, setBuckets] = useState<Bucket[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!from || !to) { setBuckets(null); return }
    const fromMs = new Date(from).getTime()
    const toMs = new Date(to).getTime()
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) { setBuckets([]); return }

    const totalDays = Math.max(1, Math.ceil((toMs - fromMs) / DAY_MS))
    const bucketCount = Math.min(MAX_BUCKETS, totalDays)
    const bucketMs = Math.ceil((toMs - fromMs) / bucketCount)

    const ranges: { from: Date; to: Date }[] = []
    for (let i = 0; i < bucketCount; i++) {
      const bFrom = new Date(fromMs + i * bucketMs)
      const bTo = new Date(Math.min(toMs, fromMs + (i + 1) * bucketMs))
      if (bFrom.getTime() >= bTo.getTime()) continue
      ranges.push({ from: bFrom, to: bTo })
    }

    let alive = true
    setLoading(true)
    Promise.all(
      ranges.map((r) =>
        pipelineAnalyticsApi
          .overview(pipelineId, { from: r.from.toISOString(), to: r.to.toISOString(), ownerUserId })
          .then((res) => ({
            label: r.from.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            won: res.data.closed.won.total.count,
            lost: res.data.closed.lost.total.count,
          })),
      ),
    )
      .then((data) => { if (alive) setBuckets(data) })
      .catch(() => { if (alive) setBuckets([]) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [pipelineId, from, to, ownerUserId])

  const title = 'Ganho × perdido no tempo'

  if (!from || !to) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-2">{title}</p>
        <EmptyState icon={LineChartIcon} title="Selecione um período para ver a série temporal" className="py-8" />
      </div>
    )
  }

  if (loading || buckets === null) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-4">{title}</p>
        <div className="h-[200px] rounded-lg bg-surface-800/40 animate-pulse" aria-hidden />
      </div>
    )
  }

  const hasData = buckets.some((b) => b.won > 0 || b.lost > 0)
  if (!hasData) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-2">{title}</p>
        <EmptyState icon={LineChartIcon} title="Nenhum negócio fechado no período" className="py-8" />
      </div>
    )
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={buckets} margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...chartTooltipProps(C)} />
          <Legend wrapperStyle={{ fontSize: 11, color: C.axis }} />
          <Line type="monotone" dataKey="won" name="Ganho" stroke={C.online} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="lost" name="Perdido" stroke={C.danger} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
