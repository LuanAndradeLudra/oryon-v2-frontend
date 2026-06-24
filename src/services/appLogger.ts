// ─── Application Audit Logger ─────────────────────────────────────────────────
// Structured, typed, fire-and-forget logger for all audit tables.
// Uses the same Supabase REST endpoint pattern as debugLogger.ts.
// Every method returns void — errors are swallowed so they never block the UI.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const BASE         = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : null

// Phase A.3 — dual-write for `activity_log` events. When the flag is on,
// every logActivity() call ALSO POSTs to the backend's `/audit/event`
// endpoint, which enqueues a BullMQ job that persists into the backend
// `activity_logs` table. Supabase remains the source of truth until count-by-
// day parity is verified across the two stores; then the Supabase write is
// removed in a follow-up.
const BACKEND_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? null
const DUAL_WRITE = (() => {
  const v = import.meta.env.VITE_BACKEND_AUDIT_DUAL_WRITE
  return v === true || v === 'true' || v === '1'
})()

// VITE_AUDIT_LOG_TO_CONSOLE=true makes the logger emit one JSON line per audit
// event when no Supabase backend is configured. Useful for local dev (where
// VITE_SUPABASE_* is unset) and for debugging the audit shape before A.3
// migrates this to the backend.
const AUDIT_LOG_TO_CONSOLE = (() => {
  const v = import.meta.env.VITE_AUDIT_LOG_TO_CONSOLE
  return v === true || v === 'true' || v === '1'
})()

/**
 * POST a semantic activity event to the backend. Fire-and-forget; httpOnly
 * cookie carries the JWT so the backend can extract tenantId / actorId.
 * Errors are swallowed — audit must never break the UI.
 */
function postBackendAuditEvent(data: ActivityLog): void {
  if (!DUAL_WRITE || !BACKEND_API) return
  // Normalise snake_case appLogger payload to the backend DTO (camelCase).
  const body = {
    action: data.action,
    entityType: data.entity_type,
    entityId: data.entity_id ?? undefined,
    entityName: data.entity_name ?? undefined,
    description: data.description,
    details: typeof data.details === 'object' && data.details !== null ? data.details : undefined,
    source: data.source ?? undefined,
    correlationId: data.correlation_id ?? undefined,
    actorName: data.actor_name ?? undefined,
  }
  fetch(`${BACKEND_API}/audit/event`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => { /* silent — Supabase write still happened */ })
}

// ─── Shared POST helper ────────────────────────────────────────────────────────

