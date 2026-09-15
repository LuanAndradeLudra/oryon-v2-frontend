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

// SCRUM-1085 (Fase 4): the model list used to be hardcoded here, duplicated
// from agent-server/src/services/modelRouting.ts with no way to notice when
// the two drifted apart. It's now fetched from the agent-server's own
// catalog endpoint — this file no longer needs updating when a model is
// added or removed on the other side.

export type ModelProvider = 'anthropic' | 'openai'
export type ModelRole = 'economy' | 'standard'

export interface ModelCatalogEntry {
  /** Value to send as `preferred_model`. */
  id: string
  provider: ModelProvider
  role: ModelRole
  label: string
  /** False only for Opus today — staff-only, set via DB direct, not this UI. */
  selectable: boolean
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

/** Every model an agent can be pinned to, any provider — the model picker's
 *  single source of truth (super_admin only). */
export function getModelCatalog(): Promise<ModelCatalogEntry[]> {
  return adminFetch<ModelCatalogEntry[]>('/agents/admin/models/catalog')
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
 *  clear the override and return the agent to the auto heuristic. `preferredModel`
 *  should be one of `getModelCatalog()`'s `selectable` ids — the agent-server
 *  re-validates regardless, so a stale id just comes back as a 400. */
export function updateAdminAgentPreferredModel(
  agentId: string,
  preferredModel: string | null,
): Promise<{ agent_id: string; preferred_model: string | null; auto_choice: string }> {
  return adminFetch<{ agent_id: string; preferred_model: string | null; auto_choice: string }>(
    `/agents/admin/agents/${encodeURIComponent(agentId)}/preferred-model`,
    {
      method: 'PATCH',
      body: JSON.stringify({ preferred_model: preferredModel }),
    },
  )
}
