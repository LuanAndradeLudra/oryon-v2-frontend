// Seção "Visão geral" do Workspace (A2 / SCRUM-1013).
//
// Conteúdo NOVO — não é mais o `detail/tabs/OverviewTab`. Aquele tinha três
// blocos e os três mudaram de casa: o STATUS subiu para o `WorkspaceHeader`
// (fica visível em todas as 10 seções, não só nesta), o "Comportamento da IA"
// desceu para o rodapé da `RulesSection` (decisão 1 do Maestro) e o que sobrou
// é o que esta seção promete no subtítulo do mockup: "Estado do agente e o que
// mudou desde a última publicação."
//
// Os três KPIs do mockup dependem do BE.7 e ficam OCULTOS, não desabilitados
// com "em breve" — o porquê está em `overviewCore.ts`, junto da regra que
// impediu de encher os quadrados com número de outro recorte.
//
// O `AgentDetail` da Lista continua com o OverviewTab intacto: são superfícies
// diferentes, e nenhuma ficou sem porta.

import { ChangesCard } from '../ChangesCard'
import { estadoRows } from '../overviewCore'
import type { UseAgentDraft } from '../useAgentDraft'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { cn } from '@/lib/utils'

export function OverviewSection({
  agent,
  draft,
}: {
  agent: AgentConfigWithTools
  draft: UseAgentDraft
}) {
  const rows = estadoRows(agent)

  return (
    <div className="space-y-6">
      {draft.isDirty ? (
        <ChangesCard
          agent={agent}
          draft={draft.draft}
          changedFields={draft.changedFields}
          publishing={draft.publishing}
          publishError={draft.publishError}
          onPublish={() => { void draft.publish() }}
          onDiscard={() => { draft.discard() }}
        />
      ) : (
        // Sem alterações a seção NÃO fica muda: "o que mudou desde a última
        // publicação" tem uma resposta boa, e é "nada". Um vazio silencioso
        // faria a pessoa procurar o card que não está lá.
        <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 p-4">
          <p className="text-sm font-semibold text-surface-300">Nada por publicar</p>
          <p className="mt-0.5 text-xs text-surface-500">
            O que está no ar é o que você vê nas seções.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 p-4">
        <p className="mb-3 text-xs font-medium text-surface-500">Estado do agente</p>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-baseline justify-between gap-4 rounded-lg px-2 py-1.5 odd:bg-surface-950/40"
            >
              <span className="text-xs text-surface-400">
                {row.label}
                {row.hint && <span className="ml-1.5 text-2xs text-surface-600">{row.hint}</span>}
              </span>
              <span
                className={cn(
                  'text-sm tabular-nums',
                  row.ativo ? 'font-semibold text-surface-100' : 'text-surface-600',
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
