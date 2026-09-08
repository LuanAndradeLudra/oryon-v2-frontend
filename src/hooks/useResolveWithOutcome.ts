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
import { selectableDeals } from '@/lib/dealIndicator'
import type { AiDealTargetView, Deal, DealOutcomeInput } from '@/types'
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
  /**
   * C2 (SCRUM-933): `no_target` por AMBIGUIDADE — o contato tem N negócios
   * abertos e nenhum vinculado a esta conversa. Em vez de resolver calado (o
   * desfecho não chegaria a negócio nenhum), o popover pergunta em qual.
   * `null` quando não há ambiguidade — o caminho de sempre.
   */
  candidates: Deal[] | null
  /** Vincula o negócio escolhido a esta conversa e segue para o desfecho. */
  pickCandidate: (dealId: string) => Promise<void>
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
  const [candidates, setCandidates] = useState<Deal[] | null>(null)
  const [currentAmountCents, setCurrentAmountCents] = useState<number | null>(null)
  const [hasLineItems, setHasLineItems] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  /** Carrega valor/itens do alvo e abre o popover de desfecho nele. */
  const adoptTarget = useCallback(async (data: AiDealTargetView) => {
    let amount: number | null = null
    let lineItems = false
    if ((data.pipelineKind ?? 'sales') === 'sales' && data.dealId) {
      try {
        const deal = (await dealsApi.get(data.dealId)).data
        amount = deal?.amountCents ?? 0
        lineItems = (deal?.lineItems?.length ?? 0) > 0
      } catch { amount = null }
    }
    setCurrentAmountCents(amount)
    setHasLineItems(lineItems)
    setCandidates(null)
    setTarget(data)
  }, [])

  const requestResolve = useCallback(async () => {
    if (!multiPipeline) { await onResolve(); return }
    setLoading(true)
    try {
      const { data } = await dealsApi.conversationTarget(conversationId)
      if (!data || data.target === 'no_target' || !data.dealId) {
        // C2 (SCRUM-933): `no_target` tem duas causas MUITO diferentes — "este
        // contato não tem negócio nenhum" (resolver como sempre) e "tem vários
        // e ninguém disse qual é o desta conversa" (a multiplicidade da C1).
        // A segunda merece a pergunta: resolver calado deixaria o desfecho sem
        // destino, que é exatamente o que o `no_target` do backend evita.
        try {
          const all = (await dealsApi.list(contactId)).data
          const open = selectableDeals(Array.isArray(all) ? all : [], conversationId)
          if (open.length > 1) { setCandidates(open); return }
        } catch {
          // Sem a lista não há pergunta a fazer — cai no caminho de sempre.
        }
        await onResolve()
        return
      }
      await adoptTarget(data)
    } catch {
      // Sem como saber o alvo (backend antigo / erro): resolver como sempre.
      await onResolve()
    } finally {
      setLoading(false)
    }
  }, [conversationId, contactId, multiPipeline, onResolve, adoptTarget])

  const pickCandidate = useCallback(async (dealId: string) => {
    setBusy(true)
    try {
      // Mesmo endpoint do seletor do cabeçalho: uma única forma de dizer "é
      // este o negócio desta conversa" no produto inteiro.
      await dealsApi.linkConversation(dealId, conversationId)
      const { data } = await dealsApi.conversationTarget(conversationId)
      if (data?.dealId) { await adoptTarget(data); return }
      // O vínculo foi gravado mas o alvo não voltou (corrida rara): resolver
      // sem desfecho é melhor que travar o operador no popover.
      await onResolve()
      setCandidates(null)
    } finally {
      setBusy(false)
    }
  }, [conversationId, adoptTarget, onResolve])

  const close = useCallback(() => {
    setTarget(null); setCandidates(null); setCurrentAmountCents(null); setHasLineItems(false)
  }, [])

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

  return { requestResolve, target, candidates, pickCandidate, currentAmountCents, hasLineItems, loading, busy, confirm, close }
}
