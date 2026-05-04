// ─── Tenant Audit API (BUSINESS_ADMIN / ADMIN) ───────────────────────────────
// Read-only feed of mutations performed by the tenant's own team. Backed by
// `GET /audit/tenant-feed` which forces tenantId from the JWT — callers
// cannot peek at other tenants.

import { api } from './api'

export type AuditSeverity = 'info' | 'warn' | 'error'

export interface TenantAuditRow {
  id: string
  tenantId: string
  actorId: string | null
  actorName: string | null
  actorType: 'user' | 'system' | 'agent' | 'webhook' | 'job'
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  description: string
  details: Record<string, unknown>
  source: string
  severity: AuditSeverity
  createdAt: string
}

export interface TenantAuditQuery {
  /** Filter by team member who performed the action. */
  actorId?: string
  /** Verb filter — 'contact_created', 'campaign_sent', etc. */
  action?: string
  /** Coarse entity filter — 'contact', 'campaign', 'tag'. */
  entityType?: string
  severity?: AuditSeverity
  since?: string  // ISO date
  before?: string // ISO date — pagination cursor
  limit?: number
}

export interface TenantAuditResponse {
  data: TenantAuditRow[]
  nextCursor: string | null
}

export async function listTenantAuditFeed(
  query: TenantAuditQuery = {},
): Promise<TenantAuditResponse> {
  const res = await api.get<TenantAuditResponse>('/audit/tenant-feed', { params: query })
  return res.data
}
