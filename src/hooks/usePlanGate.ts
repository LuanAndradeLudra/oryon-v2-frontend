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
  /** false when tenant has exhausted their credit balance */
  hasCredits: boolean
  used: number
  total: number | null
  percentUsed: number | null
}

export function useCreditGate(): CreditGateResult {
  // Saldo real do ledger no backend (SCRUM-172). Fail-open enquanto carrega:
  // billing nulo → tratado como ilimitado para não bloquear a UI por latência.
  const { billing } = useBilling()
  const used  = billing?.creditsUsed ?? 0
  const total = billing?.creditsTotal ?? null

  return useMemo(() => {
    const hasCredits = total === null || used < total
    const percentUsed = total ? Math.round((used / total) * 100) : null
    return { hasCredits, used, total, percentUsed }
  }, [used, total])
}
