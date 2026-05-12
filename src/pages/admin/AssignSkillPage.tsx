// ─── Assign Skill to Agent (admin) ─────────────────────────────────────────
// Oryon staff flow:
//   1. Pick a customer tenant   → loads agents of that tenant
//   2. Pick one or more agents  → loads templates available to all of them
//   3. Pick a template          → reveals per-agent config cards
//   4. Fill config + attach     → POST /configs/:agentId/skills (single)
//                                 or POST /configs/skills/batch-attach (N>1)
//
// Multi-select mode falls out naturally: selecting one agent looks identical
// to the original flow; selecting many shows one config card per agent so
// the operator can give each a different unidade_id / token / etc. The
// batch endpoint reports per-item success so a partial failure (e.g. one
// agent already has the template) doesn't poison the rest — the UI surfaces
// each row's outcome inline.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Link2, AlertCircle, Loader2, CheckCircle2, ShieldAlert, X } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { listAdminOrganizations, type AdminOrganization } from '@/services/adminApi'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import {
  attachSkill,
  batchAttachSkill,
  listAvailableTemplates,
  type BatchAttachResult,
} from '@/services/agentSkillsApi'
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
  /** Order preserved so the per-agent cards render top-down in selection
   *  order — using an array (not a Set) keeps that intuitive. */
  const [agentIds, setAgentIds] = useState<string[]>([])
  const [templateId, setTemplateId] = useState(initialTemplateId)
  /** Per-agent config + overrides. Keyed by agent_id so adding/removing
   *  an agent from the selection doesn't disturb the others' input. */
  const [configByAgent, setConfigByAgent] = useState<Record<string, Record<string, unknown>>>({})
  const [nameOverrideByAgent, setNameOverrideByAgent] = useState<Record<string, string>>({})
  const [descOverrideByAgent, setDescOverrideByAgent] = useState<Record<string, string>>({})

  // ── Async + UX state ─────────────────────────────────────────────────────
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Set after a batch submit so the operator sees per-agent results even
   *  when only some attaches failed. `null` until the first submit. */
  const [batchResults, setBatchResults] = useState<BatchAttachResult[] | null>(null)

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
    setAgentIds([])
    setAvailableTemplates([])
    setConfigByAgent({})
    setNameOverrideByAgent({})
    setDescOverrideByAgent({})
    setBatchResults(null)
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

  // 3) Whenever the agent selection changes, recompute the templates
  //    available to ALL of them (intersection). Calling listAvailableTemplates
  //    per-agent in parallel is fine for the scales we see (under 10 agents
  //    per tenant in practice). Templates already attached to ANY selected
  //    agent are excluded so the operator can't pick one that would fail on
  //    a UNIQUE(agent_id, template_id) for that row.
  useEffect(() => {
    setConfigByAgent({})
    setNameOverrideByAgent({})
    setDescOverrideByAgent({})
    setBatchResults(null)
    if (agentIds.length === 0 || !tenantId) {
      setAvailableTemplates([])
      return
    }
    setLoadingTemplates(true)
    setError(null)
    Promise.all(agentIds.map((id) => listAvailableTemplates(id, tenantId)))
      .then((perAgent) => {
        const intersection = intersectByKey(perAgent, (t) => t.id)
        setAvailableTemplates(intersection)
        if (initialTemplateId && !intersection.some((r) => r.id === initialTemplateId)) {
          setTemplateId('')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingTemplates(false))
  }, [agentIds, tenantId, initialTemplateId])

  // Selected template (used to render the config schema).
  const template = useMemo(
    () => availableTemplates.find((t) => t.id === templateId) ?? null,
    [availableTemplates, templateId],
  )
  const configSchema = (template?.config_schema && !Array.isArray(template.config_schema))
    ? template.config_schema as JsonSchemaObject
    : null

  // Required-field validation per agent. The submit button stays disabled
  // until every selected agent has the required keys filled — there's no
  // partial submit; the operator sees inline hints per card.
  const missingByAgent = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    if (!configSchema || !configSchema.required) {
      for (const id of agentIds) out[id] = []
      return out
    }
    for (const id of agentIds) {
      const cfg = configByAgent[id] ?? {}
      out[id] = configSchema.required.filter((key) => {
        const v = cfg[key]
        return v === undefined || v === null || v === ''
      })
    }
    return out
  }, [agentIds, configByAgent, configSchema])

  const allValid = agentIds.length > 0 && agentIds.every((id) => (missingByAgent[id] ?? []).length === 0)
  const canSubmit = !!tenantId && agentIds.length > 0 && !!templateId && allValid && !submitting

  // ── Selection helpers ────────────────────────────────────────────────────

  function toggleAgent(id: string) {
    setAgentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function selectAllAgents() {
    setAgentIds(agents.map((a) => a.id))
  }

  function clearAgents() {
    setAgentIds([])
  }

  function setConfigFor(id: string, next: Record<string, unknown>) {
    setConfigByAgent((prev) => ({ ...prev, [id]: next }))
  }

  function setNameOverrideFor(id: string, next: string) {
    setNameOverrideByAgent((prev) => ({ ...prev, [id]: next }))
  }

  function setDescOverrideFor(id: string, next: string) {
    setDescOverrideByAgent((prev) => ({ ...prev, [id]: next }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleAttach() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setBatchResults(null)

    // Single-agent fast path — keeps the existing per-instance error
    // surface (the page's `error` banner) so a single attach failure
    // doesn't trigger the batch results UI for a one-row outcome.
    if (agentIds.length === 1) {
      const id = agentIds[0]
      try {
        await attachSkill(
          id,
          {
            template_id: templateId,
            config: configByAgent[id] ?? {},
            llm_name_override: (nameOverrideByAgent[id] ?? '').trim() || null,
            llm_description_override: (descOverrideByAgent[id] ?? '').trim() || null,
          },
          tenantId,
        )
        navigate('/admin/skill-templates', {
          state: { assigned: { tenantId, agentId: id, templateId } },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Multi-agent: batch endpoint reports per-row outcomes. We stay on the
    // page when there are failures so the operator can edit just the broken
    // rows and re-submit (all-success case still navigates away).
    try {
      const { results } = await batchAttachSkill(
        {
          template_id: templateId,
          assignments: agentIds.map((id) => ({
            agent_id: id,
            config: configByAgent[id] ?? {},
            llm_name_override: (nameOverrideByAgent[id] ?? '').trim() || null,
            llm_description_override: (descOverrideByAgent[id] ?? '').trim() || null,
          })),
        },
        tenantId,
      )
      setBatchResults(results)
      const allOk = results.every((r) => r.success)
      if (allOk) {
        navigate('/admin/skill-templates', {
          state: { assigned: { tenantId, agentId: agentIds.join(','), templateId } },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers for the rendered cards ───────────────────────────────────────

  const agentById = useMemo(() => {
    const m = new Map<string, AgentConfig>()
    for (const a of agents) m.set(a.id, a)
    return m
  }, [agents])

  const resultByAgent = useMemo(() => {
    if (!batchResults) return new Map<string, BatchAttachResult>()
    const m = new Map<string, BatchAttachResult>()
    for (const r of batchResults) m.set(r.agent_id, r)
    return m
  }, [batchResults])

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
            configuração específica daquela instância. Você pode atribuir a vários
            agentes de uma vez — cada um recebe sua própria configuração.
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

          {/* ── Step 2: agentes (multi-select) ──────────────────────────── */}
          {tenantId && (
            <Step number={2} title="Agentes do cliente" complete={agentIds.length > 0}>
              {loadingAgents ? (
                <Loading text="Carregando agentes…" />
              ) : agents.length === 0 ? (
                <p className="text-sm text-surface-500">
                  Esse cliente ainda não tem nenhum agente cadastrado.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 text-xs text-surface-500">
                    <span>
                      Selecione um ou mais agentes para receber a skill.
                      {agentIds.length > 0 && (
                        <span className="text-surface-300 ml-2">
                          {agentIds.length} {agentIds.length === 1 ? 'selecionado' : 'selecionados'}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllAgents}
                        disabled={agentIds.length === agents.length}
                        className="text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-default"
                      >
                        Selecionar todos
                      </button>
                      {agentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAgents}
                          className="text-surface-400 hover:text-surface-200"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {agents.map((a) => {
                      const checked = agentIds.includes(a.id)
                      return (
                        <label
                          key={a.id}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                            checked
                              ? 'bg-brand-600/10 border-brand-600/40'
                              : 'bg-surface-900 border-surface-700 hover:border-surface-600',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAgent(a.id)}
                            className="w-4 h-4 accent-brand-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-surface-100 truncate">{a.name}</p>
                            <p className="text-[11px] text-surface-500 font-mono truncate">
                              {a.id.slice(0, 8)}… {a.status !== 'active' ? `· ${a.status}` : ''}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </>
              )}
            </Step>
          )}

          {/* ── Step 3: template ────────────────────────────────────────── */}
          {tenantId && agentIds.length > 0 && (
            <Step number={3} title="Skill a atribuir" complete={!!templateId}>
              {loadingTemplates ? (
                <Loading text="Carregando templates disponíveis…" />
              ) : availableTemplates.length === 0 ? (
                <p className="text-sm text-surface-500">
                  Nenhum template disponível para a interseção dos agentes selecionados —
                  todos já estão atribuídos a algum deles ou colidem com tools existentes.
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

          {/* ── Step 4: per-agent config ───────────────────────────────── */}
          {tenantId && agentIds.length > 0 && template && (
            <Step
              number={4}
              title="Configuração da integração"
              complete={allValid}
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

              <div className="space-y-4">
                {agentIds.map((id) => {
                  const a = agentById.get(id)
                  return (
                    <AgentConfigCard
                      key={id}
                      agent={a}
                      agentId={id}
                      template={template}
                      configSchema={configSchema}
                      config={configByAgent[id] ?? {}}
                      nameOverride={nameOverrideByAgent[id] ?? ''}
                      descOverride={descOverrideByAgent[id] ?? ''}
                      missingRequired={missingByAgent[id] ?? []}
                      result={resultByAgent.get(id)}
                      onConfigChange={(v) => setConfigFor(id, v)}
                      onNameOverrideChange={(v) => setNameOverrideFor(id, v)}
                      onDescOverrideChange={(v) => setDescOverrideFor(id, v)}
                      onRemove={agentIds.length > 1 ? () => toggleAgent(id) : undefined}
                    />
                  )
                })}
              </div>
            </Step>
          )}

          {/* ── Batch results banner ───────────────────────────────────── */}
          {batchResults && batchResults.some((r) => !r.success) && (
            <div className="p-3 rounded-lg bg-status-pending-bg/40 border border-status-pending-border text-sm">
              <p className="text-status-pending font-medium mb-1">
                {batchResults.filter((r) => r.success).length}/{batchResults.length} atribuídas com sucesso
              </p>
              <p className="text-surface-300 text-xs">
                Veja o detalhe por agente nos cards acima. Corrija os campos e tente novamente —
                os que já passaram não serão duplicados (a UNIQUE protege).
              </p>
            </div>
          )}

          {/* ── Footer actions ──────────────────────────────────────────── */}
          {tenantId && agentIds.length > 0 && template && (
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
                  : <>
                      <CheckCircle2 className="w-4 h-4" />
                      {agentIds.length > 1
                        ? `Atribuir a ${agentIds.length} agentes`
                        : 'Atribuir skill'}
                    </>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Per-agent config card ────────────────────────────────────────────────

function AgentConfigCard({
  agent,
  agentId,
  template,
  configSchema,
  config,
  nameOverride,
  descOverride,
  missingRequired,
  result,
  onConfigChange,
  onNameOverrideChange,
  onDescOverrideChange,
  onRemove,
}: {
  agent: AgentConfig | undefined
  agentId: string
  template: SkillTemplate
  configSchema: JsonSchemaObject | null
  config: Record<string, unknown>
  nameOverride: string
  descOverride: string
  missingRequired: string[]
  result?: BatchAttachResult
  onConfigChange: (v: Record<string, unknown>) => void
  onNameOverrideChange: (v: string) => void
  onDescOverrideChange: (v: string) => void
  onRemove?: () => void
}) {
  const success = result?.success === true
  const failed = result?.success === false
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        success
          ? 'border-status-active-border bg-status-active-bg/30'
          : failed
            ? 'border-danger/40 bg-danger/5'
            : 'border-surface-700 bg-surface-900/70',
      )}
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-surface-100 truncate">
            {agent?.name ?? agentId.slice(0, 8) + '…'}
          </p>
          <p className="text-[11px] text-surface-500 font-mono truncate">{agentId}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {success && (
            <span className="inline-flex items-center gap-1 text-[11px] text-status-active">
              <CheckCircle2 className="w-3.5 h-3.5" /> Atribuída
            </span>
          )}
          {failed && (
            <span className="inline-flex items-center gap-1 text-[11px] text-danger">
              <AlertCircle className="w-3.5 h-3.5" /> Falhou
            </span>
          )}
          {onRemove && !success && (
            <button
              type="button"
              onClick={onRemove}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              title="Remover deste lote"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {failed && result?.error && (
        <p className="text-[11px] text-danger mb-3 break-words">{result.error}</p>
      )}

      <DynamicSchemaFormFields
        schema={configSchema}
        values={config}
        onChange={onConfigChange}
        emptyHint="Esse template não exige configuração — você pode atribuir direto."
      />
      {missingRequired.length > 0 && (
        <p className="text-[11px] text-status-pending mt-3">
          Preencha {missingRequired.map((n) => `"${n}"`).join(', ')} antes de atribuir.
        </p>
      )}

      <details className="mt-4 pt-3 border-t border-surface-800 group">
        <summary className="text-[11px] text-surface-400 cursor-pointer select-none hover:text-surface-200">
          Customizar nome/descrição para a IA (opcional)
        </summary>
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-surface-200 mb-1">
              Nome customizado
              <span className="text-surface-500 ml-2 font-normal">
                (default: <span className="font-mono">{template.llm_name}</span>)
              </span>
            </label>
            <Input
              value={nameOverride}
              onChange={(e) => onNameOverrideChange(e.target.value)}
              placeholder={template.llm_name}
              maxLength={64}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-200 mb-1">
              Descrição customizada
            </label>
            <Textarea
              rows={3}
              value={descOverride}
              onChange={(e) => onDescOverrideChange(e.target.value)}
              placeholder={template.llm_description}
            />
          </div>
        </div>
      </details>
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

// ─── Local helper ──────────────────────────────────────────────────────────

/** Intersect N arrays by a key function. Returns items from the first array
 *  that appear (by key) in every subsequent array. Used to compute the
 *  templates available across every selected agent. */
function intersectByKey<T>(arrays: T[][], keyOf: (item: T) => string): T[] {
  if (arrays.length === 0) return []
  if (arrays.length === 1) return arrays[0]
  const otherSets = arrays.slice(1).map((arr) => new Set(arr.map(keyOf)))
  return arrays[0].filter((item) => {
    const k = keyOf(item)
    return otherSets.every((s) => s.has(k))
  })
}
