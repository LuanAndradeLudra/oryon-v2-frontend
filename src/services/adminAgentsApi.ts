// ─── Admin Agents API (Oryon staff) ────────────────────────────────────────
// Cross-tenant agent inspection / edit. Hits /agents/admin/agents/* on the
// agent-server. Backend has already gated by super_admin role, so any caller
// reaching these helpers must be staff (RequireSuperAdmin guard upstream).

import { AGENT_SERVER_BASE, getAgentToken } from './agentsApi'

export interface AdminAgentRecord {
  id: string
  tenant_id: string
  name: string
  icon: string
  sector: string | null
  objective: string | null
  status: string
  system_prompt: string
  handoff_rules: Record<string, unknown>
  channels: Record<string, unknown>
  wizard_config: Record<string, unknown>
  /** Phase 28: explicit LLM model override. null = auto. */
  preferred_model: string | null
  /** What the auto heuristic would pick — surfaced by the GET endpoint
   *  so the UI can render "Auto (Haiku)" / "Auto (Sonnet)" without
   *  re-implementing the policy. */
  auto_choice: string
  created_at?: string
  updated_at?: string
}

export const TENANT_SELECTABLE_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
] as const
export type TenantSelectableModel = typeof TENANT_SELECTABLE_MODELS[number]

export const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Haiku 4.5 (rápido, ~12x mais barato)',
  'claude-sonnet-4-6': 'Sonnet 4.6 (raciocínio mais forte)',
  'claude-opus-4-6': 'Opus 4.6 (raciocínio premium, caro)',
}

export interface EffectivePromptFragment {
  skill_id: string
  template_id: string
  template_slug: string
  template_name: string | null
  llm_name: string
  fragment: string
}

export interface EffectivePromptResponse {
  agent_id: string
  tenant_id: string
  agent_name: string
  /** The customer's raw prompt (read-only context — editable via PATCH below). */
  system_prompt: string
  /** One block per attached skill that defines a prompt_fragment. */
  fragments: EffectivePromptFragment[]
  /** The exact concatenation the executor produces for the model. */
  composed: string
  composed_chars: number
}

async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getAgentToken()
  const res = await fetch(`${AGENT_SERVER_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...opts,
  })
  const text = await res.text()
  let json: { data?: T; error?: string }
  try {
    json = JSON.parse(text) as { data?: T; error?: string }
  } catch {
    throw new Error(res.ok ? 'Resposta inválida do servidor' : `Erro ${res.status}`)
  }
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json.data as T
}

/** Fetches an agent record from any tenant (super_admin only). */
export function getAdminAgent(agentId: string): Promise<AdminAgentRecord> {
  return adminFetch<AdminAgentRecord>(`/agents/admin/agents/${encodeURIComponent(agentId)}`)
}

/** Fetches the effective prompt the model sees: customer system_prompt
 *  concatenated with each attached skill's prompt_fragment. */
export function getAdminAgentEffectivePrompt(agentId: string): Promise<EffectivePromptResponse> {
  return adminFetch<EffectivePromptResponse>(
    `/agents/admin/agents/${encodeURIComponent(agentId)}/effective-prompt`,
  )
}

/** Overwrites the agent's system_prompt cross-tenant (super_admin only). */
export function updateAdminAgentSystemPrompt(
  agentId: string,
  systemPrompt: string,
): Promise<{ agent_id: string; system_prompt: string }> {
  return adminFetch<{ agent_id: string; system_prompt: string }>(
    `/agents/admin/agents/${encodeURIComponent(agentId)}/system-prompt`,
    {
      method: 'PATCH',
      body: JSON.stringify({ system_prompt: systemPrompt }),
    },
  )
}

/** Updates the explicit model override (super_admin only). Pass `null` to
 *  clear the override and return the agent to the auto heuristic. */
export function updateAdminAgentPreferredModel(
  agentId: string,
  preferredModel: TenantSelectableModel | null,
): Promise<{ agent_id: string; preferred_model: string | null; auto_choice: string }> {
  return adminFetch<{ agent_id: string; preferred_model: string | null; auto_choice: string }>(
    `/agents/admin/agents/${encodeURIComponent(agentId)}/preferred-model`,
    {
      method: 'PATCH',
      body: JSON.stringify({ preferred_model: preferredModel }),
    },
  )
}
