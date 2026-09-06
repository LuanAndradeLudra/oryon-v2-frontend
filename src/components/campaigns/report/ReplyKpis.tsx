import type { ReportKpis } from './reportModel'

/**
 * Os três indicadores de resposta.
 *
 * **"Nota média", não "NPS"** (decisão D3-decisoes §4). O que existe aqui é a
 * média das notas 0–10 que a IA atribui a cada resposta. NPS é outra coisa:
 * escala −100 a +100, calculada como promotores menos detratores. Rotular uma
 * como a outra faz quem lê comparar com uma referência que não se aplica —
 * "8,6 de NPS" soa excelente, "nota média 8,6" é o que de fato foi medido.
 *
 * Também não há variação (`+0,4` do mockup): delta exige um período de
 * comparação, e não existe endpoint que dê o disparo anterior. Número sem
 * base de comparação é enfeite.
 */
export function ReplyKpis({ kpis }: { kpis: ReportKpis }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Kpi
        label="Nota média"
        value={kpis.averageScore != null ? kpis.averageScore.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : null}
        hint={kpis.classifiedCount != null ? `${kpis.classifiedCount} classificadas` : 'sem classificação'}
        highlight
      />
      <Kpi
        label="Promotores"
        value={kpis.promoterPct != null ? `${kpis.promoterPct}%` : null}
        hint={
          kpis.promoterCount != null && kpis.classifiedCount != null
            ? `${kpis.promoterCount} de ${kpis.classifiedCount}`
            : 'sem classificação'
        }
      />
      <Kpi
        label="Opt-out"
        value={kpis.optOutCount != null ? String(kpis.optOutCount) : null}
        hint={kpis.optOutPct != null ? `${kpis.optOutPct.toLocaleString('pt-BR')}%` : 'sem classificação'}
      />
    </div>
  )
}

function Kpi({
  label, value, hint, highlight,
}: { label: string; value: string | null; hint: string; highlight?: boolean }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5">
      <div className="text-[11px] text-surface-400">{label}</div>
      <div
        className={
          value == null
            ? 'text-xl font-semibold text-surface-500 mt-0.5'
            : highlight
              ? 'text-xl font-semibold text-status-active mt-0.5'
              : 'text-xl font-semibold text-surface-100 mt-0.5'
        }
      >
        {/* Travessão, não 0: o indicador continua na tela, o que falta é a
            medição. Um "0%" aqui leria como "nenhum promotor". */}
        {value ?? '—'}
      </div>
      <div className="text-[11px] text-surface-500 mt-0.5">{hint}</div>
    </div>
  )
}
