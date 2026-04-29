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
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { SchemaFieldsBuilder } from './SchemaFieldsBuilder'
import { createSkillTemplate, updateSkillTemplate } from '@/services/skillTemplatesApi'
import type {
  SkillTemplate,
  JsonSchemaObject,
  SkillHttpMethod,
  CreateSkillTemplatePayload,
} from '@/types/skills'
import { cn } from '@/lib/utils'
import { AlertCircle, Beaker, Loader2, Save } from 'lucide-react'

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
}

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
  const isEdit = !!template
  const [form, setForm] = useState<FormState>(() => fromTemplate(template, user?.tenantId ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Tracks whether the user has manually touched the slug — until then,
  // typing the name keeps slug auto-synced for convenience on new templates.
  const [slugTouched, setSlugTouched] = useState(isEdit)

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

  async function handleSubmit() {
    if (validation.error) {
      setError(validation.error)
      return
    }
    setSaving(true)
    setError(null)
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
        })
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
        }
        const created = await createSkillTemplate(payload)
        navigate(`/admin/skill-templates/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger">{error}</p>
        </div>
      )}

      {/* ── A. Identidade ───────────────────────────────────────────────── */}
      <Section title="Identidade" hint="Como esse template aparece para a equipe Oryon e como ele é encontrado.">
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
          hint="Identificador único no banco. Use {cliente_ou_categoria}__{capacidade}."
        >
          <Input
            value={form.slug}
            onChange={(e) => { setSlugTouched(true); update('slug', e.target.value) }}
            placeholder="serramed__marcar_consulta"
            disabled={isEdit}
          />
          {isEdit && (
            <p className="text-[11px] text-surface-500 mt-1">
              Slug não pode ser alterado depois de criado.
            </p>
          )}
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
          <Select value={form.category} onChange={(e) => update('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Escopo">
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.scope === 'public'}
                onChange={() => update('scope', 'public')}
                disabled={isEdit}
                className="mt-1 accent-brand-500"
              />
              <span>
                <span className="text-sm text-surface-100">Público</span>
                <span className="block text-[11px] text-surface-500">
                  Disponível para qualquer tenant ativar.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.scope === 'private'}
                onChange={() => update('scope', 'private')}
                disabled={isEdit}
                className="mt-1 accent-brand-500"
              />
              <span>
                <span className="text-sm text-surface-100">Privado a um tenant</span>
                <span className="block text-[11px] text-surface-500">
                  Só o tenant escolhido vê esse template.
                </span>
              </span>
            </label>
            {form.scope === 'private' && (
              <Input
                value={form.tenant_id}
                onChange={(e) => update('tenant_id', e.target.value)}
                placeholder="UUID do tenant (ex: 565df6de-fc4b-...)"
                disabled={isEdit}
              />
            )}
          </div>
          {isEdit && (
            <p className="text-[11px] text-surface-500 mt-1">
              Escopo e tenant não podem ser alterados depois de criados.
            </p>
          )}
        </Field>
        <RowSwitch
          label="Operação destrutiva"
          hint="Marque se a skill altera dados externos (ex: marcar/cancelar consulta). A UI do cliente mostrará um aviso."
          checked={form.mutates}
          onChange={(v) => update('mutates', v)}
        />
      </Section>

      {/* ── B. Para a IA ───────────────────────────────────────────────── */}
      <Section
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
      </Section>

      {/* ── C. Configuração da integração ─────────────────────────────── */}
      <Section
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

      {/* ── D. Conexão n8n ─────────────────────────────────────────────── */}
      <Section title="Conexão n8n" hint="Endpoint para onde o agent-server vai postar a chamada assinada por HMAC.">
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

      {/* ── Footer actions ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/admin/skill-templates')}
          className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
        >
          Cancelar
        </button>
        <div className="flex items-center gap-2">
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
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              'bg-brand-600 text-surface-950 hover:bg-brand-500',
              saving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar template'}
          </button>
        </div>
      </div>
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
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-surface-900/50 border border-surface-800 rounded-xl p-5">
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

function RowSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm text-surface-100">{label}</p>
        {hint && <p className="text-[11px] text-surface-500 mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}
