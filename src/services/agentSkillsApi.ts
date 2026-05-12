// ─── Agent Skills API (frontend) ───────────────────────────────────────────
// Wraps the /agents/builder/configs/:agentId/skills endpoints. Reads are open
// to tenant admins (the customer-facing Phase-3 tab uses them); writes require
// super_admin (Oryon staff attaches skills on the customer's behalf).

import { apiFetch } from './agentsApi'
import type {
  AgentSkill,
  AgentSkillWithTemplate,
  AttachSkillPayload,
  UpdateAgentSkillPayload,
  SkillTemplate,
  SkillExecutionRow,
} from '@/types/skills'

/**
 * Optional tenant override — only honoured by the agent-server when the
 * caller is super_admin. Used by the admin "Assign skill" screen to operate
 * inside a customer tenant. Customers always see / write their own tenant.
 */
function tenantQs(tenantId?: string): string {
  return tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''
}

export async function listAgentSkills(
  agentId: string,
  tenantId?: string,
): Promise<AgentSkillWithTemplate[]> {
  return apiFetch<AgentSkillWithTemplate[]>(`/configs/${agentId}/skills${tenantQs(tenantId)}`)
}

export async function attachSkill(
  agentId: string,
  payload: AttachSkillPayload,
  tenantId?: string,
): Promise<AgentSkill> {
  return apiFetch<AgentSkill>(`/configs/${agentId}/skills${tenantQs(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Batch attach (Phase 3.1) ───────────────────────────────────────────────
// One template → many agents in a single round-trip. Each agent has its own
// config so a franchise/network with per-unit settings (e.g. unidade_id)
// can be onboarded in one click.

export interface BatchAttachAssignment {
  agent_id: string
  config?: Record<string, unknown>
  llm_name_override?: string | null
  llm_description_override?: string | null
}

export interface BatchAttachResult {
  agent_id: string
  success: boolean
  agent_skill_id?: string
  error?: string
}

export async function batchAttachSkill(
  payload: { template_id: string; assignments: BatchAttachAssignment[] },
  tenantId?: string,
): Promise<{ results: BatchAttachResult[] }> {
  return apiFetch<{ results: BatchAttachResult[] }>(
    `/configs/skills/batch-attach${tenantQs(tenantId)}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function updateAgentSkill(
  agentId: string,
  skillId: string,
  patch: UpdateAgentSkillPayload,
  tenantId?: string,
): Promise<AgentSkill> {
  return apiFetch<AgentSkill>(`/configs/${agentId}/skills/${skillId}${tenantQs(tenantId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function detachSkill(
  agentId: string,
  skillId: string,
  tenantId?: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/configs/${agentId}/skills/${skillId}${tenantQs(tenantId)}`, {
    method: 'DELETE',
  })
}

export async function listAvailableTemplates(
  agentId: string,
  tenantId?: string,
): Promise<SkillTemplate[]> {
  return apiFetch<SkillTemplate[]>(`/configs/${agentId}/skills/available${tenantQs(tenantId)}`)
}

// ── Execution history (Phase 4.1) ──────────────────────────────────────────
// Most recent skill executions for a single attached instance. Sorted DESC
// by created_at on the server; clamped 1..100 limit. Used by the "Histórico"
// section inside EditAgentSkillConfigModal.

export interface ListExecutionsOptions {
  limit?: number
  offset?: number
}

export async function listSkillExecutions(
  agentId: string,
  skillId: string,
  opts: ListExecutionsOptions = {},
  tenantId?: string,
): Promise<SkillExecutionRow[]> {
  const params = new URLSearchParams()
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.offset !== undefined) params.set('offset', String(opts.offset))
  if (tenantId) params.set('tenantId', tenantId)
  const qs = params.toString()
  return apiFetch<SkillExecutionRow[]>(
    `/configs/${agentId}/skills/${skillId}/executions${qs ? `?${qs}` : ''}`,
  )
}
