// ─── Role Helpers ────────────────────────────────────────────────────────────
//
// Single source of truth for role-tier checks across the UI. Replaces the
// ad-hoc `role === 'admin' || role === 'business_admin' || role === 'super_admin'`
// chains that historically drifted (super_admin missing from some surfaces,
// business_admin missing from others). The audit caught five distinct
// drifted copies before this file existed.
//
// **Always go through these helpers** when gating UI on role tier. Direct
// string comparisons (`role === 'admin'`) are fine ONLY for distinguishing
// inside a specific tier (e.g. "is exactly business_admin", not "is
// admin-tier"). The lint-friendly rule of thumb: if you find yourself
// writing `||` between two role strings, you should be calling a helper.

import type { UserRole } from '@/types'

/**
 * "Admin tier" — anyone with full configuration / mutation power inside a
 * tenant, plus Oryon staff (super_admin) who can act on behalf of a tenant.
 *
 * Includes: super_admin, business_admin, admin.
 * Excludes: supervisor, agent.
 *
 * Use this for: settings sections, destructive bulk actions, agent builder
 * mutations, billing/security panels.
 */
export function isAdminTier(role: UserRole | string | undefined | null): boolean {
  return role === 'super_admin' || role === 'business_admin' || role === 'admin'
}

/**
 * "Supervisor and above" — anyone in the admin tier OR a supervisor.
 *
 * Use this for: team-wide notifications, conversation handoff overrides,
 * AI pause/resume, anything where the operator needs "manager" power
 * over a department but doesn't need full tenant-admin scope.
 */
export function isSupervisorOrAbove(role: UserRole | string | undefined | null): boolean {
  return isAdminTier(role) || role === 'supervisor'
}

/**
 * Oryon staff only. Used for the `/admin/*` super-tenant tooling and the
 * "Oryon" navigation section. Tenant admins must NOT pass this check —
 * if they do, you've broken multi-tenant isolation.
 */
export function isOryonStaff(role: UserRole | string | undefined | null): boolean {
  return role === 'super_admin'
}

/**
 * Human-readable label for a role. Used by user pickers, profile cards,
 * member lists. Falls back to the raw role string when the value isn't
 * recognized so the UI never shows blank — but new roles should be added
 * here, not silently rendered as raw enum values.
 */
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Equipe Oryon',
  business_admin: 'Dono',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
}

export function roleLabel(role: UserRole | string | undefined | null): string {
  if (!role) return ''
  return ROLE_LABELS[role] ?? role
}
