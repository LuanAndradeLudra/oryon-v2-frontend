// ─── ChatExecutionDrillModal ──────────────────────────────────────────────────
// Detailed view of a single POST /chat execution. Combines the execution row
// with every tool call, RAG query, anti-loop event, and the input/output
// messages exchanged in that run (when the run carried a session_id).
//
// This is the "veja tudo que aconteceu" view operators asked for after the
// /admin/audit table felt too thin.

import { useEffect, useState } from 'react'
import { Loader2, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import {
  fetchChatExecutionDetail,
  type ChatExecutionDetail,
  type ChatExecutionMessageRow,
  type ChatExecutionToolRow,
  type ChatExecutionRagRow,
  type ChatExecutionAntiLoopRow,
} from '@/services/adminAiObservabilityApi'

const STATUS_STYLE: Record<string, string> = {
  answered:     'bg-emerald-700/30 text-emerald-200',
  aborted_loop: 'bg-status-failed-bg text-status-failed',
  error:        'bg-status-failed-bg text-status-failed',
  max_turns:    'bg-amber-700/30 text-amber-200',
}

export function ChatExecutionDrillModal({
  requestId,
  tenantId,
  onClose,
}: {
  requestId: string
  tenantId?: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<ChatExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchChatExecutionDetail(requestId, { tenantId })
        if (!cancelled) setDetail(res)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar execução')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [requestId, tenantId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-5 py-4 border-b border-surface-800">
          <div>
            <h2 className="text-base font-semibold text-surface-100">Execução do Agente</h2>
            <p className="text-xs text-surface-400 font-mono mt-1">request_id: {requestId}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-800 text-surface-300">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-10 text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Buscando execução…
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {detail && !loading && (
            <>
              <ExecutionHeader detail={detail} />
              <MessagesSection messages={detail.messages} />
              <ToolsSection tools={detail.tools} />
              <RagSection rags={detail.rag_queries} />
              <AntiLoopSection events={detail.anti_loop_events} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ExecutionHeader({ detail }: { detail: ChatExecutionDetail }) {
  const e = detail.execution
  const statusClass = STATUS_STYLE[e.final_status] ?? 'bg-surface-700 text-surface-200'
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
          {e.final_status}
        </span>
        {e.model && (
          <span className="px-2 py-0.5 rounded text-xs bg-surface-800 text-surface-300 font-mono">
            {e.model}
          </span>
        )}
        <span className="text-xs text-surface-400">
          {new Date(e.created_at).toLocaleString('pt-BR')}
        </span>
        <span className="text-xs text-surface-500">·</span>
        <span className="text-xs text-surface-400">{e.duration_ms.toLocaleString('pt-BR')}ms</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Turns" value={e.total_turns.toString()} />
        <KpiCard label="Tools chamados" value={e.tools_called_count.toString()} />
        <KpiCard
          label="Tokens (in/out)"
          value={`${fmtCompact(e.tokens_input)} / ${fmtCompact(e.tokens_output)}`}
          hint={
            e.tokens_cache_read || e.tokens_cache_creation
              ? `cache: ${fmtCompact(e.tokens_cache_read)} read · ${fmtCompact(e.tokens_cache_creation)} create`
              : undefined
          }
        />
        <KpiCard label="Custo" value={`$${Number(e.cost_usd).toFixed(6)}`} />
      </div>

      <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs">
        <DefRow k="agent_id"        v={e.agent_id} mono />
        <DefRow k="tenant_id"       v={e.tenant_id} mono />
        <DefRow k="conversation_id" v={e.conversation_id} mono />
        <DefRow k="session_id"      v={e.session_id} mono />
        <DefRow k="correlation_id"  v={e.correlation_id} mono />
        <DefRow k="request_id"      v={e.request_id} mono />
        {e.error_code && <DefRow k="error_code"    v={e.error_code} />}
        {e.error_message && <DefRow k="error_message" v={e.error_message} />}
      </dl>
    </section>
  )
}

function MessagesSection({ messages }: { messages: ChatExecutionMessageRow[] }) {
  if (messages.length === 0) {
    return (
      <SectionCard title="Mensagens" subtitle="input e output do agente" count={0}>
        <p className="text-xs text-surface-500">
          Sem mensagens persistidas. Mensagens aparecem apenas quando a execução
          carrega <code className="font-mono">session_id</code> (testes do builder); chamadas
          com <code className="font-mono">conversation_id</code> ficam em <code className="font-mono">messages</code> no
          banco principal.
        </p>
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Mensagens" subtitle="input e output do agente" count={messages.length}>
      <ol className="space-y-2">
        {messages.map(m => (
          <li
            key={m.id}
            className={`rounded border p-2.5 ${
              m.role === 'user'
                ? 'border-brand-700/40 bg-brand-900/20'
                : 'border-emerald-700/40 bg-emerald-900/15'
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  m.role === 'user' ? 'bg-brand-700/40 text-brand-100' : 'bg-emerald-700/40 text-emerald-100'
                }`}
              >
                {m.role}
              </span>
              <span className="text-surface-400 font-mono">
                {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour12: false })}
              </span>
              {m.latency_ms != null && (
                <span className="text-surface-500">· {m.latency_ms}ms</span>
              )}
            </div>
            <pre className="text-sm text-surface-100 whitespace-pre-wrap break-words font-sans">
              {m.content}
            </pre>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

function ToolsSection({ tools }: { tools: ChatExecutionToolRow[] }) {
  if (tools.length === 0) {
    return (
      <SectionCard title="Tools chamados" count={0}>
        <p className="text-xs text-surface-500">Nenhum tool foi invocado nessa execução.</p>
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Tools chamados" count={tools.length}>
      <table className="w-full text-xs">
        <thead className="text-surface-500">
          <tr>
            <th className="text-left py-1">hora</th>
            <th className="text-left py-1">tool</th>
            <th className="text-left py-1">tipo</th>
            <th className="text-right py-1">status</th>
            <th className="text-right py-1">ms</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-800">
          {tools.map(t => (
            <tr key={t.id}>
              <td className="py-1.5 text-surface-400 font-mono">
                {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour12: false })}
              </td>
              <td className="py-1.5 text-surface-100 font-mono">
                {t.tool_name}
                {t.template_slug && (
                  <span className="text-surface-500"> · {t.template_slug}</span>
                )}
              </td>
              <td className="py-1.5 text-surface-300">{t.kind}</td>
              <td className="py-1.5 text-right">
                {t.success ? (
                  <span className="text-emerald-200">ok{t.status_code ? ` (${t.status_code})` : ''}</span>
                ) : (
                  <span className="text-status-failed">
                    fail{t.status_code ? ` (${t.status_code})` : ''}
                    {t.error_message && <span className="block text-[11px] truncate max-w-[280px]">{t.error_message}</span>}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right text-surface-300">
                {t.duration_ms != null ? t.duration_ms.toLocaleString('pt-BR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}

function RagSection({ rags }: { rags: ChatExecutionRagRow[] }) {
  if (rags.length === 0) {
    return (
      <SectionCard title="RAG queries" count={0}>
        <p className="text-xs text-surface-500">Nenhuma consulta RAG nessa execução.</p>
      </SectionCard>
    )
  }
  return (
    <SectionCard title="RAG queries" count={rags.length}>
      <ol className="space-y-2">
        {rags.map(r => {
          const chunks = Array.isArray(r.chunks_returned) ? r.chunks_returned : []
          return (
            <li key={r.id} className="rounded border border-surface-800 bg-surface-950/50 p-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                <span className="text-surface-400 font-mono">
                  {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour12: false })}
                </span>
                <span className="text-surface-300">top_k={r.top_k}</span>
                <span className="text-surface-500">·</span>
                <span className="text-surface-300">threshold={r.threshold}</span>
                <span className="text-surface-500">·</span>
                <span className="text-surface-300">
                  reranker={r.reranker_used ? `on (${r.reranker_duration_ms ?? '—'}ms)` : 'off'}
                </span>
                <span className="text-surface-500">·</span>
                <span className="text-surface-300">{r.total_duration_ms}ms</span>
                <span className="text-surface-500">·</span>
                <span className="text-surface-300">{chunks.length} chunks</span>
              </div>
              <p className="text-sm text-surface-100 break-words">{r.query_redacted}</p>
              {chunks.length > 0 && (
                <details className="mt-2 text-xs text-surface-400">
                  <summary className="cursor-pointer hover:text-surface-300">
                    chunks retornados ({chunks.length})
                  </summary>
                  <pre className="mt-1 p-2 rounded bg-surface-950 text-surface-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(chunks, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          )
        })}
      </ol>
    </SectionCard>
  )
}

function AntiLoopSection({ events }: { events: ChatExecutionAntiLoopRow[] }) {
  if (events.length === 0) return null
  return (
    <SectionCard title="Anti-loop" count={events.length} variant="warning">
      <ul className="space-y-1 text-sm">
        {events.map(ev => (
          <li key={ev.id} className="flex items-center gap-2 text-status-failed">
            <span className="font-mono text-xs">
              {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour12: false })}
            </span>
            <span>tool=<span className="font-mono">{ev.tool_name}</span></span>
            <span>· {ev.consecutive_count}× consecutivos</span>
            <span>· iter={ev.iteration}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, count, children, variant,
}: {
  title: string
  subtitle?: string
  count: number
  children: React.ReactNode
  variant?: 'warning'
}) {
  const [open, setOpen] = useState(true)
  const borderClass = variant === 'warning' ? 'border-status-failed/40' : 'border-surface-800'
  return (
    <section className={`rounded-lg border ${borderClass} bg-surface-900/40`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-surface-800/40 rounded-t-lg"
      >
        {open ? <ChevronDown className="w-4 h-4 text-surface-400" /> : <ChevronRight className="w-4 h-4 text-surface-400" />}
        <h3 className="text-sm font-semibold text-surface-100 flex-1">
          {title}
          <span className="ml-2 text-xs font-normal text-surface-500">({count})</span>
          {subtitle && <span className="ml-2 text-xs font-normal text-surface-400">— {subtitle}</span>}
        </h3>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-surface-800 bg-surface-900 p-3">
      <p className="text-[11px] uppercase tracking-wider text-surface-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-surface-100">{value}</p>
      {hint && <p className="text-[11px] text-surface-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function DefRow({ k, v, mono }: { k: string; v: string | null; mono?: boolean }) {
  if (!v) return null
  return (
    <div className="flex justify-between gap-2 py-0.5 border-b border-surface-800/40 last:border-0">
      <dt className="text-surface-500">{k}</dt>
      <dd className={`text-surface-200 ${mono ? 'font-mono text-[11px]' : ''} truncate`} title={v}>
        {v}
      </dd>
    </div>
  )
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}
