import type { StageConversion, StageDuration } from '@/types/pipelineAnalytics'

interface StageFlowTableProps {
  conversion: StageConversion[]
  durations: StageDuration[]
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`
const dias = (d: number | null) => (d == null ? '—' : `${d.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`)

/**
 * Fluxo por etapa (Funis, 27/09) — dois dados que o backend já mandava em
 * `overview` e a tela nunca mostrava: para onde vai quem entra em cada etapa
 * (`conversion`) e quanto tempo fica nela (`cycle.perStageCohort`). As duas
 * leituras são da MESMA coorte — negócios criados no período —, por isso
 * dividem a tabela; o ciclo médio do card de cima é outra população
 * (fechados no período) e não é somado aqui.
 */
export function StageFlowTable({ conversion, durations }: StageFlowTableProps) {
  if (conversion.length === 0) {
    return (
      <section className="flex-shrink-0 bg-surface-900 border border-surface-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-surface-100">Fluxo por etapa</h3>
        <p className="mt-2 text-sm text-surface-500">Nenhum negócio criado neste período ainda passou pelas etapas.</p>
      </section>
    )
  }
  const tempo = new Map(durations.map((d) => [d.stageId, d] as const))
  return (
    <section className="flex-shrink-0 bg-surface-900 border border-surface-700 rounded-xl overflow-hidden" data-testid="stage-flow-table">
      <header className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-surface-100">Fluxo por etapa</h3>
        <p className="text-xs text-surface-500">Negócios criados no período: quantos entraram em cada etapa, para onde seguiram e quanto tempo ficaram.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <caption className="sr-only">Conversão e tempo por etapa</caption>
          <thead className="text-left text-3xs font-bold uppercase tracking-[.1em] text-surface-500">
            <tr className="h-8 border-b border-surface-700">
              <th scope="col" className="px-4">Etapa</th>
              <th scope="col" className="px-3 text-right">Entraram</th>
              <th scope="col" className="px-3 text-right">Ainda lá</th>
              <th scope="col" className="px-3">Seguiram para</th>
              <th scope="col" className="px-4 text-right">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {conversion.map((c) => {
              const t = tempo.get(c.fromStageId)
              const saidas = [...c.outcomes].sort((a, b) => b.count - a.count).slice(0, 3)
              return (
                <tr key={c.fromStageId} className="h-11 border-b border-surface-800 last:border-0">
                  <td className="px-4 font-semibold text-surface-100 whitespace-nowrap">{c.fromStageLabel}</td>
                  <td className="px-3 text-right tabular-nums text-surface-200">{c.enteredCount}</td>
                  <td className="px-3 text-right tabular-nums text-surface-400">{c.stillHere}</td>
                  <td className="px-3 text-surface-300">
                    {saidas.length === 0 ? <span className="text-surface-500">—</span> : (
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {saidas.map((o) => (
                          <span key={o.toStageId} className="whitespace-nowrap">
                            {o.toStageLabel} <span className="tabular-nums text-surface-500">{o.count} · {pct(o.rate)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 text-right tabular-nums text-surface-300" title={t ? `${t.completedVisits} passagem(ns) concluída(s)` : undefined}>
                    {dias(t?.avgDays ?? null)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
