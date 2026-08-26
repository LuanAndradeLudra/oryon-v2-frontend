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
let lastLoadedAt = 0
let listenersInstalled = false

/** Janela em que voltar o foco NAO refaz o fetch. O sinal do socket ignora isto. */
const STALE_AFTER_MS = 15_000

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
    lastLoadedAt = Date.now()
  } catch (err) {
    state = {
      ...state,
      loading: false,
      error: err instanceof Error ? err.message : 'Falha ao carregar billing',
    }
  }
  emit()
}

/**
 * Recarrega o snapshot (SCRUM-805).
 *
 * Duas guardas, e as duas importam:
 *
 *   sem snapshot -> nao revalida. Antes da primeira carga nao ha o que
 *   revalidar; e quem nao e business_admin toma 403 em /settings/billing desde
 *   a SCRUM-694 e nunca chega a ter snapshot. Sem esta guarda, cada turno de
 *   IA dispararia um 403 no navegador de todo agente conectado.
 *
 *   carga em curso -> nao empilha. `state.loading` ja e o sinal; nao precisa
 *   de flag nova.
 */
function revalidate(force: boolean) {
  if (!state.billing || state.loading) return
  if (!force && Date.now() - lastLoadedAt < STALE_AFTER_MS) return
  void load(state.transactions.length > 0)
}

/**
 * Instala os gatilhos na primeira montagem — nao no import, para nao ter
 * efeito colateral em SSR nem em teste que so importa o modulo.
 *
 * O socket diz que o saldo MUDOU: recarrega sempre. Foco de janela e so
 * suspeita de que envelheceu: respeita STALE_AFTER_MS, senao cada alt-tab
 * vira um GET.
 */
function installRevalidation() {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true
  window.addEventListener('billing:balance-updated', () => revalidate(true))
  window.addEventListener('focus', () => revalidate(false))
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') revalidate(false)
    })
  }
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
  lastLoadedAt = 0
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
    installRevalidation()

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
