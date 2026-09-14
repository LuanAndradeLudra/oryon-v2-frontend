// ─── Connectors API (frontend) ──────────────────────────────────────────────
// Wraps /agents/builder/connectors (SCRUM-1075/1076). Reads are open to any
// tenant admin tier; writes (install/edit/test) require owner tier —
// enforced again server-side, this client trusts the backend's 403.

import { apiFetch } from './agentsApi'
import type { ConnectorSummary, ConnectorDetail, InstallConnectorResult, TestConnectorResult } from '@/types/connectors'

export async function listConnectors(agentId: string): Promise<ConnectorSummary[]> {
  return apiFetch<ConnectorSummary[]>(`/connectors?agentId=${encodeURIComponent(agentId)}`)
}

export async function getConnectorDetail(agentId: string, connectorId: string): Promise<ConnectorDetail> {
  return apiFetch<ConnectorDetail>(`/connectors/${connectorId}?agentId=${encodeURIComponent(agentId)}`)
}

export async function installConnector(
  connectorId: string,
  agentId: string,
  config?: Record<string, unknown>,
): Promise<InstallConnectorResult> {
  return apiFetch<InstallConnectorResult>(`/connectors/${connectorId}/install`, {
    method: 'POST',
    body: JSON.stringify({ agentId, config }),
  })
}

export async function updateConnectorInstallation(
  connectorId: string,
  config: Record<string, unknown>,
): Promise<{ id: string; status: string; config: Record<string, unknown> }> {
  return apiFetch(`/connectors/${connectorId}/installation`, {
    method: 'PATCH',
    body: JSON.stringify({ config }),
  })
}

export async function testConnectorInstallation(
  connectorId: string,
  agentId: string,
  config: Record<string, unknown>,
): Promise<TestConnectorResult> {
  return apiFetch<TestConnectorResult>(`/connectors/${connectorId}/test-installation`, {
    method: 'POST',
    body: JSON.stringify({ agentId, config }),
  })
}

export async function requestConnector(connectorNameFreeform: string, useCase: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/connector-requests', {
    method: 'POST',
    body: JSON.stringify({ connector_name_freeform: connectorNameFreeform, use_case: useCase }),
  })
}
