// ─── Os 4 KPIs da caixa (A6 / SCRUM-1017) ────────────────────────────────────
import { accentColor } from '@/components/ui/accentColor'
import type { HandoffSummary } from '@/types/agentsOps'

/**
 * `null` vira travessão, não zero.
 *
 * O contrato manda `avgWaitSeconds` e `returnedToAiPct` virem `null` quando não
 * há dado (fila vazia, nada resolvido em 7 dias) exatamente para que a tela não
 * afirme "ninguém está esperando" ou "nenhuma voltou para a IA" — que são
 * afirmações diferentes de "não há dado". Decisão do Maestro, mesmo critério da
 * A5: **renderiza o travessão**.
 */
function Valor({ children }: { children: React.ReactNode }) {
  return children === null || children === undefined
    ? <span className="text-surface-600">—</span>
    : <>{children}</>
}

function Kpi({
  rotulo, valor, sufixo, rodape, cor,
}: {
  rotulo: string
  valor: React.ReactNode
  sufixo?: string
  rodape?: React.ReactNode
  cor?: string
}) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-3.5">
      <div className="text-3xs font-bold uppercase tracking-[0.12em] text-surface-500">{rotulo}</div>
      <div className="mt-1 font-display text-xl font-bold" style={cor ? { color: cor } : undefined}>
        <Valor>{valor}</Valor>
        {sufixo && <span className="ml-1 text-xs font-medium text-surface-500">{sufixo}</span>}
      </div>
      {rodape && <div className="mt-1 text-3xs text-surface-500">{rodape}</div>}
    </div>
  )
}

export function HandoffKpis({ resumo }: { resumo: HandoffSummary }) {
  const espera = resumo.avgWaitSeconds === null ? null : Math.round(resumo.avgWaitSeconds / 60)
  const motivo = resumo.topReasons7d[0] ?? null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        rotulo="Aguardando"
        valor={resumo.waiting}
        cor={accentColor('amber')}
        // Some quando é zero: "0 acima do SLA" ocupa a linha para não dizer nada.
        rodape={resumo.slaBreached > 0 ? `${resumo.slaBreached} acima do SLA` : undefined}
      />
      <Kpi rotulo="Espera média" valor={espera} sufixo={espera === null ? undefined : 'min'} />
      {/*
        D9: `topReasons7d[0].label` vai ser "Motivo não identificado" na
        esmagadora maioria dos tenants, porque não existe matcher de keywords em
        runtime. Renderizo CRU, sem tratamento especial que esconda isso —
        decisão do Maestro: feio e verdadeiro ganha de bonito e falso. O mockup
        mostra "reembolso" porque é um mockup.
      */}
      <Kpi
        rotulo="Motivo nº 1 · 7d"
        valor={motivo ? <span className="text-sm">{motivo.label}</span> : null}
        rodape={motivo ? `${motivo.count} de ${motivo.total}` : undefined}
      />
      <Kpi
        rotulo="Voltaram para a IA"
        valor={resumo.returnedToAiPct === null ? null : `${resumo.returnedToAiPct}%`}
        rodape="resolvidas sem humano"
      />
    </div>
  )
}
