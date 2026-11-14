import { useMemo } from 'react'
import { ChartColumn } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { passoDoCatalogo } from '@/services/jornadas/catalogo'
import type { Catalogo, Jornada, ResultadosDaJornada as Resultados } from '@/services/jornadas/tipos'
import { numero } from './apoio'

/** Resultados: funil por passo, respostas, motivos de saída e comparação entre versões. */
export function ResultadosDaJornada({ jornada, catalogo, resultados }: { jornada: Jornada; catalogo: Catalogo; resultados: Resultados | null }) {
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

  if (!resultados) return <div className="px-4 md:px-6 py-4 space-y-2">{[0, 1].map((i) => <SkeletonCard key={i} lines={3} />)}</div>
  if (!resultados.entered) {
    return <div className="px-4 md:px-6 py-8"><EmptyState icon={ChartColumn} title="Sem resultados ainda" hint="Os números aparecem quando a jornada estiver publicada e alguém entrar." /></div>
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
    <div className="px-4 md:px-6 py-4 space-y-6 max-w-[1100px]">
      <p className="text-xs text-surface-400">Últimos 30 dias. Uma inscrição por assunto (por consulta).</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Entraram', numero(resultados.entered), null],
          ['Bateram a meta', `${taxa}%`, `${numero(resultados.completedGoal)} inscrições`],
          ['Saíram', numero(resultados.exited), 'sem meta, com motivo'],
          ['Falharam', numero(resultados.failed), 'erro num passo'],
        ].map(([r, v, s]) => (
          <div key={r} className="rounded-[10px] bg-surface-800 border border-surface-700 px-4 py-3">
            <p className="text-[11px] text-surface-500">{r}</p>
            <p className="text-2xl font-semibold text-surface-50 tabular-nums">{v}</p>
            {s && <p className="text-[11px] text-surface-400">{s}</p>}
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-surface-50">Onde as pessoas passam e param</h2>
        <ul className="space-y-1.5">
          {ordem.map((id) => {
            const b = porNo.get(id)
            const pct = b ? Math.round((b.reached / resultados.entered) * 100) : 0
            return (
              <li key={id} className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                <span className="truncate text-surface-200" title={nome(id)}>{nome(id)}</span>
                <span className="h-2 rounded-full bg-surface-700 overflow-hidden" aria-hidden><span className="block h-full rounded-full bg-[var(--color-accent-blue)]" style={{ width: `${pct}%` }} /></span>
                <span className="tabular-nums text-surface-300 w-[150px] text-right">{numero(b?.reached ?? 0)} ({pct}%){b?.now ? ` · ${numero(b.now)} agora` : ''}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {resultados.byBranch.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-surface-50">Respostas</h2>
            <ul className="space-y-1.5">
              {resultados.byBranch.map((b) => (
                <li key={`${b.nodeId}:${b.output}`} className="flex items-center justify-between gap-3 rounded-[8px] bg-surface-800 px-3 py-2 text-xs">
                  <span className="text-surface-200">{b.label}</span>
                  <span className="tabular-nums text-surface-300">{numero(b.count)} · {Math.round((b.count / totalRamos) * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-surface-50">Motivos de saída</h2>
          <ul className="space-y-1.5">
            {resultados.exitReasons.map((x) => (
              <li key={x.reason} className="space-y-1">
                <div className="flex justify-between gap-3 text-xs"><span className="text-surface-200">{x.reason}</span><span className="tabular-nums text-surface-300">{numero(x.count)}</span></div>
                <span className="block h-1.5 rounded-full bg-surface-700 overflow-hidden" aria-hidden><span className="block h-full rounded-full bg-surface-500" style={{ width: `${(x.count / maxSaida) * 100}%` }} /></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {resultados.byVersion.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-surface-50">Comparação entre versões</h2>
          <div className="flex flex-wrap gap-3">
            {resultados.byVersion.map((v) => (
              <div key={v.version} className="rounded-[10px] bg-surface-800 border border-surface-700 px-4 py-3 min-w-[160px]">
                <p className="text-[11px] text-surface-500">v{v.version} · {numero(v.entered)} inscrições</p>
                <p className="text-xl font-semibold text-surface-50 tabular-nums">{v.goalRate}% <span className="text-xs font-normal text-surface-400">bateram a meta</span></p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
