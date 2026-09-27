import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToolMetrics, type AgentConfigWithTools, type ToolMetricRow } from '@/services/agentsApi'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Bloco, CabecalhoDaSecao } from './Estrutura'

type Periodo = '1' | '7' | '30'
const PERIODOS: Array<{ value: Periodo; label: string }> = [
  { value: '1', label: 'Hoje' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
]

function relativo(iso: string | null): string {
  if (!iso) return 'nunca'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d < 30 ? `há ${d} ${d === 1 ? 'dia' : 'dias'}` : new Date(iso).toLocaleDateString('pt-BR')
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border border-surface-700 bg-[var(--sf2)] px-4 py-3">
      <p className="text-3xs font-bold uppercase tracking-[.14em] text-surface-500">{rotulo}</p>
      <p className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-surface-50 tabular-nums">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-surface-400">{detalhe}</p>}
    </div>
  )
}

/**
 * Desempenho — os números deste agente e o uso das ferramentas. O registro
 * de ferramentas do agent-server é da conta inteira (não filtra por agente);
 * a tela diz isso em vez de fingir que é deste agente.
 */
export function SecaoDesempenho({ agent }: { agent: AgentConfigWithTools }) {
  const [params, setParams] = useSearchParams()
  const periodo: Periodo = (['1', '7', '30'] as const).includes(params.get('periodo') as Periodo) ? params.get('periodo') as Periodo : '7'
  const [linhas, setLinhas] = useState<ToolMetricRow[] | null>(null)
  const [indisponivel, setIndisponivel] = useState(false)

  useEffect(() => {
    let vivo = true
    getToolMetrics(Number(periodo))
      .then((r) => { if (vivo) { setLinhas(r.tools); setIndisponivel(false) } })
      .catch(() => { if (vivo) { setLinhas([]); setIndisponivel(true) } })
    return () => { vivo = false }
  }, [periodo])

  const mudarPeriodo = (p: Periodo) => setParams((prev) => {
    const n = new URLSearchParams(prev)
    n.set('periodo', p)
    return n
  }, { replace: true })

  const total = (linhas ?? []).reduce((a, r) => ({ chamadas: a.chamadas + r.total, falhas: a.falhas + r.failures }), { chamadas: 0, falhas: 0 })
  const regrasLigadas = (agent.handoff_rules?.rules ?? []).filter((r) => r.enabled).length

  return (
    <div>
      <CabecalhoDaSecao id="desempenho" />
      <div className="space-y-8">
        <Bloco titulo="Este agente">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero rotulo="Conversas atendidas" valor={agent.conversation_count.toLocaleString('pt-BR')} detalhe="desde que foi criado" />
            <Numero rotulo="Conversas de teste" valor={agent.test_count.toLocaleString('pt-BR')} detalhe={`último teste ${relativo(agent.last_tested_at)}`} />
            <Numero rotulo="Regras de transferência" valor={String(regrasLigadas)} detalhe="ligadas agora" />
            <Numero rotulo="Última alteração" valor={relativo(agent.updated_at)} detalhe={new Date(agent.updated_at).toLocaleDateString('pt-BR')} />
          </div>
        </Bloco>

        <Bloco
          titulo="Uso das ferramentas"
          descricao={<span className="inline-flex items-center gap-1.5"><Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />Somando todos os agentes da conta.</span>}
          acoes={<SegmentedControl label="Período" options={PERIODOS} value={periodo} onChange={mudarPeriodo} />}
        >
          {linhas === null ? (
            <Skeleton className="h-24 w-full bg-[var(--sf2)]" />
          ) : indisponivel ? (
            <EmptyState icon={BarChart3} title="Registro de uso indisponível" hint="O registro das chamadas de ferramentas não está ligado nesta conta. Fale com a Oryon se quiser acompanhar." />
          ) : linhas.length === 0 ? (
            <EmptyState icon={BarChart3} title="Nenhuma ferramenta chamada no período" hint="Quando o agente usar integrações ou skills, as chamadas aparecem aqui." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-surface-700">
              <table className="w-full text-sm">
                <caption className="sr-only">Chamadas por ferramenta</caption>
                <thead className="bg-[var(--sf2)] text-left text-3xs font-bold uppercase tracking-[.1em] text-surface-500">
                  <tr>
                    <th scope="col" className="px-4 py-2">Ferramenta</th>
                    <th scope="col" className="px-4 py-2 text-right">Chamadas</th>
                    <th scope="col" className="px-4 py-2 text-right">Sucesso</th>
                    <th scope="col" className="px-4 py-2 text-right">Tempo médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {linhas.map((r) => {
                    const taxa = r.total > 0 ? (r.successes / r.total) * 100 : 0
                    return (
                      <tr key={r.tool_name}>
                        <td className="px-4 py-2.5 font-mono text-xs text-surface-100">{r.tool_name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-surface-200">{r.total.toLocaleString('pt-BR')}</td>
                        <td className={cn('px-4 py-2.5 text-right tabular-nums', taxa >= 95 ? 'text-status-active' : taxa >= 80 ? 'text-status-pending' : 'text-danger')}>
                          {taxa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-surface-400">
                          {r.avg_duration_ms != null ? `${Math.round(r.avg_duration_ms).toLocaleString('pt-BR')} ms` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-surface-700 bg-[var(--sf2)] text-xs text-surface-400">
                  <tr>
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums text-surface-200">{total.chamadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{total.falhas === 0 ? 'nenhuma falha' : `${total.falhas.toLocaleString('pt-BR')} falhas`}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Bloco>
      </div>
    </div>
  )
}
