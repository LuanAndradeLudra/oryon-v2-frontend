import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { C } from './utils'
import type { HeatmapCell } from '@/types/dashboard'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Aggregate heatmap cells into per-day buckets: manhã, tarde, noite
function aggregate(data: HeatmapCell[]) {
  return DAYS.map((label, di) => {
    const dayRows = data.filter((c) => c.day === di)
    const manha   = dayRows.filter((c) => c.hour >= 6  && c.hour < 12).reduce((s, c) => s + c.value, 0)
    const tarde   = dayRows.filter((c) => c.hour >= 12 && c.hour < 18).reduce((s, c) => s + c.value, 0)
    const noite   = dayRows.filter((c) => c.hour >= 18 && c.hour < 24).reduce((s, c) => s + c.value, 0)
    return { label, manha, tarde, noite }
  })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + p.value, 0)
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-xs shadow-lg">
      <p className="text-surface-300 font-semibold mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-surface-400">{p.name}</span>
          </div>
          <span className="text-surface-100 font-medium tabular-nums">{p.value.toLocaleString('pt-BR')}</span>
        </div>
      ))}
      <div className="border-t border-surface-700 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-surface-500">Total</span>
        <span className="text-surface-200 font-semibold tabular-nums">{total.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  )
}

export function PeakHoursHeatmap({ data }: { data: HeatmapCell[] }) {
  const chartData = aggregate(data)

  const BARS: { key: 'manha' | 'tarde' | 'noite'; label: string; color: string }[] = [
    { key: 'manha', label: 'Manhã (6h–12h)',  color: C.brand },
    { key: 'tarde', label: 'Tarde (12h–18h)', color: C.online },
    { key: 'noite', label: 'Noite (18h–24h)', color: C.axis },
  ]

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-surface-100">Horários de Pico</p>
        <p className="text-xs text-surface-400 mt-0.5">Volume de conversas por período e dia da semana</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: C.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: C.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            iconType="square"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: C.axis, fontSize: 11 }}>{value}</span>
            )}
          />
          {BARS.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
