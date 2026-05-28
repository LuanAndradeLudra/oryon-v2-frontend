import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { appLogger } from '@/services/appLogger'

function readSession() {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return { userId: null, tenantId: null, actorName: null }
    const s = JSON.parse(raw) as { user?: { id?: string; tenantId?: string; firstName?: string; lastName?: string } }
    return {
      userId: s.user?.id ?? null, tenantId: s.user?.tenantId ?? null,
      actorName: s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || null : null,
    }
  } catch { return { userId: null, tenantId: null, actorName: null } }
}
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, Check, Search, Loader2, Calendar,
  Users, Tag as TagIcon, BarChart2, UserCheck, SlidersHorizontal, Info,
  Sparkles, MessageCircle, Send, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getReadableTextColor } from '@/lib/colorPalette'
import { Emoji } from '@/lib/emojiText'
import { campaignsApi, contactsApi, templatesApi, tagsApi, whatsappNumbersApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { TemplatePreview } from './TemplatePreview'
import { CATEGORY_LABELS } from './constants'
import type {
  Campaign, Contact, ContactIntent, ContactSource, ContactSentiment,
  WhatsAppTemplate, CampaignSegment, CampaignVariableMapping, Tag,
} from '@/types'

interface CampaignWizardProps {
  open: boolean
  onClose: () => void
  onCreated: (campaign: Campaign) => void
  /**
   * When provided, opens directly on the "manual" segment with these contacts
   * pre-selected. Used by the CRM bulk bar so the user doesn't have to
   * re-find the contacts they already selected.
   */
  initialContactIds?: string[]
  /** Optional pre-filled campaign name (e.g. "Campanha de 5 contatos"). */
  initialName?: string
}

type Step = 1 | 2 | 3 | 4 | 5

const STEP_LABELS = ['Template', 'Segmento', 'Variáveis', 'Agendar', 'Revisão']

const CONTACT_FIELDS = [
  { value: 'displayName', label: 'Nome do contato' },
  { value: 'company',     label: 'Empresa' },
  { value: 'email',       label: 'E-mail' },
  { value: 'city',        label: 'Cidade' },
  { value: 'jobTitle',    label: 'Cargo' },
]

const SEGMENT_OPTIONS: {
  value: CampaignSegment['type']
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'all',    label: 'Toda a base',       description: 'Todos os contatos cadastrados na sua conta',              icon: Users },
  { value: 'tag',    label: 'Por tags',           description: 'Filtra contatos com uma ou mais tags específicas',         icon: TagIcon },
  { value: 'stage',  label: 'Estágio do CRM',    description: 'Contatos em determinadas fases do pipeline de vendas',     icon: BarChart2 },
  { value: 'manual', label: 'Seleção manual',    description: 'Busque e escolha cada contato individualmente',            icon: UserCheck },
  { value: 'filter', label: 'Filtro avançado',   description: 'Combine intenção, origem, opt-in e estágio livremente',   icon: SlidersHorizontal },
]

const INTENT_OPTIONS: { value: ContactIntent; label: string; color: string }[] = [
  { value: 'high',    label: 'Alta',       color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'medium',  label: 'Média',      color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { value: 'low',     label: 'Baixa',      color: 'text-surface-400 border-surface-600 bg-surface-800' },
  { value: 'unknown', label: 'Indefinida', color: 'text-surface-500 border-surface-700 bg-surface-800/50' },
]

const SOURCE_OPTIONS: { value: ContactSource; label: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'website',   label: 'Website' },
  { value: 'referral',  label: 'Indicação' },
  { value: 'campaign',  label: 'Campanha' },
  { value: 'manual',    label: 'Manual' },
  { value: 'import',    label: 'Importação' },
]

