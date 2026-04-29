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
