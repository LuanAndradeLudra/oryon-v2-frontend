import { Briefcase, Handshake } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { Button } from '@/components/ui/Button'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { pipelineKindOf, defaultSalesPipeline } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'

/**
 * Resumo dos negócios do contato (Visão Geral) — detalhe fica na aba
 * "Negócios" (`DealsTab`). Era a QUARTA leitura de "onde este contato está
 * nos funis", fora de `useContactPipelines`: somava `amountCents` de TODOS os
 * deals — inclusive registro de PROCESSO, que não tem valor — e tinha carga e
 * socket próprios, sem o evento local `oryon:deals-invalidate` (B3 · SCRUM-929).
 *
 * Agora usa a mesma fonte das outras três telas. "Total"/"Ganho"/"Em aberto"
 * somam só `kind = 'sales'` (a regra certa é a do painel de conversas,
 * `ContactPanelDeals`) — processo nunca entra na conta, nem como zero.
 */
export function DealsSummaryCard({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { vocab } = useTenantVocab()
  // Overview precisa mostrar algo mesmo no tenant legado de funil único —
  // mesmo `requireMultiPipeline: false` de `DealsTab`.
  const { enabled, deals, pipelines, pipelineOf } = useContactPipelines(contactId, contactName, { requireMultiPipeline: false })
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

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-surface-400" />
        <h4 className="text-sm font-semibold text-surface-100">{vocab.deals}</h4>
      </div>
      {deals === null ? (
        <p className="text-xs text-surface-600">Carregando…</p>
      ) : count === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-surface-500">
            Nenhum {vocab.deal.toLowerCase()} de venda ainda.
          </p>
          {/* A3 (SCRUM-925): o vazio ganha ação — mesmo fluxo "Adicionar ao
              funil" das outras telas (conflito I1 incluso), não um texto
              mandando o operador procurar a aba Negócios sozinho. */}
          {salesPipeline && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Handshake className="w-3.5 h-3.5" />}
              onClick={() => addToPipeline.requestAdd({ contactId, contactName, pipeline: salesPipeline })}
            >
              Novo negócio
            </Button>
          )}
        </div>
      ) : (
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
      {addToPipeline.dialogs}
    </div>
  )
}
