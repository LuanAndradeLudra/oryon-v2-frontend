// ─── Skill Types (frontend mirror) ─────────────────────────────────────────
// Mirrors agent-server/src/types/skills.ts. Kept in lockstep manually because
// the two repos don't share a tsconfig path (no shared `@oryon/types` package
// yet — adding one would be its own task).

export type SkillCategory = 'clinic' | 'crm' | 'calendar' | 'custom' | string
export type SkillHttpMethod = 'POST' | 'PUT' | 'PATCH'

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: Array<string | number>
  items?: JsonSchemaProperty
  /** Custom marker — admin UI renders the field as a masked input. */
  secret?: boolean
}

export interface JsonSchemaObject {
  type: 'object'
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
}

/** Row shape returned by GET /skill-templates endpoints. */
export interface SkillTemplate {
  id: string
  slug: string
  name: string
  description: string
  category: SkillCategory
  llm_name: string
  llm_description: string
  input_schema: JsonSchemaObject
  config_schema: JsonSchemaObject | unknown[]
  webhook_path: string
  http_method: SkillHttpMethod
  timeout_ms: number
  mutates: boolean
  tenant_id: string | null
  version: number
  enabled: boolean
  /** Operational instructions appended to the agent's system_prompt when this
   *  skill is attached. Visible only to the model + Oryon staff. */
  prompt_fragment: string | null
  created_at: string
  updated_at: string
  /** Map of tenant_id → count of agents currently using this template.
   *  Only present on the listing endpoint; admin uses it to show
   *  "attributed to" without an extra round-trip. */
  instances_by_tenant?: Record<string, number>
  /** Count of attached agent_skills whose stored `config` is missing a key
   *  currently listed in `config_schema.required`. Populated by the listing
   *  endpoint so the catalogue card can render a "⚠ N desatualizadas" badge.
   *  Absent on single-row reads. */
  drift_count?: number
}

/** One row from GET /configs/:agentId/skills/:skillId/executions. Mirrors
 *  agentSkillService.SkillExecutionRow on the agent-server. Used by the
 *  "Histórico" section inside EditAgentSkillConfigModal to confirm a skill
 *  actually fired + correlate failures with n8n logs via request_id. */
export interface SkillExecutionRow {
  id: string
  created_at: string
  success: boolean
  status_code: number | null
  duration_ms: number | null
  error_message: string | null
  request_id: string | null
  conversation_id: string | null
  tool_name: string | null
  template_slug: string | null
}

/** Per-instance drift detail returned by GET /skill-templates/:id/instances.
 *  Mirrors agent-server/src/types/skills.ts. */
export interface SkillTemplateInstance {
  id: string
  agent_id: string
  agent_name: string
  tenant_id: string
  config: Record<string, unknown>
  llm_name_override: string | null
  llm_description_override: string | null
  enabled: boolean
  created_at: string
  updated_at: string
  has_drift: boolean
  missing_required: string[]
  extra_keys: string[]
}

/** Row shape returned by POST/PATCH /agent-skills endpoints. */
export interface AgentSkill {
  id: string
  agent_id: string
  tenant_id: string
  template_id: string
  config: Record<string, unknown>
  llm_name_override: string | null
  llm_description_override: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

/** Row shape returned by GET /configs/:agentId/skills (joined view). */
export interface AgentSkillWithTemplate {
  skill_id: string
  agent_id: string
  tenant_id: string
  config: Record<string, unknown>
  llm_name_override: string | null
  llm_description_override: string | null
  enabled: boolean
  created_at: string
  updated_at: string
  template_id: string
  template_slug: string
  template_name: string
  template_description: string
  template_category: SkillCategory
  template_llm_name: string
  template_llm_description: string
  template_input_schema: JsonSchemaObject
  template_config_schema: JsonSchemaObject | unknown[]
  template_webhook_path: string
  template_http_method: SkillHttpMethod
  template_timeout_ms: number
  template_mutates: boolean
  template_enabled: boolean
}

// ─── Tester payloads ────────────────────────────────────────────────────────

export interface TesterRequest {
  config?: Record<string, unknown>
  inputs?: Record<string, unknown>
  contact?: { phone?: string; name?: string; id?: string }
}

export interface TesterResult {
  request: {
    url: string
    method: SkillHttpMethod
    headers: Record<string, string>
    envelope: {
      context: { tenant_id: string; agent_id: string; conversation_id: string | null; contact?: unknown }
      config: Record<string, unknown>
      inputs: Record<string, unknown>
    }
    request_id: string
  }
  response: {
    status: number
    body?: unknown
    duration_ms: number
    error?: string
    message?: string
  }
}

// ─── Create / Update payloads ──────────────────────────────────────────────

export interface CreateSkillTemplatePayload {
  slug: string
  name: string
  description: string
  category: SkillCategory
  llm_name: string
  llm_description: string
  input_schema: JsonSchemaObject
  config_schema?: JsonSchemaObject | unknown[]
  webhook_path: string
  http_method?: SkillHttpMethod
  timeout_ms?: number
  mutates?: boolean
  tenant_id?: string | null
  /** Optional natural-language operational instructions for the model.
   *  Append-only to the agent's system_prompt; max 2000 chars (server-enforced). */
  prompt_fragment?: string | null
}

export type UpdateSkillTemplatePayload = Partial<Omit<CreateSkillTemplatePayload, 'slug' | 'tenant_id'>> & {
  enabled?: boolean
}

export interface AttachSkillPayload {
  template_id: string
  config?: Record<string, unknown>
  llm_name_override?: string | null
  llm_description_override?: string | null
}

export interface UpdateAgentSkillPayload {
  config?: Record<string, unknown>
  enabled?: boolean
  llm_name_override?: string | null
  llm_description_override?: string | null
}
