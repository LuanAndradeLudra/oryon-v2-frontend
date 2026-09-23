import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Bold, Italic, Strikethrough,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { TemplatePreview } from './TemplatePreview'
import { TemplateCategoryTile, TEMPLATE_CATEGORIES } from './templateCategory'
import { WizardProgress } from '@/components/ui/WizardProgress'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { SubcategoryPreview } from './SubcategoryPreview'
import { templatesApi, whatsappNumbersApi } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import {
  CATEGORIES, SUBCATEGORIES, HEADER_TYPES, LANGUAGES, BUTTON_TYPES,
  CATEGORY_LABELS, SUBCATEGORY_LABELS, extractVarPositions,
} from './constants'
import { validateTemplate, isTemplateValid, type TemplateValidationErrors } from './templateValidation'
import type {
  WhatsAppTemplate, TemplateHeaderType, TemplateHeaderTypeInput, TemplateButtonType, TemplateCategoryType,
} from '@/types'
import type { SubCategory } from './SubcategoryPreview'

// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonRow = { type: TemplateButtonType; text: string; url: string; phoneNumber: string; flowId: string; urlExample: string }

type StepNum = 1 | 2 | 3 | 4

interface TemplateCreatorProps {
  onCancel: () => void
  onSaved: (tpl: WhatsAppTemplate) => void
  editing?: WhatsAppTemplate | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Categoria', 'Mensagem', 'Botões', 'Revisão']

// Meta rejects header TEXT with emojis, formatting markers (*, _, ~) or
// newlines. Strip them at the input layer so the operator can't paste an
// invalid header and only learn about it after submission.
const sanitizeHeaderText = (s: string): string =>
  s.replace(/\p{Extended_Pictographic}/gu, '')
   .replace(/[*_~\n\r\t]/g, '')

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateCreator({ onCancel, onSaved, editing }: TemplateCreatorProps) {
  /** Meta não permite alterar conteúdo de templates aprovados ou em análise. */
  const isContentLocked = !!(
    editing
    && (
      editing.status === 'APPROVED'
      || (editing.status === 'PENDING' && !editing.rejectionReason)
    )
  )
  const canEditContent = !editing || editing.status === 'REJECTED' || !!(editing.status === 'PENDING' && editing.rejectionReason)

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
        urlExample: b.urlExample ?? '',
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
    setButtons((prev) => [...prev, { type, text: defaults[type], url: '', phoneNumber: '', flowId: '', urlExample: '' }])
    setShowAddButton(false)
  }

  const removeButton = (i: number) => setButtons((prev) => prev.filter((_, idx) => idx !== i))

  const updateButton = (i: number, field: keyof ButtonRow, value: string) =>
    setButtons((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b))

  // ── Validation ─────────────────────────────────────────────────────────────

  const varPositions = extractVarPositions(body)

