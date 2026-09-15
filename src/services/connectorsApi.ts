// ─── Connectors API (frontend) ──────────────────────────────────────────────
// Wraps /agents/builder/connectors. Redesigned 2026-09-14 into hub (tenant-
// scoped, no agent) + per-agent toggle — see connectorService.ts (backend)
// for the full rationale. Reads are open to any tenant admin tier; writes
// (install/edit/test, and the per-agent toggle) require owner tier —
// enforced again server-side, this client trusts the backend's 403.

import { apiFetch } from './agentsApi'
import type {
  ConnectorSummary,
  ConnectorDetail,
  InstallConnectorResult,
  TestConnectorResult,
  AgentConnectorToggle,
  SetConnectorEnabledResult,
  ConnectorRequestRow,
  ConnectorSummaryForStaff,
  ConnectorAdminDetail,
  UpdateConnectorLifecyclePayload,
} from '@/types/connectors'

// ── Hub (tenant-scoped) ─────────────────────────────────────────────────────

export async function listConnectors(): Promise<ConnectorSummary[]> {
  return apiFetch<ConnectorSummary[]>('/connectors')
}

export async function getConnectorDetail(connectorId: string): Promise<ConnectorDetail> {
  return apiFetch<ConnectorDetail>(`/connectors/${connectorId}`)
}

export async function installConnector(
  connectorId: string,
  config: Record<string, unknown>,
): Promise<InstallConnectorResult> {
  return apiFetch<InstallConnectorResult>(`/connectors/${connectorId}/install`, {
    method: 'POST',
    body: JSON.stringify({ config }),
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
  config: Record<string, unknown>,
): Promise<TestConnectorResult> {
  return apiFetch<TestConnectorResult>(`/connectors/${connectorId}/test-installation`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  })
}

export async function requestConnector(connectorNameFreeform: string, useCase: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/connector-requests', {
    method: 'POST',
    body: JSON.stringify({ connector_name_freeform: connectorNameFreeform, use_case: useCase }),
  })
}

// ── Per-agent toggle ─────────────────────────────────────────────────────────

export async function listInstalledConnectorsForAgent(agentId: string): Promise<AgentConnectorToggle[]> {
  return apiFetch<AgentConnectorToggle[]>(`/configs/${agentId}/connectors`)
}

export async function setConnectorEnabledForAgent(
  agentId: string,
  connectorId: string,
  enabled: boolean,
): Promise<SetConnectorEnabledResult> {
  return apiFetch<SetConnectorEnabledResult>(`/configs/${agentId}/connectors/${connectorId}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

// ── Staff triage (SCRUM-1079) — super_admin only, enforced server-side ──────

export async function listConnectorRequestsForStaff(status?: string): Promise<ConnectorRequestRow[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<ConnectorRequestRow[]>(`/admin/connector-requests${qs}`)
}

export async function triageConnectorRequest(
  id: string,
  patch: { status?: string; staff_notes?: string | null; connector_id?: string | null },
): Promise<ConnectorRequestRow> {
  return apiFetch<ConnectorRequestRow>(`/admin/connector-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function listAllConnectorsForStaff(): Promise<ConnectorSummaryForStaff[]> {
  return apiFetch<ConnectorSummaryForStaff[]>('/admin/connectors')
}

export async function getConnectorAdminDetail(id: string): Promise<ConnectorAdminDetail> {
  return apiFetch<ConnectorAdminDetail>(`/admin/connectors/${id}`)
}

export async function updateConnectorLifecycle(
  id: string,
  patch: UpdateConnectorLifecyclePayload,
): Promise<ConnectorAdminDetail> {
  return apiFetch<ConnectorAdminDetail>(`/admin/connectors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
