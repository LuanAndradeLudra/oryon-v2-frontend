// ─── useWizardDraft ────────────────────────────────────────────────────────
// Hook do wizard de 5 passos (modal legado `CampaignWizard`). Era
// `useComposerDraft` na W0.4/SCRUM-997 — renomeado na D2/SCRUM-1020 porque o
// nome passou a valer para o Composer novo, que é outro modelo de interação
// (coord/D2-plano.md §7.1).
//
// O que sobrou aqui é só o que é do wizard: navegação por etapas com
// telemetria, o modelo de segmento antigo (`CampaignSegment` com
// tipo/filtros) e o alcance estimado calculado em memória. Todo o resto —
// carregar dados, template, nome, variáveis, linha, agendamento e criação —
// vem do núcleo compartilhado `useCampaignDraftCore`.
//
// Comportamento inalterado em relação à W0.4: mesmas chamadas, mesmos
// eventos de telemetria, mesmas mensagens de erro.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Sparkles, Users, SlidersHorizontal, Calendar, Check } from 'lucide-react'
import { appLogger } from '@/services/appLogger'
import { useCampaignDraftCore, readSession } from './useCampaignDraftCore'
import type {
  Campaign, ContactIntent, ContactSource, ContactSentiment, CampaignSegment,
} from '@/types'

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

