// ─── AuditDrillModal ──────────────────────────────────────────────────────────
// Phase D.2 — full timeline for a single correlationId. Combines:
//   * activity_logs from the backend (D.2 backend half)
//   * agent_chat_executions / agent_tool_executions / rag_queries /
//     anti_loop_events from the agent-server (D.2 agent-server half).
// Both calls fired in parallel; rows merged + sorted ASC by `at`.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X, AlertCircle } from 'lucide-react'
import {
  drillAiByCorrelationId,
  drillBackendByCorrelationId,
  type AuditLogRow,
  type DrillEvent,
} from '@/services/adminAuditApi'

type UnifiedEntry =
  | { kind: 'activity'; at: string; row: AuditLogRow }
  | { kind: 'ai'; at: string; ev: DrillEvent }

const AI_TYPE_LABEL: Record<DrillEvent['type'], string> = {
  chat_execution: 'Chat /chat',
  tool_execution: 'Tool/Skill',
  rag_query: 'RAG query',
  anti_loop: 'Anti-loop',
}

// Cor categórica (não status) — mesmo critério do AgentDetail.tsx pros métodos HTTP.
const AI_TYPE_CHIP: Record<DrillEvent['type'], string> = {
  chat_execution: 'var(--color-accent-green)',
  tool_execution: 'var(--color-accent-amber)',
  rag_query:      'var(--color-accent-cyan)',
  anti_loop:      'var(--color-danger)',
}

export function AuditDrillModal({
  correlationId,
  tenantId,
  onClose,
}: {
  correlationId: string
  tenantId?: string
  onClose: () => void
}) {
  const [activities, setActivities] = useState<AuditLogRow[]>([])
  const [aiEvents, setAiEvents] = useState<DrillEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [actRes, aiRes] = await Promise.all([
          drillBackendByCorrelationId(correlationId, tenantId).catch((err: unknown) => {
            // Backend drill failure shouldn't block the AI drill.
            console.warn('[drill] backend failed', err)
            return { data: [] as AuditLogRow[] }
          }),
          drillAiByCorrelationId(correlationId, tenantId).catch((err: unknown) => {
            console.warn('[drill] ai-observability failed', err)
            return { correlation_id: correlationId, events: [] as DrillEvent[] }
          }),
        ])
        if (cancelled) return
        setActivities(actRes.data)
        setAiEvents(aiRes.events)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar timeline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [correlationId, tenantId])

  const unified: UnifiedEntry[] = useMemo(() => {
    const a: UnifiedEntry[] = activities.map(row => ({ kind: 'activity', at: row.createdAt, row }))
    const b: UnifiedEntry[] = aiEvents.map(ev => ({ kind: 'ai', at: ev.at, ev }))
    return [...a, ...b].sort((x, y) => x.at.localeCompare(y.at))
  }, [activities, aiEvents])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface-900 overlay-frame border rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
          <div>
            <h2 className="text-base font-semibold text-surface-100">Timeline cross-service</h2>
            <p className="text-xs text-surface-400 font-mono mt-1">correlation_id: {correlationId}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-800 text-surface-300">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-10 text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Buscando eventos…
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loading && !error && unified.length === 0 && (
            <p className="text-center text-surface-400 py-10 text-sm">
              Nenhum evento encontrado pra esse correlation_id.
            </p>
          )}

          {!loading && unified.length > 0 && (
            <ol className="space-y-2">
              {unified.map((entry, i) => (
                <li key={i} className="rounded border border-surface-800 bg-surface-950/60 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-surface-400 font-mono">{new Date(entry.at).toLocaleTimeString('pt-BR', { hour12: false })}</span>
                    {entry.kind === 'activity' ? (
                      <span
                        className="px-2 py-0.5 rounded font-medium color-chip"
                        style={{ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties}
                      >
                        backend · {entry.row.actorType}
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded font-medium color-chip"
                        style={{ ['--chip']: AI_TYPE_CHIP[entry.ev.type] } as React.CSSProperties}
                      >
                        {AI_TYPE_LABEL[entry.ev.type]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-sm text-surface-100">
                    {entry.kind === 'activity' ? (
                      <span>
                        <span className="font-mono text-xs text-surface-300">{entry.row.action}</span>
                        {' — '}
                        {entry.row.description}
                      </span>
                    ) : (
                      <AiEventSummary ev={entry.ev} />
                    )}
                  </div>
                  <details className="mt-2 text-xs text-surface-400">
                    <summary className="cursor-pointer hover:text-surface-300">payload</summary>
                    <pre className="mt-1 p-2 rounded bg-surface-950 text-surface-300 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.kind === 'activity' ? entry.row : entry.ev, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function AiEventSummary({ ev }: { ev: DrillEvent }) {
  const p = ev.payload
  switch (ev.type) {
    case 'chat_execution':
      return (
        <span>
          {pretty(p.final_status)} · {fmtNum(p.total_turns)} turns · {fmtNum(p.tools_called_count)} tools ·{' '}
          {fmtNum((p.tokens as Record<string, unknown> | null | undefined)?.input)} in /{' '}
          {fmtNum((p.tokens as Record<string, unknown> | null | undefined)?.output)} out · ${pretty(p.cost_usd)}
        </span>
      )
    case 'tool_execution':
      return (
        <span>
          {pretty(p.kind)} · <span className="font-mono">{pretty(p.tool_name)}</span> ·{' '}
          {p.success ? 'ok' : 'fail'} {p.status_code ? `(${pretty(p.status_code)})` : ''} · {fmtNum(p.duration_ms)}ms
        </span>
      )
    case 'rag_query':
      return (
        <span>
          top_k={fmtNum(p.top_k)} · reranker={p.reranker_used ? 'on' : 'off'} · {fmtNum(p.total_duration_ms)}ms
        </span>
      )
    case 'anti_loop':
      return (
        <span>
          tool=<span className="font-mono">{pretty(p.tool_name)}</span> · {fmtNum(p.consecutive_count)}× iter={fmtNum(p.iteration)}
        </span>
      )
  }
}

function pretty(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR') : String(v)
}
