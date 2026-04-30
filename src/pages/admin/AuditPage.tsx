// ─── /admin/audit ─────────────────────────────────────────────────────────────
// Phase D.2 — paginated audit feed for Oryon staff. Filters by tenant /
// action / actorType / severity / time window / correlationId. Click a row
// to open the cross-service drill modal.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, AlertCircle, Filter, X, Activity } from 'lucide-react'
import {
  listAuditFeed,
  type AuditActorType,
  type AuditFeedQuery,
  type AuditLogRow,
  type AuditSeverity,
} from '@/services/adminAuditApi'
import { AuditDrillModal } from '@/components/admin/AuditDrillModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

const ACTOR_TYPE_OPTIONS: AuditActorType[] = ['user', 'system', 'agent', 'webhook', 'job']
const SEVERITY_OPTIONS: AuditSeverity[] = ['info', 'warn', 'error']

const SEVERITY_STYLE: Record<AuditSeverity, string> = {
  info: 'bg-surface-700/40 text-surface-200 border-surface-600',
  warn: 'bg-status-pending-bg text-status-pending border-status-pending/40',
  error: 'bg-status-failed-bg text-status-failed border-status-failed/40',
}

const ACTOR_TYPE_STYLE: Record<AuditActorType, string> = {
  user:    'bg-brand-700/30 text-brand-200',
  agent:   'bg-emerald-700/30 text-emerald-200',
  system:  'bg-surface-600/40 text-surface-200',
  webhook: 'bg-violet-700/30 text-violet-200',
  job:     'bg-amber-700/30 text-amber-200',
}

export function AuditPage() {
  const [filters, setFilters] = useState<AuditFeedQuery>({ limit: 30 })
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drillCid, setDrillCid] = useState<string | null>(null)

  const load = useCallback(async (q: AuditFeedQuery, append = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAuditFeed(q)
      setRows(prev => append ? [...prev, ...res.data] : res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar feed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const onApplyFilters = (next: AuditFeedQuery) => {
    setFilters(next)
    void load(next, false)
  }

  const onLoadMore = () => {
    if (!nextCursor) return
    void load({ ...filters, before: nextCursor }, true)
  }

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-700/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-surface-100">Auditoria — feed cross-tenant</h1>
            <p className="text-xs text-surface-400">Atividades server-side. Use o filtro de correlation id pra drill cross-service.</p>
          </div>
        </div>
      </header>

      <FilterBar value={filters} onChange={onApplyFilters} loading={loading} />

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
          <EmptyState
            icon={Search}
            title="Nenhuma atividade encontrada"
            hint="Ajuste os filtros ou amplie a janela temporal."
          />
        )}

        {rows.length > 0 && (
          <div className="rounded-lg border border-surface-800 overflow-hidden bg-surface-900">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Quando</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium">Ação</th>
                  <th className="text-left px-4 py-2.5 font-medium">Actor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Descrição</th>
                  <th className="text-left px-4 py-2.5 font-medium">Drill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-surface-800/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-surface-300 text-xs">
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', ACTOR_TYPE_STYLE[r.actorType])}>
                        {r.actorType}
                      </span>
                      {r.severity !== 'info' && (
                        <span className={cn('ml-1 inline-block px-2 py-0.5 rounded text-xs font-medium border', SEVERITY_STYLE[r.severity])}>
                          {r.severity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-surface-200">{r.action}</td>
                    <td className="px-4 py-2.5 text-surface-300 text-xs">
                      {r.actorName ?? <span className="text-surface-500">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-surface-200 max-w-md truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="px-4 py-2.5">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-100 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {drillCid && (
        <AuditDrillModal
          correlationId={drillCid}
          tenantId={filters.tenantId}
          onClose={() => setDrillCid(null)}
        />
      )}
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  value,
  onChange,
  loading,
}: {
  value: AuditFeedQuery
  onChange: (next: AuditFeedQuery) => void
  loading: boolean
}) {
  const [draft, setDraft] = useState<AuditFeedQuery>(value)

  const set = <K extends keyof AuditFeedQuery>(k: K, v: AuditFeedQuery[K]) => {
    setDraft({ ...draft, [k]: v })
  }

  const apply = () => onChange({ ...draft, before: undefined })

  const clear = () => {
    const cleared: AuditFeedQuery = { limit: 30 }
    setDraft(cleared)
    onChange(cleared)
  }

  return (
    <div className="px-6 py-3 border-b border-surface-800 bg-surface-900/40 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <Filter className="w-4 h-4" /> Filtros
      </div>
      <FilterInput label="tenantId" value={draft.tenantId ?? ''} onChange={v => set('tenantId', v || undefined)} placeholder="UUID" />
      <FilterInput label="action" value={draft.action ?? ''} onChange={v => set('action', v || undefined)} placeholder="ex: campaign_sent" />
      <FilterSelect
        label="actorType"
        value={draft.actorType ?? ''}
        options={['', ...ACTOR_TYPE_OPTIONS]}
        onChange={v => set('actorType', (v || undefined) as AuditActorType | undefined)}
      />
      <FilterSelect
        label="severity"
        value={draft.severity ?? ''}
        options={['', ...SEVERITY_OPTIONS]}
        onChange={v => set('severity', (v || undefined) as AuditSeverity | undefined)}
      />
      <FilterInput label="correlationId" value={draft.correlationId ?? ''} onChange={v => set('correlationId', v || undefined)} placeholder="UUID" />
      <FilterInput label="since" type="datetime-local" value={toLocalInput(draft.since)} onChange={v => set('since', fromLocalInput(v))} />
      <div className="flex gap-2 ml-auto">
        {(draft.tenantId || draft.action || draft.actorType || draft.severity || draft.correlationId || draft.since) && (
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

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // datetime-local needs YYYY-MM-DDTHH:mm without timezone
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}
