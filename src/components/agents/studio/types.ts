import type { HandoffRule, AgentCrmCapabilities } from '@/services/agentsApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  name: string
  icon: string
  sector: string
  objective: string
  persona_name: string
  tone: string
  language: string
  response_style: string[]
  can_do: string[]
  cannot_do: string[]
  company_name: string
  company_description: string
  products_services: string
  faqs: Array<{ question: string; answer: string }>
  extra_context: string
  brand_links: string[]
  brand_links_context: string
  handoff_rules: HandoffRule[]
  knowledge_docs: Array<{ id: string; name: string; content: string; source_type: string }>
  channels_whatsapp: boolean
  channels_messenger: boolean
  channels_instagram: boolean
  /**
   * Phase 25 — opt-in CRM operations. Configured in the Revisão step as a
   * simple toggle list (no constraint pickers — those live in the post-
   * creation "Capacidades" tab where the user has more context about
   * existing tags / stages / atendentes). When a capability is toggled on
   * here, its catalog `defaultConstraints` are applied automatically.
   */
  crm_capabilities: AgentCrmCapabilities
  generated_prompt: string
}

export const DEFAULT_DATA: WizardData = {
  name: '', icon: 'bot', sector: '', objective: '',
  persona_name: '', tone: '', language: 'pt-BR', response_style: [],
  can_do: [], cannot_do: [],
  company_name: '', company_description: '', products_services: '',
  faqs: [], extra_context: '',
  brand_links: [], brand_links_context: '',
  handoff_rules: [],
  knowledge_docs: [],
  channels_whatsapp: true, channels_messenger: false, channels_instagram: false,
  crm_capabilities: { capabilities: [] },
  generated_prompt: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STEP_LABELS = ['Identidade', 'Personalidade', 'Escopo', 'Negócio', 'Passar para humano', 'Base de Conhecimento', 'Gerar Prompt', 'Revisão']
