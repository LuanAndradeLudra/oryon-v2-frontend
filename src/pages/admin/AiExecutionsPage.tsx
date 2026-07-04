// ─── /admin/ai-executions ─────────────────────────────────────────────────────
// Detailed list of every POST /chat the agent-server processed. Click a row to
// open the drill modal with input/output messages, tools, RAG, anti-loop.
//
// This is the "logs detalhados" view operators wanted after /admin/audit felt
// too thin — that page sticks to activity_logs (BullMQ jobs, audit events),
// while this one zooms into the AI agent runtime itself.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, AlertCircle, Bot, Search, RotateCcw } from 'lucide-react'
import {
  fetchChatExecutions,
  type ChatExecutionRow,
} from '@/services/adminAiObservabilityApi'
import { ChatExecutionDrillModal } from '@/components/admin/ChatExecutionDrillModal'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 50

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',             label: 'Todos os status' },
  { value: 'answered',     label: 'answered' },
  { value: 'aborted_loop', label: 'aborted_loop' },
  { value: 'error',        label: 'error' },
  { value: 'max_turns',    label: 'max_turns' },
]

// Holds a chip color (token) rendered as a filled .color-chip.
const STATUS_STYLE: Record<string, string> = {
  answered:     'var(--color-status-active)',
  aborted_loop: 'var(--color-danger)',
  error:        'var(--color-danger)',
  max_turns:    'var(--color-status-pending)',
}

