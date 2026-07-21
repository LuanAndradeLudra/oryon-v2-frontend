// ─── /admin/audit ─────────────────────────────────────────────────────────────
// Phase D.2 + Gap 2 — paginated audit feed for Oryon staff with 4 tabs:
//   * Atividade   — activity_logs (mutations, jobs, audit events).
//   * Auth        — auth_audit_logs (login, logout, password change, IP/UA).
//   * Integração  — integration_events (Meta/WhatsApp errors with resolved
//                   lifecycle).
//   * Automations — automation_runs (per-run history with status + duration).
//
// Each tab has its own filter shape and table layout because the underlying
// schemas have domain-specific fields (Auth has IP/UA; Integração has a
// `resolvedAt` lifecycle; Automations has trigger/status/duration). Click a
// row in Atividade to open the cross-service drill modal.

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, Search, Filter, X, Activity, ShieldCheck, Plug, Workflow,
} from 'lucide-react'
import {
  listAuditFeed,
  listAuthEvents,
  listIntegrationEvents,
  listAutomationRuns,
  type AuditActorType,
  type AuditFeedQuery,
  type AuditLogRow,
  type AuditSeverity,
  type AuthEventRow,
  type AuthEventType,
  type AuthEventsQuery,
  type IntegrationEventRow,
  type IntegrationEventsQuery,
  type IntegrationSeverity,
  type IntegrationSource,
  type AutomationRunRow,
  type AutomationRunStatus,
  type AutomationRunsQuery,
} from '@/services/adminAuditApi'
import { AuditDrillModal } from '@/components/admin/AuditDrillModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'
import { cn } from '@/lib/utils'

// ─── Tab type & metadata ─────────────────────────────────────────────────────

type AuditTab = 'activity' | 'auth' | 'integration' | 'automation'

const TABS: Array<{ id: AuditTab; label: string; icon: typeof Activity; hint: string }> = [
  { id: 'activity',    label: 'Atividade',   icon: Activity,    hint: 'activity_logs — mutações, jobs e audits server-side' },
  { id: 'auth',        label: 'Auth',        icon: ShieldCheck, hint: 'auth_audit_logs — login, logout, troca de senha (com IP/UA)' },
  { id: 'integration', label: 'Integração',  icon: Plug,        hint: 'integration_events — erros Meta/WhatsApp com lifecycle resolvedAt' },
  { id: 'automation',  label: 'Automations', icon: Workflow,    hint: 'automation_runs — histórico por execução de automation' },
]

// ─── Page orchestrator ───────────────────────────────────────────────────────

export function AuditPage() {
  const [tab, setTab] = useState<AuditTab>('activity')
  const banner = useDesktopRecommendedBanner('admin/audit')

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <DesktopRecommendedBanner
        visible={banner.visible}
        onDismiss={banner.dismiss}
        message="Auditoria foi pensada para desktop — colunas largas, filtros laterais e drill modais. No celular você pode dar uma olhada rápida, mas para investigar use seu computador."
      />
      <div className="border-r border-surface-700">
      <PageHeader
        title="Auditoria — feeds cross-tenant"
        subtitle={TABS.find(t => t.id === tab)?.hint}
      />

      <nav className="px-6 border-b border-surface-700 bg-surface-900/40 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors',
                active
                  ? 'border-brand-500 text-brand-200 bg-brand-700/10'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:bg-surface-800/40',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </nav>
      </div>

      {tab === 'activity'    && <ActivityFeedTab />}
      {tab === 'auth'        && <AuthEventsTab />}
      {tab === 'integration' && <IntegrationEventsTab />}
      {tab === 'automation'  && <AutomationRunsTab />}
    </div>
  )
}

// ─── Tab 1 — Atividade (activity_logs) ───────────────────────────────────────

const ACTOR_TYPE_OPTIONS: AuditActorType[] = ['user', 'system', 'agent', 'webhook', 'job']
const SEVERITY_OPTIONS: AuditSeverity[] = ['info', 'warn', 'error']

// Maps now hold a chip color (token/hex) rendered as a filled .color-chip.
const SEVERITY_STYLE: Record<AuditSeverity, string> = {
  info:  'var(--color-status-muted)',
  warn:  'var(--color-status-pending)',
  error: 'var(--color-danger)',
}

