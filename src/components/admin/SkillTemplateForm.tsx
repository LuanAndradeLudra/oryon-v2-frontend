// ─── Skill Template Form ───────────────────────────────────────────────────
// Used by both create (/admin/skill-templates/new) and edit
// (/admin/skill-templates/:id) pages. Mirrors the four conceptual sections
// from the Phase 2 plan:
//   A. Identidade            — slug, name, description, category, scope, mutates
//   B. Para a IA             — llm_name, llm_description, input_schema
//   C. Configuração          — config_schema (filled by Oryon staff at attach
//                              time, never visible to the customer)
//   D. Conexão n8n           — webhook_path, http_method, timeout_ms

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Stepper, type StepperSection } from '@/components/ui/Stepper'
import { ToastContainer } from '@/components/ui/Toast'
import { SchemaFieldsBuilder } from './SchemaFieldsBuilder'
import { CategoryPills } from './CategoryPills'
import { ScopeSelector, type ScopeValue } from './ScopeSelector'
import { useToast } from '@/hooks/useToast'
import { createSkillTemplate, updateSkillTemplate, listSkillTemplateInstances } from '@/services/skillTemplatesApi'
import { ConfirmModal } from '@/components/ui/Modal'
import type {
  SkillTemplate,
  JsonSchemaObject,
  SkillHttpMethod,
  CreateSkillTemplatePayload,
} from '@/types/skills'
import { cn } from '@/lib/utils'
import {
  Beaker, Loader2, Save, ShieldAlert, Copy, Check,
  IdCard, Bot, Settings as SettingsIcon, PlugZap,
  ArrowLeft, ArrowRight,
} from 'lucide-react'

type StepId = 'identity' | 'ai' | 'config' | 'n8n'
const STEP_ORDER: StepId[] = ['identity', 'ai', 'config', 'n8n']

interface Props {
  /** When provided, the form is in edit mode and pre-fills from this template. */
  template?: SkillTemplate | null
}

const SLUG_RE = /^[a-z0-9_]+(?:__[a-z0-9_]+)*$/
const LLM_NAME_RE = /^[a-z][a-z0-9_]*$/
const CATEGORIES = ['clinic', 'crm', 'calendar', 'custom'] as const

const EMPTY_INPUT_SCHEMA: JsonSchemaObject = { type: 'object', properties: {}, required: [] }
const EMPTY_CONFIG_SCHEMA: JsonSchemaObject = { type: 'object', properties: {}, required: [] }

interface FormState {
  slug: string
  name: string
  description: string
  category: string
  llm_name: string
  llm_description: string
  input_schema: JsonSchemaObject
  config_schema: JsonSchemaObject
  webhook_path: string
  http_method: SkillHttpMethod
  timeout_ms: number
  mutates: boolean
  scope: 'public' | 'private'
  tenant_id: string // populated only when scope === 'private'
  /** Operational instructions automatically injected into the system_prompt
   *  of every agent that has this skill attached. Empty string == no fragment. */
  prompt_fragment: string
}

const PROMPT_FRAGMENT_MAX = 2_000

