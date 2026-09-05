import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Sparkles, Users, SlidersHorizontal, Calendar, Check } from 'lucide-react'
import { appLogger } from '@/services/appLogger'
import { campaignsApi, contactsApi, templatesApi, tagsApi, whatsappNumbersApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import type {
  Campaign, Contact, ContactIntent, ContactSource, ContactSentiment,
  WhatsAppTemplate, CampaignSegment, CampaignVariableMapping, Tag,
} from '@/types'

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

export type Step = 1 | 2 | 3 | 4 | 5

export const STEP_LABELS = ['Template', 'Segmento', 'Variáveis', 'Agendar', 'Revisão']

// Um acento categórico por etapa — só para orientação visual dentro do
// wizard (não carrega o mesmo significado do accent-rose em CampaignReport,
// que marca resultado negativo de campanha).
export const STEP_ACCENTS: { icon: typeof Sparkles; color: string }[] = [
  { icon: Sparkles,          color: 'var(--color-accent-blue)' },
  { icon: Users,             color: 'var(--color-accent-green)' },
  { icon: SlidersHorizontal, color: 'var(--color-accent-violet)' },
  { icon: Calendar,          color: 'var(--color-accent-amber)' },
  { icon: Check,             color: 'var(--color-accent-rose)' },
]

export function useComposerDraft(
  open: boolean,
  onCreated: (campaign: Campaign) => void,
  initialContactIds?: string[],
  initialName?: string,
) {
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
  const { stages, fieldDefs } = useCRMConfig()

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

  // ── Step navigation (with telemetry) ─────────────────────────────────────────

  const goBack = useCallback(() => {
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'back',
    })
    setStep((s) => Math.max(1, s - 1) as Step)
  }, [step])

  const goNext = useCallback(() => {
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'completed',
    })
    setStep((s) => (s + 1) as Step)
  }, [step])

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

  return {
    step, setStep, goBack, goNext,
    templates, loadingTemplates, selectedTemplate, setSelectedTemplate, campaignName, setCampaignName,
    segmentType, setSegmentType, selectedTagIds, setSelectedTagIds, selectedStages, setSelectedStages, tags,
    stages, fieldDefs,
    contacts, loadingContacts, selectedContactIds, setSelectedContactIds,
    filterStages, setFilterStages, filterTagIds, setFilterTagIds, filterIntent, setFilterIntent,
    filterSource, setFilterSource, filterOptIn, setFilterOptIn,
    filterSentiment, setFilterSentiment, filterContactSearch, setFilterContactSearch,
    filterHasConversations, setFilterHasConversations,
    mappings, updateMapping,
    scheduleMode, setScheduleMode, scheduledAt, setScheduledAt,
    waNumbers, whatsappNumberId, setWhatsappNumberId,
    estimatedReach, needsExplicitLine, canAdvance,
    saving, error, handleSubmit,
  }
}
