// ─── useCreditGate ────────────────────────────────────────────────────────────
// SCRUM-1210: o `usePlanGate` (módulo pelo tier fixo do plans.ts) saiu — era
// código morto e contrariava a regra de que os módulos vêm do CONTRATO (ver
// useAccountState/moduleEnabled). Fica só o gate de saldo.

import { useMemo } from 'react'
import { useBilling } from '@/hooks/useBilling'

// ─── Credit balance gate ───────────────────────────────────────────────────────

interface CreditGateResult {
  /** false when tenant has exhausted their credit balance OR saldo indeterminado */
  hasCredits: boolean
  used: number
  total: number | null
  percentUsed: number | null
  /** true quando não foi possível confirmar o saldo (API falhou / sem snapshot). */
  unavailable: boolean
  /** true enquanto o primeiro snapshot ainda está carregando. */
  loading: boolean
}

export function useCreditGate(): CreditGateResult {
  // Fail-CLOSED (SCRUM-172): gate de CONSUMO não pode liberar por
  // indisponibilidade. Sem um snapshot válido do ledger, bloqueia — o oposto
  // do fail-open, que deixaria o tenant consumir de graça quando o billing cai.
  // O useBilling preserva o último snapshot válido mesmo após um refetch com
  // erro (cache implícito), então uma falha transitória não derruba o acesso de
  // quem já teve saldo confirmado.
  const { billing, loading, error } = useBilling()

  return useMemo<CreditGateResult>(() => {
    if (!billing) {
      // Sem dado do ledger → não dá para afirmar que há saldo. Bloqueia.
      // `unavailable` distingue "indisponível" (mostrar erro) de "carregando".
      return {
        hasCredits: false,
        used: 0,
        total: null,
        percentUsed: null,
        unavailable: !loading, // carregando ainda não é indisponibilidade
        loading,
      }
    }
    const used = billing.creditsUsed ?? 0
    const total = billing.creditsTotal ?? null
    const hasCredits = total === null || used < total
    const percentUsed = total ? Math.round((used / total) * 100) : null
    // Snapshot presente (mesmo que um refetch posterior tenha falhado): usa o
    // dado real. `error` só vira `unavailable` quando não há snapshot algum.
    return { hasCredits, used, total, percentUsed, unavailable: false, loading }
  }, [billing, loading, error])
}
