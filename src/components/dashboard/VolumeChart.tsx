import { memo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip,
} from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import type { DateRange, VolumeDataPoint } from '@/types/dashboard'
import { ESCOPO, periodoPorExtenso, volumeSeguePeriodo } from '@/lib/periodoDoPainel'
import { EscopoDoCartao } from './EscopoDoCartao'

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
/** "2026-09-14" → "14/09": o eixo mostrava a data ISO crua. */
function diaMes(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso
}

export const VolumeChart = memo(function VolumeChart({ data, range = '7d' }: {
  data: VolumeDataPoint[]
  /**
   * O período da página (28/09: o seletor próprio do cartão saiu — eram dois
   * controles para o mesmo estado). O backend manda sempre os últimos 7 dias:
   * "Hoje" filtra aqui; 30 dias e "Este mês" mostram os 7 dias e dizem isso.
   */
  range?: DateRange
}) {
  const C = useChartColors()
  const chartData = data
  // O backend manda todos os dias do período (zeros inclusive): vazio = nenhuma mensagem no período.
  const semMensagem = chartData.every((d) => d.inbound === 0 && d.outbound === 0)
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
        {!volumeSeguePeriodo(range) && <EscopoDoCartao className="ml-auto">{ESCOPO.seteDias}</EscopoDoCartao>}
      </div>
      {/* Altura FIXA (26/09): com `flex-1` num cartão de altura indefinida, os
          100% do ResponsiveContainer resolviam para zero e o gráfico sumia —
          medido na demonstração da landing, mesmo layout do app. */}
      <div className="h-[170px] flex-shrink-0 pt-3.5 px-3.5 pb-2">
        {semMensagem ? (
          // P6: gráfico vazio não desenha eixos em branco — "Hoje" pode não
          // ter mensagem nenhuma ainda (dia começando, fora do horário).
          <div className="h-full flex items-center justify-center text-[11.5px] text-surface-500">
            Sem mensagens {periodoPorExtenso(range)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={2}>
              <XAxis dataKey="date" tickFormatter={diaMes} tick={{ fill: C.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<SimpleTooltip />} cursor={{ fill: C.surface8, fillOpacity: 0.5 }} />
              <Bar dataKey="inbound" name="Recebidas" stackId="volume" isAnimationActive={false}
                fill={C.brand} radius={[0, 0, 0, 0]} maxBarSize={18} />
              <Bar dataKey="outbound" name="Enviadas" stackId="volume" isAnimationActive={false}
                fill="var(--bd2)" radius={[2, 2, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
})
