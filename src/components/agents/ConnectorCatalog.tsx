// ─── ConnectorCatalog — self-service catalog + install flow (SCRUM-1078) ────
// Client-facing: lists connectors visible to this tenant (live, or pilot for
// this tenant specifically) and lets an owner-tier user connect one without
// contacting Oryon. Mirrors McpProvidersSection's owner/plan-gate posture —
// both share the `integrations` plan module (SCRUM-1084) — but the
// interaction shape is a catalog + per-connector install flow, not a flat
// "attach one thing" form.
//
// Object/array config fields are refused here on purpose (Jira SCRUM-1078:
// "sem escapes de JSON-cru/CSV nesse caminho") — a connector whose schema
// needs those still requires Oryon to finish the connection by hand. This
// isn't expected to trigger for any `live`/`pilot` connector today (Feegow's
// schema is 2 plain strings) and becomes moot once SCRUM-1083's promotion
// gate is enforced for real.

import { useState, useEffect } from 'react'
import { Plug, Loader2, AlertCircle, CheckCircle2, Lock, Beaker } from 'lucide-react'
import {
  listConnectors,
  getConnectorDetail,
  installConnector,
  testConnectorInstallation,
  requestConnector,
} from '@/services/connectorsApi'
import type { ConnectorSummary, ConnectorDetail, TestConnectorResult } from '@/types/connectors'
import type { JsonSchemaObject } from '@/types/skills'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { DynamicSchemaFormFields } from '@/components/shared/DynamicSchemaFormFields'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanGate } from '@/hooks/usePlanGate'
import { isOwnerTier } from '@/lib/roleHelpers'
import { PLANS } from '@/config/plans'
import { cn } from '@/lib/utils'

interface CatalogProps {
  agentId: string
  onClose: () => void
  onInstalled: () => void
}

export function ConnectorCatalogModal({ agentId, onClose, onInstalled }: CatalogProps) {
  const { user } = useAuth()
  const owner = isOwnerTier(user?.role)
  const { allowed: planAllowed, upgrade } = usePlanGate('integrations')

  const [rows, setRows] = useState<ConnectorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<ConnectorSummary | null>(null)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!planAllowed) { setLoading(false); return }
    listConnectors(agentId)
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [agentId, planAllowed])

  if (!planAllowed) {
    return (
      <Modal open onClose={onClose} title="Conectar uma integração">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-900/40 border border-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-400">
            Disponível a partir do plano <strong className="text-surface-200">{upgrade ? PLANS[upgrade].name : 'Business'}</strong>.
            Fale com seu gerente de conta para fazer upgrade.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <>
      <Modal open onClose={onClose} title="Conectar uma integração">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando catálogo…
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-surface-400 break-words">{loadError}</p>
          </div>
        ) : rows.length === 0 ? (
          <EmptyCatalog onRequest={() => setRequesting(true)} />
        ) : (
          <div className="space-y-2">
            {rows.map((c) => (
              <ConnectorRow key={c.id} connector={c} owner={owner} onConnect={() => setConnecting(c)} />
            ))}
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="text-xs text-surface-500 hover:text-surface-300 mt-2"
            >
              Não achou o que precisa? Solicitar uma integração
            </button>
          </div>
        )}
      </Modal>

      {connecting && (
        <ConnectorInstallModal
          agentId={agentId}
          connector={connecting}
          onClose={() => setConnecting(null)}
          onInstalled={() => { setConnecting(null); onInstalled() }}
        />
      )}

      {requesting && <RequestConnectorModal onClose={() => setRequesting(false)} />}
    </>
  )
}

function EmptyCatalog({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="p-4 rounded-lg bg-surface-900/40 border border-dashed border-surface-800 text-sm text-surface-400">
      <p className="mb-3">Nenhuma integração disponível no catálogo ainda.</p>
      <Button variant="secondary" onClick={onRequest}>Solicitar uma integração</Button>
    </div>
  )
}