export function useWizardDraft(
  open: boolean,
  onCreated: (campaign: Campaign) => void,
  initialContactIds?: string[],
  initialName?: string,
) {
  const core = useCampaignDraftCore({ active: open, initialName })

  const [step, setStep] = useState<Step>(1)
  const sessionIdRef = useRef(`wiz-campaign-${Date.now()}`)
  const completedRef = useRef(false)

  // Passo 2 — modelo de segmento antigo
  const [segmentType, setSegmentType]       = useState<CampaignSegment['type']>('all')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  // Passo 2 — filtro avançado
  const [filterStages, setFilterStages]     = useState<string[]>([])
  const [filterTagIds, setFilterTagIds]     = useState<string[]>([])
  const [filterIntent, setFilterIntent]     = useState<ContactIntent[]>([])
  const [filterSource, setFilterSource]     = useState<ContactSource[]>([])
  const [filterOptIn, setFilterOptIn]       = useState<boolean | undefined>(undefined)
  const [filterSentiment, setFilterSentiment]               = useState<ContactSentiment[]>([])
  const [filterContactSearch, setFilterContactSearch]       = useState('')
  const [filterHasConversations, setFilterHasConversations] = useState<boolean | undefined>(undefined)

  // ── Reset do que é do wizard quando ele abre ──────────────────────────────
  // O núcleo zera o que é dele no mesmo `open`; aqui zeramos só o restante.
  useEffect(() => {
    if (!open) return
    sessionIdRef.current = `wiz-campaign-${Date.now()}`
    completedRef.current = false
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: 1, step_name: STEP_LABELS[0], action: 'started',
    })

    // Se quem abriu semeou contatos, cai direto no segmento "manual" com eles
    // selecionados.
    const seed = initialContactIds ?? []
    setStep(1)
    setSegmentType(seed.length > 0 ? 'manual' : 'all')
    setSelectedTagIds([]); setSelectedStages([])
    setSelectedContactIds(seed)
    setFilterStages([]); setFilterTagIds([]); setFilterIntent([]); setFilterSource([]); setFilterOptIn(undefined)
    setFilterSentiment([]); setFilterContactSearch(''); setFilterHasConversations(undefined)
    // Roda só na abertura: `initialContactIds` é semente, não dependência
    // reativa — relê-la reiniciaria a seleção do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Alcance estimado (em memória, modelo antigo) ──────────────────────────
  // MANTIDO exatamente como na W0.4: a troca por `countSegment`/`evaluate` é
  // da D6 (Crivo) e vale só para o Composer novo, não para este wizard.
  const { contacts } = core
  const hasAdvancedFilter = !!(
    filterStages.length || filterTagIds.length || filterIntent.length ||
    filterSource.length || filterOptIn !== undefined ||
    filterSentiment.length || filterContactSearch.trim() ||
    filterHasConversations !== undefined
  )

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
      if (!hasAdvancedFilter) return null
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
      hasAdvancedFilter, filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
      filterSentiment, filterContactSearch, filterHasConversations])

  // ── Avanço de etapa ───────────────────────────────────────────────────────
  const canAdvance = useMemo((): boolean => {
    if (core.needsExplicitLine) return false
    if (step === 1) return !!core.selectedTemplate && core.campaignName.trim().length > 0
    if (step === 2) {
      if (segmentType === 'tag')    return selectedTagIds.length > 0
      if (segmentType === 'stage')  return selectedStages.length > 0
      if (segmentType === 'manual') return selectedContactIds.length > 0
      if (segmentType === 'filter') return hasAdvancedFilter
      return true // 'all'
    }
    if (step === 3) return core.mappingsComplete
    if (step === 4) return core.scheduleReady
    if (step === 5) return true
    return false
  }, [core.needsExplicitLine, core.selectedTemplate, core.campaignName, core.mappingsComplete,
      core.scheduleReady, step, segmentType, selectedTagIds, selectedStages, selectedContactIds,
      hasAdvancedFilter])

  // ── Navegação (com telemetria) ────────────────────────────────────────────
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

  // ── Submissão ─────────────────────────────────────────────────────────────
  const { selectedTemplate, campaignName, scheduleMode, submitCampaign } = core

  const handleSubmit = async () => {
    if (!selectedTemplate) return
    const { userId, tenantId, actorName } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: 5, step_name: STEP_LABELS[4], action: 'started',
      data: { campaign_name: campaignName, template_id: selectedTemplate.id, segment_type: segmentType, schedule_mode: scheduleMode },
    })

    const segment: CampaignSegment = {
      type: segmentType,
      ...(segmentType === 'tag'    ? { tagIds: selectedTagIds }         : {}),
      ...(segmentType === 'stage'  ? { stages: selectedStages }         : {}),
      ...(segmentType === 'manual' ? { contactIds: selectedContactIds } : {}),
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

    const result = await submitCampaign({ audienceFields: { segment } })

    if (!result.ok) {
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
        step_number: 5, step_name: STEP_LABELS[4], action: 'error',
        error_message: result.rawMessage ?? 'Erro ao criar campanha',
      })
      return
    }

    completedRef.current = true
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'campaign', wizard_session_id: sessionIdRef.current,
      step_number: 5, step_name: STEP_LABELS[4], action: 'completed',
      data: { campaign_id: result.campaign.id, campaign_name: campaignName, template_id: selectedTemplate.id, segment_type: segmentType, schedule_mode: scheduleMode },
    })
    appLogger.logActivity({
      tenant_id: tenantId, actor_id: userId, actor_name: actorName,
      action: 'campaign_wizard_completed', entity_type: 'campaign',
      entity_id: result.campaign.id, entity_name: campaignName,
      description: `Campanha "${campaignName}" criada via wizard com template "${selectedTemplate.name}"`,
      details: { segment_type: segmentType, schedule_mode: scheduleMode, template_name: selectedTemplate.name },
      source: 'ui',
    })
    onCreated(result.campaign)
  }

  return {
    step, setStep, goBack, goNext,
    templates: core.templates, loadingTemplates: core.loadingTemplates,
    selectedTemplate: core.selectedTemplate, setSelectedTemplate: core.setSelectedTemplate,
    campaignName: core.campaignName, setCampaignName: core.setCampaignName,
    segmentType, setSegmentType, selectedTagIds, setSelectedTagIds, selectedStages, setSelectedStages,
    tags: core.tags, stages: core.stages, fieldDefs: core.fieldDefs,
    contacts: core.contacts, loadingContacts: core.loadingContacts,
    selectedContactIds, setSelectedContactIds,
    filterStages, setFilterStages, filterTagIds, setFilterTagIds, filterIntent, setFilterIntent,
    filterSource, setFilterSource, filterOptIn, setFilterOptIn,
    filterSentiment, setFilterSentiment, filterContactSearch, setFilterContactSearch,
    filterHasConversations, setFilterHasConversations,
    mappings: core.mappings, updateMapping: core.updateMapping,
    scheduleMode: core.scheduleMode, setScheduleMode: core.setScheduleMode,
    scheduledAt: core.scheduledAt, setScheduledAt: core.setScheduledAt,
    waNumbers: core.waNumbers, whatsappNumberId: core.whatsappNumberId,
    setWhatsappNumberId: core.setWhatsappNumberId,
    estimatedReach, needsExplicitLine: core.needsExplicitLine, canAdvance,
    saving: core.saving, error: core.error, handleSubmit,
  }
}
