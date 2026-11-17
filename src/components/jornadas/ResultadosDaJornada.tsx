import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChartColumn, Download, Wallet } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useChartColors } from '@/hooks/useChartColors'
import { chartTooltipProps } from '@/components/dashboard/utils'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo } from '@/services/jornadas/catalogo'
import { MOTIVOS_DE_PULO, ROTULO_DA_ETAPA } from '@/services/jornadas/motivos'
import type { Catalogo, Jornada, RecorteDosResultados, ResultadosDaJornada as Resultados } from '@/services/jornadas/tipos'
import { baixarCsv, numero, useCarregar } from './apoio'
import { PessoasDoRecorte } from './PessoasDoRecorte'

/**
 * Resultados: funil por passo, respostas, motivos de saída e comparação entre versões.
 *
 * P1 do benchmark (16/11): período (7, 30, 90 dias) comparado com o anterior, a
 * série por dia (HubSpot Performance) e as métricas de cada envio de WhatsApp —
 * enviadas, entregues, lidas, responderam, não chegaram (com o motivo da Meta) e
 * a tarifa em R$ —, o dado mais pedido pela operação.
 *
 * P2 (16/11): cada número abre as pessoas por trás (passo, ramo, saída, meta,
 * pulo), os motivos PADRONIZADOS de quem não entrou ou pulou, a receita
 * atribuída pelo funil do CRM e a exportação em CSV.
 */
type Periodo = '7' | '30' | '90'

/** "+8%" / "-3%" contra o período anterior; "melhor" diz se subir é bom. */
function Variacao({ atual, antes, melhorSobe = true }: { atual: number; antes?: number; melhorSobe?: boolean }) {
  if (antes === undefined || antes === 0) return null
  const p = Math.round(((atual - antes) / antes) * 100)
  if (p === 0) return <span className="text-[12px] text-surface-500">igual ao anterior</span>
  const bom = p > 0 === melhorSobe
  const Seta = p > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums', bom ? 'text-status-active' : 'text-[var(--color-danger)]')}>
      <Seta className="h-3.5 w-3.5" aria-hidden />{p > 0 ? '+' : ''}{p}%
    </span>
  )
}

const pctDe = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0)
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Os números da tela num CSV só (uma linha por item), para levar para a planilha. */
function csvDosResultados(r: Resultados, nome: (id: string) => string): string {
  const L: (string | number)[][] = [['Seção', 'Item', 'Valor', 'Detalhe']]
  L.push(['Resumo', 'Entraram', r.entered, ''], ['Resumo', 'Bateram a meta', r.completedGoal, ''], ['Resumo', 'Saíram', r.exited, ''], ['Resumo', 'Falharam', r.failed, ''])
  if (r.attribution) L.push(['Receita', `Funil ${r.attribution.pipelineName}`, r.attribution.revenueBrl, `${r.attribution.won} ganhos de ${r.attribution.deals} negócios, até ${r.attribution.windowDays} dias`])
  for (const b of r.byNode) L.push(['Passo', nome(b.nodeId), b.reached, b.now ? `${b.now} agora` : ''])
  for (const b of r.byBranch) L.push(['Resposta', b.label, b.count, nome(b.nodeId)])
  for (const x of r.exitReasons) L.push(['Saída', x.reason, x.count, ''])
  for (const x of r.skipped ?? []) L.push(['Pulo', MOTIVOS_DE_PULO[x.code]?.rotulo ?? x.code, x.count, ROTULO_DA_ETAPA[MOTIVOS_DE_PULO[x.code]?.etapa ?? 'entrada'].titulo])
  for (const m of r.byMessage ?? []) L.push(['Mensagem', nome(m.nodeId), m.sent, `entregues ${m.delivered} · lidas ${m.read} · responderam ${m.replied} · não chegaram ${m.failed}`])
  for (const d of r.series ?? []) L.push(['Dia', d.date, d.entered, `meta ${d.completed} · saíram ${d.exited}`])
  return L.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
}

