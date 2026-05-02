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

// ─── Sister audit feeds (Gap 2 — separate tabs in /admin/audit) ──────────────
// Each of these reads a different table that has fields specific to its
// domain, so they're surfaced as parallel feeds rather than merged into the
// main activity_logs query.

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'token_refresh'
  | 'password_change'
  | 'logout'
  | 'account_activated'
  | 'account_deactivated'
  | 'password_reset_requested'
  | 'password_reset_completed'

export interface AuthEventRow {
  id: string
  tenantId: string
  userId: string | null
  event: AuthEventType
  ip: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuthEventsQuery {
  tenantId?: string
  userId?: string
  event?: AuthEventType
  since?: string
  before?: string
  limit?: number
}

export async function listAuthEvents(query: AuthEventsQuery = {}): Promise<{
  data: AuthEventRow[]
  nextCursor: string | null
}> {
  const res = await api.get<{ data: AuthEventRow[]; nextCursor: string | null }>(
    '/admin/audit/auth-events',
    { params: query },
  )
  return res.data
}

export type IntegrationSeverity = 'error' | 'warning' | 'info'
export type IntegrationSource = 'meta' | 'whatsapp' | 'system'

export interface IntegrationEventRow {
  id: string
  tenantId: string
  source: IntegrationSource
  severity: IntegrationSeverity
  code: string
  message: string
  metadata: Record<string, unknown> | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface IntegrationEventsQuery {
  tenantId?: string
  source?: IntegrationSource
  severity?: IntegrationSeverity
  code?: string
  /** 'true' = resolved only, 'false' = unresolved only, omit = both. */
  resolved?: 'true' | 'false'
  since?: string
  before?: string
  limit?: number
}

export async function listIntegrationEvents(
  query: IntegrationEventsQuery = {},
): Promise<{ data: IntegrationEventRow[]; nextCursor: string | null }> {
  const res = await api.get<{ data: IntegrationEventRow[]; nextCursor: string | null }>(
    '/admin/audit/integration-events',
    { params: query },
  )
  return res.data
}

export type AutomationRunStatus = 'running' | 'success' | 'partial' | 'failed'

export interface AutomationRunRow {
  id: string
  tenantId: string
  automationId: string
  contactId: string | null
  conversationId: string | null
  triggerType: string
  triggeredBy: string | null
  status: AutomationRunStatus
  errorMessage: string | null
  durationMs: number | null
  correlationId: string | null
  startedAt: string
  completedAt: string | null
  actionsExecuted: Array<Record<string, unknown>>
}

export interface AutomationRunsQuery {
  tenantId?: string
  automationId?: string
  status?: AutomationRunStatus
  since?: string
  before?: string
  limit?: number
}

export async function listAutomationRuns(
  query: AutomationRunsQuery = {},
): Promise<{ data: AutomationRunRow[]; nextCursor: string | null }> {
  const res = await api.get<{ data: AutomationRunRow[]; nextCursor: string | null }>(
    '/admin/audit/automation-runs',
    { params: query },
  )
  return res.data
}
