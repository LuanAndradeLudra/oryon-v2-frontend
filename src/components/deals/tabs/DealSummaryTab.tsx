// B2 (SCRUM-928) — aba "Resumo": observações editáveis (`description`, B1/927),
// itens (catálogo/personalizado, A1/153) e total. Espelha a composição de
// itens do DealModal/NewDealDialog (mesmo DealItemsEditor controlado), mas
// aqui os itens salvam DIRETO (autosave ao sair do campo), sem um botão
// "Salvar" — a ficha inteira segue esse padrão (cada campo é sua própria
// transação), diferente do formulário de criação.
import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Tooltip } from '@/components/ui/Tooltip'
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
      {/* "Escopo" virou "Observações" (10/09). O nome antigo prometia um
          documento — o escopo de uma proposta — que o produto não gera, e o
          que está sendo VENDIDO já tem campo estruturado logo abaixo (os
          itens, com preço e quantidade). Descrever isso de novo em prosa
          duplicava pior: o texto não soma no total nem entra em relatório.

          Com o nome novo o campo assume o papel que faltava: é a única
          anotação livre do negócio que sobrevive a um reload em todo o CRM. */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label htmlFor="deal-observacoes" className="text-xs font-semibold text-surface-400">Observações</label>
          <Tooltip
            wide
            side="bottom"
            content={
              <span className="block leading-relaxed">
                Contexto livre deste negócio: o que ficou combinado, condições, o que o time precisa lembrar na próxima conversa.
                <br /><br />
                Aparece no card do quadro, abaixo do título — então serve como lembrete de relance, sem abrir a ficha.
                <br /><br />
                <strong className="text-surface-100">A IA lê este campo.</strong> É o único texto do negócio que entra no contexto do agente ao falar com o contato: o que estiver aqui ele pode usar na conversa. Não escreva nada que o cliente não possa ouvir de volta.
              </span>
            }
          >
            <HelpCircle className="w-3.5 h-3.5 text-surface-500 hover:text-surface-300 transition-colors cursor-help" aria-hidden />
          </Tooltip>
        </div>
        <Textarea
          id="deal-observacoes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="O que o time precisa saber sobre este negócio?"
          rows={4}
          className="campo-drawer"
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
