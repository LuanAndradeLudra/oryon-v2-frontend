// ─── McpProvidersSection — "Servidores MCP" panel (SCRUM-1084) ─────────────
// Lives inside SkillsTab, right below the Skills list — the PO's framing was
// "anexar uma Skill OU anexar um servidor MCP", side by side in the same
// place, not two separate screens. Client-facing (not staff-only): any tenant
// admin tier can VIEW this; attaching/pausing a server requires owner tier
// (business_admin/super_admin) — same gate billing routes use, re-enforced
// server-side (this UI only hides what the API would refuse anyway).
//
// Trust model: a client can attach ANY MCP endpoint they type in (free path,
// at their own risk, behind an explicit confirmation) OR pick one from the
// Oryon-vetted catalog ("Verificado pela Oryon" badge) — both coexist,
// neither blocks the other.

import { useState, useEffect, useCallback } from 'react'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { Plug, Loader2, AlertCircle, ShieldCheck, HelpCircle, Lock } from 'lucide-react'
import {
  listAgentMcpProviders,
  listMcpProviderTemplates,
  attachMcpProvider,
  setAgentMcpProviderEnabled,
} from '@/services/agentMcpProvidersApi'
import type { AgentMcpProvider, McpProviderTemplateSummary, McpAuthType } from '@/types/mcp'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { RadioOptionList } from '@/components/ui/RadioOptionList'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanGate } from '@/hooks/usePlanGate'
import { isOwnerTier } from '@/lib/roleHelpers'
import { PLANS } from '@/config/plans'
import { cn } from '@/lib/utils'
import { mcpPrecisaToken, podeAnexarMcp } from './mcpAnexar'

interface Props {
  agentId: string
}

/** D12 — escondido com a flag connectorsSelfService desligada (o agent-server responde 404). */
export function McpProvidersSection(props: Props) {
  const { isFeatureVisible } = useFeatureVisibility()
  if (!isFeatureVisible('connectorsSelfService')) return null
  return <McpProvidersSectionVisivel {...props} />
}

