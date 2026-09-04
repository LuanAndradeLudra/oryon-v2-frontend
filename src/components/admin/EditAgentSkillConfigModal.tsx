// ─── Edit Agent Skill Config (Oryon staff) ─────────────────────────────────
// Lets super_admin update an already-attached skill's `config` plus the two
// optional llm overrides. Previously the only way to fix a missing config
// field after attach was a raw UPDATE in the agent-server DB — this modal
// closes that gap (Phase 1 of the skill-management UI plan).
//
// The form mirrors AssignSkillPage step 4: same DynamicSchemaFormFields, same
// required-field gating. The two override fields show the template default as
// placeholder so the operator knows what they'd be overriding.

import { useState, useMemo } from 'react'
import { Loader2, Save, AlertCircle, Copy, CheckCircle2, History, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'
import { DynamicSchemaFormFields } from './DynamicSchemaFormFields'
import { updateAgentSkill, listSkillExecutions } from '@/services/agentSkillsApi'
import { listSkillTemplateInstances } from '@/services/skillTemplatesApi'
import type {
  AgentSkillWithTemplate,
  JsonSchemaObject,
  SkillTemplateInstance,
  SkillExecutionRow,
} from '@/types/skills'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful save so the parent can refetch its list. */
  onSaved: () => void
  skill: AgentSkillWithTemplate
  /** Optional tenant override — required when super_admin acts cross-tenant. */
  tenantId?: string
}

