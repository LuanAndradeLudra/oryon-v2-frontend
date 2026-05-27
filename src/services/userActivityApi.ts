// ─── User Activity API ──────────────────────────────────────────────────────
//
// Pairs with agentActivityApi.ts. While that one queries the agent-server's
// `agent_tool_executions` for what the WhatsApp AI did on a conversation,
// this one queries the backend's `activity_logs` for what the operators
// (humans) did. The conversation activity panel merges both feeds on the
// client into a single chronological timeline.
//
// Server-side filtering at /activity-feed/conversation/:id excludes rows
// with `source` in ('agent', 'whatsapp-agent', 'copilot') so AI-driven
// writes that also pass through the @AuditLog interceptor never reach this
// endpoint — the operator panel sees them via agentActivityApi instead.

import { api } from './api'

/** Shape of a single row from /activity-feed/conversation/:id. The backend
 *  returns more in `metadata` than we currently render — only fields the
 *  ConversationActivitySection consumes are required here, the rest is
 *  retained as an open record for future expansion. */
export interface UserActivity {
  id: string
  /** Action verb identifier — e.g. 'conversation_assigned',
   *  'conversation_status_updated', 'message_sent'. Drives the icon. */
  type: string
  /** ISO timestamp of when the action happened. Used as the merge key when
   *  interleaving with agent activity. */
  timestamp: string
  /** Human-readable actor — falls back to email when firstName/lastName
   *  aren't on the JWT. Backend best-effort, may be 'Sistema' for cron rows. */
  actor: string
  /** Pre-rendered Portuguese summary the backend produced, e.g.
   *  "conversation_assigned conversation". Render verbatim. */
  summary: string
  /** Open record with entity hints, source, severity, etc. Useful for
   *  diagnostics or future tooltips; not required for rendering. */
  metadata?: Record<string, unknown>
}

interface UserActivityResponse {
  total: number
  data: UserActivity[]
  generatedAt: string
}

/** Fetch operator activity rows for one conversation, newest first. Empty
 *  array when nothing matches. Errors surface to the caller — the panel's
 *  outer try/catch handles network failures. */
export async function fetchUserActivity(
  conversationId: string,
  limit = 50,
): Promise<UserActivity[]> {
  const res = await api.get<UserActivityResponse>(
    `/activity-feed/conversation/${conversationId}`,
    { params: { limit } },
  )
  return res.data?.data ?? []
}

/** Contact-level variant: operator/system activity aggregated across ALL of
 *  the contact's conversations (CRM history → "Histórico de conversas"). */
export async function fetchContactActivity(
  contactId: string,
  limit = 100,
): Promise<UserActivity[]> {
  const res = await api.get<UserActivityResponse>(
    `/activity-feed/contact/${contactId}`,
    { params: { limit } },
  )
  return res.data?.data ?? []
}
