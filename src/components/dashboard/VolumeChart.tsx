import { memo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip,
} from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { cn } from '@/lib/utils'
import type { DateRange, VolumeDataPoint } from '@/types/dashboard'

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
const RANGE_OPTIONS: { value: 'today' | '7d' | '30d'; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

export const VolumeChart = memo(function VolumeChart({ data, range, onRangeChange }: {
  data: VolumeDataPoint[]
  /** R2-DASH-04: seletor Hoje/7 dias/30 dias no header (mock 1b) — liga ao
   *  MESMO período global da página, sem fetch próprio. */
  range?: DateRange
  onRangeChange?: (r: DateRange) => void
}) {
  const C = useChartColors()
  // R2-DASH-09 (canvas 1b, valores exatos): card sem padding próprio; header
  // h40 px14 gap16 border-b; legenda gap14 11.5 --tx2; segmentado raio 6 borda --bd
  // com células h24 px9 11.5/600 (ativa --sf2/--tx, demais --tx2 + border-left);
  // corpo h170 padding 14/14/8.
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center h-10 px-3.5 gap-4 border-b border-surface-700 flex-shrink-0">
        <p className="text-[13px] font-semibold text-surface-100">Volume de Mensagens</p>
        <div className="flex items-center gap-3.5 text-[11.5px] text-surface-400">
          <span className="inline-flex items-center gap-[5px]">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ backgroundColor: C.brand }} />
            Recebidas
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <span className="w-2 h-2 rounded-[2px] inline-block bg-[var(--bd2)]" />
            Enviadas
          </span>
        </div>
        {range && onRangeChange && (
          <div role="tablist" aria-label="Período do gráfico" className="ml-auto inline-flex rounded-[6px] border border-surface-700 overflow-hidden text-[11.5px] font-semibold">
            {RANGE_OPTIONS.map((o, i) => (
              <button
                key={o.value}
                role="tab"
                aria-selected={range === o.value}
                onClick={() => onRangeChange(o.value)}
                className={cn(
                  'h-6 px-[9px] inline-flex items-center transition-colors',
                  i > 0 && 'border-l border-surface-700',
                  range === o.value ? 'bg-[var(--sf2)] text-surface-100' : 'text-surface-400 hover:bg-[var(--rowhover)]',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 h-[170px] min-h-[170px] pt-3.5 px-3.5 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={2}>
            <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<SimpleTooltip />} cursor={{ fill: C.surface8, fillOpacity: 0.5 }} />
            <Bar dataKey="inbound" name="Recebidas" stackId="volume" isAnimationActive={false}
              fill={C.brand} radius={[0, 0, 0, 0]} maxBarSize={18} />
            <Bar dataKey="outbound" name="Enviadas" stackId="volume" isAnimationActive={false}
              fill="var(--bd2)" radius={[2, 2, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
