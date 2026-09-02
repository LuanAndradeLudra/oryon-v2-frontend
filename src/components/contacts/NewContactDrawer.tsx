import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, User, Phone, Mail, Building2, Briefcase,
  Tag as TagIcon, ToggleLeft, ToggleRight, ChevronDown,
  Loader2, Check,
} from 'lucide-react'
import { cn, getDefaultPipeline, getPipelineStages, getActivePipelines } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { tagsApi, dealsApi } from '@/services/api'
import type { Contact, ContactSource, Tag, Pipeline } from '@/types'
import { Input } from '@/components/ui/Input'
import { PhoneField } from '@/components/ui/PhoneField'
import { FormFieldContext, useFieldAria } from '@/components/ui/formField.context'

const SOURCE_OPTIONS: { value: ContactSource; label: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'website',   label: 'Website' },
  { value: 'referral',  label: 'Indicação' },
  { value: 'campaign',  label: 'Campanha' },
  { value: 'manual',    label: 'Manual' },
  { value: 'other',     label: 'Outro' },
]

interface NewContactDrawerProps {
  open: boolean
  onClose: () => void
  onCreate: (dto: Partial<Contact> & { displayName: string; waId: string }) => Promise<Contact>
  onCreated?: (contact: Contact) => void
  /** Funis de negócio do tenant — todo novo lead precisa nascer com um negócio
   *  num funil (spec: "selecionar obrigatoriamente em qual funil esse contato vai"). */
  pipelines: Pipeline[]
  /** Pré-seleciona o funil em vista no momento em que o drawer foi aberto. */
  defaultPipelineId?: string | null
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

/**
 * Invólucro de campo com a linguagem visual deste drawer (rótulo em peso médio,
 * selo Obrigatório/Opcional como chip à direita) — diferente do `FormField` do
 * DS de propósito.
 *
 * A **semântica** vem do mesmo lugar que a do `FormField` (`useFieldAria`): o
 * rótulo aponta para o campo, hint e erro são anunciados, obrigatório vira
 * `aria-required`. Só a casca é local. Os campos filhos precisam ser primitivos
 * do DS (`Input`, `PhoneField`, `Select`) para lerem o contexto.
 */
function Field({ label, required, hint, error, children }: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  const { fieldId, hintId, errorId, aria } = useFieldAria({ hint, error, required })
  return (
    <FormFieldContext.Provider value={aria}>
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-xs font-medium text-surface-300">{label}</label>
        {required
          ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none color-chip border"
              style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
            >
              Obrigatório
            </span>
          )
          : <span className="text-[10px] font-medium text-surface-600 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full leading-none">Opcional</span>
        }
      </div>
      {children}
      {hint && !error && <p id={hintId} className="text-[11px] text-surface-600">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-[11px] text-red-400">{error}</p>}
    </div>
    </FormFieldContext.Provider>
  )
}

const inputCls = (error?: boolean) => cn(
  'w-full bg-surface-800 border rounded-lg px-3 py-2 text-sm text-surface-100 placeholder-surface-600',
  'focus:outline-none focus:ring-1 transition-colors',
  error
    ? 'border-red-500/60 focus:ring-red-500/40'
    : 'border-surface-700 focus:ring-brand-500/40 focus:border-brand-500/60',
)

// ─── Tags dropdown ─────────────────────────────────────────────────────────────

function TagsSelector({ selected, onChange }: { selected: Tag[]; onChange: (tags: Tag[]) => void }) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    tagsApi.list().then((r) => setAllTags(r.data)).catch(() => {})
  }, [])

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (tag: Tag) => {
    const exists = selected.some((s) => s.id === tag.id)
    onChange(exists ? selected.filter((s) => s.id !== tag.id) : [...selected, tag])
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between bg-surface-800 border border-surface-700 rounded-lg px-3 py-2',
          'text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 transition-colors',
          open && 'border-brand-500/60 ring-1 ring-brand-500/40',
        )}
      >
        <span className="flex items-center gap-1.5 flex-wrap min-h-[20px]">
          {selected.length === 0 ? (
            <span className="text-surface-600">Selecionar etiquetas…</span>
          ) : (
            selected.map((tag) => (
              <span
                key={tag.id}
                className="color-chip inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{ ['--chip']: tag.color } as React.CSSProperties}
              >
                {tag.name}
              </span>
            ))
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-surface-500 flex-shrink-0 ml-1 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 overlay-surface border rounded-xl overflow-hidden"
          >
            <div className="p-2 border-b border-surface-700">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar etiqueta…"
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 placeholder-surface-600 focus:outline-none"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-surface-600 text-center py-3">Nenhuma etiqueta encontrada</p>
              ) : (
                filtered.map((tag) => {
                  const active = selected.some((s) => s.id === tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggle(tag)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs text-surface-200">{tag.name}</span>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-brand-400" />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NewContactDrawer({ open, onClose, onCreate, onCreated, pipelines, defaultPipelineId }: NewContactDrawerProps) {
  const { stages, fieldDefs } = useCRMConfig()
  const { toast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [waId, setWaId]               = useState('')
  const [email, setEmail]             = useState('')
  const [company, setCompany]         = useState('')
  const [jobTitle, setJobTitle]       = useState('')
  const [source, setSource]           = useState<ContactSource | ''>('')
  const [stage, setStage]             = useState('')
  const multiPipeline = useMultiPipeline()
  const [pipelineId, setPipelineId]   = useState('')
  const [pipelineStageId, setPipelineStageId] = useState('')
  const [optIn, setOptIn]             = useState(false)
  const [tags, setTags]               = useState<Tag[]>([])
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  const [errors, setErrors]   = useState<{ displayName?: string; waId?: string; pipelineId?: string }>({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setDisplayName(''); setWaId(''); setEmail(''); setCompany('')
      setJobTitle(''); setSource(''); setStage(''); setPipelineId('')
      setPipelineStageId(''); setOptIn(false)
      setTags([]); setCustomValues({}); setErrors({}); setSaved(false)
    }
  }, [open])

  // Default stage = first stage
  useEffect(() => {
    if (stages.length > 0 && !stage) setStage(stages[0].key)
  }, [stages, stage])

  // Funil pré-selecionado: o funil em vista (se algum), senão o default do
  // tenant. Depende de `pipelines`/`defaultPipelineId` (não só `open`) para
  // não travar em '' caso o drawer seja aberto antes de `pipelines` carregar
  // — quando a lista chegar depois, este efeito preenche o valor.
  useEffect(() => {
    if (open && !pipelineId && pipelines.length > 0) {
      setPipelineId(defaultPipelineId ?? getDefaultPipeline(pipelines)?.id ?? '')
    }
  }, [open, pipelines, defaultPipelineId, pipelineId])

  // "Estágio do funil" — eixo distinto de `stage` acima (ciclo de vida do
  // contato). Reativo à troca de funil: se o estágio selecionado não existe
  // mais no funil atual, recai pro 1º estágio não-terminal dele.
  useEffect(() => {
    const opts = getPipelineStages(pipelines, pipelineId)
    if (!opts.some((s) => s.id === pipelineStageId)) {
      setPipelineStageId(opts[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId, pipelines])

  const validate = () => {
    const e: typeof errors = {}
    if (!displayName.trim()) e.displayName = 'Nome é obrigatório'
    if (!waId.trim()) e.waId = 'Número WhatsApp é obrigatório'
    else if (!/^\d{10,15}$/.test(waId.replace(/\D/g, ''))) e.waId = 'Formato inválido (somente números)'
    // Gate de múltiplos funis (SCRUM-498): sem o flag o campo não existe,
    // logo não pode bloquear o cadastro.
    if (multiPipeline && !pipelineId) e.pipelineId = 'Funil é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const customFields = fieldDefs
        .filter((f) => customValues[f.key] !== undefined && customValues[f.key] !== '')
        .map((f) => ({ key: f.key, label: f.label, value: customValues[f.key], type: f.type }))

      const dto: Parameters<typeof onCreate>[0] = {
        displayName: displayName.trim(),
        waId: waId.replace(/\D/g, ''),
        ...(email.trim()    && { email: email.trim() }),
        ...(company.trim()  && { company: company.trim() }),
        ...(jobTitle.trim() && { jobTitle: jobTitle.trim() }),
        ...(source          && { source: source as ContactSource }),
        ...(stage           && { stage }),
        optIn,
        ...(tags.length > 0 && { tags }),
        ...(customFields.length > 0 && { customFields }),
      }

      const created = await onCreate(dto)

      // Todo lead nasce com um negócio no funil escolhido (spec: seleção
      // obrigatória de funil). Best-effort: o contato já foi criado com
      // sucesso, então uma falha aqui não desfaz o contato — só avisa.
      // Sem o gate de funis não há negócio automático (comportamento legado).
      if (multiPipeline) {
        try {
          await dealsApi.create({
            contactId: created.id,
            title: created.displayName,
            pipelineId,
            stageId: pipelineStageId || undefined,
          })
        } catch {
          toast('Contato criado, mas não foi possível criar o negócio no funil. Adicione manualmente pela ficha do contato.', 'error')
        }
      }

      setSaved(true)
      setTimeout(() => {
        onCreated?.(created)
        onClose()
      }, 800)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      const errorText = Array.isArray(msg) ? msg[0] : (typeof msg === 'string' ? msg : 'Erro ao criar contato.')
      toast(errorText, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="nc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-[39]"
            onClick={onClose}
          />

          <motion.div
            key="nc-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-50">Novo contato</h2>
                <p className="text-xs text-surface-500 mt-0.5">Preencha as informações do novo lead</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* ── Identificação ── */}
              <section>
                <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-widest mb-3">
                  Identificação
                </p>
                <div className="space-y-3">
                  <Field label="Nome" required error={errors.displayName}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <Input
                        value={displayName}
                        onChange={(e) => { setDisplayName(e.target.value); setErrors((v) => ({ ...v, displayName: undefined })) }}
                        placeholder="Ex: João da Silva"
                        maxLength={120}
                        className="pl-9"
                      />
                    </div>
                  </Field>

                  {/* O formato deixou de viver só no placeholder: a máscara
                      formata enquanto se digita e o hint fica na tela. O estado
                      (`waId`) continua recebendo só dígitos. */}
                  <Field
                    label="WhatsApp (número)"
                    required
                    error={errors.waId}
                    hint="Código do país + DDD + número — ex.: 55 11 99988-7766."
                  >
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <PhoneField
                        value={waId}
                        onChange={(digits) => { setWaId(digits); setErrors((v) => ({ ...v, waId: undefined })) }}
                        className="pl-9 font-mono"
                      />
                    </div>
                  </Field>

                  <Field label="E-mail">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="joao@empresa.com"
                        type="email"
                        className={cn(inputCls(), 'pl-9')}
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* ── Empresa ── */}
              <section>
                <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-widest mb-3">
                  Empresa
                </p>
                <div className="space-y-3">
                  <Field label="Empresa">
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Nome da empresa"
                        className={cn(inputCls(), 'pl-9')}
                      />
                    </div>
                  </Field>

                  <Field label="Cargo">
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      <input
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Ex: Gerente Comercial"
                        className={cn(inputCls(), 'pl-9')}
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* ── CRM ── */}
              <section>
                <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-widest mb-3">
                  CRM
                </p>
                <div className="space-y-3">
                  {/* Funil + estágio do funil só existem com o gate de
                      múltiplos funis (SCRUM-498). Sem ele, o cadastro é o
                      legado: nome/telefone + estágio do contato. */}
                  {multiPipeline && (
                  <Field label="Funil" required>
                    <div className="relative">
                      <select
                        value={pipelineId}
                        onChange={(e) => { setPipelineId(e.target.value); setErrors((v) => ({ ...v, pipelineId: undefined })) }}
                        className={cn(inputCls(!!errors.pipelineId), 'appearance-none pr-8')}
                      >
                        {getActivePipelines(pipelines).length === 0 && <option value="">Nenhum funil disponível</option>}
                        {getActivePipelines(pipelines).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                    </div>
                    {errors.pipelineId
                      ? <p className="text-[11px] text-red-400">{errors.pipelineId}</p>
                      : <p className="text-[11px] text-surface-600">O contato nasce com um negócio aberto neste funil.</p>
                    }
                  </Field>
                  )}

                  <div className={cn('grid gap-3', multiPipeline ? 'grid-cols-2' : 'grid-cols-1')}>
                    {/* Estágio do FUNIL — coluna do board em que o negócio
                        nasce. Eixo distinto de "Estágio do contato" abaixo
                        (ciclo de vida) — modelo híbrido, os dois não se
                        confundem. Reativo ao funil escolhido acima. */}
                    {multiPipeline && (
                    <Field label="Estágio do funil">
                      <div className="relative">
                        <select
                          value={pipelineStageId}
                          onChange={(e) => setPipelineStageId(e.target.value)}
                          className={cn(inputCls(), 'appearance-none pr-8')}
                        >
                          {getPipelineStages(pipelines, pipelineId).length === 0 && (
                            <option value="">Nenhum estágio disponível</option>
                          )}
                          {getPipelineStages(pipelines, pipelineId).map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      </div>
                    </Field>
                    )}

                    <Field label="Estágio do contato">
                      <div className="relative">
                        <select
                          value={stage}
                          onChange={(e) => setStage(e.target.value)}
                          className={cn(inputCls(), 'appearance-none pr-8')}
                        >
                          {stages.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      </div>
                    </Field>

                    <Field label="Origem">
                      <div className="relative">
                        <select
                          value={source}
                          onChange={(e) => setSource(e.target.value as ContactSource | '')}
                          className={cn(inputCls(), 'appearance-none pr-8')}
                        >
                          <option value="">— Selecionar —</option>
                          {SOURCE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Etiquetas">
                    <div className="relative">
                      <TagIcon className="absolute left-3 top-3 w-3.5 h-3.5 text-surface-500 z-10 pointer-events-none" />
                      <div className="pl-9">
                        <TagsSelector selected={tags} onChange={setTags} />
                      </div>
                    </div>
                  </Field>

                  <Field label="Opt-in para campanhas">
                    <button
                      type="button"
                      onClick={() => setOptIn((v) => !v)}
                      className="flex items-center gap-2.5 w-fit group"
                    >
                      {optIn
                        ? <ToggleRight className="w-8 h-8 text-brand-400 transition-colors" />
                        : <ToggleLeft  className="w-8 h-8 text-surface-600 group-hover:text-surface-400 transition-colors" />
                      }
                      <span className={cn('text-xs', optIn ? 'text-brand-300' : 'text-surface-500')}>
                        {optIn ? 'Autorizado a receber campanhas' : 'Não autorizado'}
                      </span>
                    </button>
                  </Field>
                </div>
              </section>

              {/* ── Campos personalizados ── */}
              {fieldDefs.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-widest mb-3">
                    Campos personalizados
                  </p>
                  <div className="space-y-3">
                    {fieldDefs
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((def) => (
                        <Field key={def.key} label={def.label} required={def.required}>
                          {def.type === 'boolean' ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCustomValues((v) => ({
                                  ...v,
                                  [def.key]: v[def.key] === 'true' ? 'false' : 'true',
                                }))
                              }
                              className="flex items-center gap-2.5 w-fit"
                            >
                              {customValues[def.key] === 'true'
                                ? <ToggleRight className="w-8 h-8 text-brand-400" />
                                : <ToggleLeft  className="w-8 h-8 text-surface-600" />
                              }
                              <span className="text-xs text-surface-500">
                                {customValues[def.key] === 'true' ? 'Sim' : 'Não'}
                              </span>
                            </button>
                          ) : def.type === 'select' ? (
                            <div className="relative">
                              <select
                                value={customValues[def.key] ?? ''}
                                onChange={(e) =>
                                  setCustomValues((v) => ({ ...v, [def.key]: e.target.value }))
                                }
                                className={cn(inputCls(), 'appearance-none pr-8')}
                              >
                                <option value="">— Selecionar —</option>
                                {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                            </div>
                          ) : def.type === 'textarea' ? (
                            <textarea
                              value={customValues[def.key] ?? ''}
                              onChange={(e) =>
                                setCustomValues((v) => ({ ...v, [def.key]: e.target.value }))
                              }
                              placeholder={def.placeholder}
                              rows={3}
                              className={cn(inputCls(), 'resize-none')}
                            />
                          ) : (
                            <input
                              type={
                                def.type === 'number' ? 'number' :
                                def.type === 'date'   ? 'date' :
                                def.type === 'email'  ? 'email' :
                                def.type === 'url'    ? 'url' :
                                'text'
                              }
                              value={customValues[def.key] ?? ''}
                              onChange={(e) =>
                                setCustomValues((v) => ({ ...v, [def.key]: e.target.value }))
                              }
                              placeholder={def.placeholder}
                              className={inputCls()}
                            />
                          )}
                        </Field>
                      ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-800 flex-shrink-0">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || saved}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  saved
                    ? 'bg-status-active-bg text-status-active border border-status-active-border'
                    : 'bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60',
                )}
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                ) : saved ? (
                  <><Check className="w-3.5 h-3.5" /> Contato criado!</>
                ) : (
                  'Criar contato'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
