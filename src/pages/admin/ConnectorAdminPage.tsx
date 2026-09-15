// ─── Connector Admin (staff lifecycle management) ──────────────────────────
// SCRUM-1082 — moves a connector through requested→drafting→mock_tested→
// in_review→pilot→live→retired. Extends the same `/admin` staff surface as
// SkillTemplatesPage (which now has its own connector_id picker on the
// template form) rather than building a second unrelated admin app.
//
// Moving into `pilot` or `live` requires ticking a confirmation checkbox —
// the backend (connectorService.updateConnectorLifecycle) enforces this too,
// so this UI gate is a courtesy, not the only line of defense.

import { useState, useEffect, useCallback } from 'react'
import { Plug, Loader2, ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  listAllConnectorsForStaff,
  getConnectorAdminDetail,
  updateConnectorLifecycle,
  runAutomatedConnectorDraft,
} from '@/services/connectorsApi'
import type { ConnectorSummaryForStaff, ConnectorAdminDetail, AutomatedDraftResult } from '@/types/connectors'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'

const STATUS_OPTIONS = ['requested', 'drafting', 'mock_tested', 'in_review', 'pilot', 'live', 'retired']
const VISIBILITY_OPTIONS = ['private', 'tenant_only', 'catalog']
const GATED_STATUSES = new Set(['pilot', 'live'])