/** A linha clicável de um número que abre as pessoas (sem mudar o desenho da linha). */
const LINHA_CLICAVEL = '-mx-2 w-[calc(100%+1rem)] rounded-[8px] px-2 text-left enabled:cursor-pointer enabled:hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
export function ResultadosDaJornada({ jornada, catalogo, resultados: deTrinta, onVerErros, onVerCaminho }: {
  jornada: Jornada
  catalogo: Catalogo
  resultados: Resultados | null
  /** "Falharam N" abre Pessoas → Registro de ações, só com os erros (P1, 16/11). */
  onVerErros?: () => void
  /** "Ver no desenho" de uma pessoa do recorte. */
  onVerCaminho?: (titulo: string, nodeIds: string[]) => void
}) {
  const [periodo, setPeriodo] = useState<Periodo>('30')
  // O número clicado (P2, 16/11): abre as pessoas por trás dele.
  const [recorte, setRecorte] = useState<{ r: RecorteDosResultados; titulo: string } | null>(null)
  const C = useChartColors()
  const { dados: doPeriodo } = useCarregar(() => (periodo === '30' ? Promise.resolve(null) : jornadasApi.resultados(jornada.id, { dias: Number(periodo) })), [jornada.id, periodo])
  const resultados = periodo === '30' ? deTrinta : doPeriodo
  // Ordem do funil: a do caminho (busca em largura a partir do primeiro passo).
  const ordem = useMemo(() => {
    const g = jornada.draft.graph
    const vistos: string[] = []
    const fila = g.start ? [g.start] : []
    while (fila.length) {
      const id = fila.shift()!
      if (vistos.includes(id) || !g.nodes[id]) continue
      vistos.push(id)
      for (const d of Object.values(g.nodes[id].outputs)) if (d) fila.push(d)
    }
    return vistos
  }, [jornada.draft.graph])

  if (!resultados) return <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-2">{[0, 1].map((i) => <SkeletonCard key={i} lines={3} />)}</div>
  if (!resultados.entered && periodo === '30') {
    return <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-10"><EmptyState icon={ChartColumn} title="Sem resultados ainda" hint="Os números aparecem quando a jornada estiver publicada e alguém entrar." /></div>
  }
  const taxa = Math.round((resultados.completedGoal / resultados.entered) * 100)
  const porNo = new Map(resultados.byNode.map((b) => [b.nodeId, b]))
  const nome = (id: string) => {
    const no = jornada.draft.graph.nodes[id]
    if (!no) return id
    if (no.label) return no.label
    // Vários "Sair" e "Meta" no mesmo desenho: o motivo diferencia.
    if (no.type === 'exit') return `Sair: ${String(no.params.reason ?? '')}`
    if (no.type === 'goal') return `Meta: ${String(no.params.label ?? '')}`
    return passoDoCatalogo(catalogo, no.type)?.label || no.type
  }
  const maxSaida = Math.max(1, ...resultados.exitReasons.map((x) => x.count))
  const totalRamos = resultados.byBranch.reduce((s, b) => s + b.count, 0) || 1

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-surface-400">Últimos {periodo} dias, comparados com os {periodo} dias anteriores · cada agendamento ou negócio conta como uma inscrição.</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => baixarCsv(`resultados-${jornada.id}-${periodo}-dias.csv`, csvDosResultados(resultados, nome))}>Exportar CSV</Button>
          <SegmentedControl label="Período" size="32" value={periodo} onChange={setPeriodo} options={[
            { value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }, { value: '90', label: '90 dias' },
          ]} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['Entraram', numero(resultados.entered), null, resultados.entered, resultados.previous?.entered, true],
          ['Bateram a meta', `${taxa}%`, `${numero(resultados.completedGoal)} inscrições`, taxa, resultados.previous && resultados.previous.entered ? Math.round((resultados.previous.completedGoal / resultados.previous.entered) * 100) : undefined, true],
          ['Saíram', numero(resultados.exited), 'sem meta, com motivo', resultados.exited, resultados.previous?.exited, false],
          ['Falharam', numero(resultados.failed), 'erro num passo', resultados.failed, resultados.previous?.failed, false],
        ] as const).map(([r, v, s, atual, antes, sobe], i) => (
          <div key={r} style={{ animationDelay: `${i * 50}ms` }} className="jornadas-aparecer rounded-[12px] bg-surface-800 border border-surface-700 px-5 py-4">
            <p className="text-[12px] text-surface-400">{r}</p>
            <p className="mt-1 flex items-baseline gap-2 text-[26px] leading-8 font-semibold text-surface-50 tabular-nums">{v}<Variacao atual={atual} antes={antes} melhorSobe={sobe} /></p>
            {s && <p className="text-[12px] text-surface-400">{s}</p>}
            {r === 'Bateram a meta' && resultados.completedGoal > 0 && (
              <button type="button" onClick={() => setRecorte({ r: { tipo: 'meta' }, titulo: 'Bateram a meta' })} className="mt-1 text-[12px] font-semibold jt-texto-azul hover:underline cursor-pointer">Ver quem bateu</button>
            )}
            {r === 'Falharam' && resultados.failed > 0 && onVerErros && (
              <button type="button" onClick={onVerErros} className="mt-1 text-[12px] font-semibold jt-texto-azul hover:underline cursor-pointer">Ver os erros e tentar de novo</button>
            )}
          </div>
        ))}
      </div>

      {resultados.attribution && (
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] jt-verde"><Wallet className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <p className="text-[12px] text-surface-400">Receita atribuída · funil “{resultados.attribution.pipelineName}”</p>
            <p className="mt-0.5 flex items-baseline gap-2 text-[22px] leading-7 font-semibold text-surface-50 tabular-nums">{reais(resultados.attribution.revenueBrl)}<Variacao atual={resultados.attribution.revenueBrl} antes={resultados.attribution.previousRevenueBrl} /></p>
          </div>
          <p className="min-w-[240px] flex-1 text-[12px] leading-snug text-surface-400">
            {numero(resultados.attribution.won)} negócios ganhos de {numero(resultados.attribution.deals)} abertos por quem entrou, até {resultados.attribution.windowDays} dias depois de entrar. A receita soma só os ganhos.
          </p>
        </section>
      )}

      {resultados.series && resultados.series.length > 1 && (
        <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-surface-50">Dia a dia</h2>
            <div className="flex items-center gap-4 text-[12px] text-surface-400">
              {[['Entraram', C.cyan], ['Bateram a meta', C.online], ['Saíram', C.axis]].map(([r, cor]) => (
                <span key={r} className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: cor }} />{r}</span>
              ))}
            </div>
          </div>
          <div className="h-[220px]" role="img" aria-label={`Entradas, metas batidas e saídas por dia nos últimos ${periodo} dias`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resultados.series.map((p) => ({ ...p, dia: `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}` }))} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...chartTooltipProps(C)} />
                <Line type="monotone" dataKey="entered" name="Entraram" stroke={C.cyan} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" name="Bateram a meta" stroke={C.online} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="exited" name="Saíram" stroke={C.axis} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {resultados.byMessage && resultados.byMessage.length > 0 && (
        <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold text-surface-50">Mensagens do WhatsApp</h2>
            <p className="mt-0.5 text-[12px] text-surface-400">Cada envio, do envio à resposta, com os status que a Meta devolve. A tarifa é estimada (média da categoria).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">
                  <th className="py-2 pr-3 font-semibold">Passo</th>
                  <th className="py-2 px-3 font-semibold text-right">Enviadas</th>
                  <th className="py-2 px-3 font-semibold text-right">Entregues</th>
                  <th className="py-2 px-3 font-semibold text-right">Lidas</th>
                  <th className="py-2 px-3 font-semibold text-right">Responderam</th>
                  <th className="py-2 px-3 font-semibold text-right">Não chegaram</th>
                  <th className="py-2 pl-3 font-semibold text-right">Tarifa</th>
                </tr>
              </thead>
              <tbody>
                {resultados.byMessage.map((m) => (
                  <tr key={m.nodeId} className="border-t border-surface-700 align-top">
                    <td className="py-2.5 pr-3 text-surface-100">{nome(m.nodeId)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-surface-100">{numero(m.sent)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-surface-200">{pctDe(m.delivered, m.sent)}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-surface-200">{pctDe(m.read, m.sent)}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-surface-200">{pctDe(m.replied, m.sent)}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={cn('tabular-nums', m.failed ? 'text-[var(--color-danger)]' : 'text-surface-400')} title={m.failedReasons?.map((x) => `${x.reason}: ${x.count}`).join('\n')}>{numero(m.failed)}</span>
                      {m.failedReasons && m.failedReasons.length > 0 && (
                        <span className="mt-0.5 block text-[12px] leading-snug text-surface-500">{m.failedReasons.map((x) => `${x.reason} (${numero(x.count)})`).join(' · ')}</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right tabular-nums text-surface-200">{m.costBrl ? reais(m.costBrl) : m.costBrl === 0 ? 'grátis' : '—'}</td>
                  </tr>
                ))}
              </tbody>
              {resultados.byMessage.some((m) => m.costBrl) && (
                <tfoot>
                  <tr className="border-t border-surface-700">
                    <td colSpan={6} className="py-2.5 pr-3 text-right text-[12px] text-surface-400">Tarifa estimada da Meta no período</td>
                    <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-surface-50">{reais(resultados.byMessage.reduce((t, m) => t + (m.costBrl ?? 0), 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-surface-50">Onde as pessoas passam e param</h2>
          <p className="mt-0.5 text-[12px] text-surface-400">Clique num passo para ver quem passou por ele.</p>
        </div>
        <ul className="space-y-0.5">
          {ordem.map((id) => {
            const b = porNo.get(id)
            const pct = b ? Math.round((b.reached / resultados.entered) * 100) : 0
            return (
              <li key={id}>
                <button type="button" disabled={!b?.reached} onClick={() => setRecorte({ r: { tipo: 'passo', nodeId: id }, titulo: `Passaram por “${nome(id)}”` })}
                  className={cn('grid grid-cols-[minmax(0,240px)_minmax(0,1fr)_170px] items-center gap-4 py-1 text-[14px]', LINHA_CLICAVEL)}>
                  <span className="truncate text-surface-200" title={nome(id)}>{nome(id)}</span>
                  <span className="h-2 rounded-full bg-surface-700 overflow-hidden" aria-hidden><span className="jornadas-barra block h-full rounded-full bg-[var(--color-accent-blue)]" style={{ width: `${pct}%` }} /></span>
                  <span className="tabular-nums text-surface-300 text-right">{numero(b?.reached ?? 0)} ({pct}%){b?.now ? ` · ${numero(b.now)} agora` : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {resultados.byBranch.length > 0 && (
          <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
            <h2 className="text-[16px] font-semibold text-surface-50">Respostas</h2>
            <ul className="space-y-1.5">
              {resultados.byBranch.map((b) => (
                <li key={`${b.nodeId}:${b.output}`}>
                  <button type="button" disabled={!b.count} onClick={() => setRecorte({ r: { tipo: 'ramo', nodeId: b.nodeId, output: b.output }, titulo: `Seguiram por “${b.label}”` })}
                    className={cn('flex items-center justify-between gap-3 py-2 text-xs', LINHA_CLICAVEL)}>
                    <span className="text-surface-200">{b.label}</span>
                    <span className="tabular-nums text-surface-300">{numero(b.count)} · {Math.round((b.count / totalRamos) * 100)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
          <h2 className="text-[16px] font-semibold text-surface-50">Motivos de saída</h2>
          <ul className="space-y-1.5">
            {resultados.exitReasons.map((x) => (
              <li key={x.reason}>
                <button type="button" disabled={!x.count} onClick={() => setRecorte({ r: { tipo: 'saida', reason: x.reason }, titulo: `Saíram: ${x.reason}` })} className={cn('block space-y-1 py-1', LINHA_CLICAVEL)}>
                  <span className="flex justify-between gap-3 text-xs"><span className="text-surface-200">{x.reason}</span><span className="tabular-nums text-surface-300">{numero(x.count)}</span></span>
                  <span className="block h-1.5 rounded-full bg-surface-700 overflow-hidden" aria-hidden><span className="jornadas-barra block h-full rounded-full bg-surface-500" style={{ width: `${(x.count / maxSaida) * 100}%` }} /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {resultados.skipped && resultados.skipped.length > 0 && (
        <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold text-surface-50">Ficaram de fora ou pularam</h2>
            <p className="mt-0.5 text-[12px] text-surface-400">Os motivos são os mesmos em toda a plataforma. Clique num motivo para ver quem.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {(['entrada', 'envio', 'adiado'] as const).map((etapa) => {
              const itens = resultados.skipped!.filter((x) => MOTIVOS_DE_PULO[x.code]?.etapa === etapa).sort((a, b) => b.count - a.count)
              if (!itens.length) return null
              return (
                <div key={etapa}>
                  <p className="text-[14px] font-semibold text-surface-100">{ROTULO_DA_ETAPA[etapa].titulo} <span className="font-normal tabular-nums text-surface-400">· {numero(itens.reduce((t, x) => t + x.count, 0))}</span></p>
                  <p className="mb-1.5 text-[12px] text-surface-500">{ROTULO_DA_ETAPA[etapa].ajuda}</p>
                  <ul className="space-y-0.5">
                    {itens.map((x) => (
                      <li key={x.code}>
                        <button type="button" title={MOTIVOS_DE_PULO[x.code].explicacao} onClick={() => setRecorte({ r: { tipo: 'pulo', code: x.code }, titulo: MOTIVOS_DE_PULO[x.code].rotulo })}
                          className={cn('flex items-center justify-between gap-3 py-1.5 text-xs', LINHA_CLICAVEL)}>
                          <span className="text-surface-200">{MOTIVOS_DE_PULO[x.code].rotulo}</span>
                          <span className="tabular-nums text-surface-300">{numero(x.count)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {resultados.byVersion.length > 1 && (
        <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold text-surface-50">Comparação entre versões</h2>
            <p className="mt-0.5 text-[12px] text-surface-400">Cada pessoa termina na versão em que entrou: a taxa de cada versão conta só quem entrou nela.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {resultados.byVersion.map((v) => (
              <div key={v.version} className="rounded-[10px] bg-surface-800 border border-surface-700 px-4 py-3 min-w-[160px]">
                <p className="text-[12px] text-surface-500">v{v.version} · {numero(v.entered)} inscrições</p>
                <p className="text-xl font-semibold text-surface-50 tabular-nums">{v.goalRate}% <span className="text-xs font-normal text-surface-400">bateram a meta</span></p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PessoasDoRecorte recorte={recorte?.r ?? null} titulo={recorte?.titulo ?? ''} dias={Number(periodo)} jornadaId={jornada.id} onClose={() => setRecorte(null)}
        onVerCaminho={onVerCaminho ? (t, ids) => { setRecorte(null); onVerCaminho(t, ids) } : undefined} />
    </div>
  )
}
