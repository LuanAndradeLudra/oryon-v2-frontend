// ─── useBilling ───────────────────────────────────────────────────────────────
// Carrega o snapshot real de billing do backend (SCRUM-172). Sem react-query no
// projeto → store leve em escopo de módulo com pub/sub, para que BillingSettings
// e useCreditGate compartilhem o mesmo fetch (sem duplicar requisições).

import { useEffect, useState, useCallback } from 'react'
import { billingApi } from '@/services/billingApi'
import type { BillingSnapshot, CreditTransaction } from '@/services/billingApi'

interface BillingState {
  billing: BillingSnapshot | null
  transactions: CreditTransaction[]
  loading: boolean
  error: string | null
}

let state: BillingState = { billing: null, transactions: [], loading: false, error: null }
const subscribers = new Set<() => void>()
let started = false

function emit() {
  for (const fn of subscribers) fn()
}

async function load(withTransactions: boolean) {
  state = { ...state, loading: true, error: null }
  emit()
  try {
    const [billing, transactions] = await Promise.all([
      billingApi.getBilling(),
      withTransactions ? billingApi.getTransactions() : Promise.resolve(state.transactions),
    ])
    state = { billing, transactions, loading: false, error: null }
  } catch (err) {
    // Fail-closed (SCRUM-172): se a API de billing falha, NÃO liberamos crédito
    // — o gate bloqueia até haver um snapshot válido. (Removido o fallback de
    // DEV_MOCK que o redesign usava, pois abria o gate e quebrava o fail-closed.)
    state = {
      ...state,
      loading: false,
      error: err instanceof Error ? err.message : 'Falha ao carregar billing',
    }
  }
  emit()
}

/**
 * Zera o store module-scoped (SCRUM-172). DEVE ser chamado no logout: sem isto
 * o saldo/plano do tenant anterior persiste em memória e vaza para a próxima
 * sessão (outro tenant) até o primeiro refetch. Emite para re-renderizar
 * consumidores montados com o estado limpo.
 */
export function resetBillingState() {
  state = { billing: null, transactions: [], loading: false, error: null }
  started = false
  emit()
}

interface UseBillingOptions {
  /** Também busca o extrato de transações (usado no painel, não no gate). */
  transactions?: boolean
}

export function useBilling(options: UseBillingOptions = {}) {
  const withTransactions = options.transactions ?? false
  const [, forceRender] = useState(0)

  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1)
    subscribers.add(rerender)

    if (!started) {
      started = true
      void load(withTransactions)
    } else if (withTransactions && state.transactions.length === 0 && !state.loading) {
      // Um consumidor anterior carregou só o snapshot; agora precisamos do extrato.
      void load(true)
    }

    return () => {
      subscribers.delete(rerender)
    }
  }, [withTransactions])

  const refetch = useCallback(() => load(withTransactions), [withTransactions])

  return { ...state, refetch }
}