export function EditAgentSkillConfigModal({ open, onClose, onSaved, skill, tenantId }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>(skill.config ?? {})
  const [nameOverride, setNameOverride] = useState<string>(skill.llm_name_override ?? '')
  const [descOverride, setDescOverride] = useState<string>(skill.llm_description_override ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Copy-from-another-agent picker (Phase 3.2). Lazy-loaded the first time
  // the operator opens the picker so we don't pay the round-trip on every
  // modal mount. `null` = not yet fetched; `[]` = fetched, no other agents.
  const [otherInstances, setOtherInstances] = useState<SkillTemplateInstance[] | null>(null)
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  // Execution history (Phase 4.1). Same lazy pattern: only fetched when the
  // operator expands the section, so the modal-open cost is constant.
  const [executions, setExecutions] = useState<SkillExecutionRow[] | null>(null)
  const [loadingExecutions, setLoadingExecutions] = useState(false)
  const [executionsError, setExecutionsError] = useState<string | null>(null)

  const configSchema = (skill.template_config_schema && !Array.isArray(skill.template_config_schema))
    ? skill.template_config_schema as JsonSchemaObject
    : null

  const missingRequired = useMemo(() => {
    if (!configSchema || !configSchema.required) return []
    return configSchema.required.filter((key) => {
      const v = config[key]
      return v === undefined || v === null || v === ''
    })
  }, [configSchema, config])

  const canSubmit = missingRequired.length === 0 && !saving

  async function openCopyPicker() {
    setShowCopyPicker(true)
    if (otherInstances !== null) return // already loaded
    setLoadingInstances(true)
    try {
      const all = await listSkillTemplateInstances(skill.template_id)
      // Drop the current instance so the operator can't accidentally
      // "copy from itself" (a no-op that would still toast success).
      setOtherInstances(all.filter((i) => i.id !== skill.skill_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingInstances(false)
    }
  }

  async function loadExecutions() {
    if (executions !== null || loadingExecutions) return // already loaded or loading
    setLoadingExecutions(true)
    setExecutionsError(null)
    try {
      const rows = await listSkillExecutions(
        skill.agent_id,
        skill.skill_id,
        { limit: 20 },
        tenantId,
      )
      setExecutions(rows)
    } catch (err) {
      setExecutionsError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingExecutions(false)
    }
  }

  function applyCopyFrom(sourceId: string) {
    const src = otherInstances?.find((i) => i.id === sourceId)
    if (!src) return
    // Replace the local edit buffer with the source values; the operator can
    // then tweak (e.g. change unidade_id for this specific agent) before
    // saving. We don't auto-save — the PATCH still requires an explicit
    // click so the operator owns the final state.
    setConfig({ ...src.config })
    setNameOverride(src.llm_name_override ?? '')
    setDescOverride(src.llm_description_override ?? '')
    setShowCopyPicker(false)
  }

  async function handleSave() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await updateAgentSkill(
        skill.agent_id,
        skill.skill_id,
        {
          config,
          llm_name_override: nameOverride.trim() || null,
          llm_description_override: descOverride.trim() || null,
        },
        tenantId,
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar configuração — ${skill.template_name}`}
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs text-surface-500">
            Alterações se aplicam às próximas execuções da skill.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                canSubmit
                  ? 'bg-brand-600 text-surface-950 hover:bg-brand-500 active:scale-[0.98]'
                  : 'bg-surface-800 text-surface-500 cursor-not-allowed',
              )}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger break-words">{error}</p>
        </div>
      )}

      {/* ── Copy-from picker (Phase 3.2) ──────────────────────────────────── */}
      {/* Lets the operator clone another agent's config for the same template
          and tweak from there — useful when onboarding a new unit of a
          franchise where most config is identical and only the per-unit
          ID differs. */}
      <div className="mb-4 flex items-center justify-end gap-2 text-xs">
        {!showCopyPicker ? (
          <button
            type="button"
            onClick={openCopyPicker}
            className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar configuração de outro agente
          </button>
        ) : loadingInstances ? (
          <span className="inline-flex items-center gap-1.5 text-surface-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando agentes…
          </span>
        ) : !otherInstances || otherInstances.length === 0 ? (
          <span className="text-surface-500">
            Nenhum outro agente tem este template atribuído.
            <button
              type="button"
              onClick={() => setShowCopyPicker(false)}
              className="ml-2 text-surface-400 hover:text-surface-200"
            >
              Fechar
            </button>
          </span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <span className="text-surface-400 flex-shrink-0">Copiar de:</span>
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) applyCopyFrom(e.target.value)
              }}
              className="flex-1"
            >
              <option value="">— escolher agente fonte —</option>
              {otherInstances.map((i) => {
                const cfgPreview = previewConfig(i.config)
                return (
                  <option key={i.id} value={i.id}>
                    {i.agent_name}{cfgPreview ? ` · ${cfgPreview}` : ''}
                  </option>
                )
              })}
            </Select>
            <button
              type="button"
              onClick={() => setShowCopyPicker(false)}
              className="text-surface-400 hover:text-surface-200 flex-shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ── Config schema ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-surface-100">Configuração da integração</h3>
          <p className="text-2xs text-surface-500">
            Campos preenchidos pelo Oryon staff. O cliente final nunca vê esses valores.
          </p>
        </header>
        <DynamicSchemaFormFields
          schema={configSchema}
          values={config}
          onChange={setConfig}
          emptyHint="Esse template não exige configuração."
        />
        {missingRequired.length > 0 && (
          <p className="text-2xs text-status-pending mt-3">
            Preencha {missingRequired.map((n) => `"${n}"`).join(', ')} antes de salvar.
          </p>
        )}
      </section>

      {/* ── LLM overrides (optional) ──────────────────────────────────────── */}
      <section>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-surface-100">Como a IA vê esta skill (opcional)</h3>
          <p className="text-2xs text-surface-500">
            Sobrescreve o nome/descrição que o modelo enxerga neste agente específico.
            Deixe em branco para usar o default do template.
          </p>
        </header>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-200 mb-1">
              Nome customizado
              <span className="text-surface-500 ml-2 font-normal">
                (default: <span className="font-mono">{skill.template_llm_name}</span>)
              </span>
            </label>
            <Input
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder={skill.template_llm_name}
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
              onChange={(e) => setDescOverride(e.target.value)}
              placeholder={skill.template_llm_description}
            />
          </div>
        </div>
      </section>

      {/* ── Execution history (Phase 4.1) ──────────────────────────────── */}
      {/* Collapsible by default — opening triggers the first fetch. Once
          loaded, the list stays in memory for the lifetime of the modal so
          re-opening the details is instant. The Recarregar button is the
          escape hatch when the operator just kicked a test fire and wants
          to see it. */}
      <section className="mt-6 pt-5 border-t border-surface-800">
        <details className="group" onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) void loadExecutions()
        }}>
          <summary className="flex items-center justify-between cursor-pointer select-none">
            <h3 className="text-sm font-semibold text-surface-100 inline-flex items-center gap-2">
              <History className="w-4 h-4 text-brand-400" />
              Histórico de execuções
              {executions && executions.length > 0 && (
                <span className="text-2xs font-normal text-surface-500">
                  ({executions.length}{executions.length >= 20 ? '+' : ''})
                </span>
              )}
            </h3>
            <span className="text-2xs text-surface-500 group-open:hidden">
              Clique para ver
            </span>
          </summary>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xs text-surface-500">
                Últimas 20 chamadas registradas. Cada linha tem o request_id pra correlacionar com logs do n8n.
              </p>
              <button
                type="button"
                onClick={() => {
                  setExecutions(null)
                  void loadExecutions()
                }}
                disabled={loadingExecutions}
                className="text-2xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
              >
                Recarregar
              </button>
            </div>

            {loadingExecutions && (
              <div className="flex items-center gap-2 py-6 text-sm text-surface-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico…
              </div>
            )}

            {executionsError && !loadingExecutions && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm">
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-danger break-words">{executionsError}</p>
              </div>
            )}

            {!loadingExecutions && !executionsError && executions !== null && executions.length === 0 && (
              <p className="text-sm text-surface-500 py-6 text-center">
                Esta skill ainda não foi executada. Dispare uma mensagem ao agente que acione esta skill para ver as primeiras linhas aqui.
              </p>
            )}

            {!loadingExecutions && !executionsError && executions && executions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-3xs uppercase tracking-wide text-surface-500 border-b border-surface-800">
                      <th className="text-left font-medium py-2 pr-3">Quando</th>
                      <th className="text-left font-medium py-2 pr-3">Status</th>
                      <th className="text-right font-medium py-2 pr-3">Latência</th>
                      <th className="text-left font-medium py-2 pr-3">Detalhe</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((row) => (
                      <ExecutionRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      </section>
    </Modal>
  )
}

// ─── Execution row ────────────────────────────────────────────────────────────

function ExecutionRow({ row }: { row: SkillExecutionRow }) {
  function copyRequestId() {
    if (!row.request_id) return
    navigator.clipboard?.writeText(row.request_id).catch(() => {})
  }
  return (
    <tr className="border-b border-surface-800/60">
      <td className="py-2 pr-3 text-surface-300 whitespace-nowrap">
        <Tooltip content={new Date(row.created_at).toLocaleString('pt-BR')} side="top">
          <span className="cursor-help">{formatRelativeTime(row.created_at)}</span>
        </Tooltip>
      </td>
      <td className="py-2 pr-3">
        {row.success ? (
          <span className="inline-flex items-center gap-1 text-2xs text-status-active">
            <CheckCircle2 className="w-3 h-3" /> {row.status_code ?? 'ok'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs text-danger">
            <AlertCircle className="w-3 h-3" /> {row.status_code ?? 'erro'}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-right text-surface-400 font-mono text-2xs">
        {row.duration_ms !== null ? `${row.duration_ms} ms` : '—'}
      </td>
      <td className="py-2 pr-3 text-surface-400 text-2xs max-w-[280px]">
        {row.error_message ? (
          <Tooltip content={row.error_message} side="top">
            <span className="cursor-help text-danger truncate inline-block max-w-full align-bottom">
              {row.error_message}
            </span>
          </Tooltip>
        ) : (
          <span className="text-surface-500">—</span>
        )}
      </td>
      <td className="py-2 text-right">
        {row.request_id && (
          <Tooltip content="Copiar request_id (use no n8n para encontrar o run correspondente)" side="top">
            <button
              type="button"
              onClick={copyRequestId}
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-3xs font-mono text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {row.request_id.slice(0, 8)}…
            </button>
          </Tooltip>
        )}
      </td>
    </tr>
  )
}

/** Lightweight relative-time formatter — enough for "5s ago / 3min ago / 2h ago"
 *  without pulling in date-fns. Falls back to a date for anything older than 7d. */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s atrás`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** Compact one-line summary of a config object — shown after the agent name
 *  in the copy-from dropdown so the operator can tell similar agents apart
 *  ("Serrinha · unidade_id=3" vs "Serrinha · unidade_id=11"). */
function previewConfig(config: Record<string, unknown>): string {
  const entries = Object.entries(config ?? {})
  if (entries.length === 0) return ''
  return entries
    .slice(0, 2)
    .map(([k, v]) => `${k}=${typeof v === 'string' || typeof v === 'number' ? v : '…'}`)
    .join(', ')
}
