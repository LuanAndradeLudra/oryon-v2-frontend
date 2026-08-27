// ─── usePlanGate ──────────────────────────────────────────────────────────────
// Hook to check if a feature / module is available on the current tenant plan.
// Returns { allowed, upgrade } — upgrade is the minimum tier that unlocks it.

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { PlanTier, PlanModuleAccess } from '@/types'
import { PLANS, PLAN_ORDER, canAccessModule } from '@/config/plans'
import { useBilling } from '@/hooks/useBilling'

interface PlanGateResult {
  /** true if current plan includes this module */
  allowed: boolean
  /** lowest tier that unlocks the module (null if already allowed) */
  upgrade: PlanTier | null
  /** current tier */
  tier: PlanTier
}

export function usePlanGate(module: keyof PlanModuleAccess): PlanGateResult {
  const { user } = useAuth()

  // Fall back to 'essential' if we can't determine the tenant plan.
  // In a real app, the tenant plan comes from AuthContext / tenant context.
  const tier = (user as { tenantPlan?: PlanTier } | null)?.tenantPlan ?? 'essential'

  return useMemo<PlanGateResult>(() => {
    const allowed = canAccessModule(tier, module)

    if (allowed) return { allowed: true, upgrade: null, tier }

    // Find the lowest plan that grants access
    const upgrade = PLAN_ORDER.find((t) => PLANS[t].modules[module]) ?? null

    return { allowed: false, upgrade: upgrade as PlanTier | null, tier }
  }, [tier, module])
}

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
