// ─── /admin/ai-observability ──────────────────────────────────────────────────
// Phase D.3 — Oryon staff view of AI cost & per-agent rollups. Backed by
// mv_ai_cost_per_tenant_day (cross-tenant) + agent-server agent summaries.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, AlertCircle, BarChart3, Search } from 'lucide-react'
import {
  fetchAgentSummary,
  fetchCostRollup,
  type AgentSummary,
  type CostRollupRow,
} from '@/services/adminAiObservabilityApi'
import { EmptyState } from '@/components/ui/EmptyState'

export function AiObservabilityPage() {
  const [tenantId, setTenantId] = useState('')
  const [since, setSince] = useState(defaultSince())
  const [until, setUntil] = useState('')
  const [agentId, setAgentId] = useState('')

  const [rollup, setRollup] = useState<CostRollupRow[]>([])
  const [rollupLoading, setRollupLoading] = useState(false)
  const [rollupError, setRollupError] = useState<string | null>(null)

  const [agentSummary, setAgentSummary] = useState<AgentSummary | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  const loadRollup = useCallback(async () => {
    setRollupLoading(true)
    setRollupError(null)
    try {
      const res = await fetchCostRollup({
        tenantId: tenantId || undefined,
        since: since || undefined,
        until: until || undefined,
      })
      setRollup(res.data)
    } catch (err) {
      setRollupError(err instanceof Error ? err.message : 'Falha ao carregar rollup')
    } finally {
      setRollupLoading(false)
    }
  }, [tenantId, since, until])

  const loadAgent = useCallback(async () => {
    if (!agentId) {
      setAgentSummary(null)
      return
    }
    setAgentLoading(true)
    setAgentError(null)
    try {
      const res = await fetchAgentSummary(agentId, {
        tenantId: tenantId || undefined,
        since: since || undefined,
        until: until || undefined,
      })
      setAgentSummary(res)
    } catch (err) {
      setAgentSummary(null)
      setAgentError(err instanceof Error ? err.message : 'Falha ao carregar agent')
    } finally {
      setAgentLoading(false)
    }
  }, [agentId, tenantId, since, until])

  useEffect(() => { void loadRollup() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  // ─── Aggregations for the rollup table ─────────────────────────────────────

  const totals = useMemo(() => {
    const t = { cost: 0, input: 0, output: 0, exec: 0 }
    for (const r of rollup) {
      t.cost += Number(r.total_cost_usd) || 0
      t.input += r.total_input_tokens
      t.output += r.total_output_tokens
      t.exec += r.executions
    }
    return t
  }, [rollup])

  const byFeature = useMemo(() => {
    const acc: Record<string, { cost: number; exec: number }> = {}
    for (const r of rollup) {
      const a = acc[r.feature] ?? { cost: 0, exec: 0 }
      a.cost += Number(r.total_cost_usd) || 0
      a.exec += r.executions
      acc[r.feature] = a
    }
    return Object.entries(acc).sort((a, b) => b[1].cost - a[1].cost)
  }, [rollup])

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="border-r border-surface-700">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-surface-100">AI Observability — custo e métricas por agent</h1>
            <p className="text-xs text-surface-400">Rollup diário cross-tenant + drill por agent_id.</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-3 border-b border-r border-surface-700 bg-surface-900/40 flex flex-wrap items-end gap-3">
        <Field label="tenantId" value={tenantId} onChange={setTenantId} placeholder="opcional — UUID" wide />
        <Field label="since (date)" value={since} onChange={setSince} placeholder="YYYY-MM-DD" />
        <Field label="until (date)" value={until} onChange={setUntil} placeholder="YYYY-MM-DD" />
        <button
          onClick={() => void loadRollup()}
          disabled={rollupLoading}
          className="px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs disabled:opacity-50"
        >
          Atualizar rollup
        </button>
      </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ── Cost rollup ────────────────────────────────────────────────────── */}
        <section className="px-6 py-5 border-b border-r border-surface-700">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">Cost rollup</h2>

          {rollupError && (
            <ErrorBanner message={rollupError} />
          )}

          {rollupLoading && rollup.length === 0 && <Loader />}

          {!rollupLoading && rollup.length === 0 && !rollupError && (
            <EmptyState
              icon={Search}
              title="Sem dados na janela selecionada"
              hint="Mude tenantId / janela. View materializada é refrescada diariamente."
            />
          )}

          {rollup.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiCard label="Custo total (USD)" value={`$${totals.cost.toFixed(4)}`} />
                <KpiCard label="Execuções" value={totals.exec.toLocaleString('pt-BR')} />
                <KpiCard label="Input tokens" value={totals.input.toLocaleString('pt-BR')} />
                <KpiCard label="Output tokens" value={totals.output.toLocaleString('pt-BR')} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-surface-700 bg-surface-900 p-3">
                  <h3 className="text-xs uppercase tracking-wider text-surface-400 mb-2">Por feature</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-surface-800">
                      {byFeature.map(([feature, v]) => (
                        <tr key={feature}>
                          <td className="py-1.5 text-surface-200 font-mono text-xs">{feature}</td>
                          <td className="py-1.5 text-right text-surface-300 text-xs">{v.exec.toLocaleString('pt-BR')}</td>
                          <td className="py-1.5 text-right text-emerald-200 text-xs">${v.cost.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-surface-700 bg-surface-900 p-3 max-h-[260px] overflow-auto">
                  <h3 className="text-xs uppercase tracking-wider text-surface-400 mb-2">Linhas brutas ({rollup.length})</h3>
                  <table className="w-full text-xs">
                    <thead className="text-surface-500">
                      <tr>
                        <th className="text-left py-1">day</th>
                        <th className="text-left py-1">tenant</th>
                        <th className="text-left py-1">feature</th>
                        <th className="text-right py-1">exec</th>
                        <th className="text-right py-1">$ usd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {rollup.slice(0, 100).map((r, i) => (
                        <tr key={i}>
                          <td className="py-1 text-surface-300">{r.day}</td>
                          <td className="py-1 text-surface-300 font-mono">{r.tenant_id.slice(0, 8)}…</td>
                          <td className="py-1 text-surface-200 font-mono">{r.feature}</td>
                          <td className="py-1 text-right text-surface-300">{r.executions}</td>
                          <td className="py-1 text-right text-emerald-200">${Number(r.total_cost_usd).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── Per-agent drill ─────────────────────────────────────────────── */}
        <section className="px-6 py-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">Per-agent summary</h2>

          <div className="flex items-end gap-3 mb-4">
            <Field label="agentId" value={agentId} onChange={setAgentId} placeholder="UUID" wide />
            <button
              onClick={() => void loadAgent()}
              disabled={agentLoading || !agentId}
              className="px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs disabled:opacity-50"
            >
              Buscar
            </button>
          </div>

          {agentError && <ErrorBanner message={agentError} />}
          {agentLoading && <Loader />}

          {agentSummary && !agentLoading && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiCard label="Execuções" value={agentSummary.totals.executions.toLocaleString('pt-BR')} />
                <KpiCard
                  label="Status"
                  value={`${pct(agentSummary.totals.answered, agentSummary.totals.executions)} OK`}
                  hint={`${agentSummary.totals.aborted_loop} aborted · ${agentSummary.totals.error} error · ${agentSummary.totals.max_turns} max`}
                />
                <KpiCard
                  label="Tokens (in/out)"
                  value={`${fmtCompact(agentSummary.totals.total_input_tokens)} / ${fmtCompact(agentSummary.totals.total_output_tokens)}`}
                />
                <KpiCard label="Custo" value={`$${agentSummary.totals.total_cost_usd.toFixed(4)}`} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-surface-700 bg-surface-900 p-3">
                  <h3 className="text-xs uppercase tracking-wider text-surface-400 mb-2">Top tools</h3>
                  {agentSummary.top_tools.length === 0 ? (
                    <p className="text-xs text-surface-500">Sem chamadas no período.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-surface-800">
                        {agentSummary.top_tools.map(t => (
                          <tr key={t.tool_name}>
                            <td className="py-1.5 text-surface-200 font-mono text-xs">{t.tool_name}</td>
                            <td className="py-1.5 text-right text-surface-300 text-xs">{t.calls}</td>
                            <td className="py-1.5 text-right text-status-failed text-xs">{t.failures > 0 ? `${t.failures} fail` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="rounded-xl border border-surface-700 bg-surface-900 p-3">
                  <h3 className="text-xs uppercase tracking-wider text-surface-400 mb-2">RAG</h3>
                  <dl className="space-y-1 text-xs text-surface-300">
                    <Row k="queries" v={agentSummary.rag.queries.toLocaleString('pt-BR')} />
                    <Row k="hit rate (chunks≠[])" v={(agentSummary.rag.hit_rate * 100).toFixed(1) + '%'} />
                    <Row k="reranker usage" v={(agentSummary.rag.reranker_used_rate * 100).toFixed(1) + '%'} />
                    <Row k="avg duration" v={agentSummary.rag.avg_total_duration_ms ? `${agentSummary.rag.avg_total_duration_ms}ms` : '—'} />
                    <Row k="avg reranker" v={agentSummary.rag.avg_reranker_duration_ms ? `${agentSummary.rag.avg_reranker_duration_ms}ms` : '—'} />
                  </dl>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Internals ────────────────────────────────────────────────────────────────

function defaultSince(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${((part / total) * 100).toFixed(0)}%`
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

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900 p-3">
      <p className="text-[11px] uppercase tracking-wider text-surface-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-surface-100">{value}</p>
      {hint && <p className="text-[11px] text-surface-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-surface-700/50 last:border-0 py-0.5">
      <dt className="text-surface-400">{k}</dt>
      <dd className="text-surface-200 font-mono">{v}</dd>
    </div>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-8 text-surface-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> carregando…
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
      <AlertCircle className="w-4 h-4" />
      {message}
    </div>
  )
}