function McpProvidersSectionVisivel({ agentId }: Props) {
  const { user } = useAuth()
  const owner = isOwnerTier(user?.role)
  const { allowed: planAllowed, upgrade } = usePlanGate('integrations')

  const [rows, setRows] = useState<AgentMcpProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await listAgentMcpProviders(agentId))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    if (planAllowed) void reload()
    else setLoading(false)
  }, [reload, planAllowed])

  async function toggle(row: AgentMcpProvider) {
    const next = !row.enabled
    setTogglingId(row.id)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: next } : r)))
    try {
      await setAgentMcpProviderEnabled(agentId, row.id, next)
      toast(next ? `${row.provider_name} ativado` : `${row.provider_name} pausado`, 'success')
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !next } : r)))
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Plan gate — this section only, not the whole tab ──────────────────────
  if (!planAllowed) {
    return (
      <section className="mt-6 pt-6 border-t border-surface-800">
        <SectionHeader />
        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-900/40 border border-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-400">
            Disponível a partir do plano <strong className="text-surface-200">{upgrade ? PLANS[upgrade].name : 'Business'}</strong>.
            Fale com seu gerente de conta para fazer upgrade.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 pt-6 border-t border-surface-800">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader />
        {owner && rows.length > 0 && (
          <Button variant="secondary" onClick={() => setAttaching(true)}>
            + Anexar outro
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-surface-400 break-words">{loadError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 rounded-lg bg-surface-900/40 border border-dashed border-surface-800 text-sm text-surface-400">
          {owner ? (
            <div className="flex items-center justify-between gap-3">
              <span>Nenhum servidor MCP anexado a este agente ainda.</span>
              <Button variant="secondary" onClick={() => setAttaching(true)}>
                Anexar servidor MCP
              </Button>
            </div>
          ) : (
            <span>Nenhum servidor MCP anexado. Só o dono da conta pode anexar um.</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'flex items-center justify-between gap-3 p-3 rounded-lg border',
                row.enabled ? 'bg-surface-900 border-surface-700' : 'bg-surface-900/40 border-surface-800 opacity-80',
              )}
            >
              <div className="min-w-0 flex items-center gap-2">
                <Plug className="w-4 h-4 text-surface-500 flex-shrink-0" />
                <span className="text-sm font-medium text-surface-100 truncate">{row.provider_name}</span>
                {row.verified ? (
                  <Tooltip content="Servidor vetado pela Oryon" side="top">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-status-active/10 text-status-active ring-1 ring-status-active/30">
                      <ShieldCheck className="w-3 h-3" /> Verificado
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip content="Servidor cadastrado por conta própria — sob sua responsabilidade" side="top">
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-800 text-surface-400 ring-1 ring-surface-700">
                      Não verificado
                    </span>
                  </Tooltip>
                )}
              </div>
              {owner ? (
                <Switch checked={row.enabled} onChange={() => toggle(row)} disabled={togglingId === row.id} />
              ) : (
                <span className="text-xs text-surface-500 flex-shrink-0">{row.enabled ? 'Ativo' : 'Pausado'}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {attaching && (
        <AttachMcpModal
          agentId={agentId}
          onClose={() => setAttaching(false)}
          onAttached={() => {
            setAttaching(false)
            void reload()
          }}
        />
      )}
    </section>
  )
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-1.5">
      <h2 className="text-sm font-semibold text-surface-100">Servidores MCP</h2>
      <Tooltip
        content="Alternativa às Skills: conecte um servidor MCP (seu ou de um fornecedor) direto a este agente. Você pode conectar qualquer servidor por conta própria, ou escolher um que a Oryon já verificou."
        side="top"
      >
        <span className="text-surface-500 hover:text-surface-300 cursor-help inline-flex">
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </Tooltip>
    </div>
  )
}

// ─── Attach modal ───────────────────────────────────────────────────────────

type AttachMode = 'verified' | 'manual'
const AUTH_TYPES: { id: McpAuthType; label: string }[] = [
  { id: 'bearer', label: 'Bearer token' },
  { id: 'api_key', label: 'API key' },
  { id: 'none', label: 'Nenhuma (endpoint público)' },
]

function AttachMcpModal({
  agentId,
  onClose,
  onAttached,
}: {
  agentId: string
  onClose: () => void
  onAttached: () => void
}) {
  const { toast } = useToast()
  const [mode, setMode] = useState<AttachMode>('verified')
  const [templates, setTemplates] = useState<McpProviderTemplateSummary[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateId, setTemplateId] = useState('')

  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [authType, setAuthType] = useState<McpAuthType>('bearer')
  const [authValue, setAuthValue] = useState('')
  const [riskAccepted, setRiskAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listMcpProviderTemplates()
      .then((rows) => {
        setTemplates(rows)
        // Sem nenhum servidor verificado cadastrado ainda — não força o
        // cliente a olhar pra uma lista vazia, já abre no caminho manual.
        if (rows.length === 0) setMode('manual')
      })
      .catch(() => setMode('manual'))
      .finally(() => setTemplatesLoading(false))
  }, [])

  // Revisão 02/10: "Nenhuma (endpoint público)" esconde o campo de token, mas
  // o botão exigia token sempre — ficava desabilitado para sempre; e um token
  // digitado antes de trocar para "Nenhuma" ia escondido no envio.
  const precisaToken = mcpPrecisaToken(mode, authType)
  const canSubmit = podeAnexarMcp({ mode, authType, authValue, templateId, name, endpointUrl, riskAccepted })

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await attachMcpProvider(agentId, {
        ...(mode === 'verified'
          ? { template_id: templateId }
          : { name: name.trim(), endpoint_url: endpointUrl.trim(), auth_type: authType }),
        ...(precisaToken ? { auth_value: authValue.trim() } : {}),
      })
      toast('Servidor MCP anexado', 'success')
      onAttached()
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
      title="Anexar servidor MCP"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Anexando…' : 'Anexar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {templates.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant={mode === 'verified' ? 'primary' : 'secondary'}
              onClick={() => setMode('verified')}
            >
              Servidor verificado
            </Button>
            <Button
              variant={mode === 'manual' ? 'primary' : 'secondary'}
              onClick={() => setMode('manual')}
            >
              Conectar manualmente
            </Button>
          </div>
        )}

        {mode === 'verified' ? (
          templatesLoading ? (
            <p className="text-sm text-surface-400">Carregando catálogo…</p>
          ) : (
            <RadioOptionList
              name="mcp-template"
              options={templates.map((t) => ({ id: t.id, label: t.name }))}
              value={templateId}
              onChange={setTemplateId}
              emptyMessage="Nenhum servidor verificado disponível ainda."
            />
          )
        ) : (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-surface-300">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p>
                Você está conectando um servidor que a Oryon <strong>não revisou</strong>. Ele vai receber
                o conteúdo das conversas em que for usado. Só conecte um servidor MCP em que você confia.
              </p>
            </div>
            <FormField label="Nome" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Meu ERP" />
            </FormField>
            <FormField label="Endpoint" required hint="URL do servidor MCP">
              <Input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Autenticação">
              <SelectMenu value={authType} onChange={(e) => setAuthType(e.target.value as McpAuthType)}>
                {AUTH_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </SelectMenu>
            </FormField>
          </>
        )}

        {precisaToken ? (
          <FormField label={mode === 'verified' ? 'Credencial' : 'Token / chave'} required>
            <Input
              type="password"
              value={authValue}
              onChange={(e) => setAuthValue(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
        ) : null}

        {mode === 'manual' && (
          <label className="flex items-start gap-2 text-xs text-surface-400 cursor-pointer">
            <input
              type="checkbox"
              checked={riskAccepted}
              onChange={(e) => setRiskAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>Entendo o risco e sou responsável pelos dados enviados a este servidor.</span>
          </label>
        )}
      </div>
    </Modal>
  )
}
