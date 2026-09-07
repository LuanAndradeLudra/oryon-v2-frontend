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
    // `.kpi` do mockup: raio 16px — que nesta escala é `lg`, NÃO `xl` (20px);
    // padding 14px/16px; coluna com 6px de folga.
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-3.5 flex flex-col gap-1.5">
      {/* `.kl`: 12px, surface-400, peso 500. */}
      <div className="text-xs font-medium text-surface-400">{label}</div>
      {/* `.kv`: 26px, peso 700, tracking -.02em, altura 1.1, tabular. */}
      <div
        className={
          value == null
            ? 'text-[26px] font-bold tracking-[-0.02em] leading-[1.1] tabular-nums text-surface-500'
            : highlight
              ? 'text-[26px] font-bold tracking-[-0.02em] leading-[1.1] tabular-nums text-status-active'
              : 'text-[26px] font-bold tracking-[-0.02em] leading-[1.1] tabular-nums text-surface-50'
        }
      >
        {/* Travessão, não 0: o indicador continua na tela, o que falta é a
            medição. Um "0%" aqui leria como "nenhum promotor". */}
        {value ?? '—'}
      </div>
      {/* `.kd`: 11px, peso 600. */}
      <div className="text-[11px] font-semibold text-surface-500">{hint}</div>
    </div>
  )
}
