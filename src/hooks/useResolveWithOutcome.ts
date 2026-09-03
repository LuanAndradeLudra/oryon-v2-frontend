// F10 (SCRUM-882/880) — "Resolver com desfecho" (prancheta 5).
//
// Ao escolher "Resolvida", pergunta ao backend qual é o registro-alvo desta
// conversa pela MESMA precedência que ele usa ao fechar (`GET /deals/ai/stages`,
// §4.7: conversa de origem → campanha única → `no_target`). Sem alvo (ou sem
// o flag), resolve exatamente como hoje — nenhuma chamada a `/deals`. Com alvo,
// abre o popover; "Só resolver" / "Sem decisão" resolvem sem `dealOutcome`
// (registro segue aberto); "fechou" / "não fechou" mandam `dealOutcome` e, em
// venda com valor informado, gravam o valor no registro antes de resolver.
import { useCallback, useState } from 'react'
import { dealsApi } from '@/services/api'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import type { AiDealTargetView, DealOutcomeInput } from '@/types'
import type { ResolvePayload } from '@/lib/resolveOutcome'

/** Evento local para o chip do cabeçalho recarregar na hora (o socket `deal:changed` também chega, mas depois). */
export const DEALS_INVALIDATE_EVENT = 'oryon:deals-invalidate'

export interface UseResolveWithOutcomeOptions {
  conversationId: string
  contactId: string
  /** Resolve a conversa (com ou sem desfecho) — a mesma ação do dropdown de status. */
  onResolve: (dealOutcome?: DealOutcomeInput) => void | Promise<void>
}

export interface ResolveWithOutcomeState {
  /** Chamado no lugar de `onStatusChange('resolved')`. */
  requestResolve: () => Promise<void>
  /** Popover aberto com este alvo. */
  target: AiDealTargetView | null
  /** Valor atual do registro (venda) para pré-preencher; `null` enquanto não carregou / não se aplica. */
  currentAmountCents: number | null
  /** B4 (SCRUM-930): negócio tem itens de linha → "Confirmar valor" vira
   *  somente leitura no popover (editar valor com itens é exclusivo da ficha,
   *  que soma os itens). */
  hasLineItems: boolean
  /** Buscando o alvo (entre o clique e o popover). */
  loading: boolean
  /** Enviando o desfecho. */
  busy: boolean
  confirm: (payload: ResolvePayload) => Promise<void>
  close: () => void
}

export function useResolveWithOutcome({ conversationId, contactId, onResolve }: UseResolveWithOutcomeOptions): ResolveWithOutcomeState {
  const multiPipeline = useMultiPipeline()
  const [target, setTarget] = useState<AiDealTargetView | null>(null)
  const [currentAmountCents, setCurrentAmountCents] = useState<number | null>(null)
  const [hasLineItems, setHasLineItems] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const requestResolve = useCallback(async () => {
    if (!multiPipeline) { await onResolve(); return }
    setLoading(true)
    try {
      const { data } = await dealsApi.conversationTarget(conversationId)
      if (!data || data.target === 'no_target' || !data.dealId) { await onResolve(); return }
      let amount: number | null = null
      let lineItems = false
      if ((data.pipelineKind ?? 'sales') === 'sales') {
        try {
          const deal = (await dealsApi.get(data.dealId)).data
          amount = deal?.amountCents ?? 0
          lineItems = (deal?.lineItems?.length ?? 0) > 0
        } catch { amount = null }
      }
      setCurrentAmountCents(amount)
      setHasLineItems(lineItems)
      setTarget(data)
    } catch {
      // Sem como saber o alvo (backend antigo / erro): resolver como sempre.
      await onResolve()
    } finally {
      setLoading(false)
    }
  }, [conversationId, multiPipeline, onResolve])

  const close = useCallback(() => { setTarget(null); setCurrentAmountCents(null); setHasLineItems(false) }, [])

  const confirm = useCallback(async (payload: ResolvePayload) => {
    if (!target) return
    setBusy(true)
    try {
      if (payload.amountCents !== undefined && target.dealId) {
        await dealsApi.update(target.dealId, { amountCents: payload.amountCents })
      }
      await onResolve(payload.dealOutcome)
      window.dispatchEvent(new CustomEvent(DEALS_INVALIDATE_EVENT, { detail: { contactId } }))
      close()
    } finally {
      setBusy(false)
    }
  }, [target, onResolve, contactId, close])

  return { requestResolve, target, currentAmountCents, hasLineItems, loading, busy, confirm, close }
}