function fromTemplate(t: SkillTemplate | null | undefined, fallbackTenantId: string): FormState {
  if (!t) {
    return {
      slug: '',
      name: '',
      description: '',
      category: 'custom',
      llm_name: '',
      llm_description: '',
      input_schema: EMPTY_INPUT_SCHEMA,
      config_schema: EMPTY_CONFIG_SCHEMA,
      webhook_path: '',
      http_method: 'POST',
      timeout_ms: 30_000,
      mutates: false,
      scope: 'public',
      tenant_id: fallbackTenantId,
      prompt_fragment: '',
    }
  }
  const inputSchema = (t.input_schema && (t.input_schema as JsonSchemaObject).type === 'object')
    ? (t.input_schema as JsonSchemaObject)
    : EMPTY_INPUT_SCHEMA
  const configSchema = (t.config_schema && !Array.isArray(t.config_schema) && (t.config_schema as JsonSchemaObject).type === 'object')
    ? (t.config_schema as JsonSchemaObject)
    : EMPTY_CONFIG_SCHEMA
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    llm_name: t.llm_name,
    llm_description: t.llm_description,
    input_schema: inputSchema,
    config_schema: configSchema,
    webhook_path: t.webhook_path,
    http_method: t.http_method,
    timeout_ms: t.timeout_ms,
    mutates: t.mutates,
    scope: t.tenant_id ? 'private' : 'public',
    tenant_id: t.tenant_id ?? '',
    prompt_fragment: t.prompt_fragment ?? '',
  }
}

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function SkillTemplateForm({ template }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const isEdit = !!template
  const [form, setForm] = useState<FormState>(() => fromTemplate(template, user?.tenantId ?? ''))
  const [saving, setSaving] = useState(false)
  // Cascade gate: when editing a template's config_schema and there are
  // attached instances, the next Save click pops a confirmation first so
  // the operator knows how many agent configs may end up flagged as
  // "desatualizada" by the change. Null = no pending gate.
  const [cascade, setCascade] = useState<{ instanceCount: number } | null>(null)
  // Tracks whether the user has manually touched the slug — until then,
  // typing the name keeps slug auto-synced for convenience on new templates.
  const [slugTouched, setSlugTouched] = useState(isEdit)
  // Wizard-mode: only one step is visible at a time. Navigation between
  // steps is handled by the Stepper (jump) and the footer Voltar/Continuar
  // buttons. Final step's primary CTA flips to "Criar template".
  const [currentStep, setCurrentStep] = useState<StepId>('identity')

  // Re-sync state when the template prop arrives later (lazy fetch).
  useEffect(() => {
    setForm(fromTemplate(template, user?.tenantId ?? ''))
    setSlugTouched(!!template)
  }, [template, user?.tenantId])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : slugify(value),
    }))
  }

  const validation = useMemo(() => validateForm(form, isEdit), [form, isEdit])

  // Per-section completeness — drives the green checks on the stepper. Each
  // bullet flips to "done" the moment the section's required inputs are
  // present, giving the operator constant feedback while filling the form.
  const sectionStatus = useMemo(() => ({
    identity: !!form.name.trim() && !!form.description.trim() && (isEdit || SLUG_RE.test(form.slug)) && (form.scope === 'public' || /^[0-9a-f-]{36}$/i.test(form.tenant_id)),
    ai: LLM_NAME_RE.test(form.llm_name) && !!form.llm_description.trim() && Object.keys(form.input_schema.properties ?? {}).length > 0,
    config: true, // optional section — always considered "done"
    n8n: form.webhook_path.startsWith('/') && !form.webhook_path.startsWith('//') && !form.webhook_path.includes('://') && form.timeout_ms >= 1000 && form.timeout_ms <= 60_000,
  }), [form, isEdit])

  const sections: StepperSection[] = [
    { id: 'identity', label: 'Identidade',   icon: IdCard,        complete: sectionStatus.identity },
    { id: 'ai',       label: 'Para a IA',    icon: Bot,           complete: sectionStatus.ai },
    { id: 'config',   label: 'Configuração', icon: SettingsIcon,  complete: sectionStatus.config },
    { id: 'n8n',      label: 'n8n',          icon: PlugZap,       complete: sectionStatus.n8n },
  ]

  const stepIndex = STEP_ORDER.indexOf(currentStep)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === STEP_ORDER.length - 1

  function goToStep(id: StepId) {
    setCurrentStep(id)
    // Bring the wizard panel back into view in case the user scrolled.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function goPrev() {
    if (isFirstStep) return
    goToStep(STEP_ORDER[stepIndex - 1])
  }
  function goNext() {
    if (isLastStep) return
    goToStep(STEP_ORDER[stepIndex + 1])
  }

  /** True when the operator changed the config_schema (deep stringify is
   *  enough — both sides come from the same JSON-Schema editor and key order
   *  is stable). Drives the cascade-warning gate below. */
  function configSchemaChanged(): boolean {
    if (!template) return false
    return JSON.stringify(form.config_schema) !== JSON.stringify(template.config_schema)
  }

  async function handleSubmit(skipCascadeGate = false) {
    if (validation.error) {
      toast(validation.error, 'error')
      return
    }
    // Cascade gate — only relevant when editing AND the config_schema is
    // changing. We fetch the live instance list (vs. relying on a stale
    // count cached at page load) so the modal never under-reports.
    if (!skipCascadeGate && isEdit && template && configSchemaChanged()) {
      try {
        const instances = await listSkillTemplateInstances(template.id)
        if (instances.length > 0) {
          setCascade({ instanceCount: instances.length })
          return // wait for the operator to confirm via the modal
        }
      } catch (err) {
        // Non-fatal: if we can't count instances, fall through to save.
        // The catalogue badge will surface drift after the save anyway.
        toast(`Não consegui checar instâncias antes de salvar: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    }
    setSaving(true)
    try {
      if (isEdit && template) {
        // PATCH only the editable fields. Slug + tenant_id are immutable
        // post-create on the backend.
        const updated = await updateSkillTemplate(template.id, {
          name: form.name,
          description: form.description,
          category: form.category,
          llm_name: form.llm_name,
          llm_description: form.llm_description,
          input_schema: form.input_schema,
          config_schema: form.config_schema,
          webhook_path: form.webhook_path,
          http_method: form.http_method,
          timeout_ms: form.timeout_ms,
          mutates: form.mutates,
          // Empty string == "remove the fragment". Backend collapses to NULL.
          prompt_fragment: form.prompt_fragment.trim().length > 0 ? form.prompt_fragment : null,
        })
        toast('Template atualizado', 'success')
        navigate(`/admin/skill-templates/${updated.id}`, { replace: true })
      } else {
        const payload: CreateSkillTemplatePayload = {
          slug: form.slug,
          name: form.name,
          description: form.description,
          category: form.category,
          llm_name: form.llm_name,
          llm_description: form.llm_description,
          input_schema: form.input_schema,
          config_schema: form.config_schema,
          webhook_path: form.webhook_path,
          http_method: form.http_method,
          timeout_ms: form.timeout_ms,
          mutates: form.mutates,
          tenant_id: form.scope === 'private' ? form.tenant_id : null,
          prompt_fragment: form.prompt_fragment.trim().length > 0 ? form.prompt_fragment : null,
        }
        const created = await createSkillTemplate(payload)
        toast('Template criado', 'success')
        navigate(`/admin/skill-templates/${created.id}`, { replace: true })
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper — full-width row, used both as visual progress and as
          direct navigation. The operator can jump to any step at any
          time; validation is enforced only on the final submit. */}
      <div className="px-1 py-3">
        <Stepper sections={sections} active={currentStep} onJump={(id) => goToStep(id as StepId)} />
      </div>

      {/* Animated single-step container — only the current step's fields
          render. Sliding transition makes the wizard feel like a flow
          instead of a long form chopped into accordions. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >

      {/* ── A. Identidade ───────────────────────────────────────────────── */}
      {currentStep === 'identity' && (
      <Section id="identity" title="Identidade" hint="Como esse template aparece para a equipe Oryon e como ele é encontrado.">
        <Field label="Nome amigável" required>
          <Input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="ex: Marcar Consulta — SerraMed"
          />
        </Field>
        <Field
          label="Slug técnico"
          required
          hint={isEdit
            ? 'Identificador único no banco. Imutável após criação.'
            : 'Auto-gerado a partir do nome — edite só se precisar customizar.'}
        >
          <SlugField
            value={form.slug}
            onChange={(v) => { setSlugTouched(true); update('slug', v) }}
            disabled={isEdit}
          />
        </Field>
        <Field label="Descrição interna" required hint="Uma frase para você lembrar o que esse template faz.">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Marca uma consulta verificando disponibilidade do médico antes."
          />
        </Field>
        <Field label="Categoria">
          <CategoryPills
            value={form.category}
            onChange={(v) => update('category', v)}
          />
        </Field>
        <Field label="Escopo">
          <ScopeSelector
            value={
              form.scope === 'private'
                ? { kind: 'private', tenantId: form.tenant_id }
                : { kind: 'public' }
            }
            onChange={(v: ScopeValue) => {
              if (v.kind === 'public') {
                update('scope', 'public')
                update('tenant_id', '')
              } else {
                update('scope', 'private')
                update('tenant_id', v.tenantId)
              }
            }}
            disabled={isEdit}
          />
        </Field>
        <DestructiveCallout
          checked={form.mutates}
          onChange={(v) => update('mutates', v)}
        />
      </Section>
      )}

      {/* ── B. Para a IA ───────────────────────────────────────────────── */}
      {currentStep === 'ai' && (
      <Section
        id="ai"
        title="Para a IA"
        hint="Como a IA descobre quando usar a skill e quais campos preencher na chamada."
      >
        <Field
          label="Nome para a IA"
          required
          hint="Identificador snake_case que a IA verá na lista de tools."
        >
          <Input
            value={form.llm_name}
            onChange={(e) => update('llm_name', e.target.value)}
            placeholder="marcar_consulta"
          />
        </Field>
        <Field
          label="Descrição para a IA"
          required
          hint="Diga em linguagem clara QUANDO usar essa skill e o que perguntar antes. A IA lê isso a cada turno."
        >
          <Textarea
            rows={4}
            value={form.llm_description}
            onChange={(e) => update('llm_description', e.target.value)}
            placeholder="Use SEMPRE que o cliente quiser marcar uma nova consulta. Pergunte nome, especialidade desejada, data preferida e telefone…"
          />
        </Field>
        <Field
          label="Campos que a IA preenche"
          hint="A IA produz esses valores no momento de chamar a skill. Configure obrigatórios + tipos."
        >
          <SchemaFieldsBuilder
            value={form.input_schema}
            onChange={(s) => update('input_schema', s)}
            emptyHint="Nenhum campo. Adicione os parâmetros que a IA deve coletar do cliente."
          />
        </Field>

        {/* ── prompt_fragment ────────────────────────────────────────────
            Texto operacional anexado AUTOMATICAMENTE ao system_prompt do
            agente quando essa skill estiver ativa. Permite ditar boas
            práticas de uso da skill sem precisar editar o prompt do
            cliente. Limite duro de 2000 chars (validado no servidor). */}
        <Field
          label="Instruções para o agente (opcional)"
          hint="Anexado automaticamente ao prompt de TODO agente que tem essa skill — sem o cliente precisar editar nada. Use para ditar fluxo, etapas obrigatórias, ou avisos. Máximo 2000 caracteres."
        >
          <Textarea
            rows={6}
            value={form.prompt_fragment}
            onChange={(e) => {
              // Limita no input pra evitar paste de 10k chars derrubar a UI;
              // backend reforça o limite real em validatePromptFragment().
              const v = e.target.value.slice(0, PROMPT_FRAGMENT_MAX)
              update('prompt_fragment', v)
            }}
            placeholder={`Antes de chamar essa skill, sempre confirme com o paciente:
- Nome completo
- Data e horário escolhidos
- Médico (se mencionado)

Depois de criar a consulta, envie uma confirmação amigável com emoji ✅.`}
          />
          <div className={cn(
            'mt-1.5 text-[11px] flex items-center justify-between',
            form.prompt_fragment.length > PROMPT_FRAGMENT_MAX * 0.95
              ? 'text-status-pending'
              : form.prompt_fragment.length > PROMPT_FRAGMENT_MAX * 0.75
                ? 'text-warning'
                : 'text-surface-500',
          )}>
            <span>
              {form.prompt_fragment.trim().length === 0
                ? 'Vazio — nada será injetado no prompt do agente.'
                : 'Será injetado no prompt do agente automaticamente.'}
            </span>
            <span className="font-mono tabular-nums">
              {form.prompt_fragment.length} / {PROMPT_FRAGMENT_MAX}
            </span>
          </div>
        </Field>
      </Section>
      )}

      {/* ── C. Configuração da integração ─────────────────────────────── */}
      {currentStep === 'config' && (
      <Section
        id="config"
        title="Configuração da integração (Oryon staff)"
        hint="Campos preenchidos por VOCÊ ao atribuir o template ao agente de um cliente. O cliente final nunca vê esses valores."
      >
        <Field
          label="Campos de configuração"
          hint="Tokens, IDs específicos do cliente, parâmetros de unidade etc. Marque sensíveis para que sejam mascarados."
        >
          <SchemaFieldsBuilder
            value={form.config_schema}
            onChange={(s) => update('config_schema', s)}
            allowSecret
            emptyHint="Sem configuração necessária. Adicione campos se a integração precisar de tokens, IDs, etc."
          />
        </Field>
      </Section>
      )}

      {/* ── D. Conexão n8n ─────────────────────────────────────────────── */}
      {currentStep === 'n8n' && (
      <Section id="n8n" title="Conexão n8n" hint="Endpoint para onde o agent-server vai postar a chamada assinada por HMAC.">
        <Field
          label="Webhook path"
          required
          hint="APENAS o caminho relativo, começando com /. NÃO cole a URL completa — o host vem de N8N_BASE_URL no servidor."
        >
          <Input
            value={form.webhook_path}
            onChange={(e) => update('webhook_path', e.target.value)}
            placeholder="/webhook/marcar-consulta"
          />
        </Field>
        <Field label="Método HTTP">
          <Select
            value={form.http_method}
            onChange={(e) => update('http_method', e.target.value as SkillHttpMethod)}
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </Select>
        </Field>
        <Field
          label="Timeout (ms)"
          hint="Entre 1.000 e 60.000. Default 30.000."
        >
          <Input
            type="number"
            min={1000}
            max={60000}
            step={1000}
            value={form.timeout_ms}
            onChange={(e) => update('timeout_ms', Number(e.target.value))}
          />
        </Field>
      </Section>
      )}

        </motion.div>
      </AnimatePresence>

      {/* ── Wizard footer ──────────────────────────────────────────────── */}
      {/* Left: cancel (always). Right: prev/next when mid-flow, plus the
          primary CTA on the last step. We expose the test shortcut and the
          submit only on the last step so the operator knows they reviewed
          everything before saving. */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-surface-800/60">
        <button
          type="button"
          onClick={() => navigate('/admin/skill-templates')}
          className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
        >
          Cancelar
        </button>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-surface-950 hover:bg-brand-500 active:scale-[0.98] transition-colors"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              {isEdit && template && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/skill-templates/${template.id}/test`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-100 text-sm font-medium transition-colors"
                >
                  <Beaker className="w-4 h-4" /> Testar
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  'bg-brand-600 text-surface-950 hover:bg-brand-500 active:scale-[0.98]',
                  saving && 'opacity-60 cursor-not-allowed',
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar template'}
              </button>
            </>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Cascade warning — fires only when editing AND the operator changed
          config_schema AND there are attached instances. Confirmation calls
          handleSubmit(skipCascadeGate=true) so the save proceeds without
          re-triggering the check. */}
      <ConfirmModal
        open={!!cascade}
        onClose={() => saving ? undefined : setCascade(null)}
        onConfirm={() => {
          setCascade(null)
          void handleSubmit(true)
        }}
        title="Mudança no schema afeta instâncias atribuídas"
        description={cascade
          ? `Este template tem ${cascade.instanceCount} ${cascade.instanceCount === 1 ? 'instância atribuída' : 'instâncias atribuídas'}. ` +
            `Mudar o config_schema pode deixá-las desatualizadas (badge "⚠ desatualizada" na lista de instâncias) até o config de cada agente ser corrigido. Continuar?`
          : ''}
        confirmLabel="Salvar mesmo assim"
        danger
        loading={saving}
      />
    </div>
  )
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateForm(form: FormState, isEdit: boolean): { error: string | null } {
  if (!form.name.trim()) return { error: 'Nome é obrigatório.' }
  if (!form.description.trim()) return { error: 'Descrição é obrigatória.' }
  if (!isEdit) {
    if (!SLUG_RE.test(form.slug)) {
      return { error: 'Slug inválido — use [a-z0-9_]+ com __ entre segmentos.' }
    }
  }
  if (!LLM_NAME_RE.test(form.llm_name)) {
    return { error: 'Nome para a IA deve começar com letra minúscula e usar apenas a-z 0-9 _.' }
  }
  if (!form.llm_description.trim()) {
    return { error: 'Descrição para a IA é obrigatória — é o que ensina a IA quando usar a skill.' }
  }
  if (!form.webhook_path.startsWith('/')) {
    return { error: 'Webhook path deve começar com /.' }
  }
  if (form.webhook_path.startsWith('//') || form.webhook_path.includes('://')) {
    return {
      error: 'Webhook path deve ser apenas o caminho (ex: /webhook/marcar-consulta), sem protocolo ou host.',
    }
  }
  if (!Number.isFinite(form.timeout_ms) || form.timeout_ms < 1000 || form.timeout_ms > 60_000) {
    return { error: 'Timeout deve estar entre 1.000 e 60.000 ms.' }
  }
  if (!isEdit && form.scope === 'private') {
    if (!/^[0-9a-f-]{36}$/i.test(form.tenant_id)) {
      return { error: 'UUID do tenant inválido.' }
    }
  }
  return { error: null }
}

// ─── Layout helpers ────────────────────────────────────────────────────────

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      data-section={id}
      className="bg-surface-900/50 border border-surface-800 rounded-xl p-5 scroll-mt-24"
    >
      <header className="mb-4">
        <h2 className="text-base font-semibold text-surface-100 mb-0.5">{title}</h2>
        {hint && <p className="text-sm text-surface-400">{hint}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-200 mb-1">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-surface-500 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Slug field — auto-derived, copy-able in edit mode ─────────────────────
// In create mode the slug is derived from the friendly name and shown in
// font-mono so it visually reads as "code" rather than user-typed prose.
// In edit mode the slug is immutable, so we render it read-only with a
// copy button instead of a disabled input — clearer affordance.

function SlugField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const [copied, setCopied] = useState(false)

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900 border border-surface-800">
        <code className="flex-1 font-mono text-sm text-surface-200 truncate">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => {})
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-surface-300 hover:bg-surface-800 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'copiado' : 'copiar'}
        </button>
      </div>
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="serramed__marcar_consulta"
      className="font-mono"
    />
  )
}

// ─── Destructive callout — visually proportional to the risk ────────────────
// "Operação destrutiva" used to be a plain switch row. When toggled, the
// callout flips colour to amber and previews the exact label the customer
// will see, so the operator can't miss the implication.

function DestructiveCallout({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        checked
          ? 'bg-status-pending-bg/40 border-status-pending-border'
          : 'bg-surface-900 border-surface-800',
      )}
    >
      <ShieldAlert
        className={cn(
          'w-4 h-4 flex-shrink-0 mt-0.5 transition-colors',
          checked ? 'text-status-pending' : 'text-surface-500',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', checked ? 'text-status-pending' : 'text-surface-100')}>
          Operação destrutiva
        </p>
        <p className="text-[11px] text-surface-500 mt-0.5">
          Marque se a skill altera dados externos (ex: marcar / cancelar consulta).
        </p>
        {checked && (
          <p className="text-[11px] text-status-pending mt-2">
            ⚠ O cliente verá um chip <code className="px-1 rounded bg-status-pending-bg text-status-pending">destrutiva</code> no card desta skill.
          </p>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}
