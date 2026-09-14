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
