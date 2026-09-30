// ─── Connector Requests (staff triage) ──────────────────────────────────────
// SCRUM-1079 — the other half of the demand signal from SCRUM-1077/1078's
// "Não achou o que precisa?" CTA. Cross-tenant by nature (triage isn't scoped
// to one client), same posture as SkillTemplatesPage: super_admin only.
// Deliberately no automation button here either — linking a request to a
// connector and changing its status are the only actions, matching the
// epic's guard-rail against "signal = build without review".

import { useState, useEffect, useCallback } from 'react'
import { Inbox, Loader2 } from 'lucide-react'
import {
  listConnectorRequestsForStaff,
  triageConnectorRequest,
  listAllConnectorsForStaff,
} from '@/services/connectorsApi'
import type { ConnectorRequestRow, ConnectorSummaryForStaff } from '@/types/connectors'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'

const STATUS_OPTIONS = [
  { id: 'open', label: 'Aberto' },
  { id: 'triaged', label: 'Triado' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'fulfilled', label: 'Atendido' },
  { id: 'declined', label: 'Recusado' },
]

export function ConnectorRequestsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<ConnectorRequestRow[]>([])
  const [connectors, setConnectors] = useState<ConnectorSummaryForStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [requests, allConnectors] = await Promise.all([
        listConnectorRequestsForStaff(statusFilter || undefined),
        listAllConnectorsForStaff(),
      ])
      setRows(requests)
      setConnectors(allConnectors)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { void reload() }, [reload])

  async function handleTriage(row: ConnectorRequestRow, patch: { status?: string; staff_notes?: string; connector_id?: string | null }) {
    const prev = rows
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, ...patch } as ConnectorRequestRow : r)))
    try {
      const updated = await triageConnectorRequest(row.id, patch)
      setRows((cur) => cur.map((r) => (r.id === row.id ? updated : r)))
    } catch (err) {
      setRows(prev)
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          title="Solicitações de conector"
          subtitle="Pedidos de integração registrados pelos clientes diretamente na tela de conectores."
          className="px-0 pt-0 pb-6 border-0"
          actions={
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : loadError ? (
          <ErrorState hint={loadError} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Inbox} title="Nenhuma solicitação encontrada" hint="Quando um cliente pedir uma integração que não existe, ela aparece aqui." />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <RequestRow
                key={row.id}
                row={row}
                connectors={connectors}
                onChange={(patch) => handleTriage(row, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestRow({
  row,
  connectors,
  onChange,
}: {
  row: ConnectorRequestRow
  connectors: ConnectorSummaryForStaff[]
  onChange: (patch: { status?: string; staff_notes?: string; connector_id?: string | null }) => void
}) {
  const [notes, setNotes] = useState(row.staff_notes ?? '')

  return (
    <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/60">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-surface-100">{row.connector_name_freeform}</p>
          <p className="text-xs text-surface-500 mt-0.5">{row.use_case}</p>
          <p className="text-[11px] text-surface-600 mt-1">
            tenant {row.tenant_id} · {new Date(row.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <Select
          value={row.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="flex-shrink-0 w-40"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-surface-500 mb-1">Linkar a um conector</label>
          <Select
            value={row.connector_id ?? ''}
            onChange={(e) => onChange({ connector_id: e.target.value || null })}
          >
            <option value="">— nenhum —</option>
            {connectors.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-surface-500 mb-1">Notas internas</label>
          <Textarea
            rows={1}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (row.staff_notes ?? '')) onChange({ staff_notes: notes }) }}
            placeholder="Visível só pra equipe Oryon"
          />
        </div>
      </div>
    </div>
  )
}
