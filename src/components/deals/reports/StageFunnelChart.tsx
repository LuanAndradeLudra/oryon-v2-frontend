import { memo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { chartTooltipProps } from '@/components/dashboard/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { Milestone } from 'lucide-react'
import { isMoneyBucket, type StageOverview } from '@/types/pipelineAnalytics'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * D2 (SCRUM-935) — funil por etapa: barras horizontais com valor + contagem
 * (funil `sales`) ou só contagem (`process`, sem valores — D1/934). Dados de
 * `PipelineOverview.stages`, estoque ABERTO de hoje (não filtrado por período —
 * mesma semântica do backend).
 */
export const StageFunnelChart = memo(function StageFunnelChart({ stages }: { stages: StageOverview[] }) {
  const C = useChartColors()
  const total = stages.reduce((sum, s) => sum + s.open.count, 0)

  if (total === 0) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-surface-100 mb-2">Funil por etapa</p>
        <EmptyState icon={Milestone} title="Nenhum negócio em aberto" className="py-8" />
      </div>
    )
  }

  const hasMoney = stages.length > 0 && isMoneyBucket(stages[0].open)
  const data = stages.map((s) => ({
    label: s.stageLabel,
    count: s.open.count,
    amountCents: isMoneyBucket(s.open) ? s.open.amountCents : 0,
  }))

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-4">Funil por etapa</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
          <Tooltip
            {...chartTooltipProps(C)}
            formatter={(value) => [`${value} negócio${value === 1 ? '' : 's'}`, 'Contagem']}
          />
          <Bar dataKey="count" name="Contagem" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.label} fill={C.brand} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasMoney && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-surface-500">
          {data.map((d) => (
            <span key={d.label}>{d.label}: <span className="text-surface-300 tabular-nums">{brl(d.amountCents)}</span></span>
          ))}
        </div>
      )}
    </div>
  )
})
