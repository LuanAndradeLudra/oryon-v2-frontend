import { useState, useCallback, useRef, useEffect } from 'react'
import { createAgent, updateAgent, getAgent, generateAgentPrompt, addAgentKnowledge } from '@/services/agentsApi'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import {
  loadHub, hubToBrandLinks, hubHasContent,
} from '@/services/companyContextService'
import { appLogger } from '@/services/appLogger'
import { DEFAULT_DATA, STEP_LABELS, type WizardData } from './types'

export function readSession() {
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

/**
 * Owns the wizard-level state, navigation, telemetry, and API calls that
 * cross step boundaries (creation/publish, prompt generation). Step-local UI
 * state (the Contexto da IA hub editor in Step4, file-upload progress in
 * Step6) stays inside those step components — see W0.3-mapa.md, decisão (1).
 */
export function useStudioDraft() {
  const [data, setData] = useState<WizardData>(DEFAULT_DATA)
  const [step, setStep] = useState(1)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const sessionIdRef = useRef(`wiz-agent-${Date.now()}`)
  const completedRef = useRef(false)

  useEffect(() => {
    sessionIdRef.current = `wiz-agent-${Date.now()}`
    completedRef.current = false
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: 1, step_name: STEP_LABELS[0], action: 'started',
    })
    // Pre-fill Step 4 (Negócio) from Company Context Hub
    if (tenantId) {
      const hub = loadHub(tenantId)
      if (hub.companyName || hub.description || hub.productsServices) {
        setData(prev => ({
          ...DEFAULT_DATA,
          ...prev,
          company_name: prev.company_name || hub.companyName,
          company_description: prev.company_description || hub.description,
          products_services: prev.products_services || hub.productsServices,
          brand_links: prev.brand_links.length ? prev.brand_links : hubToBrandLinks(hub),
        }))
      }
    }
    return () => {
      // Fires when wizard closes (open → false or unmount)
      if (completedRef.current) return
      const { userId: uid, tenantId: tid } = readSession()
      appLogger.logWizardEvent({
        tenant_id: tid, user_id: uid,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: step, step_name: STEP_LABELS[step - 1], action: 'abandoned',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validate = useCallback((): string | null => {
    switch (step) {
      case 1:
        if (!data.name.trim()) return 'Informe o nome do agente'
        if (!data.sector) return 'Selecione o setor'
        if (!data.objective.trim()) return 'Descreva o objetivo do agente'
        return null
      case 2:
        if (!data.tone) return 'Selecione o tom de comunicação'
        return null
      case 3:
        if (data.can_do.length === 0) return 'Selecione pelo menos uma capacidade'
        return null
      case 4: {
        const { tenantId: tid } = readSession()
        const h = tid ? loadHub(tid) : null
        if (h && hubHasContent(h)) return null
        if (!data.company_name.trim()) return 'Informe o nome da empresa'
        if (!data.company_description.trim()) return 'Descreva o negócio'
        return null
      }
      case 7:
        if (!data.generated_prompt) return 'Gere o system prompt antes de revisar'
        return null
      default:
        return null
    }
  }, [step, data])

  const goNext = () => {
    const err = validate()
    if (err) { setValidationError(err); return }
    setValidationError(null)
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'completed',
      data: { agent_name: data.name, sector: data.sector },
    })
    setStep(s => Math.min(s + 1, STEP_LABELS.length))
  }

  const goBack = () => {
    setValidationError(null)
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'back',
    })
    setStep(s => Math.max(s - 1, 1))
  }

  const jumpToStep = (s: number) => {
    setValidationError(null)
    setStep(s)
  }

  // Any real user input (name/objective/sector) or advancement past step 1
  // counts as progress worth confirming before discarding.
  const isDirty = step > 1
    || data.name.trim() !== ''
    || data.objective.trim() !== ''
    || data.sector !== ''

  const generatePrompt = useCallback(async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      const prompt = await generateAgentPrompt({
        identity: { name: data.name, emoji: '', sector: data.sector, objective: data.objective },
        personality: {
          persona_name: data.persona_name || data.name,
          tone: data.tone, language: data.language, response_style: data.response_style,
        },
        scope: { can_do: data.can_do, cannot_do: data.cannot_do },
        business: {
          company_name: data.company_name, company_description: data.company_description,
          products_services: data.products_services, faqs: data.faqs,
          extra_context: [data.extra_context, data.brand_links_context].filter(Boolean).join('\n\n'),
        },
        deployment: {
          escalation_keywords: data.handoff_rules.flatMap(r => r.keywords).slice(0, 20),
          escalation_conditions: data.handoff_rules.map(r => r.description ?? r.name).filter(Boolean),
          escalation_department: data.handoff_rules.find(r => r.department)?.department ?? '',
          channels: [
            data.channels_whatsapp && 'WhatsApp',
            data.channels_messenger && 'Messenger',
            data.channels_instagram && 'Instagram',
          ].filter(Boolean) as string[],
        },
      })
      setData(d => ({ ...d, generated_prompt: prompt }))
      return prompt
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor')
      return null
    } finally {
      setGenerating(false)
    }
  }, [data])

  const publish = async (status: 'active' | 'draft'): Promise<AgentConfigWithTools | null> => {
    setPublishing(true)
    setPublishError(null)
    const { userId, tenantId, actorName } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: 8, step_name: 'Revisão', action: 'started',
      data: { publish_mode: status, agent_name: data.name },
    })
    try {
      const raw = await createAgent(data.name, data.generated_prompt, {
        icon: data.icon,
        sector: data.sector ?? undefined,
        objective: data.objective ?? undefined,
      })
      await updateAgent(raw.id, {
        icon: data.icon,
        sector: data.sector ?? undefined,
        objective: data.objective ?? undefined,
        handoff_rules: { rules: data.handoff_rules },
        channels: {
          whatsapp:  { enabled: data.channels_whatsapp  },
          messenger: { enabled: data.channels_messenger },
          instagram: { enabled: data.channels_instagram },
        },
        // Phase 25 — persist CRM capabilities chosen in the wizard's review step.
        // Skip the field entirely when the user didn't enable anything so
        // existing tenants without capabilities aren't churned.
        ...(data.crm_capabilities.capabilities.length > 0
          ? { crm_capabilities: data.crm_capabilities }
          : {}),
        wizard_config: {
          identity: {
            name:      data.name,
            icon:      data.icon,
            sector:    data.sector,
            objective: data.objective,
          },
          personality: {
            persona_name:   data.persona_name,
            tone:           data.tone,
            language:       data.language,
            response_style: data.response_style,
          },
          scope: {
            can_do:    data.can_do,
            cannot_do: data.cannot_do,
            faqs:      data.faqs,
          },
          business: {
            company_name:        data.company_name,
            company_description: data.company_description,
            products_services:   data.products_services,
            extra_context:       data.extra_context,
            brand_links:         data.brand_links,
            brand_links_context: data.brand_links_context,
          },
          deployment: {
            channels_whatsapp:  data.channels_whatsapp,
            channels_messenger: data.channels_messenger,
            channels_instagram: data.channels_instagram,
            handoff_rules:      data.handoff_rules,
          },
        },
        status,
      })
      // Upload knowledge docs (best-effort)
      for (const doc of data.knowledge_docs) {
        try {
          await addAgentKnowledge(raw.id, {
            document_id: doc.id,
            document_name: doc.name,
            content: doc.content,
            source_type: doc.source_type,
          })
        } catch (err) {
          console.warn('[wizard] Failed to upload knowledge doc:', doc.name, err)
        }
      }
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: 8, step_name: 'Revisão', action: 'completed',
        data: {
          agent_id: raw.id, agent_name: data.name, publish_mode: status,
          handoff_rules_count: data.handoff_rules.length,
          channels: { whatsapp: data.channels_whatsapp, messenger: data.channels_messenger, instagram: data.channels_instagram },
          prompt_length: data.generated_prompt.length,
        },
      })
      appLogger.logActivity({
        tenant_id: tenantId, actor_id: userId, actor_name: actorName,
        action: 'agent_builder_completed', entity_type: 'ai_agent',
        entity_id: raw.id, entity_name: data.name,
        description: `Agente "${data.name}" criado via wizard e ${status === 'active' ? 'publicado' : 'salvo como rascunho'}`,
        details: { sector: data.sector, publish_mode: status, handoff_rules: data.handoff_rules.length },
        source: 'ui',
      })
      completedRef.current = true
      // Re-fetch the full agent so the caller (AgentsPage → AgentDetail)
      // sees the authoritative post-PATCH state: handoff_rules, channels,
      // wizard_config, status, and any knowledge docs just uploaded. The
      // previous `...raw` path used the initial POST response, which was
      // taken BEFORE the PATCH that actually persisted handoff_rules —
      // so the Regras tab opened empty until the user clicked away and
      // back (triggering AgentsPage.selectAgent which re-fetches).
      let agent: AgentConfigWithTools
      try {
        agent = await getAgent(raw.id)
      } catch {
        // Fallback to the merged local state so publish never silently
        // fails just because the final GET had a transient hiccup.
        agent = {
          ...raw,
          tools: raw.tools ?? [],
          system_prompt: data.generated_prompt,
          icon: data.icon,
          sector: data.sector ?? null,
          objective: data.objective ?? null,
          handoff_rules: { rules: data.handoff_rules },
          status,
        }
      }
      return agent
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar agente'
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: 8, step_name: 'Revisão', action: 'error',
        error_message: msg,
      })
      setPublishError(msg)
      return null
    } finally {
      setPublishing(false)
    }
  }

  return {
    data, setData,
    step, goNext, goBack, jumpToStep,
    validationError,
    isDirty,
    publishing, publishError,
    publish,
    generating, generateError, generatePrompt,
  }
}
