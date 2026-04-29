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
  created_at: string
  updated_at: string
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