function ConnectorRow({
  connector,
  owner,
  onConnect,
}: {
  connector: ConnectorSummary
  owner: boolean
  onConnect: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-lg border',
        connector.connected ? 'bg-surface-900 border-surface-700' : 'bg-surface-900/40 border-surface-800',
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        <Plug className="w-4 h-4 text-surface-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-100 truncate">{connector.name}</p>
          <p className="text-xs text-surface-500 truncate">{connector.description}</p>
        </div>
      </div>
      {connector.connected ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-status-active/10 text-status-active ring-1 ring-status-active/30 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3" /> Conectado
        </span>
      ) : owner ? (
        <Button variant="secondary" onClick={onConnect}>Conectar</Button>
      ) : (
        <span className="text-xs text-surface-500 flex-shrink-0">Só o dono da conta pode conectar</span>
      )}
    </div>
  )
}

// ─── Install modal (per connector) ─────────────────────────────────────────

function hasUnsupportedFieldTypes(schema: JsonSchemaObject | unknown[] | null): boolean {
  if (!schema || Array.isArray(schema)) return false
  const props = (schema as JsonSchemaObject).properties ?? {}
  return Object.values(props).some((p) => p.type === 'object' || p.type === 'array')
}

function ConnectorInstallModal({
  agentId,
  connector,
  onClose,
  onInstalled,
}: {
  agentId: string
  connector: ConnectorSummary
  onClose: () => void
  onInstalled: () => void
}) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<ConnectorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectorResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getConnectorDetail(agentId, connector.id)
      .then(setDetail)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [agentId, connector.id])

  const schema = detail?.config_schema ?? null
  const unsupported = hasUnsupportedFieldTypes(schema)
  const required = !schema || Array.isArray(schema) ? [] : (schema as JsonSchemaObject).required ?? []
  const canSubmit =
    !loading && !unsupported && required.every((k) => {
      const v = values[k]
      return v !== undefined && v !== null && v !== ''
    })

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testConnectorInstallation(connector.id, agentId, values))
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  async function handleInstall() {
    setSubmitting(true)
    try {
      await installConnector(connector.id, agentId, values)
      toast(`${connector.name} conectado`, 'success')
      onInstalled()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Conectar ${connector.name}`}
      footer={
        !loading && !unsupported ? (
          <div className="flex justify-between items-center gap-2 w-full">
            <Button variant="ghost" onClick={handleTest} disabled={!canSubmit || testing || submitting}>
              <Beaker className="w-3.5 h-3.5 mr-1.5 inline" /> {testing ? 'Testando…' : 'Testar conexão'}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleInstall} disabled={!canSubmit || submitting}>
                {submitting ? 'Conectando…' : 'Conectar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-10 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : unsupported ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm text-surface-300">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>Esta integração ainda não pode ser configurada por aqui — fale com a Oryon para ativá-la.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connector.docs_url && (
            <p className="text-xs text-surface-500">
              <a href={connector.docs_url} target="_blank" rel="noreferrer" className="underline hover:text-surface-300">
                Ver documentação da integração
              </a>
            </p>
          )}
          <DynamicSchemaFormFields schema={schema} values={values} onChange={setValues} />
          {testResult && (
            <div
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg border text-xs',
                testResult.success
                  ? 'bg-status-active/10 border-status-active/30 text-status-active'
                  : 'bg-danger/10 border-danger/30 text-danger',
              )}
            >
              {testResult.success
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Request modal (demand signal, SCRUM-1077) ─────────────────────────────

function RequestConnectorModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [useCase, setUseCase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = name.trim().length > 0 && useCase.trim().length > 0

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await requestConnector(name.trim(), useCase.trim())
      toast('Solicitação registrada — a Oryon vai avaliar', 'success')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Solicitar uma integração"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Enviando…' : 'Enviar solicitação'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Qual sistema você quer conectar?" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sistema XPTO" />
        </FormField>
        <FormField label="Pra que você usaria essa integração?" required>
          <Textarea
            rows={3}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Descreva rapidamente o que você precisa fazer"
          />
        </FormField>
      </div>
    </Modal>
  )
}
