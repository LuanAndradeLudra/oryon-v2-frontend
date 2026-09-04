import { Briefcase, Plus } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { Button } from '@/components/ui/Button'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { pipelineKindOf, defaultSalesPipeline, pipelineNoun } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'
import type { Deal, Pipeline } from '@/types'

/**
 * Resumo dos negócios do contato (Visão Geral) — detalhe fica na aba
 * "Negócios" (`DealsTab`). Era a QUARTA leitura de "onde este contato está
 * nos funis", fora de `useContactPipelines`: somava `amountCents` de TODOS os
 * deals — inclusive registro de PROCESSO, que não tem valor — e tinha carga e
 * socket próprios, sem o evento local `oryon:deals-invalidate` (B3 · SCRUM-929).
 *
 * "Total"/"Ganho"/"Em aberto" continuam somando só `kind = 'sales'` (a regra
 * certa é a do painel de conversas, `ContactPanelDeals`) — valor em dinheiro
 * não faz sentido pra processo. Mas funil de PROCESSO deixou de ficar
 * invisível aqui (Fase 1 do plano de UI do drawer, achado do usuário): cada
 * registro ABERTO de processo ganha sua própria linha, com o essencial —
 * nome do funil e etapa atual, sem valor. E a ação de mover/adicionar fica
 * SEMPRE visível (era só no vazio) — `AddToPipelineMenu` já deixa claro que
 * move o contato para OUTRO funil (desabilita os que ele já está, com "já
 * está · <etapa>"), então não some assim que existe 1 negócio.
 */
export function DealsSummaryCard({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { vocab } = useTenantVocab()
  const multiPipeline = useMultiPipeline()
  // Overview precisa mostrar algo mesmo no tenant legado de funil único —
  // mesmo `requireMultiPipeline: false` de `DealsTab`.
  const { enabled, deals, open, pipelines, pipelineOf } = useContactPipelines(contactId, contactName, { requireMultiPipeline: false })
  const addToPipeline = useAddToPipeline({ onCreated: () => {} })
  const salesPipeline = defaultSalesPipeline(pipelines)

  if (!enabled) return null

  // Sem funil no cache (tenant legado) todo negócio é comercial, igual às
  // outras telas; com funil, só `kind = 'sales'` entra na conta.
  const salesDeals = (deals ?? []).filter((d) => {
    const p = pipelineOf(d)
    return p ? pipelineKindOf(p) === 'sales' : true
  })
  const count = salesDeals.length
  const total = salesDeals.reduce((s, d) => s + d.amountCents, 0)
  const wonTotal = salesDeals.filter((d) => d.status === 'won').reduce((s, d) => s + d.amountCents, 0)
  const openCount = salesDeals.filter((d) => d.status === 'open').length

  // Um por registro ABERTO de processo — "onde o contato está" agora, não
  // histórico (esse fica na aba Negócios). Sem valor/Ganho-Perdido.
  const processRows = (open ?? []).reduce<Array<{ deal: Deal; pipeline: Pipeline; stageLabel: string | null }>>((acc, d) => {
    const p = pipelineOf(d)
    if (p && pipelineKindOf(p) === 'process') {
      acc.push({ deal: d, pipeline: p, stageLabel: p.stages.find((s) => s.id === d.stageId)?.label ?? null })
    }
    return acc
  }, [])

  const isEmpty = count === 0 && processRows.length === 0

  // A3 (SCRUM-925) + Fase 1 (drawer): mesma ação em qualquer estado — vazio
  // ou com negócios já abertos. Com o flag de múltiplos funis, o dropdown já
  // resolve venda × processo e o conflito I1 (funil onde já está some
  // desabilitado); sem o flag, só existe o funil de venda padrão.
  const addAction = multiPipeline ? (
    <AddToPipelineMenu
      contactId={contactId}
      contactName={contactName}
      openDeals={deals === null ? null : open}
      size="sm"
      onPick={(pipeline) => void addToPipeline.requestAdd({ contactId, contactName, pipeline })}
    />
  ) : salesPipeline ? (
    <Button
      size="sm"
      variant="secondary"
      leftIcon={<Plus className="w-3.5 h-3.5" />}
      onClick={() => addToPipeline.requestAdd({ contactId, contactName, pipeline: salesPipeline })}
    >
      Novo negócio
    </Button>
  ) : null

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-surface-400" />
          <h4 className="text-sm font-semibold text-surface-100">{vocab.deals}</h4>
        </div>
        {addAction}
      </div>
      {deals === null ? (
        <p className="text-xs text-surface-600">Carregando…</p>
      ) : isEmpty ? (
        <p className="text-xs text-surface-500">Nenhum {vocab.deal.toLowerCase()} nos funis ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {count > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-surface-600">Total</p>
                <p className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(total)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-surface-600">Ganho</p>
                <p className="text-sm font-semibold text-success tabular-nums">{formatBRL(wonTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-surface-600">Em aberto</p>
                <p className="text-sm font-semibold text-surface-100 tabular-nums">
                  {openCount} de {count}
                </p>
              </div>
            </div>
          )}
          {processRows.length > 0 && (
            <div className="flex flex-col gap-1.5" data-testid="deals-summary-process-rows">
              {processRows.map(({ deal, pipeline, stageLabel }) => (
                <div key={deal.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-surface-300 truncate" title={pipelineNoun(pipeline)}>{pipeline.name}</span>
                  <span className="text-surface-500 truncate">{stageLabel ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {addToPipeline.dialogs}
    </div>
  )
}