// Actor types are categorical — keep their distinct hues via direct hex
// (the original Tailwind *-700 palette colors, so the chips stay recognizable).
const ACTOR_TYPE_STYLE: Record<AuditActorType, string> = {
  user:    'var(--color-brand-500)', // brand accent
  agent:   '#047857',                // emerald-700
  system:  'var(--color-status-muted)',
  webhook: '#6d28d9',                // violet-700
  job:     '#b45309',                // amber-700
}

function ActivityFeedTab() {
  // Default actorType='user' — operators almost always want to see what
  // their team / customers did, not BullMQ heartbeats. The select still
  // exposes 'job' / 'system' / 'webhook' / 'agent' explicitly when needed.
  const [filters, setFilters] = useState<AuditFeedQuery>({ limit: 30, actorType: 'user' })
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drillCid, setDrillCid] = useState<string | null>(null)

  const load = useCallback(async (q: AuditFeedQuery, append = false) => {
    setLoading(true); setError(null)
    try {
      const res = await listAuditFeed(q)
      setRows(prev => append ? [...prev, ...res.data] : res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar feed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  return (
    <>
      <FilterBar<AuditFeedQuery>
        onApply={f => { setFilters(f); void load(f, false) }}
        loading={loading}
        schema="activity"
        initial={{ actorType: 'user' }}
      >
        {(d, set) => (
          <>
            <FilterInput label="tenantId" value={d.tenantId ?? ''} onChange={v => set('tenantId', v || undefined)} placeholder="UUID" />
            <FilterInput label="action" value={d.action ?? ''} onChange={v => set('action', v || undefined)} placeholder="ex: campaign_sent" />
            <FilterSelect
              label="actorType"
              value={d.actorType ?? ''}
              options={['', ...ACTOR_TYPE_OPTIONS]}
              onChange={v => set('actorType', (v || undefined) as AuditActorType | undefined)}
            />
            <FilterSelect
              label="severity"
              value={d.severity ?? ''}
              options={['', ...SEVERITY_OPTIONS]}
              onChange={v => set('severity', (v || undefined) as AuditSeverity | undefined)}
            />
            <FilterInput label="correlationId" value={d.correlationId ?? ''} onChange={v => set('correlationId', v || undefined)} placeholder="UUID" />
            <FilterInput label="since" type="datetime-local" value={toLocalInput(d.since)} onChange={v => set('since', fromLocalInput(v))} />
          </>
        )}
      </FilterBar>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <ErrorState
            compact
            hint={error}
            onRetry={() => void load(filters, false)}
            className="mb-4"
          />
        )}
        {loading && rows.length === 0 && !error && <SkeletonTable rows={8} cols={5} />}
        {!loading && rows.length === 0 && !error && (
          <EmptyState icon={Search} title="Nenhuma atividade encontrada" hint="Ajuste os filtros ou amplie a janela temporal." />
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-surface-700 overflow-x-auto bg-surface-900">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Quando</Th><Th>Tipo</Th><Th>Ação</Th><Th>Actor</Th><Th>Descrição</Th><Th>Drill</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <Td>{new Date(r.createdAt).toLocaleString('pt-BR')}</Td>
                    <Td>
                      <span
                        className="color-chip border inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ ['--chip']: ACTOR_TYPE_STYLE[r.actorType] } as React.CSSProperties}
                      >
                        {r.actorType}
                      </span>
                      {r.severity !== 'info' && (
                        <span
                          className="color-chip border ml-1 inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{ ['--chip']: SEVERITY_STYLE[r.severity] } as React.CSSProperties}
                        >
                          {r.severity}
                        </span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{r.action}</Td>
                    <Td className="text-xs">{r.actorName ?? <span className="text-surface-500">—</span>}</Td>
                    <Td className="max-w-md truncate" title={r.description}>{r.description}</Td>
                    <Td>
                      {r.correlationId ? (
                        <button
                          onClick={() => setDrillCid(r.correlationId)}
                          className="text-brand-300 hover:text-brand-200 text-xs underline-offset-2 hover:underline"
                          title={r.correlationId}
                        >
                          {r.correlationId.slice(0, 8)}…
                        </button>
                      ) : (
                        <span className="text-surface-500 text-xs">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LoadMoreButton show={!!nextCursor} loading={loading} onClick={() => void load({ ...filters, before: nextCursor! }, true)} />
      </div>

      {drillCid && (
        <AuditDrillModal correlationId={drillCid} tenantId={filters.tenantId} onClose={() => setDrillCid(null)} />
      )}
    </>
  )
}

// ─── Tab 2 — Auth (auth_audit_logs) ──────────────────────────────────────────

const AUTH_EVENT_OPTIONS: AuthEventType[] = [
  'login_success', 'login_failed', 'token_refresh', 'password_change',
  'logout', 'account_activated', 'account_deactivated',
  'password_reset_requested', 'password_reset_completed',
]

const AUTH_EVENT_STYLE: Record<AuthEventType, string> = {
  login_success:            'var(--color-status-active)',
  login_failed:             'var(--color-danger)',
  token_refresh:            'var(--color-status-muted)',
  password_change:          'var(--color-status-pending)',
  logout:                   'var(--color-brand-500)',
  account_activated:        'var(--color-status-active)',
  account_deactivated:      'var(--color-danger)',
  password_reset_requested: 'var(--color-status-pending)',
  password_reset_completed: 'var(--color-status-active)',
}

function AuthEventsTab() {
  const [filters, setFilters] = useState<AuthEventsQuery>({ limit: 30 })
  const [rows, setRows] = useState<AuthEventRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: AuthEventsQuery, append = false) => {
    setLoading(true); setError(null)
    try {
      const res = await listAuthEvents(q)
      setRows(prev => append ? [...prev, ...res.data] : res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar feed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  return (
    <>
      <FilterBar<AuthEventsQuery> onApply={f => { setFilters(f); void load(f, false) }} loading={loading} schema="auth">
        {(d, set) => (
          <>
            <FilterInput label="tenantId" value={d.tenantId ?? ''} onChange={v => set('tenantId', v || undefined)} placeholder="UUID" />
            <FilterInput label="userId" value={d.userId ?? ''} onChange={v => set('userId', v || undefined)} placeholder="UUID" />
            <FilterSelect
              label="event"
              value={d.event ?? ''}
              options={['', ...AUTH_EVENT_OPTIONS]}
              onChange={v => set('event', (v || undefined) as AuthEventType | undefined)}
            />
            <FilterInput label="since" type="datetime-local" value={toLocalInput(d.since)} onChange={v => set('since', fromLocalInput(v))} />
          </>
        )}
      </FilterBar>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <ErrorState
            compact
            hint={error}
            onRetry={() => void load(filters, false)}
            className="mb-4"
          />
        )}
        {loading && rows.length === 0 && !error && <SkeletonTable rows={8} cols={5} />}
        {!loading && rows.length === 0 && !error && (
          <EmptyState icon={Search} title="Nenhum evento de auth" hint="Ajuste os filtros — login/logout/password change vão aparecer aqui." />
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-surface-700 overflow-x-auto bg-surface-900">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Quando</Th><Th>Evento</Th><Th>userId</Th><Th>IP</Th><Th>User-Agent</Th><Th>Tenant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <Td>{new Date(r.createdAt).toLocaleString('pt-BR')}</Td>
                    <Td>
                      <span
                        className="color-chip border inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ ['--chip']: AUTH_EVENT_STYLE[r.event] ?? 'var(--color-status-muted)' } as React.CSSProperties}
                      >
                        {r.event}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{r.userId ? r.userId.slice(0, 8) + '…' : <span className="text-surface-500">—</span>}</Td>
                    <Td className="font-mono text-xs">{r.ip ?? <span className="text-surface-500">—</span>}</Td>
                    <Td className="max-w-md truncate text-xs" title={r.userAgent ?? undefined}>{r.userAgent ?? <span className="text-surface-500">—</span>}</Td>
                    <Td className="font-mono text-xs">{r.tenantId.slice(0, 8)}…</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LoadMoreButton show={!!nextCursor} loading={loading} onClick={() => void load({ ...filters, before: nextCursor! }, true)} />
      </div>
    </>
  )
}

// ─── Tab 3 — Integração (integration_events) ─────────────────────────────────

const INTEGRATION_SOURCES: IntegrationSource[] = ['meta', 'whatsapp', 'system']
const INTEGRATION_SEVERITIES: IntegrationSeverity[] = ['info', 'warning', 'error']

const INTEGRATION_SEVERITY_STYLE: Record<IntegrationSeverity, string> = {
  info:    'var(--color-status-muted)',
  warning: 'var(--color-status-pending)',
  error:   'var(--color-danger)',
}

function IntegrationEventsTab() {
  const [filters, setFilters] = useState<IntegrationEventsQuery>({ limit: 30 })
  const [rows, setRows] = useState<IntegrationEventRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: IntegrationEventsQuery, append = false) => {
    setLoading(true); setError(null)
    try {
      const res = await listIntegrationEvents(q)
      setRows(prev => append ? [...prev, ...res.data] : res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar feed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  return (
    <>
      <FilterBar<IntegrationEventsQuery> onApply={f => { setFilters(f); void load(f, false) }} loading={loading} schema="integration">
        {(d, set) => (
          <>
            <FilterInput label="tenantId" value={d.tenantId ?? ''} onChange={v => set('tenantId', v || undefined)} placeholder="UUID" />
            <FilterSelect
              label="source"
              value={d.source ?? ''}
              options={['', ...INTEGRATION_SOURCES]}
              onChange={v => set('source', (v || undefined) as IntegrationSource | undefined)}
            />
            <FilterSelect
              label="severity"
              value={d.severity ?? ''}
              options={['', ...INTEGRATION_SEVERITIES]}
              onChange={v => set('severity', (v || undefined) as IntegrationSeverity | undefined)}
            />
            <FilterInput label="code" value={d.code ?? ''} onChange={v => set('code', v || undefined)} placeholder="ex: token_expired" />
            <FilterSelect
              label="resolved"
              value={d.resolved ?? ''}
              options={['', 'true', 'false']}
              onChange={v => set('resolved', (v || undefined) as 'true' | 'false' | undefined)}
            />
            <FilterInput label="since" type="datetime-local" value={toLocalInput(d.since)} onChange={v => set('since', fromLocalInput(v))} />
          </>
        )}
      </FilterBar>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <ErrorState
            compact
            hint={error}
            onRetry={() => void load(filters, false)}
            className="mb-4"
          />
        )}
        {loading && rows.length === 0 && !error && <SkeletonTable rows={8} cols={5} />}
        {!loading && rows.length === 0 && !error && (
          <EmptyState icon={Search} title="Nenhum evento de integração" hint="Erros Meta/WhatsApp aparecem aqui (token expirado, template rejeitado, etc.)." />
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-surface-700 overflow-x-auto bg-surface-900">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Quando</Th><Th>Severidade</Th><Th>Origem</Th><Th>Código</Th><Th>Mensagem</Th><Th>Resolvido</Th><Th>Tenant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <Td>{new Date(r.createdAt).toLocaleString('pt-BR')}</Td>
                    <Td>
                      <span
                        className="color-chip border inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ ['--chip']: INTEGRATION_SEVERITY_STYLE[r.severity] } as React.CSSProperties}
                      >
                        {r.severity}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{r.source}</Td>
                    <Td className="font-mono text-xs">{r.code}</Td>
                    <Td className="max-w-md truncate" title={r.message}>{r.message}</Td>
                    <Td className="text-xs">
                      {r.resolvedAt ? (
                        <span className="text-success" title={new Date(r.resolvedAt).toLocaleString('pt-BR')}>
                          ✓ {new Date(r.resolvedAt).toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-status-failed">aberto</span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{r.tenantId.slice(0, 8)}…</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LoadMoreButton show={!!nextCursor} loading={loading} onClick={() => void load({ ...filters, before: nextCursor! }, true)} />
      </div>
    </>
  )
}

// ─── Tab 4 — Automations (automation_runs) ───────────────────────────────────

const AUTOMATION_STATUSES: AutomationRunStatus[] = ['running', 'success', 'partial', 'failed']

const AUTOMATION_STATUS_STYLE: Record<AutomationRunStatus, string> = {
  running: 'var(--color-status-pending)',
  success: 'var(--color-status-active)',
  partial: 'var(--color-status-pending)',
  failed:  'var(--color-danger)',
}

function AutomationRunsTab() {
  const [filters, setFilters] = useState<AutomationRunsQuery>({ limit: 30 })
  const [rows, setRows] = useState<AutomationRunRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: AutomationRunsQuery, append = false) => {
    setLoading(true); setError(null)
    try {
      const res = await listAutomationRuns(q)
      setRows(prev => append ? [...prev, ...res.data] : res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar feed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  return (
    <>
      <FilterBar<AutomationRunsQuery> onApply={f => { setFilters(f); void load(f, false) }} loading={loading} schema="automation">
        {(d, set) => (
          <>
            <FilterInput label="tenantId" value={d.tenantId ?? ''} onChange={v => set('tenantId', v || undefined)} placeholder="UUID" />
            <FilterInput label="automationId" value={d.automationId ?? ''} onChange={v => set('automationId', v || undefined)} placeholder="UUID" />
            <FilterSelect
              label="status"
              value={d.status ?? ''}
              options={['', ...AUTOMATION_STATUSES]}
              onChange={v => set('status', (v || undefined) as AutomationRunStatus | undefined)}
            />
            <FilterInput label="since" type="datetime-local" value={toLocalInput(d.since)} onChange={v => set('since', fromLocalInput(v))} />
          </>
        )}
      </FilterBar>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <ErrorState
            compact
            hint={error}
            onRetry={() => void load(filters, false)}
            className="mb-4"
          />
        )}
        {loading && rows.length === 0 && !error && <SkeletonTable rows={8} cols={5} />}
        {!loading && rows.length === 0 && !error && (
          <EmptyState icon={Search} title="Nenhuma execução de automation" hint="Cada vez que uma automation roda, gera uma linha aqui." />
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-surface-700 overflow-x-auto bg-surface-900">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Quando</Th><Th>Status</Th><Th>Trigger</Th><Th>automationId</Th><Th>Duração</Th><Th>Erro</Th><Th>Tenant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <Td>{new Date(r.startedAt).toLocaleString('pt-BR')}</Td>
                    <Td>
                      <span
                        className="color-chip border inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ ['--chip']: AUTOMATION_STATUS_STYLE[r.status] } as React.CSSProperties}
                      >
                        {r.status}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{r.triggerType}</Td>
                    <Td className="font-mono text-xs" title={r.automationId}>{r.automationId.slice(0, 8)}…</Td>
                    <Td className="text-xs">{r.durationMs != null ? `${r.durationMs.toLocaleString('pt-BR')}ms` : <span className="text-surface-500">—</span>}</Td>
                    <Td className="max-w-md truncate text-xs text-status-failed" title={r.errorMessage ?? undefined}>
                      {r.errorMessage ?? <span className="text-surface-500">—</span>}
                    </Td>
                    <Td className="font-mono text-xs">{r.tenantId.slice(0, 8)}…</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LoadMoreButton show={!!nextCursor} loading={loading} onClick={() => void load({ ...filters, before: nextCursor! }, true)} />
      </div>
    </>
  )
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

interface FilterBarProps<T extends { tenantId?: string }> {
  onApply: (filters: T) => void
  loading: boolean
  schema: string  // identifier so React resets local draft state on tab switch
  /** Seed values applied on mount (and on schema change). Lets a tab pre-fill
   *  defaults like `actorType=user` so the UI matches the loaded data. */
  initial?: Partial<T>
  children: (
    draft: T,
    set: <K extends keyof T>(key: K, value: T[K]) => void,
  ) => React.ReactNode
}

function FilterBar<T extends { tenantId?: string; limit?: number }>({
  onApply, loading, schema, initial, children,
}: FilterBarProps<T>) {
  const seed = (): T => ({ limit: 30, ...(initial ?? {}) } as T)
  const [draft, setDraft] = useState<T>(seed)
  // Reset draft when the tab schema changes (key trick — see usage)
  useEffect(() => { setDraft(seed()) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [schema])

  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft(prev => ({ ...prev, [k]: v }))
  const apply = () => onApply({ ...draft, before: undefined } as T)
  const clear = () => {
    const cleared = seed()
    setDraft(cleared)
    onApply(cleared)
  }

  const hasFilters = Object.entries(draft).some(([k, v]) => k !== 'limit' && v !== undefined && v !== '')

  return (
    <div className="px-6 py-3 border-b border-r border-surface-700 bg-surface-900/40 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <Filter className="w-4 h-4" /> Filtros
      </div>
      {children(draft, set)}
      <div className="flex gap-2 ml-auto">
        {hasFilters && (
          <button onClick={clear} className="px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <button
          onClick={apply}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

function FilterInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 w-44"
      />
    </label>
  )
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 min-w-[110px]"
      >
        {options.map(o => (
          <option key={o || 'all'} value={o}>{o || 'todos'}</option>
        ))}
      </select>
    </label>
  )
}

function LoadMoreButton({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-100 text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
        Carregar mais
      </button>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2.5 font-medium">{children}</th>
}

function Td({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={cn('px-4 py-2.5 whitespace-nowrap text-surface-300 text-xs', className)} title={title}>
      {children}
    </td>
  )
}

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}
