import { memo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { chartTooltipProps } from './utils'
import { useChartColors } from '@/hooks/useChartColors'
import type { TagVolume } from '@/types/dashboard'
import { EscopoDoCartao } from './EscopoDoCartao'

export const TagsChart = memo(function TagsChart({ data, escopo }: { data: TagVolume[]; escopo?: string }) {
  const C = useChartColors()
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8)
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-[10px] p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm font-semibold text-surface-100">{'Etiquetas mais usadas'}</p>
        {escopo && <EscopoDoCartao className="ml-auto">{escopo}</EscopoDoCartao>}
      </div>
      {/* Auditoria 12/11: sem etiqueta no período o gráfico ficava em branco, sem explicação. */}
      {sorted.length === 0 ? (
        <div className="h-[200px] flex flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-surface-700 text-center px-4">
          <p className="text-sm font-semibold text-surface-200">Nenhuma etiqueta aplicada no período</p>
          <p className="text-xs text-surface-500">As etiquetas que a equipe ou a IA aplicam nas conversas aparecem aqui.</p>
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="tagName"
            tick={{ fill: C.axis, fontSize: 11 }} width={112} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipProps(C)} />
          <Bar dataKey="count" name="Conversas" radius={[0, 3, 3, 0]} maxBarSize={20} isAnimationActive={false}>
            {sorted.map((entry) => (
              <Cell key={entry.tagId} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  )
})
