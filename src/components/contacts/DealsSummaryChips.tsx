import { Handshake } from 'lucide-react'
import { DealSummary } from '@/components/deals/DealSummary'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { cn } from '@/lib/utils'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
import { openPipelineChips } from '@/lib/contactPipelines'
import type { Contact, Pipeline } from '@/types'

/** Chips "● Funil · Etapa" por registro ABERTO (F11-884, prancheta 6; B3 ·
 *  SCRUM-929) — densidade `chip` do `DealSummary`, um por funil (I1). Reusado
 *  igual entre `ContactsTable` (desktop) e `ContactCard` (mobile,
 *  `ContactsMobileList`). Lê só o `dealsSummary` já carregado em lote (`GET
 *  /deals/summary`, 1 chamada por página) — nenhuma requisição extra para
 *  MOSTRAR o chip; por isso o `chip` do `DealSummary` recebe só funil+etapa,
 *  não o `Deal` inteiro que `row`/`card` (ficha, painel, aba) têm à mão.
 *
 *  Clique no chip abre a FICHA do negócio (`openDeal(dealId)` — o `dealId` já vem
 *  no resumo em lote).
 *
 *  SCRUM-929 (item 6): sem nenhum aberto, a célula fica VAZIA — o chip
 *  tracejado "nenhum aberto" era ruído puro, sem ação nenhuma atrás dele.
 *  Com `onAddToPipeline` (só o desktop passa — a tabela já tem o funil de
 *  venda padrão à mão pro menu de contexto), aparece "+ Novo negócio" no
 *  hover da linha; sem ele (mobile), a célula some — tocar no card já abre o
 *  painel, que tem o mesmo CTA na aba Negócios. */
export function DealsSummaryChips({
  contact,
  className,
  onAddToPipeline,
}: {
  contact: Contact
  className?: string
  onAddToPipeline?: (contact: Contact, pipeline: Pipeline) => void
}) {
  // Gate de múltiplos funis (SCRUM-498): sem o módulo o backend não manda
  // `dealsSummary` — mostraria a célula vazia pra todo mundo, inclusive quem
  // tem. Some (desktop e mobile passam por aqui).
  const multiPipeline = useMultiPipeline()
  const { pipelines } = useCRMConfig()
  const { openDeal } = useDealPanel()
  if (!multiPipeline) return null
  const chips = openPipelineChips(contact.dealsSummary?.byPipeline ?? [], pipelines)

  if (chips.length === 0) {
    const salesDefault = onAddToPipeline ? defaultSalesPipeline(pipelines) : null
    if (!salesDefault) return <div className={className} />
    return (
      <div className={className}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddToPipeline!(contact, salesDefault) }}
          title="Novo negócio"
          data-testid="pipeline-chip-add"
          data-row-action=""
          className="flex items-center gap-1 text-[10px] font-medium text-surface-600 hover:text-brand-300 transition-all whitespace-nowrap"
        >
          <Handshake className="w-3 h-3" /> Novo negócio
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-1 flex-wrap', className)} onClick={(e) => e.stopPropagation()}>
      {chips.map((c) => (
        <DealSummary
          key={c.dealId}
          density="chip"
          pipeline={{ id: c.pipelineId, name: c.pipelineName, color: c.color, kind: c.kind }}
          stageLabel={c.stageLabel}
          onOpen={() => openDeal(c.dealId)}
          testId={`pipeline-chip-${c.dealId}`}
        />
      ))}
    </div>
  )
}
