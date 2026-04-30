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
