// ─── Admin Audit API (super_admin only) ──────────────────────────────────────
// Phase D.2 — read-only client for the /admin/audit and /admin/ai-observability/
// drill endpoints exposed by the backend NestJS layer.

import { api } from './api'

export type AuditSeverity = 'info' | 'warn' | 'error'
export type AuditActorType = 'user' | 'system' | 'agent' | 'webhook' | 'job'

export interface AuditLogRow {
  id: string
  tenantId: string
  actorId: string | null
  actorName: string | null
  actorType: AuditActorType
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  description: string
  details: Record<string, unknown>
  source: string
  severity: AuditSeverity
  correlationId: string | null
  requestId: string | null
  durationMs: number | null
  createdAt: string
  updatedAt: string
}

export interface AuditFeedQuery {
  tenantId?: string
  action?: string
  actorId?: string
  actorType?: AuditActorType
  severity?: AuditSeverity
  source?: string
  since?: string  // ISO date
  before?: string // ISO date — pagination cursor
  correlationId?: string
  limit?: number
}

export interface AuditFeedResponse {
  data: AuditLogRow[]
  nextCursor: string | null
}

export async function listAuditFeed(query: AuditFeedQuery = {}): Promise<AuditFeedResponse> {
  const res = await api.get<AuditFeedResponse>('/admin/audit', { params: query })
  return res.data
}

export async function drillBackendByCorrelationId(
  correlationId: string,
  tenantId?: string,
): Promise<{ data: AuditLogRow[] }> {
  const res = await api.get<{ data: AuditLogRow[] }>(`/admin/audit/drill/${correlationId}`, {
    params: tenantId ? { tenantId } : undefined,
  })
  return res.data
}

// ─── Cross-service drill (agent-server side, via backend proxy) ───────────────

export type DrillEventType = 'chat_execution' | 'tool_execution' | 'rag_query' | 'anti_loop'

export interface DrillEvent {
  type: DrillEventType
  at: string
  request_id: string | null
  agent_id: string | null
  tenant_id: string
  payload: Record<string, unknown>
}

export interface DrillResponse {
  correlation_id: string
  events: DrillEvent[]
}

export async function drillAiByCorrelationId(
  correlationId: string,
  tenantId?: string,
): Promise<DrillResponse> {
  const res = await api.get<DrillResponse>(`/admin/ai-observability/drill/${correlationId}`, {
    params: tenantId ? { tenantId } : undefined,
  })
  return res.data
}
