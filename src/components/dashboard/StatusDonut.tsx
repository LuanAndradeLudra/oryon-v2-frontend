import { memo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTooltipProps } from './utils'
import { useChartColors } from '@/hooks/useChartColors'
import type { StatusDistribution } from '@/types/dashboard'
import { EscopoDoCartao } from './EscopoDoCartao'

/**
 * `escopo`: o recorte, quando o cartão está numa tela com seletor de período.
 * Revisão 30/09 (C5): ativas e pendentes são de AGORA; resolvidas e arquivadas,
 * do PERÍODO (`periodo`, ex.: "nos últimos 7 dias"). Antes o cartão dizia
 * "agora" e somava as resolvidas de todo o histórico — por isso o centro mostra
 * só o que está em andamento, e a lista diz o recorte de cada linha.
 */
export const StatusDonut = memo(function StatusDonut({ data, escopo, periodo }: { data: StatusDistribution | null; escopo?: string; periodo?: string }) {
  const C = useChartColors()
  if (!data) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-lg p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-surface-100">Status das Conversas</p>
          {escopo && <EscopoDoCartao className="ml-auto">{escopo}</EscopoDoCartao>}
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">Status indisponível</div>
      </div>
    )
  }
  const SLICES = [
    { key: 'pending' as const,   label: 'Pendentes',   recorte: 'agora',   color: C.away    },
    { key: 'open' as const,      label: 'Ativas',      recorte: 'agora',   color: C.brand   },
    { key: 'resolved' as const,  label: 'Resolvidas',  recorte: periodo ?? 'no período', color: C.online  },
    { key: 'abandoned' as const, label: 'Arquivadas',  recorte: periodo ?? 'no período', color: C.danger  },
  ]
  const slices = SLICES.map((s) => ({ name: s.label, recorte: s.recorte, value: data[s.key], color: s.color }))
  const emAndamento = data.open + data.pending
  // O anel só desenha o que é do MESMO recorte (agora): resolvidas/arquivadas
  // do período não são fatia de um todo com as ativas (revisão de código 01/10).
  const anel = slices.filter((s) => s.recorte === 'agora')

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-surface-100">Status das Conversas</p>
        {escopo && <EscopoDoCartao className="ml-auto">{escopo}</EscopoDoCartao>}
      </div>

      <div className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={anel} cx="50%" cy="50%"
              innerRadius={50} outerRadius={72}
              paddingAngle={3} dataKey="value"
              startAngle={90} endAngle={-270}
              isAnimationActive={false}
            >
              {anel.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip {...chartTooltipProps(C)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-surface-50 tabular-nums">{emAndamento.toLocaleString('pt-BR')}</span>
          <span className="text-[10px] text-surface-500 uppercase tracking-wide">em andamento</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {slices.map((s) => {
          return (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-surface-400">{s.name}</span>
                <span className="text-surface-600">· {s.recorte}</span>
              </div>
              <span className="text-surface-100 font-medium tabular-nums">{s.value.toLocaleString('pt-BR')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
