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
  targetEntityType: 'conversation' | 'contact' | 'tag' | 'deal' | null
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
  conversation_id?: string
  contact_id?: string
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

/** Contact-level variant: the agent's CRM operations across ALL of the
 *  contact's conversations (CRM history → "Histórico de conversas"). */
export async function fetchAgentActionsByContact(contactId: string, limit = 100): Promise<AgentAction[]> {
  const res = await apiFetch<AgentActionsResponse>(
    `/contacts/${contactId}/actions?limit=${limit}`,
  )
  return res.actions ?? []
}

// B6 (SCRUM-941) — the CRM Judge's own decisions (agent B, fire-and-forget
// after /chat), separate from agent A's actions above. Includes SKIPS
// (executed=false with a skipReason) on purpose: "IA visível e simétrica"
// means an operator reading the audit trail sees what the AI chose NOT to
// do too, not just what it did.
export interface JudgeDecision {
  id: string
  judgeDecisionId: string
  agentId: string
  triggerReason: string
  type: string | null
  params: unknown
  confidence: number | null
  rationale: string | null
  executed: boolean
  skipReason: string | null
  createdAt: string
}

interface JudgeDecisionsResponse {
  conversation_id: string
  decisions: JudgeDecision[]
}

/**
 * Returns the CRM Judge's decided actions (including skips) for a
 * conversation, most recent first. Shadow-mode runs are excluded server-side
 * — they never execute anything and would just confuse an operator reading
 * a real audit trail.
 */
export async function fetchJudgeDecisions(conversationId: string, limit = 50): Promise<JudgeDecision[]> {
  const res = await apiFetch<JudgeDecisionsResponse>(
    `/conversations/${conversationId}/judge-decisions?limit=${limit}`,
  )
  return res.decisions ?? []
}
