import { memo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { chartTooltipProps } from '@/components/dashboard/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { Scale } from 'lucide-react'
import type { CloseReasonBucket } from '@/types/pipelineAnalytics'

function reasonLabel(reason: string | null): string {
  if (reason === null) return 'Sem motivo (legado)'
  return reason
}

/**
 * D2 (SCRUM-935) — ganho × perdido por motivo, no período filtrado. Barras
 * horizontais agrupadas por motivo (won em verde, lost em vermelho) — mesmo
 * `reason` pode aparecer nos dois lados (ex.: "Preço" perdendo negócios e,
 * via motivo de reabertura, também fechando outros).
 */
export const WonLostReasonChart = memo(function WonLostReasonChart({
  won, lost,
}: {
  won: CloseReasonBucket[]
  lost: CloseReasonBucket[]
}) {
  const C = useChartColors()
  const byReason = new Map<string, { label: string; won: number; lost: number }>()
  for (const b of won) {
    const key = b.reason ?? '__none__'
    const entry = byReason.get(key) ?? { label: reasonLabel(b.reason), won: 0, lost: 0 }
    entry.won += b.count
    byReason.set(key, entry)
  }
  for (const b of lost) {
    const key = b.reason ?? '__none__'
    const entry = byReason.get(key) ?? { label: reasonLabel(b.reason), won: 0, lost: 0 }
    entry.lost += b.count
    byReason.set(key, entry)
  }
  const data = [...byReason.values()].sort((a, b) => (b.won + b.lost) - (a.won + a.lost))

  if (data.length === 0) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-2">Ganho × perdido por motivo</p>
        <EmptyState icon={Scale} title="Nenhum negócio fechado no período" className="py-8" />
      </div>
    )
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-4">Ganho × perdido por motivo</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipProps(C)} />
          <Bar dataKey="won" name="Ganho" fill={C.online} radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="lost" name="Perdido" fill={C.danger} radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
