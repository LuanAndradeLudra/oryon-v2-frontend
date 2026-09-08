// B2 (SCRUM-928) — aba "Resumo": escopo editável (`description`, B1/927),
// itens (catálogo/personalizado, A1/153) e total. Espelha a composição de
// itens do DealModal/NewDealDialog (mesmo DealItemsEditor controlado), mas
// aqui os itens salvam DIRETO (autosave ao sair do campo), sem um botão
// "Salvar" — a ficha inteira segue esse padrão (cada campo é sua própria
// transação), diferente do formulário de criação.
import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { DealItemsEditor } from '@/components/deals/DealItemsEditor'
import { draftFromLineItem, toLineItemPayload, itemsTotalCents, validateItems, type DealItemDraft } from '@/components/deals/dealItems'
import { formatBRL } from '@/utils/money'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import type { Deal, Pipeline } from '@/types'

interface DealSummaryTabProps {
  deal: Deal
  pipeline: Pipeline
  onPatch: (patch: Partial<Deal> & { updateAmount?: boolean }) => Promise<void>
}

export function DealSummaryTab({ deal, pipeline, onPatch }: DealSummaryTabProps) {
  const isSales = pipelineKindOf(pipeline) === 'sales'
  const [description, setDescription] = useState(deal.description ?? '')
  const [items, setItems] = useState<DealItemDraft[]>(() => (deal.lineItems ?? []).map(draftFromLineItem))
  const [itemsError, setItemsError] = useState<string | undefined>(undefined)
  const [savingItems, setSavingItems] = useState(false)

  // Deal trocou (ou dados frescos chegaram) — realinha o rascunho local.
  useEffect(() => {
    setDescription(deal.description ?? '')
    setItems((deal.lineItems ?? []).map(draftFromLineItem))
  }, [deal.id, deal.description, deal.lineItems])

  const handleDescriptionBlur = async () => {
    const trimmed = description.trim()
    if (trimmed === (deal.description ?? '').trim()) return
    await onPatch({ description: trimmed || null })
  }

  const handleItemsChange = async (next: DealItemDraft[]) => {
    setItems(next)
    const error = validateItems(next)
    setItemsError(error ?? undefined)
    if (error) return
    setSavingItems(true)
    try {
      // Itens gravados SEMPRE recalculam o total (D0-2: sem "dois botões" na
      // ficha — a divergência intencional é só um recurso do momento de
      // vincular, no diálogo de criação; editar itens aqui sempre soma).
      await onPatch({ lineItems: toLineItemPayload(next), updateAmount: true })
    } finally {
      setSavingItems(false)
    }
  }

  const total = itemsTotalCents(items)

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      <div>
        <label className="text-xs font-semibold text-surface-400 mb-1.5 block">Escopo</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="O que está sendo proposto?"
          rows={4}
          data-testid="deal-description"
        />
      </div>

      {isSales && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-surface-400">Itens</span>
            {savingItems && <span className="text-[11px] text-surface-500">salvando…</span>}
          </div>
          <DealItemsEditor value={items} onChange={(next) => void handleItemsChange(next)} error={itemsError} showTotal={false} />
          <div className="flex justify-end mt-2 text-sm">
            <span className="text-surface-400">Total: </span>
            <span className="font-semibold text-surface-100 tabular-nums ml-1" data-testid="deal-items-total">{formatBRL(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
