import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { C } from './utils'
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

export function VolumeChart({ data }: { data: VolumeDataPoint[] }) {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <p className="text-sm font-semibold text-surface-100">Volume de Mensagens</p>
        <div className="flex items-center gap-4 text-xs text-surface-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: C.brand }} />
            Recebidas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: C.online }} />
            Enviadas
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<SimpleTooltip />} />
          <Area type="monotone" dataKey="inbound" name="Recebidas"
            stroke={C.brand} fill={C.brand} fillOpacity={0.08} strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="outbound" name="Enviadas"
            stroke={C.online} fill={C.online} fillOpacity={0.08} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
