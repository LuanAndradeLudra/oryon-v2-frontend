// ─── Agent MCP Providers API (frontend) ────────────────────────────────────
// Wraps /agents/builder/configs/:agentId/mcp-providers (SCRUM-1084). Reads are
// open to any tenant admin tier; writes (attach/pause-resume) require owner
// tier — enforced again server-side, this client trusts the backend's 403.

import { apiFetch } from './agentsApi'
import type { AgentMcpProvider, McpProviderTemplateSummary, AttachMcpProviderPayload } from '@/types/mcp'

export async function listAgentMcpProviders(agentId: string): Promise<AgentMcpProvider[]> {
  return apiFetch<AgentMcpProvider[]>(`/configs/${agentId}/mcp-providers`)
}

export async function listMcpProviderTemplates(): Promise<McpProviderTemplateSummary[]> {
  return apiFetch<McpProviderTemplateSummary[]>('/mcp-provider-templates')
}

export async function attachMcpProvider(
  agentId: string,
  payload: AttachMcpProviderPayload,
): Promise<AgentMcpProvider> {
  return apiFetch<AgentMcpProvider>(`/configs/${agentId}/mcp-providers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function setAgentMcpProviderEnabled(
  agentId: string,
  id: string,
  enabled: boolean,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/configs/${agentId}/mcp-providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}
