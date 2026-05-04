// ─── Workspace Readiness Hook (Phase 29) ─────────────────────────────────────
//
// Fetches the workspace setup status from `GET /workspace/readiness` and
// exposes helpers to filter checks by page (via the `affects` taxonomy).
// One global hook per app — components consume it directly. Stale-while-
// revalidate semantics: the cached value is returned immediately and
// refreshed in the background. Failures don't block the UI; the banner
// just stays hidden.

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api'

export type WorkspaceCheckAffects =
  | 'send_message'
  | 'receive_message'
  | 'auto_reply'
  | 'assign_conversation'
  | 'campaigns'
  | 'human_handoff'

export type WorkspaceCheckSeverity = 'blocker' | 'warning'

export interface WorkspaceCheck {
  id: 'whatsapp_number' | 'departments' | 'user_in_department' | 'ai_agent_active'
  ok: boolean
  severity: WorkspaceCheckSeverity
  label: string
  description: string
  affects: WorkspaceCheckAffects[]
  scope: 'tenant' | 'current_user'
  cta?: { href: string; label: string }
}

export interface WorkspaceReadinessSnapshot {
  allBlockersOk: boolean
  checks: WorkspaceCheck[]
}

const EMPTY_SNAPSHOT: WorkspaceReadinessSnapshot = { allBlockersOk: true, checks: [] }

/**
 * Module-level cache so multiple components mounting at the same time
 * (Home + ConversationsPage + MessageInput) all share one in-flight
 * request and the same data.
 */
let cachedSnapshot: WorkspaceReadinessSnapshot | null = null
let inFlight: Promise<WorkspaceReadinessSnapshot> | null = null
const subscribers = new Set<() => void>()

async function fetchSnapshot(): Promise<WorkspaceReadinessSnapshot> {
  if (inFlight) return inFlight
  inFlight = api.get<WorkspaceReadinessSnapshot>('/workspace/readiness')
    .then((r) => {
      cachedSnapshot = r.data ?? EMPTY_SNAPSHOT
      subscribers.forEach((fn) => fn())
      return cachedSnapshot
    })
    .catch(() => {
      // Network/auth failure — keep the previous snapshot if any.
      // Don't block the UI; readiness is a hint, not a hard gate.
      return cachedSnapshot ?? EMPTY_SNAPSHOT
    })
    .finally(() => { inFlight = null })
  return inFlight
}

/** Force a refresh — call after a setting change that could flip a check. */
export function refreshWorkspaceReadiness(): void {
  cachedSnapshot = null
  void fetchSnapshot()
}

export function useWorkspaceReadiness() {
  const [snapshot, setSnapshot] = useState<WorkspaceReadinessSnapshot>(
    cachedSnapshot ?? EMPTY_SNAPSHOT,
  )
  const [loading, setLoading] = useState(cachedSnapshot === null)

  useEffect(() => {
    const sub = () => setSnapshot(cachedSnapshot ?? EMPTY_SNAPSHOT)
    subscribers.add(sub)
    if (!cachedSnapshot) {
      fetchSnapshot().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return () => { subscribers.delete(sub) }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    refreshWorkspaceReadiness()
    // Wait for the in-flight to settle before clearing loading.
    Promise.resolve(inFlight).finally(() => setLoading(false))
  }, [])

  return { snapshot, loading, refresh }
}

/** Filter unmet blockers that gate one of the given flows. */
export function unmetBlockersAffecting(
  snapshot: WorkspaceReadinessSnapshot,
  flows: WorkspaceCheckAffects[],
): WorkspaceCheck[] {
  return snapshot.checks.filter((c) =>
    !c.ok && c.severity === 'blocker' && c.affects.some((a) => flows.includes(a)),
  )
}

/** All unmet checks (blockers + warnings) — for the home checklist. */
export function unmetChecks(snapshot: WorkspaceReadinessSnapshot): WorkspaceCheck[] {
  return snapshot.checks.filter((c) => !c.ok)
}
