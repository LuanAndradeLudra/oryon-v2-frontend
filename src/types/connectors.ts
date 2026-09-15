// ─── Connector types (frontend) ─────────────────────────────────────────────
// Redesigned 2026-09-14: two-level model — hub (tenant-scoped, "installed")
// + per-agent toggle ("enabled for this agent"). Mirrors agent-server's
// connectorService.ts response shapes exactly.

import type { JsonSchemaObject } from '@/types/skills'

/** One row from GET /connectors (the hub catalog, Settings → Conectores). */
export interface ConnectorSummary {
  id: string
  slug: string
  name: string
  vendor: string | null
  description: string
  category: string
  logo_url: string | null
  status: string
  docs_url: string | null
  setup_instructions: string | null
  /** Whether the TENANT already has a credential installed — says nothing
   *  about which agents use it. */
  installed: boolean
}

/** GET /connectors/:id */
export interface ConnectorDetail extends ConnectorSummary {
  config_schema: JsonSchemaObject | unknown[] | null
  /** Redacted current config (secret fields = the sentinel string) — lets
   *  the manage form prefill without ever seeing the real secret. Null when
   *  the connector isn't installed yet. */
  current_config: Record<string, unknown> | null
  /** Longer-form copy for the detail modal (ClickUp-style). Null for
   *  connectors that predate migration 50. */
  long_description: string | null
  /** Bullet list of what the connector lets the agent do — rendered as a
   *  capability list in the detail modal. Null for older connectors. */
  capabilities: string[] | null
}

export interface InstallConnectorResult {
  installation: { id: string; status: string; connector_id: string }
}

export interface TestConnectorResult {
  success: boolean
  message: string
}

/** GET /configs/:agentId/connectors — the per-agent toggle list. */
export interface AgentConnectorToggle {
  id: string
  slug: string
  name: string
  category: string
  logo_url: string | null
  description: string
  /** True only when EVERY enabled member skill is attached and enabled for
   *  this agent — not "at least one". A single switch can't represent a
   *  partial state honestly. */
  enabled: boolean
}

export interface SetConnectorEnabledResult {
  enabled: boolean
  skills: Array<{ template_id: string; template_name: string; agent_skill_id?: string; already_in_sync: boolean }>
}

// ── Staff triage (SCRUM-1079) ───────────────────────────────────────────────

export interface ConnectorRequestRow {
  id: string
  tenant_id: string
  requested_by_user_id: string
  connector_name_freeform: string
  connector_id: string | null
  use_case: string
  status: string
  staff_notes: string | null
  created_at: string
  resolved_at: string | null
}

/** GET /admin/connectors — staff-only, unfiltered by visibility/status. */
export interface ConnectorSummaryForStaff {
  id: string
  slug: string
  name: string
  status: string
  visibility: string
}

/** GET /admin/connectors/:id — staff-only full lifecycle detail. */
export interface ConnectorAdminDetail {
  id: string
  slug: string
  name: string
  vendor: string | null
  description: string
  category: string
  logo_url: string | null
  status: string
  visibility: string
  pilot_tenant_id: string | null
  docs_url: string | null
  draft_notes: unknown
  setup_instructions: string | null
  created_at: string
  updated_at: string
  members: Array<{ id: string; slug: string; name: string; enabled: boolean }>
}

export interface UpdateConnectorLifecyclePayload {
  status?: string
  visibility?: string
  pilot_tenant_id?: string | null
  confirmed_gate?: boolean
}
