import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { chartTooltipProps } from './utils'
import { useChartColors } from '@/hooks/useChartColors'
import type { TagVolume } from '@/types/dashboard'

export function TagsChart({ data }: { data: TagVolume[] }) {
  const C = useChartColors()
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8)
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 h-full">
      <p className="text-sm font-semibold text-surface-100 mb-4">Tags Mais Usadas</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="tagName"
            tick={{ fill: C.axis, fontSize: 11 }} width={76} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipProps(C)} />
          <Bar dataKey="count" name="Conversas" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {sorted.map((entry) => (
              <Cell key={entry.tagId} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