const SENTIMENT_OPTIONS: { value: ContactSentiment; label: string; color: string }[] = [
  { value: 'positive', label: 'Positivo',     color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'neutral',  label: 'Neutro',       color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { value: 'negative', label: 'Negativo',     color: 'text-danger border-danger/40 bg-danger/10' },
  { value: 'unknown',  label: 'Desconhecido', color: 'text-surface-500 border-surface-700 bg-surface-800/50' },
]

export function CampaignWizard({
  open, onClose, onCreated, initialContactIds, initialName,
}: CampaignWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const sessionIdRef = useRef(`wiz-campaign-${Date.now()}`)
  const completedRef = useRef(false)

  // Step 1
  const [templates, setTemplates]             = useState<WhatsAppTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [campaignName, setCampaignName]       = useState('')

  // Step 2 — base
  const [segmentType, setSegmentType]         = useState<CampaignSegment['type']>('all')
  const [selectedTagIds, setSelectedTagIds]   = useState<string[]>([])
  const [selectedStages, setSelectedStages]   = useState<string[]>([])
  const [tags, setTags]                       = useState<Tag[]>([])
  const { stages } = useCRMConfig()

  // Step 2 — manual picker
  const [contacts, setContacts]               = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  // Step 2 — advanced filter (existing)
  const [filterStages, setFilterStages]       = useState<string[]>([])
  const [filterTagIds, setFilterTagIds]       = useState<string[]>([])
  const [filterIntent, setFilterIntent]       = useState<ContactIntent[]>([])
  const [filterSource, setFilterSource]       = useState<ContactSource[]>([])
  const [filterOptIn, setFilterOptIn]         = useState<boolean | undefined>(undefined)

  // Step 2 — extended filter state
  const [filterSentiment, setFilterSentiment]               = useState<ContactSentiment[]>([])
  const [filterContactSearch, setFilterContactSearch]       = useState('')
  const [filterHasConversations, setFilterHasConversations] = useState<boolean | undefined>(undefined)

  // Step 3
  const [mappings, setMappings]               = useState<CampaignVariableMapping[]>([])

  // Step 4
  const [scheduleMode, setScheduleMode]       = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt]         = useState('')

  // WhatsApp number — smart default (dept → primary → lone → pick
  // manually). Operator can still override. Callout below surfaces which
  // line will be targeted at submit time.
  const smartDefault = useSmartLineDefault()
  const [waNumbers, setWaNumbers]             = useState<Array<{ id: string; displayPhoneNumber: string; label?: string }>>([])
  const [whatsappNumberId, setWhatsappNumberId] = useState('')

  // Submit
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')

  // ── Reset & load data when wizard opens ─────────────────────────────────────

  const staleRef = useRef(false)

  useEffect(() => {
    if (!open) return
    staleRef.current = false
    sessionIdRef.current = `wiz-campaign-${Date.now()}`
    completedRef.current = false
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: 1, step_name: STEP_LABELS[0], action: 'started',
    })

    // Reset all state synchronously before loading. If the caller seeded
    // contacts, jump straight to the "manual" segment with them selected.
    const seed = initialContactIds ?? []
    setStep(1)
    setSelectedTemplate(null)
    setCampaignName(initialName ?? '')
    setSegmentType(seed.length > 0 ? 'manual' : 'all')
    setSelectedTagIds([]); setSelectedStages([])
    setSelectedContactIds(seed)
    setFilterStages([]); setFilterTagIds([]); setFilterIntent([]); setFilterSource([]); setFilterOptIn(undefined)
    setFilterSentiment([]); setFilterContactSearch(''); setFilterHasConversations(undefined)
    setMappings([])
    setScheduleMode('now'); setScheduledAt('')
    setWhatsappNumberId('')
    setError('')

    setLoadingTemplates(true)
    setLoadingContacts(true)
    Promise.all([
      templatesApi.ensureFromMeta().then(() => templatesApi.list('APPROVED')),
      tagsApi.list(),
      contactsApi.list({}, 1, 500),
      whatsappNumbersApi.list(),
    ]).then(([tplRes, tagRes, ctRes, waRes]) => {
      if (staleRef.current) return
      setTemplates(tplRes.data)
      setTags(tagRes.data)
      setContacts(ctRes.data.data)
      const nums = (waRes.data as any[]).map((n: any) => ({ id: n.id, displayPhoneNumber: n.displayPhoneNumber, label: n.label }))
      setWaNumbers(nums)
      // Apply the smart default here (single active → auto-pick; else
      // dept/primary; else blank for explicit choice). Template
      // selection later may still override this — see effect below.
      if (!smartDefault.loading && smartDefault.lineId && nums.some((n) => n.id === smartDefault.lineId)) {
        setWhatsappNumberId(smartDefault.lineId)
      } else if (nums.length === 1) {
        setWhatsappNumberId(nums[0].id)
      }
    }).finally(() => {
      if (!staleRef.current) {
        setLoadingTemplates(false)
        setLoadingContacts(false)
      }
    })

    return () => { staleRef.current = true }
  }, [open])

  // ── Init variable mappings when template changes ────────────────────────────

  useEffect(() => {
    if (!selectedTemplate) { setMappings([]); return }
    // Auto-select the number associated with the template
    if (selectedTemplate.whatsappNumberId) setWhatsappNumberId(selectedTemplate.whatsappNumberId)
    const vars = selectedTemplate.bodyVariables ?? []
    setMappings(vars.map((variableName, i) => ({
      position: i + 1,
      variableName,
      source: 'contact_field',
      contactField: 'displayName',
    })))
  }, [selectedTemplate])

  // ── Estimated reach ─────────────────────────────────────────────────────────

  const estimatedReach = useMemo(() => {
    if (!contacts.length) return null
    if (segmentType === 'all') return contacts.length
    if (segmentType === 'tag')
      return selectedTagIds.length
        ? contacts.filter((c) => c.tags?.some((t) => selectedTagIds.includes(t.id))).length
        : null
    if (segmentType === 'stage')
      return selectedStages.length
        ? contacts.filter((c) => selectedStages.includes(c.stage ?? '')).length
        : null
    if (segmentType === 'manual') return selectedContactIds.length || null
    if (segmentType === 'filter') {
      const hasFilter = filterStages.length || filterTagIds.length || filterIntent.length ||
                        filterSource.length || filterOptIn !== undefined ||
                        filterSentiment.length || filterContactSearch.trim() ||
                        filterHasConversations !== undefined
      if (!hasFilter) return null
      let f = contacts
      if (filterStages.length)  f = f.filter((c) => filterStages.includes(c.stage ?? ''))
      if (filterTagIds.length)  f = f.filter((c) => c.tags?.some((t) => filterTagIds.includes(t.id)))
      if (filterIntent.length)  f = f.filter((c) => filterIntent.includes(c.intent ?? 'unknown'))
      if (filterSource.length)  f = f.filter((c) => filterSource.includes(c.source ?? 'other'))
      if (filterOptIn !== undefined) f = f.filter((c) => c.optIn === filterOptIn)
      if (filterSentiment.length)  f = f.filter((c) => filterSentiment.includes(c.aiSentiment ?? 'unknown'))
      if (filterContactSearch.trim()) {
        const q = filterContactSearch.toLowerCase()
        f = f.filter((c) => c.displayName.toLowerCase().includes(q) || c.waId.includes(q))
      }
      if (filterHasConversations !== undefined)
        f = f.filter((c) => filterHasConversations ? (c.conversationCount ?? 0) > 0 : (c.conversationCount ?? 0) === 0)
      return f.length
    }
    return null
  }, [contacts, segmentType, selectedTagIds, selectedStages, selectedContactIds,
      filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
      filterSentiment, filterContactSearch, filterHasConversations])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const updateMapping = useCallback((position: number, patch: Partial<CampaignVariableMapping>) => {
    setMappings((prev) => prev.map((m) => m.position === position ? { ...m, ...patch } : m))
  }, [])

  // Multi-WABA gate — block advance on every step until the line is
  // picked. The callout at the top of the wizard carries the message;
  // the button just refuses.
  const needsExplicitLine = waNumbers.length > 1 && !whatsappNumberId

  const canAdvance = useMemo((): boolean => {
    if (needsExplicitLine) return false
    if (step === 1) return !!selectedTemplate && campaignName.trim().length > 0
    if (step === 2) {
      if (segmentType === 'tag')    return selectedTagIds.length > 0
      if (segmentType === 'stage')  return selectedStages.length > 0
      if (segmentType === 'manual') return selectedContactIds.length > 0
      if (segmentType === 'filter') return !!(
        filterStages.length || filterTagIds.length || filterIntent.length ||
        filterSource.length || filterOptIn !== undefined ||
        filterSentiment.length || filterContactSearch.trim() ||
        filterHasConversations !== undefined
      )
      return true // 'all'
    }
    if (step === 3) return mappings.every((m) => {
      if (m.source === 'literal')       return (m.literal ?? '').trim().length > 0
      if (m.source === 'contact_field') return !!m.contactField
      if (m.source === 'custom_field')  return !!m.customFieldKey
      return false
    })
    if (step === 4) return scheduleMode === 'now' || !!scheduledAt
    if (step === 5) return true
    return false
  }, [needsExplicitLine, step, selectedTemplate, campaignName, segmentType, selectedTagIds, selectedStages,
      selectedContactIds, filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
      filterSentiment, filterContactSearch, filterHasConversations,
      mappings, scheduleMode, scheduledAt])

  const handleSubmit = async () => {
    if (!selectedTemplate) return
    setSaving(true); setError('')
    const { userId, tenantId, actorName } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: 5, step_name: STEP_LABELS[4], action: 'started',
      data: { campaign_name: campaignName, template_id: selectedTemplate.id, segment_type: segmentType, schedule_mode: scheduleMode },
    })
    try {
      const segment: CampaignSegment = {
        type: segmentType,
        ...(segmentType === 'tag'    ? { tagIds: selectedTagIds }           : {}),
        ...(segmentType === 'stage'  ? { stages: selectedStages }           : {}),
        ...(segmentType === 'manual' ? { contactIds: selectedContactIds }   : {}),
        ...(segmentType === 'filter' ? {
          ...(filterStages.length  ? { filterStages }  : {}),
          ...(filterTagIds.length  ? { filterTagIds }  : {}),
          ...(filterIntent.length  ? { filterIntent }  : {}),
          ...(filterSource.length  ? { filterSource }  : {}),
          ...(filterOptIn !== undefined ? { filterOptIn } : {}),
          ...(filterSentiment.length ? { filterSentiment } : {}),
          ...(filterContactSearch.trim() ? { filterContactSearch } : {}),
          ...(filterHasConversations !== undefined ? { filterHasConversations } : {}),
        } : {}),
      }
      const res = await campaignsApi.create({
        name: campaignName.trim(),
        templateId: selectedTemplate.id,
        segment,
        variableMappings: mappings,
        // Converte para ISO UTC antes de enviar. O datetime-local devolve
        // "YYYY-MM-DDTHH:mm" sem timezone — new Date() no browser interpreta
        // como hora local do usuário, e .toISOString() converte para UTC.
        // Isso garante que o servidor (UTC na AWS) dispare no horário certo.
        scheduledAt: scheduleMode === 'later' ? new Date(scheduledAt).toISOString() : undefined,
        ...(whatsappNumberId ? { whatsappNumberId } : {}),
      } as any)

      let finalCampaign = res.data

      // Quando o modo é "agora", disparar imediatamente após criar.
      if (scheduleMode === 'now') {
        try {
          const sendRes = await campaignsApi.send(res.data.id)
          finalCampaign = sendRes.data
        } catch (sendErr) {
          const msg = (sendErr as { response?: { data?: { message?: string | string[] } } })
            ?.response?.data?.message
          const text = Array.isArray(msg) ? msg.join('; ') : msg
          // Campanha foi criada mas o envio falhou — informar sem
          // desfazer a criação (o usuário pode tentar na lista).
          setError(text?.trim() || 'Campanha criada, mas o envio automático falhou. Use "Enviar" na lista.')
        }
      }

      completedRef.current = true
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
        step_number: 5, step_name: STEP_LABELS[4], action: 'completed',
        data: { campaign_id: res.data.id, campaign_name: campaignName, template_id: selectedTemplate.id, segment_type: segmentType, schedule_mode: scheduleMode },
      })
      appLogger.logActivity({
        tenant_id: tenantId, actor_id: userId, actor_name: actorName,
        action: 'campaign_wizard_completed', entity_type: 'campaign',
        entity_id: res.data.id, entity_name: campaignName,
        description: `Campanha "${campaignName}" criada via wizard com template "${selectedTemplate.name}"`,
        details: { segment_type: segmentType, schedule_mode: scheduleMode, template_name: selectedTemplate.name },
        source: 'ui',
      })
      onCreated(finalCampaign)
    } catch (createErr) {
      const msg = (createErr as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message
      const text = Array.isArray(msg) ? msg.join('; ') : msg
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
        step_number: 5, step_name: STEP_LABELS[4], action: 'error',
        error_message: text ?? 'Erro ao criar campanha',
      })
      setError(text?.trim() || 'Erro ao criar campanha. Verifique os campos e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wizard-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-[49]"
            onClick={onClose}
          />

          <motion.div
            key="wizard-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-3xl pointer-events-auto flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-surface-50">Nova campanha</h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Passo {step} de 5 — {STEP_LABELS[step - 1]}
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Workspace line callout — multi-WABA only */}
              <div className="px-5 pt-3">
                <WhatsappLineRow
                  whatsappNumberId={whatsappNumberId || null}
                  variant="callout"
                  onLineChange={(id) => setWhatsappNumberId(id)}
                />
              </div>

              {/* Progress */}
              <div className="flex px-5 py-3 gap-1.5 border-b border-surface-800 flex-shrink-0">
                {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                  <div key={s} className="flex-1 flex items-center gap-1.5">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                      s < step  ? 'bg-brand-600 text-surface-950' :
                      s === step ? 'bg-brand-600/20 border-2 border-brand-500 text-brand-400' :
                                   'bg-surface-800 text-surface-500'
                    )}>
                      {s < step ? <Check className="w-3 h-3" /> : s}
                    </div>
                    <span className={cn('text-xs transition-colors', s === step ? 'text-surface-200' : 'text-surface-600')}>
                      {STEP_LABELS[s - 1]}
                    </span>
                    {s < 5 && <div className={cn('flex-1 h-px', s < step ? 'bg-brand-600/50' : 'bg-surface-700')} />}
                  </div>
                ))}
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto p-5">
                {step === 1 && (
                  <>
                    <Step1
                      templates={templates}
                      loading={loadingTemplates}
                      selected={selectedTemplate}
                      onSelect={setSelectedTemplate}
                      campaignName={campaignName}
                      onNameChange={setCampaignName}
                    />
                    {/* Line picker lives in the top-of-wizard
                        WhatsappLineRow callout (right-side select) —
                        no duplicate "Número de envio" block here. */}
                  </>
                )}
                {step === 2 && (
                  <Step2
                    segmentType={segmentType}
                    onSegmentType={setSegmentType}
                    tags={tags}
                    selectedTagIds={selectedTagIds}
                    onTagIds={setSelectedTagIds}
                    stages={stages}
                    selectedStages={selectedStages}
                    onStages={setSelectedStages}
                    contacts={contacts}
                    loadingContacts={loadingContacts}
                    selectedContactIds={selectedContactIds}
                    onContactIds={setSelectedContactIds}
                    filterStages={filterStages}
                    onFilterStages={setFilterStages}
                    filterTagIds={filterTagIds}
                    onFilterTagIds={setFilterTagIds}
                    filterIntent={filterIntent}
                    onFilterIntent={setFilterIntent}
                    filterSource={filterSource}
                    onFilterSource={setFilterSource}
                    filterOptIn={filterOptIn}
                    onFilterOptIn={setFilterOptIn}
                    filterSentiment={filterSentiment}
                    onFilterSentiment={setFilterSentiment}
                    filterContactSearch={filterContactSearch}
                    onFilterContactSearch={setFilterContactSearch}
                    filterHasConversations={filterHasConversations}
                    onFilterHasConversations={setFilterHasConversations}
                    estimatedReach={estimatedReach}
                  />
                )}
                {step === 3 && selectedTemplate && (
                  <Step3
                    template={selectedTemplate}
                    mappings={mappings}
                    onUpdate={updateMapping}
                  />
                )}
                {step === 4 && (
                  <Step4
                    estimatedReach={estimatedReach}
                    scheduleMode={scheduleMode}
                    onScheduleMode={setScheduleMode}
                    scheduledAt={scheduledAt}
                    onScheduledAt={setScheduledAt}
                  />
                )}
                {step === 5 && selectedTemplate && (
                  <Step5
                    template={selectedTemplate}
                    mappings={mappings}
                    segmentType={segmentType}
                    tags={tags}
                    stages={stages}
                    selectedTagIds={selectedTagIds}
                    selectedStages={selectedStages}
                    selectedContactIds={selectedContactIds}
                    contacts={contacts}
                    filterStages={filterStages}
                    filterTagIds={filterTagIds}
                    filterIntent={filterIntent}
                    filterSource={filterSource}
                    filterOptIn={filterOptIn}
                    filterSentiment={filterSentiment}
                    filterContactSearch={filterContactSearch}
                    filterHasConversations={filterHasConversations}
                    estimatedReach={estimatedReach}
                    scheduleMode={scheduleMode}
                    scheduledAt={scheduledAt}
                    campaignName={campaignName}
                  />
                )}
                {error && (
                  <p className="text-xs text-danger bg-danger/10 px-3 py-2 rounded-lg mt-4">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-surface-800 flex-shrink-0">
                <button
                  onClick={() => {
                    const { userId, tenantId } = readSession()
                    appLogger.logWizardEvent({
                      tenant_id: tenantId, user_id: userId,
                      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
                      step_number: step, step_name: STEP_LABELS[step - 1], action: 'back',
                    })
                    setStep((s) => Math.max(1, s - 1) as Step)
                  }}
                  disabled={step === 1}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    step === 1 ? 'invisible' : 'text-surface-400 hover:text-surface-200'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                {step < 5 ? (
                  <button
                    onClick={() => {
                      const { userId, tenantId } = readSession()
                      appLogger.logWizardEvent({
                        tenant_id: tenantId, user_id: userId,
                        wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
                        step_number: step, step_name: STEP_LABELS[step - 1], action: 'completed',
                      })
                      setStep((s) => (s + 1) as Step)
                    }}
                    disabled={!canAdvance}
                    title={needsExplicitLine ? 'Escolha a linha WhatsApp no banner acima para continuar' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                      canAdvance
                        ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    )}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving || (waNumbers.length > 1 && !whatsappNumberId)}
                    title={waNumbers.length > 1 && !whatsappNumberId ? 'Escolha a linha WhatsApp antes de criar' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                      !saving && !(waNumbers.length > 1 && !whatsappNumberId)
                        ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    )}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {scheduleMode === 'later'
                      ? 'Agendar campanha'
                      : saving ? 'Enviando...' : 'Criar e enviar agora'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Step 1: Template & Name ────────────────────────────────────────────────

function Step1({
  templates, loading, selected, onSelect, campaignName, onNameChange,
}: {
  templates: WhatsAppTemplate[]
  loading: boolean
  selected: WhatsAppTemplate | null
  onSelect: (t: WhatsAppTemplate) => void
  campaignName: string
  onNameChange: (v: string) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-brand-500/5 border border-brand-500/20 rounded-xl">
        <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-surface-400 leading-relaxed">
          Apenas templates com status <strong className="text-brand-300">Aprovado</strong> pela Meta podem ser usados em campanhas.
          Crie e submeta novos modelos na aba <strong className="text-surface-300">Templates</strong>.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-400 mb-1.5 block">
          Nome da campanha <span className="text-danger">*</span>
        </label>
        <input
          value={campaignName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Campanha Black Friday 2026"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <p className="text-[11px] text-surface-600 mt-1">Use um nome descritivo para identificar a campanha no histórico.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">
          Selecione o template <span className="text-danger">*</span>
        </label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou conteúdo..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-surface-500">Nenhum template aprovado no Oryon</p>
            <p className="text-xs text-surface-600 max-w-xs mx-auto">
              Abra a aba Templates e use Sincronizar para importar os modelos ativos da Meta.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  selected?.id === tpl.id
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium font-mono text-surface-100">{tpl.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">{tpl.category}</span>
                    <span className="text-[11px] text-surface-600">{tpl.language}</span>
                  </div>
                </div>
                <p className="text-xs text-surface-500 line-clamp-1">{tpl.body.replace(/\n/g, ' ')}</p>
                {tpl.bodyVariables && tpl.bodyVariables.length > 0 && (
                  <p className="text-[11px] text-brand-400/70 mt-1">
                    {tpl.bodyVariables.length} variáve{tpl.bodyVariables.length === 1 ? 'l' : 'is'}: {tpl.bodyVariables.map((v, i) => `{{${i + 1}}} ${v}`).join(', ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 2: Segment ─────────────────────────────────────────────────────────

function Step2({
  segmentType, onSegmentType,
  tags, selectedTagIds, onTagIds,
  stages, selectedStages, onStages,
  contacts, loadingContacts, selectedContactIds, onContactIds,
  filterStages, onFilterStages,
  filterTagIds, onFilterTagIds,
  filterIntent, onFilterIntent,
  filterSource, onFilterSource,
  filterOptIn, onFilterOptIn,
  filterSentiment, onFilterSentiment,
  filterContactSearch, onFilterContactSearch,
  filterHasConversations, onFilterHasConversations,
  estimatedReach,
}: {
  segmentType: CampaignSegment['type']
  onSegmentType: (t: CampaignSegment['type']) => void
  tags: Tag[]
  selectedTagIds: string[]
  onTagIds: (ids: string[]) => void
  stages: { key: string; label: string; color: string }[]
  selectedStages: string[]
  onStages: (s: string[]) => void
  contacts: Contact[]
  loadingContacts: boolean
  selectedContactIds: string[]
  onContactIds: (ids: string[]) => void
  filterStages: string[]
  onFilterStages: (v: string[]) => void
  filterTagIds: string[]
  onFilterTagIds: (v: string[]) => void
  filterIntent: ContactIntent[]
  onFilterIntent: (v: ContactIntent[]) => void
  filterSource: ContactSource[]
  onFilterSource: (v: ContactSource[]) => void
  filterOptIn: boolean | undefined
  onFilterOptIn: (v: boolean | undefined) => void
  filterSentiment: ContactSentiment[]
  onFilterSentiment: (v: ContactSentiment[]) => void
  filterContactSearch: string
  onFilterContactSearch: (v: string) => void
  filterHasConversations: boolean | undefined
  onFilterHasConversations: (v: boolean | undefined) => void
  estimatedReach: number | null
}) {
  const [contactSearch, setContactSearch] = useState('')

  const toggleTag = (id: string) =>
    onTagIds(selectedTagIds.includes(id) ? selectedTagIds.filter((t) => t !== id) : [...selectedTagIds, id])

  const toggleStage = (key: string) =>
    onStages(selectedStages.includes(key) ? selectedStages.filter((s) => s !== key) : [...selectedStages, key])

  const toggleContact = (id: string) =>
    onContactIds(selectedContactIds.includes(id) ? selectedContactIds.filter((c) => c !== id) : [...selectedContactIds, id])

  const toggleFilterStage = (key: string) =>
    onFilterStages(filterStages.includes(key) ? filterStages.filter((s) => s !== key) : [...filterStages, key])

  const toggleFilterTag = (id: string) =>
    onFilterTagIds(filterTagIds.includes(id) ? filterTagIds.filter((t) => t !== id) : [...filterTagIds, id])

  const toggleFilterIntent = (v: ContactIntent) =>
    onFilterIntent(filterIntent.includes(v) ? filterIntent.filter((i) => i !== v) : [...filterIntent, v])

  const toggleFilterSource = (v: ContactSource) =>
    onFilterSource(filterSource.includes(v) ? filterSource.filter((s) => s !== v) : [...filterSource, v])

  const toggleFilterSentiment = (v: ContactSentiment) =>
    onFilterSentiment(filterSentiment.includes(v) ? filterSentiment.filter((s) => s !== v) : [...filterSentiment, v])

  const filteredContacts = contacts.filter((c) =>
    !contactSearch ||
    c.displayName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.waId.includes(contactSearch)
  )

  const chipBase = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all'
  const chipOn   = 'border-transparent text-white'
  const chipOff  = 'border-surface-700 text-surface-400 hover:border-surface-500 hover:text-surface-200'

  return (
    <div className="space-y-4">
      {/* Segment type cards */}
      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">Como definir os destinatários?</label>
        <div className="grid grid-cols-1 gap-1.5">
          {SEGMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => onSegmentType(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3',
                  segmentType === opt.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  segmentType === opt.value ? 'border-brand-500' : 'border-surface-600'
                )}>
                  {segmentType === opt.value && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <Icon className={cn('w-4 h-4 flex-shrink-0', segmentType === opt.value ? 'text-brand-400' : 'text-surface-500')} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-100">{opt.label}</p>
                  <p className="text-[11px] text-surface-500">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reach estimate */}
      {estimatedReach !== null && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
          estimatedReach === 0
            ? 'bg-danger/10 border border-danger/30 text-danger'
            : 'bg-status-active-bg border border-status-active-border text-status-active'
        )}>
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          {estimatedReach === 0
            ? 'Nenhum contato corresponde aos filtros selecionados'
            : `Alcance estimado: ${estimatedReach} contato${estimatedReach === 1 ? '' : 's'}`}
        </div>
      )}

      {/* Tag picker */}
      {segmentType === 'tag' && (
        <div>
          <label className="text-xs font-medium text-surface-400 mb-2 block">
            Selecione as tags <span className="text-[11px] text-surface-600">(contatos com qualquer uma serão incluídos)</span>
          </label>
          {tags.length === 0 ? (
            <p className="text-xs text-surface-600 py-2">Nenhuma tag cadastrada.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(chipBase, selectedTagIds.includes(tag.id) ? chipOn : chipOff)}
                  style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage picker */}
      {segmentType === 'stage' && (
        <div>
          <label className="text-xs font-medium text-surface-400 mb-2 block">
            Selecione os estágios <span className="text-[11px] text-surface-600">(contatos em qualquer um serão incluídos)</span>
          </label>
          {stages.length === 0 ? (
            <p className="text-xs text-surface-600 py-2">Nenhum estágio configurado no CRM.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => (
                <button
                  key={stage.key}
                  onClick={() => toggleStage(stage.key)}
                  className={cn(chipBase, selectedStages.includes(stage.key) ? chipOn : chipOff)}
                  style={selectedStages.includes(stage.key) ? { backgroundColor: stage.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  {stage.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual contact picker */}
      {segmentType === 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-surface-400">
              Buscar e selecionar contatos
            </label>
            {selectedContactIds.length > 0 && (
              <button onClick={() => onContactIds([])} className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors">
                Limpar seleção ({selectedContactIds.length})
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-xs text-surface-600 text-center py-6">Nenhum contato encontrado</p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => {
                const selected = selectedContactIds.includes(contact.id)
                const stageDef = stages.find((s) => s.key === contact.stage)
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left',
                      selected ? 'border-brand-500/50 bg-brand-500/8' : 'border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/60'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      selected ? 'bg-brand-600 border-brand-500' : 'border-surface-600'
                    )}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {contact.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{contact.displayName}</p>
                      <p className="text-[11px] text-surface-500">{contact.waId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stageDef && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: stageDef.color, color: getReadableTextColor(stageDef.color) }}
                        >
                          {stageDef.label}
                        </span>
                      )}
                      {contact.tags && contact.tags.length > 0 && (
                        <span className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                          {contact.tags[0].name}
                          {contact.tags.length > 1 && ` +${contact.tags.length - 1}`}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {!loadingContacts && contacts.length > 0 && (
            <p className="text-[11px] text-surface-600 mt-2 text-center">
              {filteredContacts.length} de {contacts.length} contatos · {selectedContactIds.length} selecionados
            </p>
          )}
        </div>
      )}

      {/* Advanced filter */}
      {segmentType === 'filter' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
            <Info className="w-3.5 h-3.5 text-surface-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Os critérios marcados são combinados com <strong className="text-surface-300">E</strong> —
              apenas contatos que atendem a <em>todos</em> os filtros ativos serão incluídos.
              Deixe um critério em branco para ignorá-lo.
            </p>
          </div>

          {/* Filter: stages */}
          {stages.length > 0 && (
            <FilterGroup label="Estágio do CRM">
              <div className="flex flex-wrap gap-1.5">
                {stages.map((stage) => (
                  <button
                    key={stage.key}
                    onClick={() => toggleFilterStage(stage.key)}
                    className={cn(chipBase, filterStages.includes(stage.key) ? chipOn : chipOff)}
                    style={filterStages.includes(stage.key) ? { backgroundColor: stage.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Filter: tags */}
          {tags.length > 0 && (
            <FilterGroup label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilterTag(tag.id)}
                    className={cn(chipBase, filterTagIds.includes(tag.id) ? chipOn : chipOff)}
                    style={filterTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Filter: intent */}
          <FilterGroup label="Intenção de compra">
            <div className="flex flex-wrap gap-1.5">
              {INTENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterIntent(opt.value)}
                  className={cn(
                    chipBase,
                    filterIntent.includes(opt.value) ? opt.color : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: source */}
          <FilterGroup label="Origem do contato">
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterSource(opt.value)}
                  className={cn(
                    chipBase,
                    filterSource.includes(opt.value)
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: opt-in */}
          <FilterGroup label="Opt-in de marketing">
            <div className="flex gap-1.5">
              {([
                { value: undefined, label: 'Qualquer' },
                { value: true,      label: 'Com opt-in ✓' },
                { value: false,     label: 'Sem opt-in' },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => onFilterOptIn(opt.value)}
                  className={cn(
                    chipBase,
                    filterOptIn === opt.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-surface-600 mt-1.5">
              Opt-in indica que o contato autorizou o envio de mensagens de marketing.
            </p>
          </FilterGroup>

          {/* Filter: sentiment */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-brand-400" />Sentimento da IA</span>}>
            <div className="flex flex-wrap gap-1.5">
              {SENTIMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterSentiment(opt.value)}
                  className={cn(
                    chipBase,
                    filterSentiment.includes(opt.value) ? opt.color : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: contact search */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><Search className="w-3 h-3 text-brand-400" />Busca por contato</span>}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
              <input
                value={filterContactSearch}
                onChange={(e) => onFilterContactSearch(e.target.value)}
                placeholder="Buscar por nome ou número..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-surface-600 mt-1">Inclui contatos cujo nome ou número de WhatsApp correspondam à busca.</p>
          </FilterGroup>

          {/* Filter: has conversations */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-brand-400" />Engajamento</span>}>
            <div className="flex gap-1.5">
              {([
                { value: undefined, label: 'Qualquer' },
                { value: true,      label: 'Com conversas' },
                { value: false,     label: 'Sem conversas' },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => onFilterHasConversations(opt.value)}
                  className={cn(
                    chipBase,
                    filterHasConversations === opt.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface-800/40 border border-surface-700/60 rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  )
}

// ─── Step 3: Variable Mapping ─────────────────────────────────────────────────

function Step3({
  template, mappings, onUpdate,
}: {
  template: WhatsAppTemplate
  mappings: CampaignVariableMapping[]
  onUpdate: (position: number, patch: Partial<CampaignVariableMapping>) => void
}) {
  if (mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <Check className="w-8 h-8 text-emerald-400" />
        <p className="text-sm text-surface-300">Este template não possui variáveis</p>
        <p className="text-xs text-surface-500">Clique em Próximo para continuar</p>
      </div>
    )
  }

  const previewVars: Record<string, string> = {}
  mappings.forEach((m) => {
    const val = m.source === 'literal'       ? (m.literal ?? '') :
                m.source === 'contact_field' ? (CONTACT_FIELDS.find((f) => f.value === m.contactField)?.label ?? m.contactField ?? '') :
                m.customFieldKey ?? ''
    previewVars[String(m.position)] = val || `{{${m.position}}}`
  })

  return (
    <div className="flex gap-5">
      <div className="flex-1 space-y-4">
        {/* Explanation */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
          <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-surface-400 space-y-1 leading-relaxed">
            <p>Configure como cada <strong className="text-brand-300">variável numérica</strong> do template será preenchida para cada destinatário no momento do envio.</p>
            <p><strong className="text-surface-300">Campo do contato</strong> — usa dados do CRM (nome, empresa, cidade…).</p>
            <p><strong className="text-surface-300">Campo personalizado</strong> — usa um campo extra criado em Configurações → CRM.</p>
            <p><strong className="text-surface-300">Valor fixo</strong> — mesmo texto para todos os destinatários.</p>
          </div>
        </div>

        {mappings.map((m) => (
          <div key={m.position} className="bg-surface-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">{`{{${m.position}}}`}</span>
              <span className="text-sm font-medium text-surface-200">{m.variableName}</span>
            </div>

            <div className="flex items-center gap-2">
              {(['contact_field', 'custom_field', 'literal'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => onUpdate(m.position, { source: src })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    m.source === src
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-surface-700 text-surface-500 hover:border-surface-600'
                  )}
                >
                  {src === 'contact_field' ? 'Campo do contato' :
                   src === 'custom_field'  ? 'Campo personalizado' : 'Valor fixo'}
                </button>
              ))}
            </div>

            {m.source === 'contact_field' && (
              <select
                value={m.contactField ?? 'displayName'}
                onChange={(e) => onUpdate(m.position, { contactField: e.target.value })}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
              >
                {CONTACT_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            )}

            {m.source === 'literal' && (
              <input
                value={m.literal ?? ''}
                onChange={(e) => onUpdate(m.position, { literal: e.target.value })}
                placeholder="Digite o valor fixo para todos os destinatários..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-[220px] flex-shrink-0">
        <p className="text-xs text-surface-500 mb-3 text-center">Preview com mapeamento</p>
        <TemplatePreview template={template} variables={previewVars} compact />
      </div>
    </div>
  )
}

// ─── Step 4: Schedule ─────────────────────────────────────────────────────────

function Step4({
  estimatedReach,
  scheduleMode, onScheduleMode, scheduledAt, onScheduledAt,
}: {
  estimatedReach: number | null
  scheduleMode: 'now' | 'later'
  onScheduleMode: (m: 'now' | 'later') => void
  scheduledAt: string
  onScheduledAt: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      {/* Schedule */}
      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">Quando enviar?</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'now',   label: 'Enviar agora',  icon: <Send className="w-4 h-4" />, desc: 'Disparo imediato após criar' },
            { value: 'later', label: 'Agendar',        icon: <Clock className="w-4 h-4" />, desc: 'Escolha data e hora do envio' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onScheduleMode(opt.value)}
              className={cn(
                'p-3 rounded-xl border text-left transition-colors',
                scheduleMode === opt.value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
              )}
            >
              <span className="text-surface-400">{opt.icon}</span>
              <p className="text-sm font-medium text-surface-100 mt-1">{opt.label}</p>
              <p className="text-[11px] text-surface-500">{opt.desc}</p>
            </button>
          ))}
        </div>

        {scheduleMode === 'later' && (
          <div className="mt-3">
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Data e hora do envio</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => onScheduledAt(e.target.value)}
                min={(() => {
                  // toISOString() é UTC — subtrai o offset para obter hora local
                  const now = new Date()
                  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
                  return local.toISOString().slice(0, 16)
                })()}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-surface-600 mt-1.5">
              Dica: envios nas terças e quartas, entre 9h–11h, tendem a ter maiores taxas de abertura.
            </p>
          </div>
        )}
      </div>

      {/* Warning for large reach */}
      {estimatedReach !== null && estimatedReach > 100 && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-status-pending-bg border border-status-pending-border rounded-xl">
          <Info className="w-3.5 h-3.5 text-status-pending mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-status-pending/80 leading-relaxed">
            Campanhas grandes podem impactar o <strong>limite de conversas</strong> do seu plano e a qualidade do número WhatsApp.
            Verifique seu saldo antes de enviar.
          </p>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-surface-500">{label}</span>
      <span className={cn('text-xs text-surface-200', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

// ─── Step 5: Review ────────────────────────────────────────────────────────────

function Step5({
  template, mappings, segmentType,
  tags, stages, contacts,
  selectedTagIds, selectedStages, selectedContactIds,
  filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
  filterSentiment, filterContactSearch, filterHasConversations,
  estimatedReach, scheduleMode, scheduledAt, campaignName,
}: {
  template: WhatsAppTemplate
  mappings: CampaignVariableMapping[]
  segmentType: CampaignSegment['type']
  tags: Tag[]
  stages: { key: string; label: string; color: string }[]
  contacts: Contact[]
  selectedTagIds: string[]
  selectedStages: string[]
  selectedContactIds: string[]
  filterStages: string[]
  filterTagIds: string[]
  filterIntent: ContactIntent[]
  filterSource: ContactSource[]
  filterOptIn: boolean | undefined
  filterSentiment: ContactSentiment[]
  filterContactSearch: string
  filterHasConversations: boolean | undefined
  estimatedReach: number | null
  scheduleMode: 'now' | 'later'
  scheduledAt: string
  campaignName: string
}) {
  const [showContactsModal, setShowContactsModal] = useState(false)

  const segmentLabels: Record<CampaignSegment['type'], string> = {
    all:    'Toda a base',
    tag:    'Por tags selecionadas',
    stage:  'Por estágio do CRM',
    manual: 'Seleção manual',
    filter: 'Filtro avançado',
  }

  // Build preview vars from mappings
  const previewVars: Record<string, string> = {}
  mappings.forEach((m) => {
    const val = m.source === 'literal'       ? (m.literal ?? '') :
                m.source === 'contact_field' ? (CONTACT_FIELDS.find((f) => f.value === m.contactField)?.label ?? m.contactField ?? '') :
                m.customFieldKey ?? ''
    previewVars[String(m.position)] = val || `{{${m.position}}}`
  })

  // Build active filter pills for the "filter" segment type
  const filterPills: { label: string; color?: string }[] = []
  if (segmentType === 'filter') {
    filterStages.forEach((key) => {
      const stage = stages.find((s) => s.key === key)
      if (stage) filterPills.push({ label: `Estágio: ${stage.label}`, color: stage.color })
    })
    filterTagIds.forEach((id) => {
      const tag = tags.find((t) => t.id === id)
      if (tag) filterPills.push({ label: `Tag: ${tag.name}`, color: tag.color })
    })
    filterIntent.forEach((v) => {
      const opt = INTENT_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Intenção: ${opt?.label ?? v}` })
    })
    filterSource.forEach((v) => {
      const opt = SOURCE_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Origem: ${opt?.label ?? v}` })
    })
    if (filterOptIn !== undefined) filterPills.push({ label: filterOptIn ? 'Com opt-in' : 'Sem opt-in' })
    filterSentiment.forEach((v) => {
      const opt = SENTIMENT_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Sentimento: ${opt?.label ?? v}` })
    })
    if (filterContactSearch.trim()) filterPills.push({ label: `Busca: "${filterContactSearch.trim()}"` })
    if (filterHasConversations !== undefined) filterPills.push({ label: filterHasConversations ? 'Com conversas' : 'Sem conversas' })
  }

  const scheduleDisplay = scheduleMode === 'now'
    ? 'Imediatamente após criar'
    : scheduledAt
      ? new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '—'

  return (
    <div className="flex gap-5">
      {/* Left column */}
      <div className="flex-1 space-y-4">
        {/* Card: Campaign info */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-surface-300 uppercase tracking-wider">Campanha</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Nome</span>
              <span className="text-xs font-medium text-surface-100">{campaignName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Template</span>
              <span className="text-xs font-mono text-brand-300 bg-brand-400/10 px-2 py-0.5 rounded">{template.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Categoria</span>
              <span className="text-xs text-surface-300 bg-surface-700 px-2 py-0.5 rounded">{CATEGORY_LABELS[template.category] ?? template.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Envio</span>
              <span className="text-xs text-surface-300">{scheduleDisplay}</span>
            </div>
            {mappings.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500">Variáveis</span>
                <span className="text-xs text-surface-300">{mappings.length} variáve{mappings.length === 1 ? 'l' : 'is'} mapeada{mappings.length === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card: Segment info */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-surface-300 uppercase tracking-wider">Segmento</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-500">Tipo</span>
            <span className="text-xs text-surface-300">{segmentLabels[segmentType]}</span>
          </div>
          {estimatedReach !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Alcance estimado</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                estimatedReach === 0
                  ? 'text-danger bg-danger/10'
                  : 'text-status-active bg-status-active-bg'
              )}>
                {estimatedReach} contato{estimatedReach === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Manual contacts preview */}
          {segmentType === 'manual' && selectedContactIds.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Contatos selecionados:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedContactIds.slice(0, 5).map((id) => {
                  const c = contacts.find((ct) => ct.id === id)
                  return (
                    <span key={id} className="text-[10px] text-surface-300 bg-surface-700 px-1.5 py-0.5 rounded">
                      {c?.displayName ?? id}
                    </span>
                  )
                })}
                {selectedContactIds.length > 5 && (
                  <span className="text-[10px] text-surface-500">+{selectedContactIds.length - 5} mais</span>
                )}
              </div>
            </div>
          )}

          {/* Tag segment */}
          {segmentType === 'tag' && selectedTagIds.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Tags:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTagIds.map((id) => {
                  const tag = tags.find((t) => t.id === id)
                  return tag ? (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: tag.color, color: getReadableTextColor(tag.color) }}>
                      {tag.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Stage segment */}
          {segmentType === 'stage' && selectedStages.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Estágios:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedStages.map((key) => {
                  const stage = stages.find((s) => s.key === key)
                  return stage ? (
                    <span key={key} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: stage.color, color: getReadableTextColor(stage.color) }}>
                      {stage.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Filter pills */}
          {segmentType === 'filter' && filterPills.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">{filterPills.length} filtro{filterPills.length === 1 ? '' : 's'} ativo{filterPills.length === 1 ? '' : 's'}:</p>
              <div className="flex flex-wrap gap-1.5">
                {filterPills.map((pill, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded font-medium"
                    style={pill.color
                      ? { backgroundColor: pill.color, color: '#fff' }
                      : { backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                    }
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verify contacts button */}
          {estimatedReach !== null && estimatedReach > 0 && (
            <button
              onClick={() => setShowContactsModal(true)}
              className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-surface-600 text-xs text-surface-400 hover:border-brand-500/50 hover:text-brand-300 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              Verificar lista de contatos ({estimatedReach} contato{estimatedReach === 1 ? '' : 's'})
            </button>
          )}
        </div>
      </div>

      {/* Right column: message preview */}
      <div className="w-[240px] flex-shrink-0">
        <p className="text-xs text-surface-500 mb-3 text-center">Prévia da mensagem</p>
        <TemplatePreview template={template} variables={previewVars} compact />
      </div>

      {/* Contact list modal */}
      {showContactsModal && (
        <ContactListModal
          contacts={contacts}
          segmentType={segmentType}
          selectedContactIds={selectedContactIds}
          selectedTagIds={selectedTagIds}
          selectedStages={selectedStages}
          filterStages={filterStages}
          filterTagIds={filterTagIds}
          filterIntent={filterIntent}
          filterSource={filterSource}
          filterOptIn={filterOptIn}
          filterSentiment={filterSentiment}
          filterContactSearch={filterContactSearch}
          filterHasConversations={filterHasConversations}
          stages={stages}
          tags={tags}
          onClose={() => setShowContactsModal(false)}
        />
      )}
    </div>
  )
}

// ─── Contact List Modal ────────────────────────────────────────────────────────

function ContactListModal({
  contacts, segmentType,
  selectedContactIds, selectedTagIds, selectedStages,
  filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
  filterSentiment, filterContactSearch, filterHasConversations,
  stages, tags, onClose,
}: {
  contacts: Contact[]
  segmentType: CampaignSegment['type']
  selectedContactIds: string[]
  selectedTagIds: string[]
  selectedStages: string[]
  filterStages: string[]
  filterTagIds: string[]
  filterIntent: ContactIntent[]
  filterSource: ContactSource[]
  filterOptIn: boolean | undefined
  filterSentiment: ContactSentiment[]
  filterContactSearch: string
  filterHasConversations: boolean | undefined
  stages: { key: string; label: string; color: string }[]
  tags: Tag[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const segmented = useMemo(() => {
    if (segmentType === 'all') return contacts
    if (segmentType === 'tag')
      return contacts.filter((c) => c.tags?.some((t) => selectedTagIds.includes(t.id)))
    if (segmentType === 'stage')
      return contacts.filter((c) => selectedStages.includes(c.stage ?? ''))
    if (segmentType === 'manual')
      return contacts.filter((c) => selectedContactIds.includes(c.id))
    // filter
    let f = contacts
    if (filterStages.length)  f = f.filter((c) => filterStages.includes(c.stage ?? ''))
    if (filterTagIds.length)  f = f.filter((c) => c.tags?.some((t) => filterTagIds.includes(t.id)))
    if (filterIntent.length)  f = f.filter((c) => filterIntent.includes(c.intent ?? 'unknown'))
    if (filterSource.length)  f = f.filter((c) => filterSource.includes(c.source ?? 'other'))
    if (filterOptIn !== undefined) f = f.filter((c) => c.optIn === filterOptIn)
    if (filterSentiment.length) f = f.filter((c) => filterSentiment.includes(c.aiSentiment ?? 'unknown'))
    if (filterContactSearch.trim()) {
      const q = filterContactSearch.toLowerCase()
      f = f.filter((c) => c.displayName.toLowerCase().includes(q) || c.waId.includes(q))
    }
    if (filterHasConversations !== undefined)
      f = f.filter((c) => filterHasConversations ? (c.conversationCount ?? 0) > 0 : (c.conversationCount ?? 0) === 0)
    return f
  }, [contacts, segmentType, selectedContactIds, selectedTagIds, selectedStages,
      filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
      filterSentiment, filterContactSearch, filterHasConversations])

  const displayed = search.trim()
    ? segmented.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        c.waId.includes(search)
      )
    : segmented

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-surface-50">Lista de contatos</h3>
            <p className="text-xs text-surface-500 mt-0.5">{segmented.length} contato{segmented.length === 1 ? '' : 's'} na segmentação</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-surface-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nesta lista..."
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {displayed.length === 0 ? (
            <p className="text-xs text-surface-500 text-center py-8">Nenhum contato encontrado</p>
          ) : (
            <div className="space-y-0.5">
              {displayed.map((c) => {
                const stageDef = stages.find((s) => s.key === c.stage)
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {c.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{c.displayName}</p>
                      <p className="text-xs text-surface-500">{c.waId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stageDef && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: stageDef.color, color: getReadableTextColor(stageDef.color) }}>
                          {stageDef.label}
                        </span>
                      )}
                      {c.tags && c.tags.length > 0 && (
                        <span className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                          {c.tags[0].name}{c.tags.length > 1 ? ` +${c.tags.length - 1}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-medium transition-all"
          >
            Fechar e continuar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
