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
import { Loader2, Save, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { DynamicSchemaFormFields } from './DynamicSchemaFormFields'
import { updateAgentSkill } from '@/services/agentSkillsApi'
import type { AgentSkillWithTemplate, JsonSchemaObject } from '@/types/skills'
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
          <p className="text-[11px] text-surface-500">
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

      {/* ── Config schema ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-surface-100">Configuração da integração</h3>
          <p className="text-[11px] text-surface-500">
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
          <p className="text-[11px] text-status-pending mt-3">
            Preencha {missingRequired.map((n) => `"${n}"`).join(', ')} antes de salvar.
          </p>
        )}
      </section>

      {/* ── LLM overrides (optional) ──────────────────────────────────────── */}
      <section>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-surface-100">Como a IA vê esta skill (opcional)</h3>
          <p className="text-[11px] text-surface-500">
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
    </Modal>
  )
}
