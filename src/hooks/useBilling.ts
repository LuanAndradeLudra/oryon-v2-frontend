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

// O ledger real (SCRUM-170/172) ainda não foi integrado neste ambiente — o
// backend não expõe /settings/billing aqui. Em produção isso deve continuar
// mostrando o banner de erro (nunca inventar número de plano/crédito pro
// cliente); em DEV, cai pra este snapshot de exemplo só pra permitir validar
// o estilo da tela antes do backend existir de fato.
const DEV_MOCK_BILLING: BillingSnapshot = {
  plan: {
    tier: 'professional',
    displayName: 'Professional',
    priceMonthlyCents: 49900,
    currency: 'BRL',
    monthlyCredits: 3000,
    tokensPerCredit: 7000,
    features: {},
  },
  creditsTotal: 3000,
  creditsUsed: 1850,
  remaining: 1150,
  planResetsAt: new Date(Date.now() + 12 * 86400000).toISOString(),
  status: 'active',
}

const DEV_MOCK_TRANSACTIONS: CreditTransaction[] = [
  { id: 'mock-1', type: 'debit', credits: '-1', balanceAfter: '1150', source: 'copilot', feature: 'Resposta gerada', conversationId: null, contentTokens: 6820, costUsd: '0.04', model: 'claude-sonnet-5', requestId: null, createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'mock-2', type: 'debit', credits: '-1', balanceAfter: '1151', source: 'automation', feature: 'Follow-up automático', conversationId: null, contentTokens: 5140, costUsd: '0.03', model: 'claude-sonnet-5', requestId: null, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'mock-3', type: 'grant', credits: '3000', balanceAfter: '3000', source: 'plan_reset', feature: null, conversationId: null, contentTokens: null, costUsd: null, model: null, requestId: null, createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
  { id: 'mock-4', type: 'refund', credits: '2', balanceAfter: '2998', source: 'copilot', feature: 'Falha no envio — estornado', conversationId: null, contentTokens: null, costUsd: null, model: null, requestId: null, createdAt: new Date(Date.now() - 17 * 86400000).toISOString() },
  { id: 'mock-5', type: 'adjustment', credits: '-5', balanceAfter: '2993', source: 'support', feature: 'Ajuste manual (suporte)', conversationId: null, contentTokens: null, costUsd: null, model: null, requestId: null, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
]

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
    if (import.meta.env.DEV) {
      state = { billing: DEV_MOCK_BILLING, transactions: withTransactions ? DEV_MOCK_TRANSACTIONS : [], loading: false, error: null }
    } else {
      state = {
        ...state,
        loading: false,
        error: err instanceof Error ? err.message : 'Falha ao carregar billing',
      }
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
