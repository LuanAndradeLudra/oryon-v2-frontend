import { memo } from 'react'
import { HelpCircle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts'
import { Tooltip } from '@/components/ui/Tooltip'
import { chartTooltipProps } from './utils'
import { useChartColors } from '@/hooks/useChartColors'
import type { DesfechoDosAtendimentos } from '@/types/dashboard'
import { TituloDaAjuda } from './agora/FaixaDoAgora'

/**
 * Auditoria do Dashboard (12/11, decisão D6): o anel dos Relatórios responde "como terminaram
 * os atendimentos do período". Antes ("Status das conversas") somava pendentes e ativas de AGORA
 * com resolvidas e arquivadas do PERÍODO — naturezas diferentes num gráfico de partes, e o estoque
 * antigo inflava o centro. Agora tudo é do mesmo período e as fatias somam o cartão Atendimentos.
 */
const AJUDA = (
  <span className="block space-y-1.5">
    <TituloDaAjuda>Desfecho dos atendimentos</TituloDaAjuda>
    <span className="block">Como terminaram os atendimentos que começaram no período. Soma 100% e fecha com o cartão Atendimentos.</span>
    <span className="block"><b>Só pela IA:</b> nenhuma pessoa escreveu. <b>Com a equipe:</b> uma pessoa participou. <b>Arquivados:</b> encerrados sem retorno do paciente, inclusive por inatividade. <b>Em aberto:</b> ainda sem desfecho.</span>
  </span>
)

export const DesfechoDonut = memo(function DesfechoDonut({ data, periodo }: { data: DesfechoDosAtendimentos | null; periodo?: string }) {
  const C = useChartColors()
  const cabecalho = (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-sm font-semibold text-surface-100">Desfecho dos atendimentos</p>
      {periodo && <span className="text-xs text-surface-500">{periodo}</span>}
      <span className="ml-auto">
        <Tooltip content={AJUDA} side="left" wide>
          <HelpCircle className="w-3.5 h-3.5 text-surface-600 hover:text-surface-400 transition-colors" aria-label="O que é o desfecho dos atendimentos" />
        </Tooltip>
      </span>
    </div>
  )
  if (!data) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-[10px] p-5 h-full flex flex-col">
        {cabecalho}
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">Desfecho indisponível</div>
      </div>
    )
  }
  const fatias = [
    { nome: 'Resolvidos só pela IA', valor: data.resolvedByAiOnly, cor: C.brand },
    { nome: 'Resolvidos com a equipe', valor: data.resolvedWithTeam, cor: C.online },
    { nome: 'Arquivados sem retorno', valor: data.archived, cor: C.danger },
    { nome: 'Ainda em aberto', valor: data.open, cor: C.away },
  ]
  const total = fatias.reduce((s, f) => s + f.valor, 0)
  const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '—')
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-[10px] p-5 h-full flex flex-col" data-testid="desfecho-donut">
      {cabecalho}
      <div className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={total > 0 ? fatias : [{ nome: 'Sem atendimentos', valor: 1, cor: C.grid }]}
              cx="50%" cy="50%" innerRadius={54} outerRadius={72} paddingAngle={total > 0 ? 3 : 0}
              dataKey="valor" nameKey="nome" startAngle={90} endAngle={-270} isAnimationActive={false}
            >
              {(total > 0 ? fatias : [{ nome: 'Sem atendimentos', valor: 1, cor: C.grid }]).map((f) => <Cell key={f.nome} fill={f.cor} />)}
            </Pie>
            {total > 0 && <ChartTooltip {...chartTooltipProps(C)} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-semibold text-surface-50 tabular-nums">{total.toLocaleString('pt-BR')}</span>
          <span className="text-2xs leading-tight text-surface-500">atendimentos</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        {fatias.map((f) => (
          <div key={f.nome} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.cor }} />
              <span className="text-surface-400 truncate">{f.nome}</span>
            </div>
            <span className="flex items-center gap-3 tabular-nums">
              <span className="text-surface-100 font-medium">{f.valor.toLocaleString('pt-BR')}</span>
              <span className="w-9 text-right text-surface-500">{pct(f.valor)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
