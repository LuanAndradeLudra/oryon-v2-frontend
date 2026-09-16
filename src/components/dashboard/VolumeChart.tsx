import { memo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import type { VolumeDataPoint } from '@/types/dashboard'

function SimpleTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-surface-400 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-surface-300">{p.name}:</span>
          <span className="text-surface-100 font-medium">{p.value.toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  )
}

// memo + isAnimationActive={false}: sem isso o gráfico re-anima (~1s) a cada
// re-render do DashboardPage, mesmo quando os dados não mudaram.
//
// SCRUM-1104 (tela 1b, "Conversas por hora"): o mock mostra colunas
// empilhadas por hora com quebra Humano/IA — dado que este widget não tem
// (o backend só expõe volume por dia, Recebidas/Enviadas). Portamos o
// VOCABULÁRIO visual (header 40px, legenda com quadradinho de 8px, colunas
// empilhadas) sobre o dado real existente, sem inventar granularidade nova.
export const VolumeChart = memo(function VolumeChart({ data }: { data: VolumeDataPoint[] }) {
  const C = useChartColors()
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between min-h-10 pb-2.5 mb-2.5 border-b border-surface-700 flex-shrink-0 flex-wrap gap-2">
        <p className="text-sm font-semibold text-surface-100">Volume de Mensagens</p>
        <div className="flex items-center gap-4 text-xs text-surface-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ backgroundColor: C.brand }} />
            Recebidas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ backgroundColor: C.online }} />
            Enviadas
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <Tooltip content={<SimpleTooltip />} cursor={{ fill: C.surface8, fillOpacity: 0.5 }} />
          <Bar dataKey="inbound" name="Recebidas" stackId="volume" isAnimationActive={false}
            fill={C.brand} radius={[0, 0, 0, 0]} maxBarSize={18} />
          <Bar dataKey="outbound" name="Enviadas" stackId="volume" isAnimationActive={false}
            fill={C.online} fillOpacity={0.55} radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
})