  // Run the same Meta-rule checks the backend will run, so the operator
  // sees the actionable error inline (next to the field) rather than as a
  // 400 banner after submit. The backend remains the authoritative gate.
  const errors: TemplateValidationErrors = validateTemplate({
    name, body, varExamples, headerType, headerText, headerMediaUrl, buttons,
  })
  const hasStep2Error = !!(errors.name || errors.body || errors.vars || errors.headerText || errors.headerMediaUrl)
  const hasStep3Error = !!(errors.buttonsGeneral || errors.buttonByIndex)

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
    if (step === 2) return !!(name.trim() && body.trim() && varExamples.every(v => v.trim())) && !hasStep2Error
    if (step === 3) return buttons.every(b => b.text.trim() && (b.type !== 'URL' || b.url.trim()) && (b.type !== 'PHONE_NUMBER' || b.phoneNumber.trim())) && !hasStep3Error
    return true // step 4: submit
  }

  const canSave = !!(
    name.trim() && body.trim() &&
    varExamples.every((v) => v.trim()) &&
    buttons.every((b) => b.text.trim() && (b.type !== 'URL' || b.url.trim()) && (b.type !== 'PHONE_NUMBER' || b.phoneNumber.trim())) &&
    !needsExplicitLine &&
    isTemplateValid(errors)
  )

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!canSave || isContentLocked) return
    setSaving(true); setError('')
    try {
      const resolvedHeader: TemplateHeaderTypeInput | undefined =
        headerType ? headerType : editing ? 'NONE' : undefined
      const payload = {
        name: name.trim().toLowerCase().replace(/\s+/g, '_'),
        language, category,
        ...(resolvedHeader !== undefined ? { headerType: resolvedHeader } : {}),
        ...(headerType === 'TEXT' && headerText.trim() ? { headerText: headerText.trim() } : {}),
        ...(['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerMediaUrl.trim() ? { headerMediaUrl: headerMediaUrl.trim() } : {}),
        body,
        ...(footer.trim() ? { footer: footer.trim() } : {}),
        ...(buttons.length > 0 ? {
          buttons: buttons.map(({ type, text, url, phoneNumber, flowId, urlExample }) => ({
            type, text: text.trim(),
            ...(type === 'URL' ? { url: url.trim() } : {}),
            ...(type === 'URL' && /\{\{1\}\}/.test(url) && urlExample.trim() ? { urlExample: urlExample.trim() } : {}),
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
    buttons: buttons.map(({ type, text, url, phoneNumber, flowId, urlExample }) => ({
      type, text,
      ...(type === 'URL' ? { url } : {}),
      ...(type === 'URL' && /\{\{1\}\}/.test(url) && urlExample ? { urlExample } : {}),
      ...(type === 'PHONE_NUMBER' ? { phoneNumber } : {}),
      ...(type === 'FLOW' ? { flowId } : {}),
    })),
    bodyVariables: varExamples,
    createdAt: '', updatedAt: '',
  }


  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-surface-700 flex-shrink-0 bg-surface-950">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Templates
        </button>
        <div className="w-px h-4 bg-surface-700" />

        {/* Identidade da categoria — pedido do PO (22/09): assim que a
            categoria é escolhida, o ícone dela acompanha o modelo por todo o
            fluxo, como no painel da Meta. */}
        <TemplateCategoryTile category={category} size={28} />
        <div className="min-w-0">
          <h1 className="text-[13px] font-semibold text-surface-50 leading-tight truncate">
            {name.trim() || (editing ? 'Editar modelo' : 'Novo modelo')}
          </h1>
          <p className="text-[11px] text-surface-500 leading-tight">
            {TEMPLATE_CATEGORIES[category].label}{language ? ` · ${language}` : ''}
          </p>
        </div>

        {/* Trilha de passos: primitivo `WizardProgress`, NÃO uma versão à mão.
            Eu havia escrito uma trilha própria aqui (bolinha de 14px) e o
            Cartógrafo apontou que isso é o mesmo defeito que venho cobrando de
            todo mundo — primitivo existente reimplementado ao lado. O
            primitivo ainda tem respaldo melhor que a minha versão: os valores
            dele (18px, fundo --acsoft, check) vêm do HTML do canvas
            (CAMP-WIZ-07..13); os meus vinham de um mockup. Os três wizards do
            produto passam a mostrar a mesma trilha. */}
        <div className="ml-auto flex-none">
          <WizardProgress
            steps={STEP_LABELS}
            currentStep={step}
            onStepClick={(n) => setStep(n as StepNum)}
          />
        </div>
      </div>

      {/* Multi-WABA banner — surface the target line above every step so
          the operator never submits a template to the wrong WABA. Hidden
          automatically in single-line tenants. Width capped so the
          callout doesn't stretch across the whole page on wide screens
          (the full-bleed page was making it feel outsized). */}
      <div className="px-6 pt-3 space-y-2">
        {isContentLocked && (
          <Banner variant="warning">
            {editing?.status === 'APPROVED'
              ? 'Templates aprovados não podem ser editados. Use Duplicar na lista para criar uma nova versão, ou exclua e crie outro.'
              : 'Este template está em análise na Meta. Aguarde o resultado ou duplique com outro nome para alterar o conteúdo.'}
          </Banner>
        )}
        <WhatsappLineRow
          whatsappNumberId={whatsappNumberId || null}
          variant="callout"
          onLineChange={(id) => setWhatsappNumberId(id)}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* CENTER: form */}
        <div className="flex-1 overflow-y-auto p-7 bg-surface-950">
          {step === 1 && (
            <>
              <StepCategoria
                category={category}
                onCategory={setCategory}
                subCategory={subCategory}
                onSubCategory={setSubCategory}
                editing={!!editing}
                readOnly={isContentLocked}
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
              errors={errors}
              readOnly={isContentLocked}
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
              errors={errors}
              readOnly={isContentLocked}
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
        <div className="w-[340px] border-l border-surface-700 flex flex-col flex-shrink-0 bg-surface-950">
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

      {/* Footer: navigation — secundária à esquerda, primária à direita */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 flex-shrink-0 bg-surface-950">
        <Button
          variant="ghost"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => step > 1 ? setStep((s) => (s - 1) as StepNum) : onCancel()}
        >
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </Button>

        <div className="flex items-center gap-3">
          {/* Step 3: "Skip buttons" link */}
          {step === 3 && (
            <Button variant="ghost" onClick={() => setStep(4)}>
              Pular botões →
            </Button>
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setStep((s) => (s + 1) as StepNum)}
              disabled={!canAdvance()}
              title={needsExplicitLine ? 'Escolha a linha WhatsApp no banner acima para continuar' : undefined}
            >
              Próximo
            </Button>
          ) : (
            <Button
              variant="neutral"
              onClick={handleSave}
              loading={saving}
              disabled={!canSave || isContentLocked}
              title={
                isContentLocked
                  ? 'Este template não pode ser editado no estado atual'
                  : needsExplicitLine
                    ? 'Escolha a linha WhatsApp no banner acima para continuar'
                    : undefined
              }
            >
              {editing ? (canEditContent ? 'Salvar e reenviar para aprovação' : 'Não editável') : 'Enviar para aprovação'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Categoria ────────────────────────────────────────────────────────

function StepCategoria({
  category, onCategory, subCategory, onSubCategory, editing, readOnly,
}: {
  category: TemplateCategoryType
  onCategory: (v: TemplateCategoryType) => void
  subCategory: SubCategory
  onSubCategory: (v: SubCategory) => void
  editing: boolean
  readOnly?: boolean
}) {
  // Referência: print do painel da Meta (22/09) — segmentado de 3 células com
  // ícone + lista de rádio com título e descrição, linha selecionada com
  // fundo suave. Sem cartões por categoria, sem faixa "como funciona".
  const disponiveis = CATEGORIES.filter((c) => !c.comingSoon || c.value === category)
  const emBreve = CATEGORIES.filter((c) => c.comingSoon && c.value !== category)
  void editing
  return (
    <div className="flex flex-col">
      <Section title="Categoria" required badge="Define a cobrança e as regras de aprovação da Meta.">
        <SegmentedControl
          size="md"
          className="w-full [&>*]:flex-1"
          label="Categoria do modelo"
          value={category}
          onChange={(v) => { if (!readOnly) onCategory(v) }}
          options={disponiveis.map((c) => ({ value: c.value, label: c.label, icon: c.icon }))}
        />
        <p className="text-[11px] text-surface-500 mt-2 leading-relaxed">
          <span className="text-surface-300 font-semibold">Marketing</span> cobra por conversa aberta ·
          <span className="text-surface-300 font-semibold"> Utilidade</span> tem tarifa reduzida
          {emBreve.length > 0 && <> · {emBreve.map((c) => c.label).join(', ')} em breve</>}
        </p>
      </Section>

      <Section title="Tipo" badge="Escolhe o modelo inicial do editor. Não é enviado à Meta.">
        <div role="radiogroup" aria-label="Tipo do modelo" className="rounded-sm border border-surface-700 overflow-hidden">
          {SUBCATEGORIES[category].map((sub) => {
            const ativo = subCategory === sub.value
            return (
              <button
                key={sub.value}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => { if (!readOnly) onSubCategory(sub.value) }}
                disabled={readOnly}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-left border-t border-surface-700 first:border-t-0 transition-colors',
                  ativo ? 'bg-[var(--rowhover)]' : 'hover:bg-[var(--rowhover)]',
                  readOnly && 'cursor-default',
                )}
              >
                <span className={cn(
                  'mt-[3px] w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none',
                  ativo ? 'border-brand-500' : 'border-[var(--bd2)]',
                )}>
                  {ativo && <span className="w-[7px] h-[7px] rounded-full bg-brand-500" />}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-[12.5px] leading-tight', ativo ? 'font-semibold text-surface-50' : 'font-medium text-surface-200')}>{sub.label}</span>
                  <span className="block text-[11px] text-surface-500 mt-0.5 leading-snug">{sub.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

// ─── Step 2: Mensagem ─────────────────────────────────────────────────────────

// Fora do render: componente criado dentro de outro remonta a cada render
// (lint react/no-create-components-during-render) e perde foco/estado.
function Contador({ n, max }: { n: number; max: number }) {
  return (
    <span className={cn(
      'absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] tabular-nums pointer-events-none',
      n > max ? 'text-danger' : 'text-surface-500',
    )}>{n}/{max}</span>
  )
}
function Ajuda({ children, erro }: { children?: React.ReactNode; erro?: string }) {
  return <p className={cn('text-[11px] mt-1.5 leading-snug', erro ? 'text-danger' : 'text-surface-500')}>{erro ?? children}</p>
}

function StepMensagem({
  name, onName, language, onLanguage,
  headerType, onHeaderType, headerText, onHeaderText,
  headerMediaUrl, onHeaderMediaUrl,
  body, onBody, footer, onFooter,
  bodyRef, varPositions, varExamples, onVarExamples,
  wrapSelection, addVariable,
  errors,
  readOnly,
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
  errors: TemplateValidationErrors
  readOnly?: boolean
}) {
  const fieldDisabled = !!readOnly
  // Direção C + referência de mercado (Meta, Twilio, Wati): contador DENTRO
  // do campo à direita, tipo de cabeçalho em pílulas, sem caixas de "boas
  // práticas". Campos são os PRIMITIVOS Input/Select/Textarea em `md` (36px,
  // FIELD-03) — a primeira versão copiava valores à mão em 32px, fora da
  // régua sm 28 / md 36 / lg 44 do sistema.
  return (
    <div className="flex flex-col">
      <Section title="Nome" required badge="Minúsculas, números e _ · até 512">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Input
              size="md"
              error={errors.name}
              value={name}
              onChange={(e) => onName(e.target.value)}
              disabled={fieldDisabled}
              placeholder="ex: boas_vindas_novos_clientes"
              className="pr-16"
            />
            <Contador n={name.length} max={512} />
          </div>
          <Select
            size="md"
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            disabled={fieldDisabled}
            aria-label="Idioma"
            className="w-44 flex-none"
          >
            {LANGUAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        {errors.name && <Ajuda erro={errors.name} />}
      </Section>

      <Section title="Cabeçalho" badge="Opcional · uma mídia ou 60 caracteres">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de cabeçalho">
          {HEADER_TYPES.map((ht) => {
            const ativo = headerType === ht.value
            return (
              <button
                key={ht.value || 'none'}
                type="button"
                role="radio"
                aria-checked={ativo}
                title={ht.desc}
                onClick={() => { if (!fieldDisabled) onHeaderType(ht.value) }}
                disabled={fieldDisabled}
                className={cn(
                  'h-7 px-2.5 rounded-sm border text-[11.5px] transition-colors',
                  ativo
                    ? 'border-[var(--bd2)] bg-surface-800 text-surface-50 font-semibold'
                    : 'border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]',
                  fieldDisabled && 'cursor-not-allowed',
                )}
              >{ht.label}</button>
            )
          })}
        </div>
        {headerType === 'TEXT' && (
          <div className="mt-2.5">
            <div className="relative">
              <Input
                size="md"
                error={errors.headerText}
                value={headerText}
                onChange={(e) => onHeaderText(sanitizeHeaderText(e.target.value).slice(0, 60))}
                disabled={fieldDisabled}
                placeholder="Texto do cabeçalho — pode conter {{1}}"
                className="pr-14"
              />
              <Contador n={headerText.length} max={60} />
            </div>
            <Ajuda erro={errors.headerText}>Sem emoji, sem * _ ~ e sem quebra de linha — a Meta rejeita.</Ajuda>
          </div>
        )}
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
          <div className="mt-2.5">
            <Input
              size="md"
              error={errors.headerMediaUrl}
              value={headerMediaUrl}
              onChange={(e) => onHeaderMediaUrl(e.target.value)}
              disabled={fieldDisabled}
              placeholder="https://exemplo.com/amostra.jpg"
            />
            <Ajuda erro={errors.headerMediaUrl}>URL pública da amostra que a Meta usa na revisão. {HEADER_TYPES.find((h) => h.value === headerType)?.desc}.</Ajuda>
          </div>
        )}
      </Section>

      <Section title="Corpo" required badge="Até 1.024 caracteres · {{1}} vira o valor do contato">
        <div className="relative">
          <Textarea
            size="md"
            error={errors.body}
            ref={bodyRef}
            value={body}
            onChange={(e) => onBody(e.target.value)}
            disabled={fieldDisabled}
            rows={6}
            maxLength={1024}
            placeholder="Olá, {{1}}! Sua mensagem aqui…"
            className="pb-6 leading-[1.55] resize-y min-h-[120px]"
          />
          <span className={cn('absolute right-2.5 bottom-2 text-[11px] tabular-nums pointer-events-none', body.length > 1024 ? 'text-danger' : 'text-surface-500')}>
            {body.length}/1024
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <ToolbarBtn onClick={() => wrapSelection('*')} title="Negrito (Ctrl+B)"><Bold className="w-3.5 h-3.5" />Negrito</ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSelection('_')} title="Itálico (Ctrl+I)"><Italic className="w-3.5 h-3.5" />Itálico</ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSelection('~')} title="Tachado"><Strikethrough className="w-3.5 h-3.5" />Tachado</ToolbarBtn>
          <ToolbarBtn onClick={addVariable} title="Insere {{N}} na posição do cursor" destaque><Plus className="w-3.5 h-3.5" />Variável</ToolbarBtn>
        </div>
        {(errors.body || errors.vars) ? (
          <Ajuda erro={errors.body ?? errors.vars} />
        ) : (
          <Ajuda>Até 640 caracteres entregam melhor · evite caixa alta e exclamações · sem link em Utilidade ou Autenticação.</Ajuda>
        )}

        {varPositions.length > 0 && (
          <div className="mt-3 border-t border-surface-700 pt-3">
            <p className="text-[11px] text-surface-500 mb-2 leading-snug">
              Valor de exemplo para cada variável — a Meta exige amostras reais (não aceita "nome", "valor").
            </p>
            <div className="flex flex-col gap-1.5">
              {varPositions.map((pos, i) => (
                <div key={pos} className="flex items-center gap-2">
                  <span className="h-9 w-14 flex-none inline-flex items-center justify-center rounded-sm border border-surface-700 bg-surface-900 font-mono text-[11.5px] text-surface-300">
                    {`{{${pos}}}`}
                  </span>
                  <Input
                    size="md"
                    value={varExamples[i] ?? ''}
                    onChange={(e) => onVarExamples(varExamples.map((x, idx) => idx === i ? e.target.value : x))}
                    placeholder={`Exemplo para {{${pos}}} — ex: Ana`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Rodapé" badge="Opcional · 60 caracteres · sem variável">
        <div className="relative">
          <Input
            size="md"
            value={footer}
            onChange={(e) => onFooter(e.target.value.slice(0, 60))}
            disabled={fieldDisabled}
            placeholder="Ex: Equipe Oryon"
            className="pr-14"
          />
          <Contador n={footer.length} max={60} />
        </div>
      </Section>
    </div>
  )
}

// ─── Step 3: Botões ───────────────────────────────────────────────────────────

function StepBotoes({
  buttons, availableButtonTypes, showAddButton, onShowAddButton,
  addButtonOfType, removeButton, updateButton,
  errors,
  readOnly,
}: {
  buttons: ButtonRow[]
  availableButtonTypes: typeof BUTTON_TYPES
  showAddButton: boolean
  onShowAddButton: (v: boolean) => void
  addButtonOfType: (t: TemplateButtonType) => void
  removeButton: (i: number) => void
  updateButton: (i: number, field: keyof ButtonRow, value: string) => void
  errors: TemplateValidationErrors
  readOnly?: boolean
}) {
  const fieldDisabled = !!readOnly
  // Direção C: sem cartão por botão nem caixa de aviso. Cada botão é uma
  // faixa separada por 1px; o tipo é um Select sm; remover é a ação de
  // linha padrão (28px, --rowhover). Os primitivos Select/Input fazem o
  // campo — nada de valor copiado.
  return (
    <div className="flex flex-col">
      <Section title="Botões" badge="Opcional · até 3 — a Meta rejeita mais que isso">
        {errors.buttonsGeneral && <Banner variant="danger" className="mb-3">{errors.buttonsGeneral}</Banner>}
        {buttons.length === 0 && (
          <p className="text-[11px] text-surface-500 mb-2 leading-snug">
            Nenhum botão. Resposta rápida, link, telefone ou copiar código — o contato vê cada um como uma linha azul (ou verde) abaixo da mensagem.
          </p>
        )}
        <div className="flex flex-col">
          {buttons.map((btn, i) => {
            const cfg = BUTTON_TYPES.find((t) => t.value === btn.type)
            if (!cfg) return null
            const Icon = cfg.icon
            return (
              <div key={i} className="border-t border-surface-700 first:border-t-0 py-3 first:pt-0 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-surface-400 flex-none" />
                  <Select
                    size="sm"
                    aria-label={`Tipo do botão ${i + 1}`}
                    className="w-48"
                    value={btn.type}
                    onChange={(e) => updateButton(i, 'type', e.target.value)}
                    disabled={fieldDisabled}
                  >
                    {availableButtonTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                  <span className="text-[11px] text-surface-500">Botão {i + 1} de 3</span>
                  <button
                    type="button"
                    onClick={() => removeButton(i)}
                    disabled={fieldDisabled}
                    aria-label={`Remover botão ${i + 1}`}
                    className="ml-auto w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-danger hover:bg-[var(--rowhover)] transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <InputRow
                  value={btn.text}
                  onChange={(v) => updateButton(i, 'text', v)}
                  placeholder={
                    btn.type === 'QUICK_REPLY'  ? 'Ex: Quero saber mais'    :
                    btn.type === 'URL'          ? 'Ex: Ver oferta'           :
                    btn.type === 'PHONE_NUMBER' ? 'Ex: Ligar agora'          :
                    btn.type === 'FLOW'         ? 'Ex: Preencher formulário' :
                    'Copiar código'
                  }
                  label="Texto"
                  maxLength={25}
                  disabled={fieldDisabled}
                />
                {btn.type === 'URL' && (
                  <>
                    <InputRow value={btn.url} onChange={(v) => updateButton(i, 'url', v)} placeholder="https://seusite.com.br/promo/{{1}}" label="URL" disabled={fieldDisabled} />
                    {/\{\{1\}\}/.test(btn.url) && (
                      <InputRow value={btn.urlExample} onChange={(v) => updateButton(i, 'urlExample', v)} placeholder="https://seusite.com.br/promo/abc123" label="URL de exemplo" disabled={fieldDisabled} />
                    )}
                  </>
                )}
                {btn.type === 'PHONE_NUMBER' && (
                  <InputRow value={btn.phoneNumber} onChange={(v) => updateButton(i, 'phoneNumber', v)} placeholder="+55 11 99999-9999" label="Telefone" disabled={fieldDisabled} />
                )}
                {btn.type === 'FLOW' && (
                  <InputRow value={btn.flowId} onChange={(v) => updateButton(i, 'flowId', v)} placeholder="ID do Flow no Meta Business Manager" label="Flow ID" disabled={fieldDisabled} />
                )}
                {btn.type === 'COPY_CODE' && (
                  <p className="text-[11px] text-surface-500 pl-[104px]">O código é copiado ao toque — nada mais a configurar.</p>
                )}
                {errors.buttonByIndex?.[i] && (
                  <p className="text-[11px] text-danger pl-[104px]">{errors.buttonByIndex[i]}</p>
                )}
              </div>
            )
          })}
        </div>

        {buttons.length < 3 && (
          <div className={cn(buttons.length > 0 && 'mt-3 pt-3 border-t border-surface-700')}>
            <Button
              size="sm"
              variant="neutral"
              onClick={() => onShowAddButton(!showAddButton)}
              disabled={fieldDisabled}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              rightIcon={showAddButton ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              aria-expanded={showAddButton}
            >
              Adicionar botão
            </Button>
            <AnimatePresence>
              {showAddButton && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-sm border border-surface-700 overflow-hidden">
                    {availableButtonTypes.map((bt) => {
                      const Icon = bt.icon
                      const alreadyHasType = buttons.some((b) => b.type === bt.value)
                      const isDisabledType = bt.comingSoon || (bt.value === 'COPY_CODE' && buttons.length > 0) || alreadyHasType
                      return (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => !isDisabledType && addButtonOfType(bt.value)}
                          disabled={isDisabledType}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-surface-700 first:border-t-0 transition-colors',
                            isDisabledType ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--rowhover)]',
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 text-surface-400 flex-none" />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-medium text-surface-200 leading-tight">{bt.label}</span>
                            <span className="block text-[11px] text-surface-500 leading-snug">{bt.description}</span>
                          </span>
                          {bt.comingSoon
                            ? <span className="ml-auto text-[11px] text-surface-500">em breve</span>
                            : alreadyHasType
                              ? <span className="ml-auto text-[11px] text-surface-500">já adicionado</span>
                              : null}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Section>
    </div>
  )
}

// ─── Step 4: Revisão ──────────────────────────────────────────────────────────

function LinhaResumo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-t border-surface-700 first:border-t-0 first:pt-0">
      <span className="text-[11px] text-surface-500 w-[88px] flex-none">{rotulo}</span>
      <span className="text-xs text-surface-100 min-w-0 truncate">{children}</span>
    </div>
  )
}
function EtapaAprovacao({ n, titulo, sub, Icone, ativa }: { n: number; titulo: string; sub: string; Icone: typeof Sparkles; ativa?: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0 flex-1">
      <Icone className={cn('w-3.5 h-3.5 mt-px flex-none', ativa ? 'text-brand-400' : 'text-surface-500')} />
      <div className="min-w-0">
        <p className={cn('text-[12px] leading-tight', ativa ? 'font-semibold text-surface-50' : 'font-medium text-surface-300')}>{n} · {titulo}</p>
        <p className="text-[11px] text-surface-500 leading-snug">{sub}</p>
      </div>
    </div>
  )
}

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
  // Direção C: o resumo é uma lista rótulo/valor em faixas, e o processo de
  // aprovação vira uma linha de três passos — nada de cartões. A prévia
  // completa já está no painel da direita.
  return (
    <div className="flex flex-col">
      <Section title="Resumo" badge="Confira antes de enviar para análise">
        <div className="flex flex-col">
          <LinhaResumo rotulo="Nome"><span className="font-mono">{name || '—'}</span></LinhaResumo>
          <LinhaResumo rotulo="Categoria">{CATEGORY_LABELS[category]}</LinhaResumo>
          <LinhaResumo rotulo="Tipo">{SUBCATEGORY_LABELS[subCategory]}</LinhaResumo>
          <LinhaResumo rotulo="Idioma">{language}</LinhaResumo>
          {headerType && <LinhaResumo rotulo="Cabeçalho">{HEADER_TYPES.find((h) => h.value === headerType)?.label ?? headerType}</LinhaResumo>}
          <LinhaResumo rotulo="Variáveis">{varExamples.length === 0 ? 'nenhuma' : `${varExamples.length} · ${varExamples.join(' · ')}`}</LinhaResumo>
          <LinhaResumo rotulo="Botões">{buttons.length === 0 ? 'nenhum' : buttons.map((b) => b.text || '(sem texto)').join(' · ')}</LinhaResumo>
        </div>
      </Section>

      <Section title="Aprovação" badge="Processo automático da Meta">
        <div className="flex items-start gap-3">
          <EtapaAprovacao n={1} titulo="Enviado" sub="Submetido à Meta agora" Icone={Sparkles} ativa />
          <ChevronRight className="w-3 h-3 text-surface-600 mt-1 flex-none" />
          <EtapaAprovacao n={2} titulo="Em análise" sub="Costuma levar 24–48 h" Icone={Clock} />
          <ChevronRight className="w-3 h-3 text-surface-600 mt-1 flex-none" />
          <EtapaAprovacao n={3} titulo="Aprovado" sub="Disponível para disparos" Icone={CheckCircle2} />
        </div>
      </Section>

      {error && <Banner variant="danger" className="mt-3">{error}</Banner>}
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
  // Direção C (aprovada 22/09): sem cartão, sem título em caixa alta. Cada
  // grupo é uma faixa separada por linha de 1px, rótulo à esquerda em coluna
  // fixa de 104px, campo à direita. Contraste por peso, não por cor.
  return (
    <div className="grid grid-cols-[104px_1fr] gap-x-4 py-4 border-t border-surface-700 first:border-t-0 first:pt-0">
      <div className="pt-1.5">
        <h3 className="text-[12.5px] font-bold text-surface-100 tracking-[-0.01em] leading-tight">
          {title}{required && <span className="text-surface-500 font-normal"> *</span>}
        </h3>
        {badge && <p className="text-[11px] text-surface-500 mt-0.5 leading-snug">{badge}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11.5px] font-medium text-surface-400 mb-1 block">{children}</label>
}

function ToolbarBtn({ onClick, title, children, destaque }: {
  onClick: () => void; title: string; children: React.ReactNode; destaque?: boolean
}) {
  // Pílula h-7 / raio 7 — mesma medida dos outros chips de barra do produto.
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 px-2.5 rounded-sm border inline-flex items-center gap-1.5 text-[11.5px] transition-colors',
        destaque
          ? 'border-[var(--bd2)] text-surface-100 hover:bg-[var(--rowhover)]'
          : 'border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]',
      )}
    >{children}</button>
  )
}

function InputRow({ value, onChange, placeholder, label, maxLength, disabled }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
  maxLength?: number
  disabled?: boolean
}) {
  // Mesma gramática da faixa: rótulo à esquerda (88px, dentro da coluna de
  // conteúdo da Section), campo = primitivo Input md, contador dentro.
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-surface-500 w-[88px] flex-none">{label}</span>
      <div className="flex-1 relative min-w-0">
        <Input
          size="md"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
          placeholder={placeholder}
          className={maxLength ? 'pr-14' : undefined}
        />
        {maxLength && (
          <span className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] tabular-nums pointer-events-none', value.length >= maxLength ? 'text-danger' : 'text-surface-500')}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
