import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Bold, Italic, Strikethrough,
  Info, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, Sparkles, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplatePreview } from './TemplatePreview'
import { SubcategoryPreview } from './SubcategoryPreview'
import { templatesApi, whatsappNumbersApi } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import {
  CATEGORIES, SUBCATEGORIES, HEADER_TYPES, LANGUAGES, BUTTON_TYPES,
  CATEGORY_LABELS, SUBCATEGORY_LABELS, extractVarPositions,
} from './constants'
import type {
  WhatsAppTemplate, TemplateHeaderType, TemplateButtonType, TemplateCategoryType,
} from '@/types'
import type { SubCategory } from './SubcategoryPreview'

// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonRow = { type: TemplateButtonType; text: string; url: string; phoneNumber: string; flowId: string }

type StepNum = 1 | 2 | 3 | 4

interface TemplateCreatorProps {
  onCancel: () => void
  onSaved: (tpl: WhatsAppTemplate) => void
  editing?: WhatsAppTemplate | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Categoria', 'Mensagem', 'Botões', 'Revisão']

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateCreator({ onCancel, onSaved, editing }: TemplateCreatorProps) {
  const [step, setStep] = useState<StepNum>(1)

  const [name, setName]                     = useState('')
  const [language, setLanguage]             = useState('pt_BR')
  const [category, setCategory]             = useState<TemplateCategoryType>('MARKETING')
  const [subCategory, setSubCategory]       = useState<SubCategory>('standard')
  const [headerType, setHeaderType]         = useState<TemplateHeaderType | ''>('')
  const [headerText, setHeaderText]         = useState('')
  const [headerMediaUrl, setHeaderMediaUrl] = useState('')
  const [body, setBody]                     = useState('')
  const [footer, setFooter]                 = useState('')
  const [buttons, setButtons]               = useState<ButtonRow[]>([])
  const [varExamples, setVarExamples]       = useState<string[]>([])
  const [showAddButton, setShowAddButton]   = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  // Default line: department hint → primary → lone → operator picks.
  // Smart defaults land as the initial value; operator can still override
  // via the line select below.
  const { numbers: workspaceNumbers } = useWorkspaceNumber()
  const smartDefault = useSmartLineDefault()
  const [whatsappNumberId, setWhatsappNumberId] = useState(
    editing?.whatsappNumberId ?? '',
  )
  const [waNumbers, setWaNumbers]           = useState<Array<{ id: string; displayPhoneNumber: string; label?: string }>>([])

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Populate the select options from the workspace cache (or a direct
  // fetch fallback for non-admin deployments where /meta/numbers 403s).
  useEffect(() => {
    if (workspaceNumbers.length > 0) {
      setWaNumbers(
        workspaceNumbers.map((n) => ({
          id: n.id,
          displayPhoneNumber: n.displayPhoneNumber,
          label: n.label,
        })),
      )
      return
    }
    whatsappNumbersApi.list()
      .then((r) => {
        const nums = (r.data as any[]).map((n: any) => ({ id: n.id, displayPhoneNumber: n.displayPhoneNumber, label: n.label }))
        setWaNumbers(nums)
      })
      .catch(() => {})
  }, [workspaceNumbers])

  // Apply the smart default when the form opens fresh (no `editing`) and
  // the operator hasn't picked anything yet. Runs once per smart-default
  // resolution so the default doesn't stomp on an explicit choice.
  useEffect(() => {
    if (editing) return
    if (whatsappNumberId) return
    if (smartDefault.loading) return
    if (smartDefault.lineId) setWhatsappNumberId(smartDefault.lineId)
  }, [editing, whatsappNumberId, smartDefault.loading, smartDefault.lineId])

  // Sync varExamples count with variables found in body
  useEffect(() => {
    const positions = extractVarPositions(body)
    setVarExamples((prev) => positions.map((_, i) => prev[i] ?? ''))
  }, [body])

  // Reset / populate when mounted / editing changes
  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setLanguage(editing.language)
      setCategory(editing.category)
      setSubCategory('standard')
      setHeaderType(editing.headerType ?? '')
      setHeaderText(editing.headerText ?? '')
      setHeaderMediaUrl(editing.headerMediaUrl ?? '')
      setBody(editing.body)
      setFooter(editing.footer ?? '')
      setButtons((editing.buttons ?? []).map((b) => ({
        type: b.type, text: b.text,
        url: b.url ?? '', phoneNumber: b.phoneNumber ?? '', flowId: b.flowId ?? '',
      })))
      setVarExamples(editing.bodyVariables ?? [])
    } else {
      setName(''); setLanguage('pt_BR'); setCategory('MARKETING'); setSubCategory('standard')
      setHeaderType(''); setHeaderText(''); setHeaderMediaUrl('')
      setBody(''); setFooter(''); setButtons([]); setVarExamples([])
    }
    setError(''); setSaving(false); setShowAddButton(false); setStep(1)
  }, [editing])

  // When category changes, reset sub-category and clear incompatible buttons
  useEffect(() => {
    setSubCategory('standard')
    setButtons((prev) => prev.filter((b) => {
      const cfg = BUTTON_TYPES.find((t) => t.value === b.type)
      return !cfg?.forCategories || cfg.forCategories.includes(category)
    }))
  }, [category])

  // ── Body text operations ───────────────────────────────────────────────────

  const wrapSelection = (wrapper: string) => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const selected = body.slice(s, e)
    const newBody = body.slice(0, s) + wrapper + selected + wrapper + body.slice(e)
    setBody(newBody)
    requestAnimationFrame(() => {
      el.selectionStart = s + wrapper.length
      el.selectionEnd = e + wrapper.length
      el.focus()
    })
  }

  const addVariable = () => {
    const el = bodyRef.current
    const pos = extractVarPositions(body)
    const nextVar = pos.length > 0 ? Math.max(...pos) + 1 : 1
    const insert = `{{${nextVar}}}`
    const cursor = el?.selectionStart ?? body.length
    setBody(body.slice(0, cursor) + insert + body.slice(cursor))
    requestAnimationFrame(() => {
      if (el) { el.selectionStart = cursor + insert.length; el.selectionEnd = cursor + insert.length; el.focus() }
    })
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  const availableButtonTypes = BUTTON_TYPES.filter(
    (t) => !t.forCategories || t.forCategories.includes(category)
  )

  const addButtonOfType = (type: TemplateButtonType) => {
    const defaults: Record<TemplateButtonType, string> = {
      QUICK_REPLY:  '',
      URL:          '',
      PHONE_NUMBER: '',
      FLOW:         'Ir para o flow',
      COPY_CODE:    'Copiar código',
    }
    setButtons((prev) => [...prev, { type, text: defaults[type], url: '', phoneNumber: '', flowId: '' }])
    setShowAddButton(false)
  }

  const removeButton = (i: number) => setButtons((prev) => prev.filter((_, idx) => idx !== i))

  const updateButton = (i: number, field: keyof ButtonRow, value: string) =>
    setButtons((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b))

  // ── Validation ─────────────────────────────────────────────────────────────

  const varPositions = extractVarPositions(body)

  // Multi-WABA: block submit until the operator has picked a line. In
  // single-line tenants `waNumbers.length <= 1` so the condition is a
  // no-op. Mirrors the backend rule (resolveResourceNumberOrThrow).
  const needsExplicitLine = waNumbers.length > 1 && !whatsappNumberId

  const canAdvance = () => {
    // Gate every step behind the line picker when the tenant has more
    // than one active WABA — the callout at the top of the form carries
    // the explanation, here we just refuse to advance.
    if (needsExplicitLine) return false
    if (step === 1) return true
    if (step === 2) return !!(name.trim() && body.trim() && varExamples.every(v => v.trim()))
    if (step === 3) return buttons.every(b => b.text.trim() && (b.type !== 'URL' || b.url.trim()) && (b.type !== 'PHONE_NUMBER' || b.phoneNumber.trim()))
    return true // step 4: submit
  }

  const canSave = !!(
    name.trim() && body.trim() &&
    varExamples.every((v) => v.trim()) &&
    buttons.every((b) => b.text.trim() && (b.type !== 'URL' || b.url.trim()) && (b.type !== 'PHONE_NUMBER' || b.phoneNumber.trim())) &&
    !needsExplicitLine
  )

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true); setError('')
    try {
      const payload = {
        name: name.trim().toLowerCase().replace(/\s+/g, '_'),
        language, category,
        ...(headerType ? { headerType } : {}),
        ...(headerType === 'TEXT' && headerText.trim() ? { headerText: headerText.trim() } : {}),
        ...(['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerMediaUrl.trim() ? { headerMediaUrl: headerMediaUrl.trim() } : {}),
        body,
        ...(footer.trim() ? { footer: footer.trim() } : {}),
        ...(buttons.length > 0 ? {
          buttons: buttons.map(({ type, text, url, phoneNumber, flowId }) => ({
            type, text: text.trim(),
            ...(type === 'URL' ? { url: url.trim() } : {}),
            ...(type === 'PHONE_NUMBER' ? { phoneNumber: phoneNumber.trim() } : {}),
            ...(type === 'FLOW' ? { flowId: flowId.trim() } : {}),
          })),
        } : {}),
        bodyVariables: varExamples.map((v) => v.trim()),
        ...(whatsappNumberId ? { whatsappNumberId } : {}),
      }
      const res = editing ? await templatesApi.update(editing.id, payload) : await templatesApi.create(payload)
      onSaved(res.data)
    } catch (err) {
      // Surface the backend message when it's an actionable 400 (e.g.
      // "escolha qual linha usar", "placeholder fora de sequência"); fall
      // back to the generic hint only when we can't parse anything.
      const backendMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(backendMessage) ? backendMessage.join('; ') : backendMessage
      setError(text?.trim() || 'Falha ao salvar o template. Verifique os campos e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Preview variables — use example values
  const previewVars: Record<string, string> = {}
  varPositions.forEach((pos, i) => {
    previewVars[String(pos)] = varExamples[i] || `Exemplo ${i + 1}`
  })

  const previewTemplate: WhatsAppTemplate = {
    id: 'preview', tenantId: '', name: name || 'preview', language, category, status: 'PENDING',
    headerType: headerType || undefined, headerText: headerText || undefined,
    headerMediaUrl: headerMediaUrl || undefined,
    body: body || ' ', footer: footer || undefined,
    buttons: buttons.map(({ type, text, url, phoneNumber, flowId }) => ({
      type, text,
      ...(type === 'URL' ? { url } : {}),
      ...(type === 'PHONE_NUMBER' ? { phoneNumber } : {}),
      ...(type === 'FLOW' ? { flowId } : {}),
    })),
    bodyVariables: varExamples,
    createdAt: '', updatedAt: '',
  }

  // ── Step subtitles ─────────────────────────────────────────────────────────

  const stepSubtitles = [
    `${CATEGORIES.find(c => c.value === category)?.label ?? 'Marketing'} · ${SUBCATEGORIES[category].find(s => s.value === subCategory)?.label ?? 'Padrão'}`,
    `Corpo${headerType ? ' + cabeçalho' : ''}${footer ? ' + rodapé' : ''}`,
    `${buttons.length} botã${buttons.length === 1 ? 'o' : 'ões'} · opcional`,
    'Enviar para análise',
  ]

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-surface-700 flex-shrink-0 bg-black">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Templates
        </button>
        <div className="w-px h-4 bg-surface-700" />
        <h1 className="text-sm font-semibold text-surface-100">
          {editing ? 'Editar template' : 'Criar novo template'}
        </h1>
        <div className="ml-auto flex items-center gap-2 text-xs text-surface-400">
          Passo {step} de 4 — {STEP_LABELS[step - 1]}
        </div>
      </div>

      {/* Multi-WABA banner — surface the target line above every step so
          the operator never submits a template to the wrong WABA. Hidden
          automatically in single-line tenants. Width capped so the
          callout doesn't stretch across the whole page on wide screens
          (the full-bleed page was making it feel outsized). */}
      <div className="px-6 pt-3">
        <WhatsappLineRow
          whatsappNumberId={whatsappNumberId || null}
          variant="callout"
          onLineChange={(id) => setWhatsappNumberId(id)}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: step sidebar */}
        <div className="w-44 border-r border-surface-700 py-6 px-3 flex flex-col gap-1 flex-shrink-0 bg-black">
          {([1, 2, 3, 4] as StepNum[]).map((s) => {
            const done = s < step
            const current = s === step
            return (
              <div
                key={s}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all',
                  current ? 'bg-brand-500/10' : 'hover:bg-surface-800/50'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all mt-0.5',
                  done    ? 'bg-brand-600 text-surface-950' :
                  current ? 'bg-brand-600/20 border-2 border-brand-500 text-brand-400' :
                             'bg-surface-800 text-surface-400 border border-surface-700'
                )}>
                  {done ? <Check className="w-3 h-3" /> : s}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', current ? 'text-surface-50' : done ? 'text-surface-200' : 'text-surface-400')}>
                    {STEP_LABELS[s - 1]}
                  </p>
                  <p className="text-[10px] text-surface-400 mt-0.5 leading-tight truncate">
                    {stepSubtitles[s - 1]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CENTER: form */}
        <div className="flex-1 overflow-y-auto p-7 bg-black">
          {step === 1 && (
            <>
              <StepCategoria
                category={category}
                onCategory={setCategory}
                subCategory={subCategory}
                onSubCategory={setSubCategory}
                editing={!!editing}
              />
              {/* Line picker lives in the top-of-form WhatsappLineRow
                  callout (right-side select) — no duplicate block here. */}
            </>
          )}
          {step === 2 && (
            <StepMensagem
              name={name}
              onName={setName}
              language={language}
              onLanguage={setLanguage}
              headerType={headerType}
              onHeaderType={setHeaderType}
              headerText={headerText}
              onHeaderText={setHeaderText}
              headerMediaUrl={headerMediaUrl}
              onHeaderMediaUrl={setHeaderMediaUrl}
              body={body}
              onBody={setBody}
              footer={footer}
              onFooter={setFooter}
              bodyRef={bodyRef}
              varPositions={varPositions}
              varExamples={varExamples}
              onVarExamples={setVarExamples}
              wrapSelection={wrapSelection}
              addVariable={addVariable}
            />
          )}
          {step === 3 && (
            <StepBotoes
              buttons={buttons}
              availableButtonTypes={availableButtonTypes}
              showAddButton={showAddButton}
              onShowAddButton={setShowAddButton}
              addButtonOfType={addButtonOfType}
              removeButton={removeButton}
              updateButton={updateButton}
            />
          )}
          {step === 4 && (
            <StepRevisao
              name={name}
              category={category}
              subCategory={subCategory}
              language={language}
              headerType={headerType}
              buttons={buttons}
              varExamples={varExamples}
              error={error}
            />
          )}
        </div>

        {/* RIGHT: preview panel */}
        <div className="w-[340px] border-l border-surface-700 flex flex-col flex-shrink-0 bg-black">
          <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0 flex items-center justify-center gap-1.5">
            {body ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-medium text-surface-300">Prévia em tempo real</p>
              </>
            ) : (
              <p className="text-xs font-medium text-surface-300">
                {SUBCATEGORY_LABELS[subCategory] ?? 'Modelo padrão'} · prévia interativa
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
            {step === 1 ? (
              <SubcategoryPreview category={category} subCategory={subCategory} />
            ) : body ? (
              <TemplatePreview template={previewTemplate} variables={previewVars} compact />
            ) : (
              <SubcategoryPreview category={category} subCategory={subCategory} />
            )}
            {step === 4 && (
              <div className="mt-4">
                <TemplatePreview template={previewTemplate} variables={previewVars} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 flex-shrink-0 bg-black">
        <button
          onClick={() => step > 1 ? setStep((s) => (s - 1) as StepNum) : onCancel()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>

        <div className="flex items-center gap-3">
          {/* Step 3: "Skip buttons" link */}
          {step === 3 && (
            <button
              onClick={() => setStep(4)}
              className="text-sm text-surface-400 hover:text-surface-300 transition-colors"
            >
              Pular botões →
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as StepNum)}
              disabled={!canAdvance()}
              title={needsExplicitLine ? 'Escolha a linha WhatsApp no banner acima para continuar' : undefined}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                canAdvance()
                  ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                  : 'bg-surface-700 text-surface-400 cursor-not-allowed'
              )}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              title={needsExplicitLine ? 'Escolha a linha WhatsApp no banner acima para continuar' : undefined}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-medium transition-all',
                canSave && !saving
                  ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                  : 'bg-surface-700 text-surface-400 cursor-not-allowed'
              )}
            >
              {saving ? 'Enviando...' : editing ? 'Salvar e reenviar para aprovação' : 'Enviar para aprovação'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Categoria ────────────────────────────────────────────────────────

function StepCategoria({
  category, onCategory, subCategory, onSubCategory, editing,
}: {
  category: TemplateCategoryType
  onCategory: (v: TemplateCategoryType) => void
  subCategory: SubCategory
  onSubCategory: (v: SubCategory) => void
  editing: boolean
}) {
  return (
    <div className="space-y-7">
      {!editing && (
        <div className="flex items-center gap-0 bg-brand-500/5 border border-brand-500/15 rounded-xl overflow-hidden text-[11px]">
          <div className="flex items-center gap-2 px-3 py-2.5 flex-1 border-r border-brand-500/15">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-brand-300">1 · Preencha o modelo</p>
              <p className="text-surface-400">Categoria, corpo e botões</p>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-surface-400 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-2 px-3 py-2.5 flex-1 border-r border-surface-700/50">
            <Clock className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-surface-300">2 · Meta analisa</p>
              <p className="text-surface-400">Processo automático · 24–48h</p>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-surface-400 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-2 px-3 py-2.5 flex-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-surface-300">3 · Template aprovado</p>
              <p className="text-surface-400">Disponível para campanhas</p>
            </div>
          </div>
        </div>
      )}

      <Section title="Categoria" required>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onCategory(value)}
              className={cn(
                'text-left p-3 rounded-xl border transition-all',
                category === value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/40 hover:border-surface-600'
              )}
            >
              <Icon className={cn('w-4 h-4 mb-2', category === value ? 'text-brand-400' : 'text-surface-400')} />
              <p className="text-xs font-semibold text-surface-100">{label}</p>
              <p className="text-[11px] text-surface-400 mt-0.5 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>

        {/* Pricing note */}
        <div className="mt-3 flex items-start gap-2 px-2.5 py-2 bg-surface-800/50 border border-surface-700/60 rounded-lg">
          <Info className="w-3 h-3 text-surface-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-surface-400 leading-relaxed">
            <strong className="text-amber-400">Marketing</strong> cobra por conversa aberta.
            <strong className="text-blue-400"> Utilidade</strong> tem tarifa reduzida (transacional).
            <strong className="text-purple-400"> Autenticação</strong> usa cobrança única por OTP.
          </p>
        </div>

        {/* Subcategory */}
        <div className="mt-3 space-y-1.5">
          {SUBCATEGORIES[category].map((sub) => (
            <button
              key={sub.value}
              onClick={() => onSubCategory(sub.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                subCategory === sub.value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/30 hover:border-surface-600'
              )}
            >
              <div className={cn(
                'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                subCategory === sub.value ? 'border-brand-500' : 'border-surface-600'
              )}>
                {subCategory === sub.value && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
              </div>
              <div>
                <span className="text-xs font-medium text-surface-200">{sub.label}</span>
                <span className="text-[11px] text-surface-400 ml-2">{sub.description}</span>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── Step 2: Mensagem ─────────────────────────────────────────────────────────

function StepMensagem({
  name, onName, language, onLanguage,
  headerType, onHeaderType, headerText, onHeaderText,
  headerMediaUrl, onHeaderMediaUrl,
  body, onBody, footer, onFooter,
  bodyRef, varPositions, varExamples, onVarExamples,
  wrapSelection, addVariable,
}: {
  name: string
  onName: (v: string) => void
  language: string
  onLanguage: (v: string) => void
  headerType: TemplateHeaderType | ''
  onHeaderType: (v: TemplateHeaderType | '') => void
  headerText: string
  onHeaderText: (v: string) => void
  headerMediaUrl: string
  onHeaderMediaUrl: (v: string) => void
  body: string
  onBody: (v: string) => void
  footer: string
  onFooter: (v: string) => void
  bodyRef: React.RefObject<HTMLTextAreaElement | null>
  varPositions: number[]
  varExamples: string[]
  onVarExamples: (v: string[]) => void
  wrapSelection: (w: string) => void
  addVariable: () => void
}) {
  return (
    <div className="space-y-7">
      {/* Section: Identificação */}
      <Section title="Identificação" required>
        <div className="space-y-3">
          <div>
            <FieldLabel>Nome do template</FieldLabel>
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="ex: boas_vindas_novos_clientes"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <p className="text-[11px] text-surface-400 mt-1">Apenas letras minúsculas, números e underscore ( _ )</p>
          </div>
          <div>
            <FieldLabel>Idioma</FieldLabel>
            <select
              value={language}
              onChange={(e) => onLanguage(e.target.value)}
              className="w-full appearance-none bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 pr-8 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
            >
              {LANGUAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Section: Cabeçalho */}
      <Section title="Cabeçalho" badge="Opcional">
        <p className="text-[11px] text-surface-400 mb-3">
          Adicione um texto ou mídia no topo da mensagem. A API do Meta analisa e aprova este conteúdo.
        </p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {HEADER_TYPES.map((ht) => (
            <button
              key={ht.value}
              onClick={() => onHeaderType(ht.value)}
              className={cn(
                'p-2.5 rounded-xl border text-center transition-all',
                headerType === ht.value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/40 hover:border-surface-600'
              )}
            >
              <p className={cn('text-xs font-medium', headerType === ht.value ? 'text-brand-300' : 'text-surface-300')}>{ht.label}</p>
              <p className="text-[10px] text-surface-400 mt-0.5 leading-tight">{ht.desc}</p>
            </button>
          ))}
        </div>
        {headerType === 'TEXT' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Texto do cabeçalho</FieldLabel>
              <span className="text-[11px] text-surface-400">{headerText.length}/60</span>
            </div>
            <input
              value={headerText}
              onChange={(e) => onHeaderText(e.target.value.slice(0, 60))}
              placeholder="Texto do cabeçalho — pode conter {{1}}"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        )}
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
          <div>
            <FieldLabel>URL da amostra de mídia</FieldLabel>
            <input
              value={headerMediaUrl}
              onChange={(e) => onHeaderMediaUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <p className="text-[11px] text-surface-400 mt-1">URL pública e acessível. A Meta usará esta amostra para revisar o template.</p>
          </div>
        )}
      </Section>

      {/* Section: Corpo */}
      <Section title="Corpo" required>
        <p className="text-[11px] text-surface-400 mb-3">
          Escreva a mensagem principal. Use variáveis numéricas <code className="text-brand-400 bg-brand-400/10 px-1 rounded">{'{{1}}'}</code> para personalizar o conteúdo por destinatário.
        </p>

        {/* Best practices callout */}
        <div className="mb-3 bg-surface-800/60 border border-surface-700/60 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/60">
            <Sparkles className="w-3 h-3 text-brand-400 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-surface-300">Boas práticas para aprovação mais rápida</p>
          </div>
          <ul className="px-3 py-2 space-y-1">
            {[
              'Mantenha o corpo abaixo de 640 caracteres — melhora a taxa de entrega.',
              'Evite maiúsculas excessivas, exclamações e linguagem de spam.',
              'Não inclua links externos em templates de Utilidade ou Autenticação.',
              'Preencha exemplos reais para cada {{variável}} — a Meta rejeita valores genéricos como "nome".',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-surface-400">
                <span className="text-brand-500 mt-0.5 flex-shrink-0">·</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-1 mb-2 p-1.5 bg-surface-800 border border-surface-700 rounded-xl w-fit">
          <ToolbarBtn onClick={() => wrapSelection('*')} title="Negrito (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSelection('_')} title="Itálico (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSelection('~')} title="Tachado">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <div className="w-px h-4 bg-surface-700 mx-1" />
          <button
            onClick={addVariable}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-xs font-medium transition-all"
            title="Insere {{N}} na posição do cursor"
          >
            <Plus className="w-3 h-3" />
            Adicionar variável
          </button>
        </div>

        <div className="relative">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => onBody(e.target.value)}
            rows={6}
            maxLength={1024}
            placeholder="Olá, {{1}}! Sua mensagem aqui..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
          <span className="absolute bottom-2.5 right-3 text-[11px] text-surface-400">{body.length}/1024</span>
        </div>

        {/* Variable examples */}
        {varPositions.length > 0 ? (
          <div className="mt-3 bg-surface-800/60 border border-surface-700 rounded-xl overflow-hidden">
            <div className="flex items-start gap-2 px-3 py-2.5 border-b border-surface-700">
              <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-surface-200">Como funcionam as variáveis</p>
                <p className="text-[11px] text-surface-400 mt-0.5 leading-relaxed">
                  As variáveis são identificadas pela <strong className="text-surface-300">posição numérica</strong> — <code className="text-brand-400">{'{{1}}'}</code>, <code className="text-brand-400">{'{{2}}'}</code>… — não por nome.
                  Forneça um <strong className="text-surface-300">valor de exemplo</strong> para cada uma: a Meta exige amostras reais para aprovar o template.
                </p>
              </div>
            </div>
            <div className="divide-y divide-surface-700/60">
              {varPositions.map((pos, i) => (
                <div key={pos} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-xs font-mono text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded w-10 text-center flex-shrink-0">
                    {`{{${pos}}}`}
                  </span>
                  <input
                    value={varExamples[i] ?? ''}
                    onChange={(e) => onVarExamples(varExamples.map((x, idx) => idx === i ? e.target.value : x))}
                    placeholder={`Valor de exemplo para a variável ${pos}`}
                    className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-surface-400">
            <Info className="w-3 h-3 flex-shrink-0" />
            Clique em <span className="text-brand-400 mx-0.5">+ Adicionar variável</span> para inserir <code className="text-brand-400">{'{{1}}'}</code> na posição do cursor.
          </div>
        )}
      </Section>

      {/* Section: Rodapé */}
      <Section title="Rodapé" badge="Opcional">
        <p className="text-[11px] text-surface-400 mb-2">
          Texto exibido em cinza abaixo da mensagem. Não suporta variáveis nem formatação.
        </p>
        <div className="relative">
          <input
            value={footer}
            onChange={(e) => onFooter(e.target.value.slice(0, 60))}
            placeholder="Ex: Oryon • Atendimento Digital"
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">{footer.length}/60</span>
        </div>
      </Section>
    </div>
  )
}

// ─── Step 3: Botões ───────────────────────────────────────────────────────────

function StepBotoes({
  buttons, availableButtonTypes, showAddButton, onShowAddButton,
  addButtonOfType, removeButton, updateButton,
}: {
  buttons: ButtonRow[]
  availableButtonTypes: typeof BUTTON_TYPES
  showAddButton: boolean
  onShowAddButton: (v: boolean) => void
  addButtonOfType: (t: TemplateButtonType) => void
  removeButton: (i: number) => void
  updateButton: (i: number, field: keyof ButtonRow, value: string) => void
}) {
  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
        <Info className="w-3.5 h-3.5 text-surface-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-surface-400 leading-relaxed">
          Botões são opcionais — pule este passo se não precisar. Você pode adicionar até 10 botões;
          acima de 3 eles aparecem em <strong className="text-surface-300">lista</strong> no WhatsApp.
        </p>
      </div>

      {/* Button list */}
      <div className="space-y-2">
        {buttons.map((btn, i) => {
          const cfg = BUTTON_TYPES.find((t) => t.value === btn.type)
          if (!cfg) return null
          const Icon = cfg.icon
          return (
            <div key={i} className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 border-b border-surface-700/60">
                <Icon className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                <select
                  value={btn.type}
                  onChange={(e) => updateButton(i, 'type', e.target.value)}
                  className="flex-1 appearance-none bg-transparent text-xs text-surface-300 focus:outline-none cursor-pointer"
                >
                  {availableButtonTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeButton(i)}
                  className="p-1 rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <InputRow
                  value={btn.text}
                  onChange={(v) => updateButton(i, 'text', v)}
                  placeholder={
                    btn.type === 'QUICK_REPLY'  ? 'Ex: Quero saber mais'   :
                    btn.type === 'URL'          ? 'Ex: Ver oferta'          :
                    btn.type === 'PHONE_NUMBER' ? 'Ex: Ligar agora'         :
                    btn.type === 'FLOW'         ? 'Ex: Preencher formulário':
                    'Copiar código'
                  }
                  label="Texto do botão"
                  maxLength={25}
                />
                {btn.type === 'URL' && (
                  <InputRow value={btn.url} onChange={(v) => updateButton(i, 'url', v)} placeholder="https://seusite.com.br/pagina" label="URL de destino" />
                )}
                {btn.type === 'PHONE_NUMBER' && (
                  <InputRow value={btn.phoneNumber} onChange={(v) => updateButton(i, 'phoneNumber', v)} placeholder="+55 11 99999-9999" label="Número de telefone" />
                )}
                {btn.type === 'FLOW' && (
                  <InputRow value={btn.flowId} onChange={(v) => updateButton(i, 'flowId', v)} placeholder="ID do Flow no Meta Business Manager" label="Flow ID" />
                )}
                {btn.type === 'COPY_CODE' && (
                  <p className="text-[11px] text-surface-400">
                    O código OTP será copiado automaticamente ao toque. Nenhuma configuração adicional necessária.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add button picker */}
      {buttons.length < 10 && (
        <div>
          <button
            onClick={() => onShowAddButton(!showAddButton)}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-surface-600 hover:border-brand-500 rounded-xl text-xs text-surface-400 hover:text-brand-300 transition-all w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar botão
            {showAddButton ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          <AnimatePresence>
            {showAddButton && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-2 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden divide-y divide-surface-700/60">
                  {availableButtonTypes.map((bt) => {
                    const Icon = bt.icon
                    const alreadyHasType = buttons.some((b) => b.type === bt.value)
                    const isDisabledType = (bt.value === 'COPY_CODE' && buttons.length > 0) || alreadyHasType
                    return (
                      <button
                        key={bt.value}
                        onClick={() => !isDisabledType && addButtonOfType(bt.value)}
                        disabled={isDisabledType}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all',
                          isDisabledType ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-700'
                        )}
                      >
                        <Icon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-surface-200">{bt.label}</p>
                          <p className="text-[11px] text-surface-400">{bt.description}</p>
                        </div>
                        {alreadyHasType && <span className="ml-auto text-[10px] text-surface-400">Já adicionado</span>}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Revisão ──────────────────────────────────────────────────────────

function StepRevisao({
  name, category, subCategory, language, headerType, buttons, varExamples, error,
}: {
  name: string
  category: TemplateCategoryType
  subCategory: SubCategory
  language: string
  headerType: TemplateHeaderType | ''
  buttons: ButtonRow[]
  varExamples: string[]
  error: string
}) {
  return (
    <div className="space-y-5">
      {/* Card: Sobre o template */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-surface-300 uppercase tracking-wider mb-3">Sobre o template</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Nome</span>
          <span className="text-xs font-mono text-brand-300 bg-brand-400/10 px-2 py-0.5 rounded">{name || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Categoria</span>
          <span className="text-xs text-surface-300 bg-surface-700 px-2 py-0.5 rounded">{CATEGORY_LABELS[category]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Subcategoria</span>
          <span className="text-xs text-surface-300 bg-surface-700 px-2 py-0.5 rounded">{SUBCATEGORY_LABELS[subCategory]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Idioma</span>
          <span className="text-xs text-surface-300">{language}</span>
        </div>
        {headerType && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">Cabeçalho</span>
            <span className="text-xs text-surface-300">{HEADER_TYPES.find(h => h.value === headerType)?.label ?? headerType}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Variáveis</span>
          <span className="text-xs text-surface-300">{varExamples.length} variáve{varExamples.length === 1 ? 'l' : 'is'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Botões</span>
          <span className="text-xs text-surface-300">{buttons.length} botã{buttons.length === 1 ? 'o' : 'ões'}</span>
        </div>
      </div>

      {/* Card: Processo de aprovação */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-700">
          <p className="text-xs font-bold text-surface-200 uppercase tracking-wider">Processo de aprovação</p>
        </div>
        <div className="flex items-center gap-0 text-[11px] p-3">
          <div className="flex items-center gap-2 px-2 py-2 flex-1 border-r border-surface-700">
            <Sparkles className="w-3 h-3 text-brand-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-brand-300">1 · Enviado</p>
              <p className="text-surface-400">Template submetido à Meta agora</p>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-surface-400 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-2 px-2 py-2 flex-1 border-r border-surface-700">
            <Clock className="w-3 h-3 text-surface-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-surface-300">2 · Em análise</p>
              <p className="text-surface-400">Processo automático · 24–48h</p>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-surface-400 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-2 px-2 py-2 flex-1">
            <CheckCircle2 className="w-3 h-3 text-surface-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-surface-300">3 · Aprovado</p>
              <p className="text-surface-400">Disponível para campanhas</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger/10 px-3 py-2.5 rounded-xl flex items-center gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, required, badge, children }: {
  title: string
  required?: boolean
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider">{title}</h3>
        {required && <span className="text-danger text-xs">*</span>}
        {badge && <span className="text-[10px] text-surface-400 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-surface-400 mb-1.5 block">{children}</label>
}

function ToolbarBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
    >
      {children}
    </button>
  )
}

function InputRow({ value, onChange, placeholder, label, maxLength }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
  maxLength?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-surface-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 relative">
        <input
          value={value}
          onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
        />
        {maxLength && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-surface-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
