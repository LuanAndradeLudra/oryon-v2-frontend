// ─── Admin AI Observability API (super_admin only) ───────────────────────────
// Phase D.3 — frontend client for the cost rollup + per-agent summary
// endpoints exposed by the backend NestJS proxy (which forwards to
// agent-server).

import { api } from './api'

export interface CostRollupRow {
  tenant_id: string
  day: string  // YYYY-MM-DD
  feature: string
  executions: number
  total_cost_usd: string
  total_input_tokens: number
  total_output_tokens: number
}

export interface AgentSummary {
  agent_id: string
  window: { since: string; until: string }
  totals: {
    executions: number
    answered: number
    aborted_loop: number
    error: number
    max_turns: number
    total_input_tokens: number
    total_output_tokens: number
    total_cost_usd: number
  }
  top_tools: Array<{ tool_name: string; calls: number; failures: number }>
  rag: {
    queries: number
    hit_rate: number
    reranker_used_rate: number
    avg_total_duration_ms: number | null
    avg_reranker_duration_ms: number | null
  }
}

export async function fetchCostRollup(
  query: { since?: string; until?: string; tenantId?: string } = {},
): Promise<{ data: CostRollupRow[] }> {
  const res = await api.get<{ data: CostRollupRow[] }>('/admin/ai-observability/cost-rollup', { params: query })
  return res.data
}

export async function fetchAgentSummary(
  agentId: string,
  query: { since?: string; until?: string; tenantId?: string } = {},
): Promise<AgentSummary> {
  const res = await api.get<AgentSummary>(`/admin/ai-observability/agent/${agentId}/summary`, { params: query })
  return res.data
}

// ─── Chat executions (detailed list + drill) ──────────────────────────────────
// Powers /admin/ai-executions. One row = one POST /chat to the agent-server.

export interface ChatExecutionRow {
  id: string
  request_id: string
  correlation_id: string | null
  tenant_id: string
  agent_id: string | null
  conversation_id: string | null
  session_id: string | null
  total_turns: number
  tools_called_count: number
  tokens_input: number
  tokens_output: number
  tokens_cache_read: number
  tokens_cache_creation: number
  cost_usd: string
  final_status: string
  error_code: string | null
  error_message: string | null
  duration_ms: number
  model: string | null
  created_at: string
}

export interface ChatExecutionListQuery {
  since?: string
  until?: string
  tenantId?: string
  agentId?: string
  finalStatus?: string
  before?: string
  limit?: number
}

export interface ChatExecutionToolRow {
  id: string
  tool_name: string
  kind: string
  template_slug: string | null
  status_code: number | null
  duration_ms: number | null
  success: boolean
  error_message: string | null
  input_hash: string | null
  created_at: string
}

export interface ChatExecutionRagRow {
  id: string
  query_redacted: string
  top_k: number
  threshold: number
  chunks_returned: unknown
  reranker_used: boolean
  reranker_duration_ms: number | null
  total_duration_ms: number
  created_at: string
}

export interface ChatExecutionAntiLoopRow {
  id: string
  tool_name: string
  consecutive_count: number
  iteration: number
  created_at: string
}

export interface ChatExecutionMessageRow {
  id: string
  role: string
  content: string
  latency_ms: number | null
  created_at: string
}

export interface ChatExecutionDetail {
  execution: ChatExecutionRow
  tools: ChatExecutionToolRow[]
  rag_queries: ChatExecutionRagRow[]
  anti_loop_events: ChatExecutionAntiLoopRow[]
  messages: ChatExecutionMessageRow[]
}

export async function fetchChatExecutions(
  query: ChatExecutionListQuery = {},
): Promise<{ data: ChatExecutionRow[]; nextCursor: string | null }> {
  const params: Record<string, string> = {}
  if (query.since) params.since = query.since
  if (query.until) params.until = query.until
  if (query.tenantId) params.tenantId = query.tenantId
  if (query.agentId) params.agentId = query.agentId
  if (query.finalStatus) params.finalStatus = query.finalStatus
  if (query.before) params.before = query.before
  if (query.limit) params.limit = String(query.limit)
  const res = await api.get<{ data: ChatExecutionRow[]; nextCursor: string | null }>(
    '/admin/ai-observability/executions',
    { params },
  )
  return res.data
}

export async function fetchChatExecutionDetail(
  requestId: string,
  query: { tenantId?: string } = {},
): Promise<ChatExecutionDetail> {
  const res = await api.get<ChatExecutionDetail>(
    `/admin/ai-observability/executions/${requestId}`,
    { params: query },
  )
  return res.data
}