function post(table: string, data: Record<string, unknown>): void {
  if (!BASE || !SUPABASE_KEY) {
    if (AUDIT_LOG_TO_CONSOLE) {
      // Single JSON line, no pretty-printing — pipe-friendly for jq.
      console.log(JSON.stringify({ ts: new Date().toISOString(), table, ...data }))
    }
    return
  }
  fetch(`${BASE}/${table}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(data),
  }).catch(() => { /* silent */ })
}

// ─── AI model cost constants (USD per million tokens) ─────────────────────────
// Mirror of ai_model_pricing table — update both when Anthropic changes pricing.

const MODEL_COST: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6':         { in: 3.00,  out: 15.00 },
  'claude-haiku-4-5-20251001': { in: 1.00,  out: 5.00  },
  'claude-haiku-4-5':          { in: 1.00,  out: 5.00  },
  'claude-opus-4-6':           { in: 15.00, out: 75.00 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const p = MODEL_COST[model] ?? MODEL_COST['claude-sonnet-4-6']
  return {
    input_cost_usd:  (inputTokens  / 1_000_000) * p.in,
    output_cost_usd: (outputTokens / 1_000_000) * p.out,
  }
}

// ─── Input / result sanitisers ────────────────────────────────────────────────
// Prevent huge payloads from bloating the DB. Truncate strings at 500 chars.

function truncate(value: unknown, maxLen = 500): unknown {
  if (typeof value === 'string') return value.length > maxLen ? value.slice(0, maxLen) + '…' : value
  if (Array.isArray(value))      return value.slice(0, 20).map((v) => truncate(v, 200))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    let count = 0
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (count++ >= 30) { out['…'] = '(truncated)'; break }
      out[k] = truncate(v, 200)
    }
    return out
  }
  return value
}

function safeJson(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  try {
    return truncate(value) as Record<string, unknown>
  } catch {
    return null
  }
}

// ─── Activity log type ────────────────────────────────────────────────────────

export interface ActivityLog {
  tenant_id?:   string | null
  actor_id?:    string | null
  actor_name?:  string | null
  action:       string          // e.g. 'contact_stage_changed'
  entity_type:  string          // e.g. 'contact'
  entity_id?:   string | null
  entity_name?: string | null
  description:  string          // human-readable: "Moveu lead Maria para estágio Cliente"
  details?:     unknown
  source?:      'ui' | 'copilot'
  turn_id?:     string | null
  correlation_id?: string | null
}

// ─── Table-typed log methods ───────────────────────────────────────────────────

export interface TurnLog {
  turn_id:      string
  tenant_id?:   string | null
  user_id?:     string | null
  user_message: string
  intent?:      string | null
  complexity?:  string | null
  confidence?:  number | null
  agents_used?: string[]
  slide_preset?: string | null
  total_tokens: number
  latency_ms?:  number | null
  status:       'started' | 'completed' | 'aborted' | 'error'
}

export interface AgentRunLog {
  turn_id:     string
  agent_id:    string
  model?:      string | null
  rounds_used: number
  tokens_used: number
  stop_reason?: string | null
  latency_ms?: number | null
  status:      'completed' | 'error'
}

export interface ToolCallLog {
  turn_id:           string
  agent_id:          string
  tool_name:         string
  tool_category?:    string | null
  input?:            unknown
  result_summary?:   unknown
  status:            'success' | 'error' | 'denied' | 'cache_hit'
  cache_hit?:        boolean
  approval_required?: boolean
  approved?:         boolean | null
  latency_ms?:       number | null
}

export interface ApprovalBatchLog {
  turn_id:        string
  agent_id:       string
  batch_id?:      string | null
  items?:         unknown
  total_items:    number
  approved_count: number
  rejected_count: number
  decision?:      'all_approved' | 'partial' | 'all_rejected' | null
}

export interface UserActionLog {
  tenant_id?:   string | null
  user_id?:     string | null
  session_id?:  string | null
  turn_id?:     string | null
  source?:      'ui' | 'copilot'
  method:       string
  endpoint:     string
  entity_type?: string | null
  entity_id?:   string | null
  payload?:     unknown
  status_code?: number | null
  latency_ms?:  number | null
  correlation_id?: string | null
}

export interface EntityChangeLog {
  tenant_id?:   string | null
  user_id?:     string | null
  source?:      'ui' | 'copilot'
  turn_id?:     string | null
  entity_type:  string
  entity_id:    string
  operation:    'create' | 'update' | 'delete'
  changes?:     unknown
  correlation_id?: string | null
}

export interface ArtifactLog {
  turn_id?:        string | null
  tenant_id?:      string | null
  user_id?:        string | null
  artifact_type:   string
  title?:          string | null
  slide_preset?:   string | null
  char_count?:     number | null
  tokens_used?:    number | null
  canva_exported?: boolean
  pptx_downloaded?: boolean
}

export interface SessionEventLog {
  tenant_id?: string | null
  user_id?:   string | null
  user_role?: string | null
  event_type: 'login' | 'logout' | 'session_restored' | 'token_expired'
  page?:      string | null
  metadata?:  unknown
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const appLogger = {
  logTurn(data: TurnLog): void {
    post('copilot_turns', {
      ...data,
      user_message: (data.user_message ?? '').slice(0, 500),
      agents_used:  data.agents_used ?? [],
    })
  },

  logAgentRun(data: AgentRunLog): void {
    post('copilot_agent_runs', { ...data })
  },

  logToolCall(data: ToolCallLog): void {
    post('copilot_tool_calls', {
      ...data,
      input:          safeJson(data.input),
      result_summary: safeJson(data.result_summary),
      cache_hit:      data.cache_hit  ?? false,
      approval_required: data.approval_required ?? false,
    })
  },

  logApprovalBatch(data: ApprovalBatchLog): void {
    post('copilot_approval_batches', {
      ...data,
      items: safeJson(data.items),
    })
  },

  logUserAction(data: UserActionLog): void {
    post('user_actions', {
      ...data,
      payload: safeJson(data.payload),
    })
  },

  logEntityChange(data: EntityChangeLog): void {
    post('entity_changelog', {
      ...data,
      changes: safeJson(data.changes),
    })
  },

  logArtifact(data: ArtifactLog): void {
    post('artifact_generations', {
      ...data,
      canva_exported:  data.canva_exported  ?? false,
      pptx_downloaded: data.pptx_downloaded ?? false,
    })
  },

  logSessionEvent(data: SessionEventLog): void {
    post('session_events', {
      ...data,
      metadata: safeJson(data.metadata),
    })
  },

  logActivity(data: ActivityLog): void {
    post('activity_log', {
      ...data,
      details: safeJson(data.details),
      source:  data.source ?? 'ui',
    })
    // Phase A.3: dual-write semantic events to the backend so /admin/audit
    // (Phase D.2) can drill them alongside server-originated rows. No-op
    // unless VITE_BACKEND_AUDIT_DUAL_WRITE is on.
    postBackendAuditEvent(data)
  },

  logAIGeneration(data: {
    tenant_id?:       string | null
    user_id?:         string | null
    actor_name?:      string | null
    generation_type:  'agent_prompt' | 'handoff_rule' | 'crm_config' | 'artifact' | 'copilot_turn'
    input_summary?:   unknown
    output_summary?:  unknown
    tokens_used?:     number | null
    latency_ms?:      number | null
    source?:          'ai' | 'local_fallback' | 'cached'
    status:           'success' | 'error'
    error_message?:   string | null
    turn_id?:         string | null
  }): void {
    post('ai_generation_logs', {
      ...data,
      input_summary:  safeJson(data.input_summary),
      output_summary: safeJson(data.output_summary),
      source:         data.source ?? 'ai',
    })
  },

  logWizardEvent(data: {
    tenant_id?:         string | null
    user_id?:           string | null
    wizard_type:        'agent_builder' | 'campaign' | 'automation' | 'template' | 'crm_setup' | 'user_create'
    wizard_session_id?: string | null
    step_number?:       number | null
    step_name:          string
    action:             'started' | 'completed' | 'back' | 'skipped' | 'error' | 'abandoned' | 'saved'
    data?:              unknown
    error_message?:     string | null
  }): void {
    post('wizard_events', {
      ...data,
      data: safeJson(data.data),
    })
  },

  logUserManagement(data: {
    tenant_id?:         string | null
    actor_id?:          string | null
    actor_name?:        string | null
    target_user_id?:    string | null
    target_user_name?:  string | null
    action:             'user_created' | 'user_updated' | 'role_changed' | 'user_deactivated' | 'user_activated' | 'password_changed' | 'permissions_updated'
    details?:           unknown
    source?:            'ui' | 'copilot'
  }): void {
    post('user_management_logs', {
      ...data,
      details: safeJson(data.details),
      source:  data.source ?? 'ui',
    })
  },

  // ── Unified AI execution log ────────────────────────────────────────────────
  // One row per Anthropic API call — covers every feature that uses AI.
  // Cost is auto-computed from MODEL_COST if not provided explicitly.
  logAIExecution(data: {
    tenant_id?:      string | null
    user_id?:        string | null
    execution_type:  string   // 'copilot_turn' | 'dashboard_insight' | 'crm_onboarding' | …
    agent_name?:     string | null
    model:           string
    input_summary?:  string | null
    output_summary?: string | null
    tools_called?:   Array<{ name: string; status: string; latency_ms?: number }>
    input_tokens:    number
    output_tokens:   number
    input_cost_usd?:  number | null   // pass to override auto-computed cost
    output_cost_usd?: number | null
    latency_ms?:     number | null
    rounds?:         number | null
    status:          'success' | 'error' | 'aborted'
    error_message?:  string | null
    context_ref?:    Record<string, string | null | undefined>
    turn_id?:        string | null
  }): void {
    const costs = data.input_cost_usd != null
      ? { input_cost_usd: data.input_cost_usd, output_cost_usd: data.output_cost_usd }
      : estimateCost(data.model, data.input_tokens, data.output_tokens)
    post('ai_execution_logs', {
      ...data,
      ...costs,
      tools_called: data.tools_called ?? [],
      context_ref:  data.context_ref  ?? {},
    })
  },
}
