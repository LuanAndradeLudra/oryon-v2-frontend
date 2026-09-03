import { memo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { chartTooltipProps } from '@/components/dashboard/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'
import type { OwnerOverview } from '@/types/pipelineAnalytics'

/**
 * D2 (SCRUM-935) — ranking por dono: abertos × ganhos × perdidos no período,
 * um dono por linha. Inclui "Sem dono" (D0-9) quando há negócios sem
 * atribuição — não é omitido do ranking.
 */
export const OwnerRankingChart = memo(function OwnerRankingChart({ byOwner }: { byOwner: OwnerOverview[] }) {
  const C = useChartColors()
  const data = byOwner
    .map((o) => ({
      label: o.ownerName,
      open: o.open.count,
      won: o.won.count,
      lost: o.lost.count,
    }))
    .filter((d) => d.open + d.won + d.lost > 0)
    .sort((a, b) => (b.open + b.won + b.lost) - (a.open + a.won + a.lost))

  if (data.length === 0) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-2">Ranking por dono</p>
        <EmptyState icon={Users} title="Nenhum negócio atribuído ainda" className="py-8" />
      </div>
    )
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-4">Ranking por dono</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipProps(C)} />
          <Legend wrapperStyle={{ fontSize: 11, color: C.axis }} />
          <Bar dataKey="open" name="Em aberto" fill={C.cyan} radius={[0, 3, 3, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="won" name="Ganho" fill={C.online} radius={[0, 3, 3, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="lost" name="Perdido" fill={C.danger} radius={[0, 3, 3, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
