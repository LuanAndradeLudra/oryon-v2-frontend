// ─── Admin Agent Editor (Oryon staff) ──────────────────────────────────────
// Cross-tenant view of any agent — Oryon staff selects a customer + agent and
// gets two side-by-side panels:
//   1. system_prompt editor   (the customer's raw prompt — editable, saves back)
//   2. effective prompt view  (system_prompt + every attached skill's
//                              prompt_fragment, in the exact order the executor
//                              feeds the model)
//
// This is the only place where staff can override a customer's prompt —
// every save goes to /agents/admin/agents/:id/system-prompt with audit.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, Bot, Eye, Loader2, RefreshCcw, Save,
  ShieldCheck,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { listAdminOrganizations, type AdminOrganization } from '@/services/adminApi'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import {
  getAdminAgentEffectivePrompt,
  updateAdminAgentSystemPrompt,
  type EffectivePromptResponse,
} from '@/services/adminAgentsApi'
import { cn } from '@/lib/utils'

export function AdminAgentEditorPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // URL state: ?tenant=... &agent=... — lets staff bookmark a specific agent
  // and survives reload. Falls back to "" so the picker drops to the empty
  // option without throwing.
  const initialTenantId = searchParams.get('tenant') ?? ''
  const initialAgentId = searchParams.get('agent') ?? ''

  const [orgs, setOrgs] = useState<AdminOrganization[]>([])
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [tenantId, setTenantId] = useState(initialTenantId)
  const [agentId, setAgentId] = useState(initialAgentId)

  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Effective prompt response — server returns BOTH the raw system_prompt AND
  // the composed string + per-skill fragment list. We keep it as one object
  // so the two panels never go out of sync after a save/refresh.
  const [eff, setEff] = useState<EffectivePromptResponse | null>(null)
  // Local edit buffer for the system_prompt — persisted only when "Salvar"
  // is clicked. Kept separate from `eff.system_prompt` so the diff view (chars
  // changed) can compare both.
  const [draft, setDraft] = useState<string>('')
  const [savedHint, setSavedHint] = useState<string | null>(null)

  const isDirty = useMemo(
    () => eff !== null && draft !== eff.system_prompt,
    [draft, eff],
  )

  // ── Load orgs once ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingOrgs(true)
    listAdminOrganizations()
      .then(setOrgs)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingOrgs(false))
  }, [])

  // ── When tenant changes, reload its agents and reset selections ──────────
  useEffect(() => {
    setEff(null)
    setDraft('')
    setError(null)
    setSavedHint(null)
    if (!tenantId) {
      setAgents([])
      // If user cleared the tenant, drop the agent selection in the URL too.
      if (agentId) {
        setAgentId('')
        setSearchParams({})
      }
      return
    }
    setLoadingAgents(true)
    listAgents(tenantId)
      .then((rows) => {
        setAgents(rows)
        // If the URL still has an agent that doesn't belong to this tenant,
        // clear it instead of leaving a broken selection.
        if (agentId && !rows.some((r) => r.id === agentId)) {
          setAgentId('')
          setSearchParams({ tenant: tenantId })
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingAgents(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  // ── When agent changes, fetch its effective prompt ──────────────────────
  useEffect(() => {
    setError(null)
    setSavedHint(null)
    if (!agentId) {
      setEff(null)
      setDraft('')
      return
    }
    loadEffectivePrompt(agentId)
    setSearchParams({ tenant: tenantId, agent: agentId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  async function loadEffectivePrompt(id: string) {
    setLoadingPrompt(true)
    try {
      const data = await getAdminAgentEffectivePrompt(id)
      setEff(data)
      setDraft(data.system_prompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingPrompt(false)
    }
  }

  async function handleSave() {
    if (!eff || !isDirty) return
    setSaving(true)
    setError(null)
    setSavedHint(null)
    try {
      await updateAdminAgentSystemPrompt(eff.agent_id, draft)
      // Refresh the effective prompt so the right-side preview rebuilds with
      // the new system_prompt and the (unchanged) skill fragments — no need
      // to invalidate `eff` until the round-trip completes successfully.
      await loadEffectivePrompt(eff.agent_id)
      setSavedHint('Prompt salvo. Próximas conversas usarão a nova versão.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (!eff) return
    setDraft(eff.system_prompt)
    setSavedHint(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/admin/skill-templates')}
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-surface-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-400" />
            Editor de agente (cross-tenant)
          </h1>
          <p className="text-sm text-surface-400">
            Visualize e edite o prompt de qualquer agente de qualquer cliente. As mudanças
            valem só nas próximas conversas — chats em andamento continuam com a versão antiga.
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm mb-5">
            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-danger">{error}</p>
          </div>
        )}

        {/* ── Pickers ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <PickerBlock label="Cliente (tenant)">
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
          </PickerBlock>

          <PickerBlock label="Agente">
            {loadingAgents ? (
              <Loading text="Carregando agentes…" />
            ) : !tenantId ? (
              <p className="text-sm text-surface-500">Escolha um cliente primeiro.</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-surface-500">Esse cliente ainda não tem agentes.</p>
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
          </PickerBlock>
        </div>

        {/* ── Editor + preview ─────────────────────────────────────────── */}
        {agentId && (
          loadingPrompt ? (
            <div className="flex items-center justify-center py-16">
              <Loading text="Carregando prompt efetivo…" />
            </div>
          ) : eff ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── LEFT: editor do system_prompt ───────────────────────── */}
              <section className="bg-surface-900/50 border border-surface-800 rounded-xl p-5">
                <header className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-brand-400" />
                    System prompt do cliente
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums text-surface-500">
                    {draft.length} chars
                  </span>
                </header>
                <p className="text-[11px] text-surface-500 mb-2">
                  Esse é o texto que <strong>{eff.agent_name}</strong> usa como base.
                  Skills anexadas adicionam instruções automaticamente abaixo.
                </p>
                <Textarea
                  rows={28}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-mono text-[12px] leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-[11px] text-surface-500">
                    {savedHint && (
                      <span className="text-status-active">{savedHint}</span>
                    )}
                    {isDirty && !savedHint && (
                      <span className="text-status-pending">Modificações não salvas</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={!isDirty || saving}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
                        isDirty && !saving
                          ? 'text-surface-300 hover:bg-surface-800'
                          : 'text-surface-600 cursor-not-allowed',
                      )}
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!isDirty || saving}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        isDirty && !saving
                          ? 'bg-brand-600 text-surface-950 hover:bg-brand-500 active:scale-[0.98]'
                          : 'bg-surface-800 text-surface-500 cursor-not-allowed',
                      )}
                    >
                      {saving
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                        : <><Save className="w-3.5 h-3.5" /> Salvar</>}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── RIGHT: prompt efetivo (read-only preview) ───────────── */}
              <section className="bg-surface-900/50 border border-surface-800 rounded-xl p-5">
                <header className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-400" />
                    Prompt efetivo (o que a IA recebe)
                  </h2>
                  <span className={cn(
                    'text-[11px] font-mono tabular-nums',
                    eff.composed_chars > 12_000 ? 'text-status-pending' : 'text-surface-500',
                  )}>
                    {eff.composed_chars} chars
                  </span>
                </header>
                <p className="text-[11px] text-surface-500 mb-3">
                  Concatenação do prompt do cliente com as instruções de cada skill anexada,
                  na ordem que o executor envia para o Anthropic.
                </p>

                {/* Customer prompt block (read-only mirror; greyed out so the
                    operator visually distinguishes "what the customer wrote"
                    from "what we're injecting"). */}
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  <PromptBlock
                    label="Prompt do cliente"
                    tone="neutral"
                    chars={(eff.system_prompt ?? '').length}
                  >
                    <pre className="text-[11px] text-surface-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {eff.system_prompt || '(vazio)'}
                    </pre>
                  </PromptBlock>

                  {eff.fragments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-surface-700 bg-surface-900/30 px-3 py-4 text-center text-[11px] text-surface-500">
                      Nenhuma skill com instruções injetadas. Cadastre <code>prompt_fragment</code> em
                      um template e atribua ao agente para vê-las aqui.
                    </div>
                  ) : (
                    eff.fragments.map((f) => (
                      <PromptBlock
                        key={f.skill_id}
                        label={`${f.template_name ?? f.llm_name}`}
                        sublabel={`tool: ${f.llm_name}`}
                        tone="brand"
                        chars={f.fragment.length}
                      >
                        <pre className="text-[11px] text-surface-200 whitespace-pre-wrap font-mono leading-relaxed">
                          {f.fragment}
                        </pre>
                      </PromptBlock>
                    ))
                  )}
                </div>

                {eff.composed_chars > 12_000 && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-status-pending-bg/40 border border-status-pending-border text-xs">
                    <AlertCircle className="w-4 h-4 text-status-pending flex-shrink-0 mt-0.5" />
                    <p className="text-status-pending">
                      Prompt grande ({eff.composed_chars} chars) — pode reduzir o cache hit
                      rate da Anthropic e aumentar o custo por turno.
                    </p>
                  </div>
                )}
              </section>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── Local helpers ─────────────────────────────────────────────────────────

function PickerBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
      <label className="block text-xs uppercase tracking-wide text-surface-500 mb-2">{label}</label>
      {children}
    </div>
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

function PromptBlock({
  label,
  sublabel,
  tone,
  chars,
  children,
}: {
  label: string
  sublabel?: string
  tone: 'neutral' | 'brand'
  chars: number
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      'rounded-lg border px-3 py-3',
      tone === 'brand'
        ? 'bg-brand-600/5 border-brand-600/30'
        : 'bg-surface-900 border-surface-800',
    )}>
      <header className="flex items-center justify-between mb-2">
        <div>
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-wide',
            tone === 'brand' ? 'text-brand-300' : 'text-surface-400',
          )}>{label}</p>
          {sublabel && (
            <p className="text-[10px] text-surface-500 font-mono">{sublabel}</p>
          )}
        </div>
        <span className="text-[10px] font-mono tabular-nums text-surface-500">{chars} chars</span>
      </header>
      {children}
    </div>
  )
}
