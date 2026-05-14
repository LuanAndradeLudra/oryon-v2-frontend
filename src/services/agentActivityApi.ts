// ─── Agent Activity API ──────────────────────────────────────────────────────
//
// Phase 25 — fetches the WhatsApp agent's CRM operations on a given
// conversation, used by the "Atividade do agente IA" section in
// ContactPanel. Queries the agent-server directly because the data lives
// on the agent-server's database (oryon_agents_db port 5434) and the
// existing builder routes already use the same auth pattern.

import { apiFetch } from './agentsApi'

export interface AgentAction {
  id: string
  toolName: string
  humanSummary: string
  success: boolean
  targetEntityType: 'conversation' | 'contact' | 'tag' | null
  targetEntityId: string | null
  contactId: string | null
  durationMs: number | null
  errorMessage: string | null
  agentId: string
  /** Snapshot of the agent's display name when the action ran. Null for
   *  legacy rows recorded before migration 31. The activity panel renders
   *  this next to each card (matching the operator's actor name format). */
  agentName: string | null
  createdAt: string
}

interface AgentActionsResponse {
  conversation_id: string
  actions: AgentAction[]
}

/**
 * Returns the most recent CRM operations performed by the WhatsApp agent on
 * this conversation. Filtered server-side by tenant_id (from auth) and
 * conversation_id, ordered most-recent first. Empty array when no actions.
 */
export async function fetchAgentActions(conversationId: string, limit = 50): Promise<AgentAction[]> {
  const res = await apiFetch<AgentActionsResponse>(
    `/conversations/${conversationId}/actions?limit=${limit}`,
  )
  return res.actions ?? []
}
