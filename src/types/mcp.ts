// ─── MCP types (frontend) ───────────────────────────────────────────────────
// SCRUM-1084 — mirrors agent-server's agentMcpService.ts response shapes.

export type McpAuthType = 'none' | 'bearer' | 'api_key'

/** One row from GET /configs/:agentId/mcp-providers — never carries a
 *  credential, sealed or otherwise. */
export interface AgentMcpProvider {
  id: string
  agent_id: string
  provider_id: string
  provider_name: string
  endpoint_url: string
  auth_type: McpAuthType
  enabled: boolean
  /** True when this provider was created from a vetted `mcp_provider_templates`
   *  row — drives the "Verificado pela Oryon" badge. */
  verified: boolean
  created_at: string
  updated_at: string
}

/** GET /mcp-provider-templates — the "verified" catalog for the picker. Only
 *  id + name: the client never needs (or sees) the endpoint_url. */
export interface McpProviderTemplateSummary {
  id: string
  name: string
}

export interface AttachMcpProviderPayload {
  /** Verified path — when set, `name`/`endpoint_url`/`auth_type` below are
   *  ignored server-side (read from the template instead). Only `auth_value`
   *  is actually used together with a template_id. */
  template_id?: string
  /** Free path — required together, ignored when template_id is set. */
  name?: string
  endpoint_url?: string
  auth_type?: McpAuthType
  /** Required on every attach (verified or free) — the credential itself. */
  auth_value?: string
}
