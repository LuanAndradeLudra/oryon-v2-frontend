import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToolMetrics } from '@/services/agentsApi'
import type { AgentConfigWithTools, ToolMetricRow } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'

// ─── Metrics Tab (tool executions dashboard) ─────────────────────────────────
// Reads GET /metrics/tools. Admin-only on the backend — this component fails
// gracefully when the caller lacks access or the FF_AGENT_AUDIT_LOG flag is
// off (returns an empty/error state instead of crashing).

export function MetricsTab({ agent: _agent }: { agent: AgentConfigWithTools }) {
  const [rows, setRows] = useState<ToolMetricRow[]>([])
  const [windowDays, setWindowDays] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (days: number) => {
    setError(null)
    try {
      const resp = await getToolMetrics(days)
      setRows(resp.tools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar métricas')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load(windowDays).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [windowDays, load])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await load(windowDays) } finally { setRefreshing(false) }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      successes: acc.successes + r.successes,
      failures: acc.failures + r.failures,
    }),
    { total: 0, successes: 0, failures: 0 },
  )
  const successRate = totals.total > 0
    ? Math.round((totals.successes / totals.total) * 1000) / 10
    : null

  return (
    <div className="space-y-4">
      {/* Header with window selector + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-500">
            Execução de ferramentas HTTP — últimas {windowDays} {windowDays === 1 ? 'dia' : 'dias'}
          </p>
          <p className="text-[10px] text-surface-600 mt-0.5">
            Requer <code className="text-surface-400">FF_AGENT_AUDIT_LOG</code> ativo no agent-server
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
            className="bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1 text-xs text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value={1}>Último dia</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-900 hover:bg-surface-800 border border-surface-800 text-xs text-surface-300 transition disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && !error && totals.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Total de chamadas</p>
            <p className="text-xl font-bold text-surface-100">{totals.total.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Taxa de sucesso</p>
            <p className={cn('text-xl font-bold', successRate !== null && successRate >= 95 ? 'text-status-active' : successRate !== null && successRate >= 80 ? 'text-status-pending' : 'text-danger')}>
              {successRate !== null ? `${successRate}%` : '—'}
            </p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Falhas</p>
            <p className={cn('text-xl font-bold', totals.failures === 0 ? 'text-surface-400' : 'text-danger')}>
              {totals.failures.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Banner variant="danger">
          <p className="font-medium">Não foi possível carregar as métricas</p>
          <p className="opacity-80 mt-0.5">{error}</p>
        </Banner>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 border border-dashed border-surface-800 rounded-xl">
          <BarChart3 className="w-8 h-8 text-surface-700" />
          <div className="text-center">
            <p className="text-sm text-surface-500">Nenhuma execução registrada</p>
            <p className="text-xs text-surface-600 mt-0.5">
              Ative <code className="text-surface-400">FF_AGENT_CUSTOM_TOOLS</code> + <code className="text-surface-400">FF_AGENT_AUDIT_LOG</code> e execute conversas para ver os dados aqui.
            </p>
          </div>
        </div>
      )}

      {/* Per-tool table */}
      {!loading && !error && rows.length > 0 && (
        <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-950/60 text-surface-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Ferramenta</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-right px-4 py-2 font-medium">Sucesso</th>
                <th className="text-right px-4 py-2 font-medium">Falhas</th>
                <th className="text-right px-4 py-2 font-medium">Média</th>
                <th className="text-right px-4 py-2 font-medium">p95</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {rows.map(r => {
                const rate = r.total > 0 ? (r.successes / r.total) * 100 : 0
                return (
                  <tr key={r.tool_name} className="hover:bg-surface-800/30 transition">
                    <td className="px-4 py-2.5 font-mono text-surface-200">{r.tool_name}</td>
                    <td className="px-4 py-2.5 text-right text-surface-300">{r.total}</td>
                    <td className={cn('px-4 py-2.5 text-right font-medium', rate >= 95 ? 'text-status-active' : rate >= 80 ? 'text-status-pending' : 'text-danger')}>
                      {r.successes} <span className="text-surface-600">({rate.toFixed(1)}%)</span>
                    </td>
                    <td className={cn('px-4 py-2.5 text-right', r.failures === 0 ? 'text-surface-500' : 'text-danger font-medium')}>
                      {r.failures}
                    </td>
                    <td className="px-4 py-2.5 text-right text-surface-400">
                      {r.avg_duration_ms !== null ? `${r.avg_duration_ms.toFixed(0)}ms` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-surface-400">
                      {r.p95_duration_ms !== null ? `${r.p95_duration_ms.toFixed(0)}ms` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