export function AiExecutionsPage() {
  const [tenantId, setTenantId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [finalStatus, setFinalStatus] = useState('')
  const [since, setSince] = useState(defaultSince())
  const [until, setUntil] = useState('')

  const [rows, setRows] = useState<ChatExecutionRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<ChatExecutionRow | null>(null)

  const baseQuery = useMemo(
    () => ({
      tenantId: tenantId || undefined,
      agentId: agentId || undefined,
      finalStatus: finalStatus || undefined,
      since: since || undefined,
      until: until || undefined,
      limit: PAGE_SIZE,
    }),
    [tenantId, agentId, finalStatus, since, until],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchChatExecutions(baseQuery)
      setRows(res.data)
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar execuções')
      setRows([])
      setNextCursor(null)
    } finally {
      setLoading(false)
    }
  }, [baseQuery])

  const loadMore = useCallback(async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await fetchChatExecutions({ ...baseQuery, before: nextCursor })
      setRows(prev => [...prev, ...res.data])
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar mais execuções')
    } finally {
      setLoadingMore(false)
    }
  }, [baseQuery, nextCursor])

  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const totals = useMemo(() => {
    const t = { exec: 0, cost: 0, input: 0, output: 0, errors: 0 }
    for (const r of rows) {
      t.exec += 1
      t.cost += Number(r.cost_usd) || 0
      t.input += r.tokens_input
      t.output += r.tokens_output
      if (r.final_status !== 'answered') t.errors += 1
    }
    return t
  }, [rows])

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="border-r border-surface-700">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-700/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-surface-100">Execuções de Agentes</h1>
            <p className="text-xs text-surface-400">
              Cada linha é uma chamada <code className="font-mono text-surface-300">POST /chat</code> — clique para ver input, output, tools e RAG.
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-3 border-b border-r border-surface-700 bg-surface-900/40 flex flex-wrap items-end gap-3">
        <Field label="tenantId" value={tenantId} onChange={setTenantId} placeholder="opcional — UUID" wide />
        <Field label="agentId" value={agentId} onChange={setAgentId} placeholder="opcional — UUID" wide />
        <SelectField
          label="status"
          value={finalStatus}
          onChange={setFinalStatus}
          options={STATUS_OPTIONS}
        />
        <Field label="since (date)" value={since} onChange={setSince} placeholder="YYYY-MM-DD" />
        <Field label="until (date)" value={until} onChange={setUntil} placeholder="YYYY-MM-DD" />
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 border-b border-r border-surface-700">
          <KpiCard label="Execuções" value={totals.exec.toLocaleString('pt-BR')} />
          <KpiCard label="Custo total" value={`$${totals.cost.toFixed(4)}`} />
          <KpiCard label="Input tokens" value={fmtCompact(totals.input)} />
          <KpiCard label="Output tokens" value={fmtCompact(totals.output)} />
          <KpiCard
            label="Não-OK"
            value={totals.errors.toLocaleString('pt-BR')}
            hint={totals.exec > 0 ? `${((totals.errors / totals.exec) * 100).toFixed(1)}% das execuções` : undefined}
          />
        </div>

        <section className="px-6 py-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && rows.length === 0 && (
            <div className="flex items-center justify-center py-12 text-surface-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> carregando…
            </div>
          )}

          {!loading && rows.length === 0 && !error && (
            <EmptyState
              icon={Search}
              title="Nenhuma execução encontrada"
              hint="Mude os filtros ou expanda a janela. Execuções só são gravadas com FF_AGENT_CHAT_LOG=true."
            />
          )}

          {rows.length > 0 && (
            <div className="rounded-xl border border-surface-700 bg-surface-900 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-900 text-surface-500 text-left border-b border-surface-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Quando</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Agente</th>
                    <th className="px-3 py-2 font-medium">Tenant</th>
                    <th className="px-3 py-2 font-medium text-right">Turns</th>
                    <th className="px-3 py-2 font-medium text-right">Tools</th>
                    <th className="px-3 py-2 font-medium text-right">Tokens (in/out)</th>
                    <th className="px-3 py-2 font-medium text-right">Custo</th>
                    <th className="px-3 py-2 font-medium text-right">Latência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {rows.map(r => {
                    const statusChip = STATUS_STYLE[r.final_status] ?? 'var(--color-status-muted)'
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="cursor-pointer hover:bg-surface-800/40"
                      >
                        <td className="px-3 py-2 text-surface-300 font-mono">
                          {new Date(r.created_at).toLocaleString('pt-BR', { hour12: false })}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="color-chip border px-1.5 py-0.5 rounded text-[11px] font-medium"
                            style={{ ['--chip']: statusChip } as React.CSSProperties}
                          >
                            {r.final_status}
                          </span>
                          {r.error_code && (
                            <div className="text-[11px] text-status-failed mt-0.5 font-mono">{r.error_code}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-surface-300 font-mono">
                          {r.agent_id ? `${r.agent_id.slice(0, 8)}…` : '—'}
                        </td>
                        <td className="px-3 py-2 text-surface-300 font-mono">
                          {r.tenant_id.slice(0, 8)}…
                        </td>
                        <td className="px-3 py-2 text-right text-surface-200">{r.total_turns}</td>
                        <td className="px-3 py-2 text-right text-surface-200">{r.tools_called_count}</td>
                        <td className="px-3 py-2 text-right text-surface-300">
                          {fmtCompact(r.tokens_input)} / {fmtCompact(r.tokens_output)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-200">
                          ${Number(r.cost_usd).toFixed(6)}
                        </td>
                        <td className="px-3 py-2 text-right text-surface-300">
                          {r.duration_ms.toLocaleString('pt-BR')}ms
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {nextCursor && (
                <div className="border-t border-surface-800 px-3 py-2 flex justify-center">
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Carregar mais
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <ChatExecutionDrillModal
          requestId={selected.request_id}
          tenantId={selected.tenant_id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ─── Internals ────────────────────────────────────────────────────────────────

function defaultSince(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function Field({
  label, value, onChange, placeholder, wide,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  wide?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={
          'px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 ' +
          (wide ? 'w-72' : 'w-36')
        }
      />
    </label>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 w-44"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900 p-3">
      <p className="text-[11px] uppercase tracking-wider text-surface-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-surface-100">{value}</p>
      {hint && <p className="text-[11px] text-surface-500 mt-0.5">{hint}</p>}
    </div>
  )
}
