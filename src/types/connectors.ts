// ─── Connector types (frontend) ─────────────────────────────────────────────
// SCRUM-1078 — mirrors agent-server's connectorService.ts response shapes.

import type { JsonSchemaObject } from '@/types/skills'

/** One row from GET /connectors?agentId=xxx — the tenant-visible catalog. */
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
  /** Whether THIS agent (not just the tenant) already has the connector's
   *  skills attached. */
  connected: boolean
}

/** GET /connectors/:id?agentId=xxx */
export interface ConnectorDetail extends ConnectorSummary {
  config_schema: JsonSchemaObject | unknown[] | null
}

export interface InstallConnectorResult {
  installation: { id: string; status: string; connector_id: string }
  skills: Array<{ template_id: string; template_name: string; agent_skill_id?: string; already_connected: boolean }>
}

export interface TestConnectorResult {
  success: boolean
  message: string
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
