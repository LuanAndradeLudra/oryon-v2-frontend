import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { DynamicSchemaFormFields } from '@/components/shared/DynamicSchemaFormFields'
import { useToast } from '@/hooks/useToast'
import {
  getConnectorDetail,
  installConnector,
  testConnectorInstallation,
  updateConnectorInstallation,
} from '@/services/connectorsApi'
import type { ConnectorDetail, ConnectorSummary, TestConnectorResult } from '@/types/connectors'
import type { JsonSchemaObject } from '@/types/skills'
import { ConnectorTile } from './ConnectorTile'
import { toConnectorView } from './connectorView'

/** Campo de objeto/lista ainda não tem editor — a Oryon configura por fora. */
function hasUnsupportedFieldTypes(schema: JsonSchemaObject | unknown[] | null): boolean {
  if (!schema || Array.isArray(schema)) return false
  const props = (schema as JsonSchemaObject).properties ?? {}
  return Object.values(props).some((p) => p.type === 'object' || p.type === 'array')
}

interface ConnectorInstallModalProps {
  connector: ConnectorSummary
  onClose: () => void
  onSaved: () => void
}

/**
 * Instalar ou editar a credencial de um conector (1x por workspace). Os campos
 * vêm do `config_schema` do conector (DynamicSchemaFormFields); segredos já
 * salvos voltam mascarados em `current_config` e só mudam se forem digitados
 * de novo. Casca visual da restyle (SCRUM-1110) sobre a API do SCRUM-1071.
 */
export function ConnectorInstallModal({ connector, onClose, onSaved }: ConnectorInstallModalProps) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<ConnectorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectorResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let vivo = true
    getConnectorDetail(connector.id)
      .then((d) => {
        if (!vivo) return
        setDetail(d)
        if (d.current_config) setValues(d.current_config)
      })
      .catch((err) => { if (vivo) setLoadError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [connector.id])

  const view = toConnectorView(connector, detail)
  const schema = detail?.config_schema ?? null
  const unsupported = hasUnsupportedFieldTypes(schema)
  const required = !schema || Array.isArray(schema) ? [] : (schema as JsonSchemaObject).required ?? []
  const canSubmit = !loading && !loadError && !unsupported && required.every((k) => {
    const v = values[k]
    return v !== undefined && v !== null && v !== ''
  })

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testConnectorInstallation(connector.id, values))
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      if (connector.installed) {
        await updateConnectorInstallation(connector.id, values)
        toast(`Credencial de ${connector.name} atualizada.`, 'success')
      } else {
        await installConnector(connector.id, values)
        toast(`${connector.name} conectado — ative nos agentes que quiser usar.`, 'success')
      }
      onSaved()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const titulo = connector.installed ? 'Credencial' : 'Conectar'

  return (
    <Modal
      open
      onClose={onClose}
      aria-label={`${titulo} ${connector.name}`}
      className="max-w-[520px]"
      title={
        <div className="flex items-start gap-2.5 min-w-0">
          <ConnectorTile connector={view} size={32} radius={8} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-surface-50 truncate">{titulo} · {connector.name}</h2>
            <p className="text-xs text-surface-400 mt-px">Válida para todo o workspace. Agentes escolhem usar ou não.</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <span className="flex-1" />
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          {!unsupported && !loadError && (
            <Button variant="primary" onClick={() => void handleSave()} disabled={!canSubmit || submitting} loading={submitting}>
              {connector.installed ? 'Salvar credencial' : 'Salvar e conectar'}
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="py-4"><SkeletonCard lines={3} /></div>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : unsupported ? (
        <div className="flex items-start gap-3 p-3 rounded-sm bg-warning/10 border border-warning/30 text-sm text-surface-300">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>Esta integração ainda não pode ser configurada por aqui — fale com a Oryon para ativá-la.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connector.installed && (
            <p className="text-xs text-surface-500">
              Campos de credencial que você não digitar de novo continuam como estão.
            </p>
          )}
          <DynamicSchemaFormFields
            schema={schema}
            values={values}
            onChange={(v) => { setValues(v); setTestResult(null) }}
          />
          {connector.docs_url && (
            <a href={connector.docs_url} target="_blank" rel="noreferrer" className="text-xs text-accent-dark font-semibold hover:opacity-80">
              Guia de conexão ↗
            </a>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" variant="neutral" className="h-8 px-3 text-[12.5px]" onClick={() => void handleTest()} disabled={!canSubmit || submitting} loading={testing}>
              {testResult && !testResult.success ? 'Testar de novo' : 'Testar conexão'}
            </Button>
            {testResult && (
              <span className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-success' : 'text-danger'}`}>
                {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
