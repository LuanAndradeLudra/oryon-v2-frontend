import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { C } from './utils'
import type { StatusDistribution } from '@/types/dashboard'

const SLICES = [
  { key: 'pending' as const,   label: 'Em Fila',     color: C.away    },
  { key: 'open' as const,      label: 'Ativas',      color: C.brand   },
  { key: 'resolved' as const,  label: 'Resolvidas',  color: C.online  },
  { key: 'abandoned' as const, label: 'Abandonadas', color: C.danger  },
]

export function StatusDonut({ data }: { data: StatusDistribution }) {
  const slices = SLICES.map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
  const total = slices.reduce((s, x) => s + x.value, 0)

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 h-full flex flex-col">
      <p className="text-sm font-semibold text-surface-100 mb-3">Status das Conversas</p>

      <div className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%"
              innerRadius={50} outerRadius={72}
              paddingAngle={3} dataKey="value"
              startAngle={90} endAngle={-270}
            >
              {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#0a1a26', border: '1px solid #112a3a', borderRadius: 8, fontSize: 12 }}
              itemStyle={{ color: '#d4e6f2' }}
              labelStyle={{ color: '#82adc8' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-surface-50 tabular-nums">{total.toLocaleString('pt-BR')}</span>
          <span className="text-[10px] text-surface-500 uppercase tracking-wide">conversas</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {slices.map((s) => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-surface-400">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-surface-100 font-medium">{s.value.toLocaleString('pt-BR')}</span>
                <span className="text-surface-600 w-10 text-right">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