export function ConnectorAdminPage() {
  const [rows, setRows] = useState<ConnectorSummaryForStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    listAllConnectorsForStaff()
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(reload, [reload])

  if (selectedId) {
    return (
      <ConnectorDetailPanel
        id={selectedId}
        onBack={() => { setSelectedId(null); reload() }}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          title="Conectores"
          subtitle="Ciclo de vida do catálogo de integrações — status, visibilidade e piloto."
          className="px-0 pt-0 pb-6 border-0"
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : loadError ? (
          <ErrorState hint={loadError} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Plug} title="Nenhum conector cadastrado ainda" hint="Conectores nascem da migration de modelo de dados (SCRUM-1072) ou de uma solicitação triada (SCRUM-1079)." />
        ) : (
          <div className="space-y-2">
            {rows.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-surface-800 bg-surface-900/60 hover:bg-surface-900 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Plug className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-surface-100 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-surface-800 text-surface-300">{c.status}</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-800 text-surface-500">{c.visibility}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectorDetailPanel({ id, onBack }: { id: string; onBack: () => void }) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<ConnectorAdminDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [status, setStatus] = useState('')
  const [visibility, setVisibility] = useState('')
  const [pilotTenantId, setPilotTenantId] = useState('')
  const [confirmedGate, setConfirmedGate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [autoDrafting, setAutoDrafting] = useState(false)
  const [autoDraftError, setAutoDraftError] = useState<string | null>(null)
  const [autoDraftResult, setAutoDraftResult] = useState<AutomatedDraftResult | null>(null)

  const loadDetail = useCallback(() => {
    getConnectorAdminDetail(id)
      .then((d) => {
        setDetail(d)
        setStatus(d.status)
        setVisibility(d.visibility)
        setPilotTenantId(d.pilot_tenant_id ?? '')
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(loadDetail, [loadDetail])

  async function handleAutoDraft() {
    setAutoDrafting(true)
    setAutoDraftError(null)
    setAutoDraftResult(null)
    try {
      const result = await runAutomatedConnectorDraft(id)
      setAutoDraftResult(result)
      loadDetail() // status/members mudaram — recarrega pra refletir requested → drafting
    } catch (err) {
      setAutoDraftError(err instanceof Error ? err.message : String(err))
    } finally {
      setAutoDrafting(false)
    }
  }

  const statusChangedToGated = detail && status !== detail.status && GATED_STATUSES.has(status)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateConnectorLifecycle(id, {
        status: status !== detail?.status ? status : undefined,
        visibility: visibility !== detail?.visibility ? visibility : undefined,
        pilot_tenant_id: pilotTenantId !== (detail?.pilot_tenant_id ?? '') ? (pilotTenantId || null) : undefined,
        confirmed_gate: confirmedGate,
      })
      setDetail(updated)
      setConfirmedGate(false)
      toast('Conector atualizado', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para conectores
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : loadError || !detail ? (
          <ErrorState hint={loadError ?? 'Conector não encontrado'} />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-xl font-semibold text-surface-100">{detail.name}</h1>
              <p className="text-sm text-surface-400">{detail.description}</p>
            </header>

            {/* SCRUM-1092 — só faz sentido no primeiro rascunho (mesma trava
                que o backend já aplica: status precisa ser 'requested'). Tela
                bem simples de propósito — o painel de revisão de verdade
                (transcrição, chat de correção) é a SCRUM-1094, ainda não
                construída. */}
            {detail.status === 'requested' && (
              <div className="mb-6 p-4 rounded-xl border border-brand-500/30 bg-brand-500/5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-brand-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-100 mb-1">Rascunho automático (IA)</p>
                    <p className="text-xs text-surface-400 mb-3">
                      Lê a documentação pública do fornecedor ({detail.docs_url || 'nenhuma docs_url cadastrada'})
                      e, se confirmar algum endpoint de verdade, cria um workflow rascunho INATIVO no n8n +
                      skills desabilitadas pra revisão. Nunca inventa endpoint — o que não for confirmado vira
                      nota, não workflow. Demora de 30s a alguns minutos.
                    </p>
                    <Button onClick={handleAutoDraft} disabled={autoDrafting || !detail.docs_url} variant="secondary">
                      {autoDrafting ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 inline animate-spin" /> Lendo documentação…</>
                      ) : (
                        'Iniciar rascunho automático'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {autoDraftError && (
              <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {autoDraftError}
              </div>
            )}

            {autoDraftResult && (
              <div className="mb-6 p-4 rounded-xl border border-status-active/30 bg-status-active/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-status-active" />
                  <p className="text-sm font-medium text-surface-100">Rascunho concluído</p>
                </div>
                <p className="text-xs text-surface-300 mb-1">
                  {autoDraftResult.capabilitiesMap.confirmedCapabilities.length} capacidade(s) confirmada(s),{' '}
                  {autoDraftResult.capabilitiesMap.unconfirmedEndpoints.length} não confirmada(s).
                </p>
                {autoDraftResult.n8nWorkflowId ? (
                  <p className="text-xs text-surface-400">
                    Workflow rascunho criado no n8n (inativo) — id: <code className="text-surface-200">{autoDraftResult.n8nWorkflowId}</code>.
                    {' '}Abra no n8n pra revisar antes de qualquer gate.
                  </p>
                ) : (
                  <p className="text-xs text-surface-400">
                    Nenhum endpoint confirmado com URL absoluta — nenhum workflow foi criado. Veja as notas
                    em "não confirmada(s)" abaixo pra entender o motivo.
                  </p>
                )}
                {autoDraftResult.capabilitiesMap.unconfirmedEndpoints.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {autoDraftResult.capabilitiesMap.unconfirmedEndpoints.map((u, i) => (
                      <li key={i} className="text-[11px] text-surface-500">
                        <strong className="text-surface-400">{u.operation}:</strong> {u.note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-4 p-4 rounded-xl border border-surface-800 bg-surface-900/60 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-surface-500 mb-1">Status</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-surface-500 mb-1">Visibilidade</label>
                  <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    {VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-surface-500 mb-1">
                  Tenant do piloto (obrigatório pra status "pilot")
                </label>
                <Input
                  value={pilotTenantId}
                  onChange={(e) => setPilotTenantId(e.target.value)}
                  placeholder="UUID do tenant"
                />
              </div>

              {statusChangedToGated && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-surface-300">
                  <p className="mb-2">
                    Mover para <strong>{status}</strong> exige confirmar o checklist do gate
                    correspondente — ver{' '}
                    <code className="px-1 py-0.5 rounded bg-surface-800 text-surface-200">
                      docs/conectores-gates-de-aprovacao.md
                    </code>{' '}
                    no repositório agent-server.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedGate}
                      onChange={(e) => setConfirmedGate(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Segui o checklist do gate correspondente para este conector.</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || (statusChangedToGated ? !confirmedGate : false)}
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-surface-100 mb-2">
                Skills membro ({detail.members.length})
              </h2>
              {detail.members.length === 0 ? (
                <p className="text-xs text-surface-500">Nenhum skill_template vinculado ainda — vincule pelo editor de templates.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-900/60 border border-surface-800 text-sm">
                      <span className="text-surface-200">{m.name}</span>
                      <span className="text-xs text-surface-500">{m.enabled ? 'habilitado' : 'desabilitado'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
