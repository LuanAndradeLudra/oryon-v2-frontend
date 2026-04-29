// ─── Assign Skill to Agent (admin) ─────────────────────────────────────────
// Oryon staff flow:
//   1. Pick a customer tenant   → loads agents of that tenant
//   2. Pick one of its agents   → loads templates available to attach
//   3. Pick a template          → reveals the config form
//   4. Fill config + attach     → POST /configs/:agentId/skills with override

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Link2, AlertCircle, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { listAdminOrganizations, type AdminOrganization } from '@/services/adminApi'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { attachSkill, listAvailableTemplates } from '@/services/agentSkillsApi'
import { DynamicSchemaFormFields } from '@/components/admin/DynamicSchemaFormFields'
import { CategoryIcon } from '@/components/skills/CategoryIcon'
import type { SkillTemplate, JsonSchemaObject } from '@/types/skills'
import { cn } from '@/lib/utils'

export function AssignSkillPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Optional `?templateId=` lets the operator land here pre-aimed at one
  // template — handy from a "Atribuir" button on the catalogue card.
  const initialTemplateId = searchParams.get('templateId') ?? ''

  // ── Selections ───────────────────────────────────────────────────────────
  const [orgs, setOrgs] = useState<AdminOrganization[]>([])
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<SkillTemplate[]>([])
  const [tenantId, setTenantId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [templateId, setTemplateId] = useState(initialTemplateId)
  const [config, setConfig] = useState<Record<string, unknown>>({})

  // ── Async + UX state ─────────────────────────────────────────────────────
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1) Load orgs once.
  useEffect(() => {
    setLoadingOrgs(true)
    listAdminOrganizations()
      .then(setOrgs)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingOrgs(false))
  }, [])

  // 2) Whenever tenant changes, reload agents + reset everything below.
  useEffect(() => {
    setAgentId('')
    setAvailableTemplates([])
    setConfig({})
    if (!tenantId) {
      setAgents([])
      return
    }
    setLoadingAgents(true)
    setError(null)
    listAgents(tenantId)
      .then(setAgents)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingAgents(false))
  }, [tenantId])

  // 3) Whenever the chosen agent changes, refetch the available templates
  //    for it (already filters out attached + name-collision with tools).
  useEffect(() => {
    setConfig({})
    if (!agentId || !tenantId) {
      setAvailableTemplates([])
      return
    }
    setLoadingTemplates(true)
    setError(null)
    listAvailableTemplates(agentId, tenantId)
      .then((rows) => {
        setAvailableTemplates(rows)
        // If the operator landed with ?templateId= and that template is in
        // the available list, keep the selection; otherwise clear it.
        if (initialTemplateId && !rows.some((r) => r.id === initialTemplateId)) {
          setTemplateId('')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingTemplates(false))
  }, [agentId, tenantId, initialTemplateId])

  // Selected template (used to render the config schema).
  const template = useMemo(
    () => availableTemplates.find((t) => t.id === templateId) ?? null,
    [availableTemplates, templateId],
  )
  const configSchema = (template?.config_schema && !Array.isArray(template.config_schema))
    ? template.config_schema as JsonSchemaObject
    : null

  // Validate config against required fields before allowing submit.
  const missingRequired = useMemo(() => {
    if (!configSchema || !configSchema.required) return []
    return configSchema.required.filter((key) => {
      const v = config[key]
      return v === undefined || v === null || v === ''
    })
  }, [configSchema, config])

  const canSubmit = !!tenantId && !!agentId && !!templateId && missingRequired.length === 0 && !submitting

  async function handleAttach() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await attachSkill(agentId, { template_id: templateId, config }, tenantId)
      // Navigate back to catalogue with a banner hint via state so the user
      // gets confirmation without us building a global toast system.
      navigate('/admin/skill-templates', {
        state: { assigned: { tenantId, agentId, templateId } },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/admin/skill-templates')}
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o catálogo
        </button>

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-surface-100 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-400" />
            Atribuir skill a um agente
          </h1>
          <p className="text-sm text-surface-400">
            Liga um template do catálogo ao agente de um cliente, preenchendo a
            configuração específica daquela instância. O cliente nunca vê esses valores.
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm mb-5">
            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-danger">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* ── Step 1: tenant ──────────────────────────────────────────── */}
          <Step number={1} title="Cliente (tenant)" complete={!!tenantId}>
            {loadingOrgs ? (
              <Loading text="Carregando clientes…" />
            ) : (
              <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">— escolher cliente —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.businessName}</option>
                ))}
              </Select>
            )}
          </Step>

          {/* ── Step 2: agente ──────────────────────────────────────────── */}
          {tenantId && (
            <Step number={2} title="Agente do cliente" complete={!!agentId}>
              {loadingAgents ? (
                <Loading text="Carregando agentes…" />
              ) : agents.length === 0 ? (
                <p className="text-sm text-surface-500">
                  Esse cliente ainda não tem nenhum agente cadastrado.
                </p>
              ) : (
                <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">— escolher agente —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.status !== 'active' ? `· ${a.status}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Step>
          )}

          {/* ── Step 3: template ────────────────────────────────────────── */}
          {tenantId && agentId && (
            <Step number={3} title="Skill a atribuir" complete={!!templateId}>
              {loadingTemplates ? (
                <Loading text="Carregando templates disponíveis…" />
              ) : availableTemplates.length === 0 ? (
                <p className="text-sm text-surface-500">
                  Não há templates disponíveis para esse agente — todos já foram
                  atribuídos ou colidem com tools existentes.
                </p>
              ) : (
                <>
                  <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">— escolher template —</option>
                    {availableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category}){t.tenant_id ? ' · privado' : ''}
                      </option>
                    ))}
                  </Select>
                  {/* Visual confirmation once a template is picked — same icon
                      the customer will see in their Skills tab. */}
                  {template && (
                    <div className="mt-3 flex items-start gap-3 p-3 rounded-lg bg-surface-900 border border-surface-700">
                      <CategoryIcon category={template.category} tone="active" size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-surface-100">{template.name}</p>
                        <p className="text-xs text-surface-500 line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Step>
          )}

          {/* ── Step 4: config ──────────────────────────────────────────── */}
          {tenantId && agentId && template && (
            <Step
              number={4}
              title="Configuração da integração"
              complete={missingRequired.length === 0}
            >
              {template.mutates && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-status-pending-bg/40 border border-status-pending-border text-sm">
                  <ShieldAlert className="w-4 h-4 text-status-pending flex-shrink-0 mt-0.5" />
                  <p className="text-status-pending">
                    Operação destrutiva — esta skill altera dados externos quando chamada.
                  </p>
                </div>
              )}
              <p className="text-sm text-surface-400 mb-4">
                {template.description}
              </p>
              <DynamicSchemaFormFields
                schema={configSchema}
                values={config}
                onChange={setConfig}
                emptyHint="Esse template não exige configuração — você pode atribuir direto."
              />
              {missingRequired.length > 0 && (
                <p className="text-[11px] text-status-pending mt-3">
                  Preencha {missingRequired.map((n) => `"${n}"`).join(', ')} antes de atribuir.
                </p>
              )}
            </Step>
          )}

          {/* ── Footer actions ──────────────────────────────────────────── */}
          {tenantId && agentId && template && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/skill-templates')}
                className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAttach}
                disabled={!canSubmit}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  canSubmit
                    ? 'bg-brand-600 text-surface-950 hover:bg-brand-500 active:scale-[0.98]'
                    : 'bg-surface-800 text-surface-500 cursor-not-allowed',
                )}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Atribuindo…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Atribuir skill</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step wrapper ──────────────────────────────────────────────────────────

function Step({
  number,
  title,
  complete,
  children,
}: {
  number: number
  title: string
  complete: boolean
  children: React.ReactNode
}) {
  return (
    <section className="bg-surface-900/50 border border-surface-800 rounded-xl p-5">
      <header className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
            complete
              ? 'bg-brand-600 text-surface-950'
              : 'bg-surface-800 text-surface-300 border border-surface-700',
          )}
        >
          {complete ? <CheckCircle2 className="w-4 h-4" /> : number}
        </span>
        <h2 className="text-base font-semibold text-surface-100">{title}</h2>
      </header>
      <div className="ml-10">{children}</div>
    </section>
  )
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-surface-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </div>
  )
}
