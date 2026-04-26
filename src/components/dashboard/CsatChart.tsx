import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { C } from './utils'
import type { CsatDataPoint } from '@/types/dashboard'

export function CsatChart({ data }: { data: CsatDataPoint[] }) {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-surface-100">Satisfação & NPS</p>
        <div className="flex items-center gap-4 text-xs text-surface-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: C.online }} />
            CSAT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: C.brand }} />
            NPS
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="csat" domain={[3, 5]} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="nps" orientation="right" domain={[0, 100]} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0a1a26', border: '1px solid #112a3a', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#d4e6f2' }}
          />
          <ReferenceLine yAxisId="csat" y={4} stroke={C.online} strokeDasharray="4 2" strokeOpacity={0.3} />
          <Line yAxisId="csat" type="monotone" dataKey="csat" name="CSAT"
            stroke={C.online} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="nps" type="monotone" dataKey="nps" name="NPS"
            stroke={C.brand} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
