// ─── Multi-vertical / Vocabulary ─────────────────────────────────────────────

export interface TenantVocabulary {
  contact:   string   // "Lead" | "Paciente" | "Cliente" | "Aluno"
  contacts:  string   // plural
  deal:      string   // "Negócio" | "Consulta" | "Imóvel" | "Processo"
  deals:     string   // plural
  agent:     string   // "Agente" | "Recepcionista" | "Corretor"
  agents:    string   // plural
  leadScore: string   // "Lead Score" | "Prioridade" | "Temperatura"
  intent:    string   // "Intenção de compra" | "Urgência" | "Interesse"
  pipeline:  string   // "Funil" | "Agenda" | "Pipeline"
  company:   string   // "Empresa" | "Clínica" | "Escritório"
  jobTitle:  string   // "Cargo" | "Especialidade" | "Área"
}

export interface VerticalTemplateSuggestedStage {
  label: string
  color: string
  order: number
  isTerminal: boolean
}

export interface VerticalTemplateSuggestedField {
  label: string
  type: CustomFieldType
  required: boolean
  order: number
  options?: string[]
  placeholder?: string
}

export interface VerticalTemplate {
  id: string
  label: string
  description: string
  emoji: string
  color: string
  vocabulary: TenantVocabulary
  suggestedStages: VerticalTemplateSuggestedStage[]
  suggestedFields: VerticalTemplateSuggestedField[]
}

// ─────────────────────────────────────────────────────────────────────────────

export type ConversationStatus = 'pending' | 'open' | 'resolved' | 'abandoned'

export type MessageDirection = 'inbound' | 'outbound'

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'sticker'
  | 'reaction'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'order'
  | 'system'
  | 'template'
  | 'unsupported'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export type UserRole = 'super_admin' | 'business_admin' | 'admin' | 'agent' | 'supervisor'

export type UserStatus = 'active' | 'pending' | 'inactive'

export type UserModule = 'dashboard' | 'conversations' | 'crm' | 'chat-interno'

export interface UserPermissions {
  tags:          { criar: boolean; atualizar: boolean; excluir: boolean }
  conversations: { arquivar: boolean; bloquearContato: boolean }
  templates:     { criar: boolean; atualizar: boolean; excluir: boolean }
  campanhas:     { criar: boolean; iniciar: boolean; excluir: boolean }
}

export type DepartmentPermission =
  | 'read_conversations'
  | 'reply_conversations'
  | 'archive_conversations'
  | 'assign_conversations'
  | 'view_dashboard'
  | 'view_reports'
  | 'manage_agents'
  | 'create_departments'
  | 'edit_company'
  | 'manage_bots'
  | 'access_settings'

export interface Department {
  id: string
  tenantId: string
  name: string
  description?: string | null
  color: string
  whatsappNumberId?: string | null
  permissions: DepartmentPermission[]
  usersCount?: number
  waNumberIds?: string[]
  createdAt: string
  updatedAt?: string
}

export interface User {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  avatarUrl?: string
  // Extended fields
  cargo?: string
  departmentId?: string
  departmentName?: string
  departmentIds?: string[]
  departmentNames?: string[]
  status?: UserStatus
  modules?: UserModule[]
  permissions?: UserPermissions
}

// ─── CRM Types ────────────────────────────────────────────────────────────────

// ContactStage é agora uma string livre — o valor é a `key` de um TenantStage configurado pelo tenant
export type ContactStage = string

export interface TenantStage {
  id: string
  tenantId: string
  key: string         // kebab-case, ex: "proposta-enviada"
  label: string       // ex: "Proposta Enviada"
  name?: string       // alias for label used in some components
  color: string       // hex, ex: "#6366f1"
  order: number
  isTerminal: boolean // se true, fica oculto por padrão no Kanban
  createdAt: string
}

export type ContactSentiment = 'positive' | 'neutral' | 'negative' | 'unknown'

export type ContactSource =
  | 'whatsapp' | 'instagram' | 'facebook' | 'website'
  | 'referral' | 'campaign' | 'manual' | 'import' | 'other'
  | 'meta_ads'

export type ContactIntent = 'low' | 'medium' | 'high' | 'unknown'

export type CustomFieldType =
  | 'text' | 'number' | 'date' | 'boolean' | 'url'
  | 'phone' | 'email' | 'select' | 'multiselect' | 'textarea'

export interface ContactCustomField {
  key: string
  label: string
  value: string
  type: CustomFieldType
}

export interface ContactCustomFieldDef {
  key: string
  label: string
  type: CustomFieldType
  placeholder?: string
  required?: boolean
  options?: string[]   // apenas para select e multiselect
  order: number
}

// ─── Catálogo de Produtos ───────────────────────────────────────────────────────
export interface ProductPriceVariation {
  id?: string
  label: string
  amountCents: number      // valor em centavos (BRL por padrão)
  currency?: string        // default 'BRL'
  description?: string
  order?: number
}

export interface Product {
  id: string
  agentId?: string | null  // reservado: null = catálogo da empresa toda
  name: string
  sku?: string | null
  description?: string | null
  category?: string | null
  active: boolean
  order: number
  priceVariations: ProductPriceVariation[]
  createdAt?: string
  updatedAt?: string
}

// ─── Registro de Profissionais ──────────────────────────────────────────────
export interface Practitioner {
  id: string
  agentId?: string | null  // reservado: null = registro da empresa toda
  name: string
  category?: string | null // especialidade
  active: boolean
  order: number
  createdAt?: string
  updatedAt?: string
}

// ─── Negócios / Propostas (Deals) ────────────────────────────────────────────
export type DealStatus = 'open' | 'won' | 'lost'

export interface DealLineItem {
  id?: string
  productId: string
  productName?: string          // snapshot (vem do backend)
  variationLabel?: string | null
  unitPriceCents: number        // centavos
  quantity?: number
  discountCents?: number
  order?: number
}

/** Origem do registro no funil (Modelo B §4.2, F1-823). */
export type DealOriginKind = 'manual' | 'import' | 'campaign' | 'journey' | 'event' | 'ai'
/** Quem executou o último movimento (histórico, F2). */
export type DealMovedByKind = 'user' | 'ai' | 'journey' | 'campaign' | 'system' | 'automation'

export interface Deal {
  id: string
  contactId: string
  title: string
  status: DealStatus
  pipelineId: string            // Fase 2: pipeline de negócio
  stageId: string               // estágio atual (fonte da verdade do status)
  originConversationId?: string | null
  createdByKind?: 'user' | 'automation' | 'ai'
  /** F1: de onde o registro veio (campanha, evento, IA, manual, importação, jornada). */
  originKind?: DealOriginKind
  originId?: string | null
  /** F8-870 (board): nome da campanha de origem quando `originKind = 'campaign'`. */
  originLabel?: string | null
  /** F1: motivo do desfecho (catálogo por tipo de funil, I5). */
  closeReason?: string | null
  closeNote?: string | null
  /** F8-870 (board): quando entrou na etapa atual (último movimento; fallback updatedAt/createdAt). */
  stageEnteredAt?: string | null
  /** F8-870 (board): quem fez o último movimento — `ai` = Judge/tool, `user` = humano, demais = automático. */
  lastMovedByKind?: DealMovedByKind | null
  lastMovedByActorName?: string | null
  amountCents: number           // total em centavos
  currency?: string
  note?: string | null
  ownerUserId?: string | null
  closedAt?: string | null
  lineItems?: DealLineItem[]
  createdAt?: string
  updatedAt?: string
  /** Resumo leve do contato — presente no board por pipeline (GET /deals?pipelineId=). `phone` desde a F8. */
  contact?: { id: string; displayName: string; profilePicUrl: string | null; phone?: string | null }
}

/** Tipo do funil (Modelo B §4.2, F1): `sales` = negócios com valor, termina em
 *  Ganho/Perdido; `process` = registros de atendimento/onboarding/pós-venda,
 *  sem valor, termina em Concluído/Cancelado. Imutável após a criação. */
export type PipelineKind = 'sales' | 'process'

/** Rótulos dos dois terminais, derivados do `kind` pelo backend (nunca coluna). */
export interface TerminalLabels {
  won: string
  lost: string
}

/** Motivo de desfecho do catálogo por `kind` (§4.6, I5). */
export interface CloseReason {
  key: string
  label: string
  outcome: 'won' | 'lost' | 'any'
}

/** F10 (SCRUM-882): desfecho ao resolver a conversa (`PATCH /conversations/:id/status`). */
export interface DealOutcomeInput {
  outcome: 'won' | 'lost'
  /** Motivo do catálogo por tipo de funil (I5). */
  reason: string
  note?: string
}

/** F10 (SCRUM-882): envelope de `GET /deals/ai/stages?conversationId=` (F6) — o
 *  registro-alvo da conversa pela precedência §4.7. `no_target` é resposta
 *  normal (a conversa não tem registro aberto). */
export interface AiDealTargetView {
  target: 'origin_conversation' | 'campaign' | 'no_target'
  dealId?: string
  pipelineId?: string
  pipelineName?: string | null
  pipelineKind?: PipelineKind
  terminalLabels?: TerminalLabels
  currentStageKey?: string | null
  currentStageLabel?: string | null
  /** Só etapas não-terminais. */
  stages: Array<{ id: string; key: string; label: string; order: number }>
  closeReasons?: { won: Array<{ key: string; label: string }>; lost: Array<{ key: string; label: string }> }
}

/** Pipeline de negócio (múltiplos por tenant). O `isDefault` é o pipeline padrão. */
export interface Pipeline {
  id: string
  tenantId: string
  name: string
  description?: string | null
  color: string
  order: number
  isDefault: boolean
  isArchived: boolean
  /** F1 (SCRUM-822): tipo do funil. Backends anteriores ao épico não mandam — tratar ausência como `sales`. */
  kind?: PipelineKind
  /** F1 (SCRUM-828): Ganho/Perdido × Concluído/Cancelado — usar em chips, tooltips e modais em vez de texto fixo. */
  terminalLabels?: TerminalLabels
  /** F1 (SCRUM-824): ids dos setores com acesso (`pipeline_access`). */
  access?: string[]
  /** F1 (SCRUM-827): catálogo de motivos de fechamento do tipo. */
  closeReasons?: CloseReason[]
  stages: PipelineStage[]
  /** Contagem de negócios abertos — badge do segmented control da aba Leads. */
  openDealsCount: number
  createdAt?: string
  updatedAt?: string
}

/** Etapa de um modelo de funil (`GET /settings/pipelines/templates`, F1-826). */
export interface PipelineTemplateStage {
  key: string
  label: string
  color: string
  isWon?: boolean
  isLost?: boolean
}

/** Modelo de etapas por tipo — o funil nunca nasce vazio (I2). */
export interface PipelineTemplate {
  key: string
  kind: PipelineKind
  name: string
  description: string
  isDefault?: boolean
  stages: PipelineTemplateStage[]
}

/** Etapa enviada na criação atômica do funil (`POST /settings/pipelines`, F1-825). */
export interface CreatePipelineStageInput {
  label: string
  key?: string
  color?: string
  isWon?: boolean
  isLost?: boolean
}

/** Estágio de um pipeline. `isWon`/`isLost` marcam os terminais. */
export interface PipelineStage {
  id: string
  tenantId: string
  pipelineId: string
  key: string
  label: string
  color: string
  order: number
  isWon: boolean
  isLost: boolean
  createdAt?: string
  updatedAt?: string
}

/** Dono do negócio auto-criado pelo roteamento. */
export type OwnerRule = 'unassigned' | 'conversation_assignee' | 'fixed_user'

/** Roteamento por canal (Fase 4): linha WhatsApp → pipeline. No máx. 1 por linha. */
export interface PipelineChannelRouting {
  id: string
  tenantId: string
  whatsappNumberId: string
  pipelineId: string
  autoCreateDeal: boolean
  defaultStageId: string | null
  ownerRule: OwnerRule
  ownerUserId: string | null
  createdAt?: string
  updatedAt?: string
}

/** Agregado de negócios de um contato (contagem + valor em centavos). Usado no card do Kanban. */
/** Agregado por (contato, pipeline) — alimenta os chips "Negócios" da tabela de contatos. */
export interface ContactDealsPipelineSummary {
  pipelineId: string
  pipelineName: string
  pipelineColor: string
  count: number
  openCount: number
  wonCount: number
  totalCents: number
  openCents: number
  wonCents: number
  /** F4-848: etapa do registro ABERTO neste funil (chips "Funil · Etapa", "já está · etapa"). */
  stageKey?: string | null
  stageLabel?: string | null
}

export interface ContactDealsSummary {
  count: number
  openCount: number
  wonCount: number
  totalCents: number
  openCents: number
  wonCents: number
  byPipeline: ContactDealsPipelineSummary[]
}

// ─── AI Onboarding ────────────────────────────────────────────────────────────

export interface AIOnboardingConfig {
  stages: Array<{
    label: string
    color: string
    order: number
    isTerminal: boolean
  }>
  customFields: Array<{
    label: string
    type: CustomFieldType
    placeholder?: string
    required: boolean
    order: number
    options?: string[]
  }>
}

export type ContactHistoryEventType =
  | 'ai_update' | 'stage_change' | 'manual_edit' | 'tag_added'
  | 'tag_removed' | 'campaign_added' | 'conversation_opened'
  | 'conversation_resolved' | 'note_added'
  | 'ad_attribution_created'
  | 'ai_analysis_completed' | 'conversion_confirmed' | 'capi_event_sent'
  | 'deal_created' | 'deal_won' | 'deal_lost' | 'deal_updated'

export interface ContactHistoryEvent {
  id: string
  contactId: string
  type: ContactHistoryEventType
  actor: 'ai' | 'user'
  actorName: string
  summary: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ContactFilters {
  search?: string
  stage?: ContactStage[]
  tagId?: string[]
  source?: ContactSource
  sentiment?: ContactSentiment
  intent?: ContactIntent
  optIn?: boolean
  sortBy?: 'displayName' | 'leadScore' | 'lastContactedAt' | 'createdAt'
  sortDir?: 'asc' | 'desc'
  /** Faixa de lead score (interpretada no backend: high>=80, medium 50-79, low<50). */
  leadScoreBand?: 'high' | 'medium' | 'low'
  /** Recência do último contato (interpretada no backend a partir de lastContactedAt). */
  lastContact?: '24h' | '7d' | '30d' | 'none'
  /** Faceta "Situação comercial" (SCRUM-293 — movida do client pro backend).
   *  Omitido = sem filtro ("Todos"). Nunca fica guardado no estado `filters`
   *  do useContacts (ContactsFiltersBar substitui esse objeto por inteiro a
   *  cada mudança) — só existe no payload da requisição em si. */
  commercial?: 'no_deal' | 'open_deal' | 'customer'
}

export interface Contact {
  // ── Core ──────────────────────────────────────────────────────────────────
  id: string
  tenantId: string
  waId: string
  displayName: string
  profilePicUrl?: string
  lastSeenAt?: string
  createdAt: string

  // ── Campos IA (escritos pelo n8n, read-only na UI) ─────────────────────────
  aiSummary?: string
  aiSentiment?: ContactSentiment
  aiPainPoints?: string[]
  aiInterests?: string[]
  aiObjections?: string[]
  aiNextBestAction?: string
  aiLastInteractionSummary?: string
  aiUpdatedAt?: string

  // ── Qualificação (editável pelos agentes) ──────────────────────────────────
  stage?: ContactStage
  leadScore?: number
  intent?: ContactIntent
  source?: ContactSource
  optIn?: boolean
  optInUpdatedAt?: string

  // ── Informações pessoais/empresa (editável) ────────────────────────────────
  email?: string
  company?: string
  jobTitle?: string
  industry?: string
  city?: string
  state?: string
  country?: string

  // ── Campos personalizados ──────────────────────────────────────────────────
  customFields?: ContactCustomField[]

  // ── Métricas de engajamento (read-only, computadas pelo backend) ───────────
  conversationCount?: number
  lastContactedAt?: string
  firstContactedAt?: string

  // ── Resumo de negócios (preenchido no client a partir de /deals/summary, p/ o card do Kanban) ──
  dealsSummary?: ContactDealsSummary

  // ── Relações ──────────────────────────────────────────────────────────────
  tags?: Tag[]

  // ── Atribuição de anúncios (read-only, gravado pelo backend via webhook) ──
  metaAdsReferral?: MetaAdsReferral
  googleAdsAttribution?: GoogleAdsAttribution
}

export interface GoogleAdsAttribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  gclid?: string
  clickedAt?: string
}

// ─── Ads Attribution Types ────────────────────────────────────────────────────

export type AdPlatform = 'meta' | 'google'

export interface MetaAdsReferral {
  adId: string
  adSetId?: string
  campaignId?: string
  adName?: string
  adSetName?: string
  campaignName?: string
  sourceType: 'AD'
  ctwaClickId: string
  headline?: string
  clickedAt: string
}

export interface CampaignLeadSummary {
  id: string
  name: string
  phone: string
  stage: string
  stageColor: string
  adName: string
  adSetName: string
  clickedAt: string
  outcome: 'converted' | 'qualified' | 'lead' | 'lost'
}

export interface AdAccount {
  id: string
  tenantId: string
  platform: AdPlatform
  accountId: string
  accountName: string
  currency: string
  isActive: boolean
  connectedAt: string
  lastSyncAt?: string
}

export interface AdCampaignMetrics {
  platformCampaignId: string
  platformCampaignName: string
  platform: AdPlatform
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
  cpc: number
  leadsGenerated: number
  cpl: number
  qualified: number
  customers: number
  revenue?: number
  roas?: number
  conversionRate: number
  funnelBreakdown: Array<{
    stageKey: string
    stageLabel: string
    stageColor: string
    count: number
  }>
}

export interface MarketingFunnelTotals {
  spend: number
  leads: number
  qualified: number
  customers: number
  avgCpl: number
  avgRoas: number
}

export interface AdAttributionTouchpoint {
  type: 'ad_click' | 'organic'
  platform?: AdPlatform
  timestamp: string
  detail: string
}

export type AdCreativeFormat = 'image' | 'video' | 'carousel'

export interface AdSetMetrics {
  id: string
  campaignId: string
  name: string
  impressions: number
  reach: number
  frequency: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
  cpc: number
  leadsGenerated: number
  cpl: number
  qualified: number
  customers: number
  revenue?: number
  roas?: number
  conversionRate: number
}

export interface AdCreativeMetrics {
  id: string
  adSetId: string
  campaignId: string
  name: string
  headline: string
  body: string
  callToAction: string
  format: AdCreativeFormat
  impressions: number
  reach: number
  frequency: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
  cpc: number
  leadsGenerated: number
  cpl: number
  conversions: number
  conversionRate: number
  revenue?: number
  roas?: number
}

// ─── Conversion Analysis Types ────────────────────────────────────────────────

export type ConversionOutcome = 'converted' | 'interested' | 'not_interested' | 'follow_up'

export interface ConversationAnalysisResult {
  id: string
  conversationId: string
  contactId: string
  campaignId?: string
  campaignName?: string
  platform?: AdPlatform
  messagesAnalyzed: number
  analyzedAt: string
  outcome: ConversionOutcome
  confidence: number
  conversionValue?: number
  conversionType?: string
  suggestedStage?: string
  signals: string[]
  objections?: string[]
  nextAction?: string
  summary: string
  status: 'pending_review' | 'confirmed' | 'rejected' | 'auto_applied'
  confirmedBy?: string
  confirmedAt?: string
  dealValue?: number
}

export interface MetaCapiEvent {
  id: string
  eventName: 'Purchase' | 'Lead' | 'InitiateCheckout' | 'Contact'
  contactId: string
  contactName: string
  conversationId?: string
  campaignId?: string
  campaignName?: string
  ctwaClickId: string
  eventTime: string
  value?: number
  currency: string
  status: 'sent' | 'failed' | 'pending'
  sentAt?: string
  errorMessage?: string
  deduplicationKey: string
}

// ─── Automations Types ────────────────────────────────────────────────────────

export type AutomationType =
  | 'boas_vindas'
  | 'follow_up'
  | 'fora_horario'
  | 'triagem_keyword'
  | 'estagio_crm'
  | 'inatividade'
  | 'custom'

export type AutomationStatus = 'active' | 'inactive' | 'draft'

export type InternalEventCategory = 'conversa' | 'mensagem' | 'contato' | 'crm' | 'agente' | 'campanha'

export type InternalEventKey =
  // Conversa
  | 'conversa_iniciada' | 'conversa_resolvida' | 'conversa_reaberta'
  | 'conversa_atribuida' | 'conversa_transferida' | 'sem_resposta_agente'
  // Mensagem
  | 'mensagem_recebida' | 'mensagem_com_midia' | 'mensagem_enviada'
  // Contato
  | 'contato_criado' | 'contato_atualizado' | 'tag_adicionada' | 'tag_removida'
  | 'lead_score_mudou' | 'lead_score_atingiu'
  // CRM
  | 'estagio_mudou' | 'lead_qualificado' | 'deal_ganho' | 'deal_perdido'
  // Agente
  | 'agente_offline' | 'sem_agente_disponivel'
  // Campanha
  | 'campanha_enviada' | 'campanha_falha_alta'

export interface InternalEventParams {
  minutes?:   number
  tagName?:   string
  threshold?: number
  direction?: 'above' | 'below'
  stageKey?:  string
  fieldName?: string
}

export type AutomationTrigger =
  | { type: 'boas_vindas' }
  | { type: 'follow_up';       afterHours: number }
  | { type: 'fora_horario' }
  | { type: 'triagem_keyword'; keywords: string[]; matchMode: 'any' | 'all' }
  | { type: 'estagio_crm';     stageKey: string }
  | { type: 'inatividade';     afterDays: number }
  | {
      type:          'custom'
      eventCategory: InternalEventCategory
      eventKey:      InternalEventKey
      eventLabel:    string
      params?:       InternalEventParams
    }

export type AutomationConditionField =
  | 'stage' | 'tag' | 'source' | 'department' | 'assigned_to'
  | 'intent' | 'lead_score' | 'none'

export type AutomationConditionOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set'

export interface AutomationCondition {
  field: AutomationConditionField
  operator: AutomationConditionOperator
  value: string
}

export type AutomationAction =
  | { type: 'send_message';        templateId: string; templateName: string }
  | { type: 'send_text';           body: string }
  | { type: 'assign_agent';        userId: string; userName: string }
  | { type: 'assign_dept';         departmentId: string; departmentName: string }
  | { type: 'add_tag';             tagId: string; tagName: string }
  | { type: 'remove_tag';          tagId: string; tagName: string }
  | { type: 'change_stage';        stageKey: string; stageLabel: string }
  | { type: 'set_lead_score';      score: number }
  | { type: 'resolve_conversation' }
  | {
      type: 'send_note'
      note: string
      /** Phase 19: who receives the notification generated by this note.
       *  Undefined = legacy behavior (all active users). New wizard saves
       *  'admins' by default. */
      notifyScope?: 'admins' | 'department' | 'user' | 'all'
      /** Required when notifyScope === 'department'. */
      departmentId?: string
      departmentName?: string
      /** Required when notifyScope === 'user'. */
      notifyUserId?: string
      notifyUserName?: string
    }
  | { type: 'send_webhook';        url: string; method: 'POST' | 'GET' }

/**
 * Controls whether this automation silences the AI agent when it matches
 * an inbound. Evaluated by the backend priority gate
 * (ConversationsService.hasMatchingActiveAutomation).
 *   - 'auto'            silence only if the automation replies to the
 *                       customer (has send_message / send_template /
 *                       send_text action). Backoffice-only automations
 *                       (tag, notify, webhook, stage) let the agent run.
 *   - 'always_silence'  silence the agent whenever this matches
 *   - 'never_silence'   keep the agent talking even when this matches
 */
export type AutomationAgentBehavior = 'auto' | 'always_silence' | 'never_silence'

export interface Automation {
  id: string
  tenantId: string
  name: string
  description: string
  type: AutomationType
  status: AutomationStatus
  trigger: AutomationTrigger
  conditionsLogic: 'and' | 'or'
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  agentBehavior: AutomationAgentBehavior
  // Pins the automation to a specific WhatsApp line. Required server-side
  // in tenants with >1 active line — used by the processor when a trigger
  // (scheduled, contact_created) has no conversation to inherit from.
  whatsappNumberId?: string | null
  // Set by Migration #045 on legacy rows in multi-WABA tenants. When
  // true, the UI must force the operator to pick a line before the
  // automation is allowed to fire.
  needsWabaAssignment?: boolean
  executionCount: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AutomationProposal {
  intent: 'create_automation'
  automation: Omit<Automation, 'id' | 'tenantId' | 'executionCount' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>
}

// ── Histórico de execuções ──────────────────────────────────────────────────
// Espelha a entidade AutomationRun do backend (Phase B.2), lida via
// GET /automations/:id/runs. O painel de detalhe consome isto para responder
// "está funcionando?" — status por run + telemetria por ação. O tipo do admin
// (adminAuditApi.AutomationRunRow) é um paralelo com actionsExecuted opaco;
// este é o canônico do lado do cliente, com as ações tipadas.
export type AutomationRunStatus = 'running' | 'success' | 'partial' | 'failed'
export type AutomationActionStatus = 'success' | 'failed' | 'skipped'

export interface AutomationActionExecuted {
  type: string
  status: AutomationActionStatus
  durationMs?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export interface AutomationRun {
  id: string
  automationId: string
  contactId: string | null
  conversationId: string | null
  triggerType: string
  triggeredBy: string | null
  status: AutomationRunStatus
  errorMessage: string | null
  durationMs: number | null
  correlationId: string | null
  startedAt: string
  completedAt: string | null
  actionsExecuted: AutomationActionExecuted[]
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface WhatsAppNumber {
  id: string
  displayPhoneNumber: string
  label?: string
  status: string
  // Added by Migration #044 — at most one per tenant. Used as the default
  // line for templates / campaigns / automations that don't specify a
  // whatsappNumberId. Absence means no primary has been chosen yet.
  isPrimary?: boolean
  // `true` when the line is usable for sends. Multi-WABA tenants may
  // have more than one active; writers must pick explicitly.
  isActive?: boolean
}

export interface Conversation {
  id: string
  tenantId: string
  contact: Contact
  whatsappNumber: WhatsAppNumber
  status: ConversationStatus
  channel: string
  lastMessageAt: string
  lastMessagePreview: string
  /** Who sent the last message — drives the sender indicator on the preview. */
  lastMessageSenderKind?: 'client' | 'operator' | 'ai' | 'campaign' | 'rule' | null
  unreadCount: number
  /** Minimal shape — only the fields the conversation list/header actually
   *  read (id, firstName, lastName for the assignee pill). The realtime
   *  socket payload carries this shape too, so the cached row can be
   *  patched without casting. When the backend returns a full User over
   *  HTTP, the extra fields are silently kept (interfaces allow excess
   *  properties); the UI just doesn't render them. */
  assignedUser?: {
    id: string
    firstName: string
    lastName: string | null
    avatarUrl?: string | null
  }
  tags?: Tag[]
  /**
   * Phase 19 SLA — timestamp of the most recent outbound message from a
   * human agent. The conversation list compares this against lastMessageAt
   * to surface an "awaiting reply" chip when the client's last message is
   * newer (i.e. the customer is currently waiting).
   */
  lastAgentReplyAt?: string | null
  /**
   * Phase 27 — when null, the WhatsApp AI agent auto-replies on this
   * conversation. When set to a future ISO timestamp, the agent is paused
   * (manual or auto-handoff after a human outbound). UI uses this for
   * the "Em atendimento IA" / "Você está atendendo" banner + countdown.
   */
  aiPausedUntil?: string | null
  /**
   * Phase 33c — true when a phantom-confirmation handoff fired on this
   * conversation in the recent window (the AI claimed an action it never
   * executed and the turn was transferred to a human). Drives the amber
   * "Verificar" badge in the conversation list. Cleared after the window.
   */
  hasRecentAnomaly?: boolean
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  wamid?: string
  direction: MessageDirection
  type: MessageType
  status: MessageStatus
  body?: string
  mediaUrl?: string
  mediaCaption?: string
  /** Whisper transcription for inbound WhatsApp voice notes — null when the
   *  feature flag is off, transcription failed, or type !== 'audio'. */
  transcription?: string | null
  /** Emoji string for reaction messages (type = 'reaction'). */
  reactionEmoji?: string | null
  /** wamid of the message that was reacted to (type = 'reaction'). */
  reactionTargetWamid?: string | null
  /** Structured payload for non-trivial types (contacts, interactive reply,
   *  order, system, referral, …). Discriminated by `metadata.kind`. */
  metadata?: Record<string, unknown> | null
  /** wamid of the message this one replies to (WhatsApp `context.id`). */
  contextWamid?: string | null
  /** Sender of the replied-to message (WhatsApp `context.from`). */
  contextFrom?: string | null
  /** Origin of the message — drives the per-bubble sender indicator. */
  senderKind?: 'client' | 'operator' | 'ai' | 'campaign' | 'rule' | null
  sentAt: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  errorCode?: string
  /** Populated by the backend for outbound messages typed by a human operator
   *  (`sentByUserId` not null). Stays null/undefined for AI-generated outbound
   *  and any inbound. The bubble uses presence to render either the
   *  operator's first name or the "IA" label. lastName can be null because
   *  the User entity allows null lastName at the database level. */
  sentByUser?: { id: string; firstName: string; lastName: string | null } | null
  sentByUserId?: string | null
  /**
   * Phase 33c — phantom-confirmation marker for this bubble. Set when the
   * anti-claim guard caught the AI claiming an action it never executed on
   * this turn. `handoff` = transferred to a human (needs verification);
   * `corrected` = the AI self-corrected before sending. Null/absent otherwise.
   */
  anomaly?: {
    kind: 'handoff' | 'corrected'
    claimType: string | null
    /** The phrase the AI used that triggered detection. */
    matchedText?: string | null
    /** Technical guard outcome (e.g. "retry_failed_fallback"). */
    outcome?: string | null
    /** When the anomaly was recorded (ISO). */
    occurredAt?: string | null
    /** The skill that should have run for this claim (slug). */
    requiredSkill?: string | null
    /** Skills/tools that were called and failed during the turn. */
    skillFailures?: Array<{ name: string; kind: string; statusCode: number | null; message: string | null }>
    /** Correlation id to cross-reference the agent-server logs. */
    correlationId?: string | null
    // ── Sinal v2 (SCRUM-511) — contexto completo do operador ──────────────
    // Ausentes em marcador anterior ao v2; o modal degrada para o que era.
    /** A resposta COMO A IA ESCREVEU, retida antes do envio. */
    blockedText?: string | null
    /** Os fatos barrados, com posição DENTRO de blockedText para marcação. */
    findings?: Array<{
      type: string
      reason: string
      raw: string
      span: [number, number] | null
      suggested: string | null
    }>
    /** O que o sistema SABIA no turno — vagas reais, preços por convênio,
     *  nomes com lastro. É o que permite responder o cliente na hora. */
    evidence?: { slots: string[]; prices: string[]; names: string[] } | null
    /** Quanto a IA tentou se corrigir antes da transferência. */
    repair?: { rung: number | null; llmCalls: number | null } | null
  } | null
  createdAt: string
}

export interface ConversationFilters {
  status?: ConversationStatus | 'all'
  /**
   * Assignment filter. Values:
   *   • 'me'         → conversations assigned to the logged-in user
   *   • 'unassigned' → no assignee at all
   *   • 'all' / undefined → no filter
   *   • <UUID>       → conversations assigned to a specific team member,
   *     picked from the "Equipe" dropdown in ConversationFiltersBar.
   * The backend recognises all four shapes; arbitrary strings fall through.
   */
  assignedTo?: 'me' | 'unassigned' | 'all' | string
  /**
   * Filter by AI handling state (derived server-side from aiPausedUntil):
   *   'active' → AI is replying (paused until is null or in the past)
   *   'paused' → A human took over (paused until is in the future)
   *   'all' / undefined → both
   */
  aiHandling?: 'active' | 'paused' | 'all'
  /** Quick filters surfaced by the dropdown button next to the search input.
   *  Each is an independent toggle; the backend AND-combines them so they
   *  stack (e.g. unread + awaiting reply = "needs attention now"). */
  unreadOnly?: boolean
  awaitingReply?: boolean
  untagged?: boolean
  /** Only conversations with a recent phantom-confirmation handoff (the
   *  "Verificar" badge). Lets the operator triage AI validation errors. */
  needsReview?: boolean
  tagId?: string
  contactId?: string
  search?: string
  /** Scope listings to a single WhatsApp line. Set by the TopBar workspace
   *  switcher on the client; backend intersects with the user's allowed
   *  lines (department gating) so clients can never widen their own
   *  access. Omit to fetch across every line the user is authorized to
   *  see (admin "All lines" mode, or agent with no line restriction). */
  whatsappNumberId?: string
  /** Period filter — ISO 8601 UTC. Frontend resolves the BRT-aligned range
   *  (start of "today" at 00:00 America/Sao_Paulo, etc.) before sending so
   *  the backend doesn't need timezone awareness. Backend filters
   *  `lastMessageAt >= startDate AND lastMessageAt < endDate`, and statusCounts
   *  inherits the same filter automatically. */
  startDate?: string
  endDate?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  /** True when there is at least one more page after `page` for the current
   *  filter set. Backend computes this as `page * limit < total` so it stays
   *  accurate even when the last page is partially filled. */
  hasMore: boolean
}

/** Database-wide conversation totals grouped by status, computed under the
 *  same non-status filters that produced the current page. Lets the tab
 *  badges show the real total (e.g. "Resolvidas 287") instead of just
 *  whatever fits in the loaded array, which would shrink with pagination. */
export interface ConversationStatusCounts {
  all: number
  open: number
  pending: number
  resolved: number
}

export interface ConversationListResponse extends PaginatedResponse<Conversation> {
  statusCounts: ConversationStatusCounts
  /** Tenant-wide count of conversations with a recent phantom-confirmation
   *  handoff — drives the "Verificar" indicator badge next to the search. */
  needsReviewCount?: number
}

export interface SendMessageDto {
  body?: string
  file?: File
  mediaCaption?: string
  /** wamid of the message being replied to — sent so the client sees a quoted reply. */
  replyToWamid?: string
}

// ─── Billing / Plan Types ─────────────────────────────────────────────────────

export type PlanTier = 'starter' | 'essential' | 'pro' | 'business' | 'scale' | 'enterprise'

/** @deprecated use PlanTier */
export type TenantPlan = PlanTier

export interface PlanLimits {
  creditsPerMonth: number | null   // null = unlimited
  users: number | null
  waNumbers: number | null
  agents: number | null            // AI agent configs
  automations: number | null
  campaignsPerMonth: number | null
  copilotInteractions: number | null
  customFields: number | null
  dataRetentionMonths: number | null
  subAccounts: number | null
}

export interface PlanDefinition {
  tier: PlanTier
  name: string
  monthlyPrice: number | null      // null = enterprise (contact sales)
  annualMonthlyPrice: number | null
  limits: PlanLimits
  modules: PlanModuleAccess
}

export interface PlanModuleAccess {
  conversations: boolean
  crm: boolean
  campaigns: boolean
  automations: boolean
  dashboard: boolean
  marketing: boolean          // marketing attribution
  agentBuilder: boolean
  copilot: boolean
  nexus: boolean              // internal chat
  apiAccess: boolean
  webhooks: boolean
  advancedAnalytics: boolean
  customReports: boolean
  prioritySupport: boolean
  dedicatedOnboarding: boolean
  sla: boolean
  subAccounts: boolean
}

export type CreditOperation =
  | 'agent_message'        // WhatsApp AI agent message — Haiku (0.1 cr)
  | 'automation_eval'      // Automation condition evaluation — Haiku (0.05 cr)
  | 'contact_summary'      // AI contact summary / analysis — Sonnet (0.5 cr)
  | 'copilot_simple'       // Copilot simple response — Sonnet (2 cr)
  | 'copilot_complex'      // Copilot with tool calls / data — Sonnet (4 cr)
  | 'artifact_generation'  // Copilot artifact (doc/HTML) — Sonnet (5 cr)
  | 'agent_builder'        // Agent Builder wizard step — Sonnet (3 cr)

export interface CreditCost {
  operation: CreditOperation
  credits: number
  model: 'haiku' | 'sonnet'
  description: string
}

export interface CreditBalance {
  used: number
  total: number | null   // null = unlimited
  resetsAt: string
  percentUsed: number | null
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  plan: PlanTier
  isActive: boolean
  timezone: string
  language: string
  logoUrl?: string
  createdAt: string
}

export interface WhatsAppNumberDetailed extends WhatsAppNumber {
  wabaId: string
  wabaName: string
  phoneNumberId: string
  qualityRating: 'green' | 'yellow' | 'red' | 'unknown'
  messagingLimit: string
  connectedAt: string
  agentId?: string | null
  agentName?: string | null
}

export interface CannedResponse {
  id: string
  tenantId: string
  shortcut: string
  title: string
  body: string
  createdByUserId: string
  createdByName: string
  createdAt: string
}

export type InvoiceStatus = 'paid' | 'pending' | 'failed'

export interface Invoice {
  id: string
  date: string
  description: string
  amount: number
  status: InvoiceStatus
}

export interface BillingPlan {
  planName: PlanTier
  price: number
  currency: 'BRL' | 'USD'
  renewalDate: string
  creditsUsed: number
  creditsTotal: number | null
  features: string[]
  invoices: Invoice[]
  /** @deprecated use creditsUsed/creditsTotal */
  conversationsUsed?: number
  /** @deprecated use creditsUsed/creditsTotal */
  conversationsLimit?: number
}

export interface ActiveSession {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastSeenAt: string
  isCurrent: boolean
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, unknown>
  ipAddress: string
  createdAt: string
}

export interface HomeStats {
  conversationsOpen: number
  conversationsResolvedToday: number
  messagesSentToday: number
  messagesReceivedToday?: number
  newContactsThisWeek: number
  agentsOnline: number
  agentsActive: number
  agentsPending: number
  avgResponseMinutes: number
  queueCount: number
  planUsed: number
  planLimit: number
  totalContacts?: number
  totalConversations?: number
  unassignedCount?: number
  myConversationsOpen: number
  myConversationsResolvedToday: number
  myAvgResponseMinutes: number
  myMessagesSentToday: number
}

// ─── Templates & Campaigns ────────────────────────────────────────────────────

export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'

export type TemplateHeaderType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

/** API-only value to clear header on update (stored as null in DB). */
export type TemplateHeaderTypeInput = TemplateHeaderType | 'NONE'

export type TemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW' | 'COPY_CODE'

export type TemplateCategoryType = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export interface TemplateButton {
  type: TemplateButtonType
  text: string
  url?: string
  phoneNumber?: string
  flowId?: string
  // Sample URL when `url` contains {{1}} — Meta requires it for review.
  urlExample?: string
}

export interface WhatsAppTemplate {
  id: string
  tenantId: string
  name: string           // snake_case, unique per namespace
  language: string       // 'pt_BR', 'en_US', etc.
  category: TemplateCategoryType
  status: TemplateStatus
  headerType?: TemplateHeaderType
  headerText?: string    // only when headerType === 'TEXT'
  headerMediaUrl?: string
  body: string           // required, can contain {{1}}, {{2}}, etc.
  footer?: string
  buttons?: TemplateButton[]
  bodyVariables?: string[]   // human-readable names for {{1}}, {{2}}…
  rejectionReason?: string
  whatsappNumberId?: string
  // Set by Migration #045 on legacy rows in multi-WABA tenants. UI
  // should surface a badge and block submit-to-Meta until assigned.
  needsWabaAssignment?: boolean
  createdAt: string
  updatedAt: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'

export interface CampaignSegment {
  type: 'all' | 'tag' | 'stage' | 'manual' | 'filter'
  tagIds?: string[]
  stages?: string[]
  contactIds?: string[]
  // Advanced CRM filter (type === 'filter') — all non-empty criteria are AND-combined
  filterStages?: string[]
  filterTagIds?: string[]
  filterIntent?: ContactIntent[]
  filterSource?: ContactSource[]
  filterOptIn?: boolean
  // Extended CRM filters
  filterSentiment?: ContactSentiment[]
  filterContactSearch?: string        // matches displayName or waId
  filterHasConversations?: boolean
}

export interface CampaignVariableMapping {
  position: number           // 1-indexed, matches {{1}}, {{2}}
  variableName: string       // human-readable name from template
  source: 'contact_field' | 'custom_field' | 'literal'
  contactField?: string      // 'displayName' | 'company' | 'email' | etc.
  customFieldKey?: string
  literal?: string
}

export interface CampaignStats {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  replied?: number
  clicked?: number
  optedOut?: number
  conversions?: number
  engagementScore?: number   // 0–100 composite
  churnCount?: number
}

export interface CampaignChurnBreakdown {
  optOut:        number   // descadastraram / bloquearam
  blocked:       number   // reportaram spam
  invalidNumber: number   // número inválido/inexistente
  undelivered:   number   // não entregue (falha de rede/servidor)
  noInteraction: number   // entregue mas sem nenhuma interação (soft churn)
}

export interface CampaignConversionEvent {
  contactId:   string
  contactName: string
  convertedAt: string
  type: 'replied' | 'clicked_link' | 'stage_changed' | 'purchase'
  detail?: string
}

export interface CampaignEngagementPoint {
  label:     string   // "0h", "1h", "6h", "12h", "24h"
  read:      number
  replied:   number
  converted: number
}

export interface CampaignAttributionBreakdown {
  source:          string            // 'meta_ads' | 'google_ads' | 'whatsapp' | 'import' | 'manual'
  platform?:       'meta' | 'google'
  label:           string
  adCampaignName?: string
  contactCount:    number
  readCount:       number
  replyCount:      number
  conversionCount: number
  readRate:        number
  conversionRate:  number
}

export interface CampaignConversationSummary {
  contactId:        string
  contactName:      string
  conversationId:   string
  sentiment:        string
  outcome:          'converted' | 'churned' | 'pending' | 'no_response'
  lastMessageSnippet: string
  lastMessageAt:    string
  adSource?:        string
  adCampaignName?:  string
}

export interface CampaignAnalytics {
  campaignId:         string
  churnBreakdown:     CampaignChurnBreakdown
  conversionEvents:   CampaignConversionEvent[]
  engagementTimeline: CampaignEngagementPoint[]
  attributionBreakdown: CampaignAttributionBreakdown[]
  aiInsights:         string[]
}

export interface Campaign {
  id: string
  tenantId: string
  name: string
  templateId: string
  templateName: string   // denormalized for display
  segment: CampaignSegment
  variableMappings: CampaignVariableMapping[]
  status: CampaignStatus
  scheduledAt?: string
  sentAt?: string
  stats: CampaignStats
  createdByUserId: string
  createdAt: string
  whatsappNumberId?: string | null
  needsWabaAssignment?: boolean
}

// Socket.IO event payloads
export interface SocketMessageNew {
  conversationId: string
  message: Message
  contact: Contact
  unreadCount: number
  /** Phase 27 — surfaced on outbound human messages so the UI's AI-handoff
   *  banner and ContactPanel countdown update in lockstep with the new row. */
  aiPausedUntil?: string | null
  /** Phase 32 — the human outbound also auto-assigns the conversation to the
   *  sender. Sent for outbound human messages; undefined for inbound and
   *  AI-generated messages. */
  assignedUser?: { id: string; firstName: string; lastName: string | null } | null
}

export interface SocketAiPauseUpdated {
  conversationId: string
  aiPausedUntil: string | null
  changedBy: string
  /** Phase 32 — handoff state now controls assignment too. Pause sets the
   *  assigned user to the intervener; resume clears it. The frontend
   *  applies this to its cached conversation row. */
  assignedUser?: { id: string; firstName: string; lastName: string | null } | null
  assignmentChanged?: boolean
  /** Phase 33c — a phantom-confirmation handoff reuses this event (it pauses
   *  the AI + assigns) and sets this so the "Verificar" list badge appears in
   *  realtime. Undefined for ordinary manual pause/resume. */
  hasRecentAnomaly?: boolean
}

/**
 * SCRUM-562 — conversation status changed server-side.
 *
 * Emitted by `applyStatusTransition`, so it covers BOTH the manual endpoint and
 * the AI guard's move to `pending`. Before this, no socket carried conversation
 * status at all: an operator resolving a conversation was invisible to their
 * colleagues and to their own other tabs until a refetch.
 *
 * Its own event rather than a field on `conversation:updated`, because that one
 * drops message-less payloads by design (see the guard in useConversations).
 */
export interface SocketConversationStatusUpdated {
  conversationId: string
  status: ConversationStatus
  previousStatus: ConversationStatus
  /** User id, or `'ai-guard'` when the verification gateway moved it. */
  changedBy: string
}

export interface SocketMessageStatus {
  messageId: string
  status: MessageStatus
  timestamp: string
}

export interface SocketConversationAssigned {
  conversationId: string
  assignedTo: User
}

export interface SocketUnreadUpdate {
  total: number
  byConversation: Record<string, number>
}


// ─── Internal Chat ────────────────────────────────────────────────────────────

export type InternalChannelType = 'dm' | 'department_room' | 'group'

export interface InternalChannel {
  id: string
  tenantId: string
  type: InternalChannelType
  name?: string             // null for DMs
  emoji?: string            // for groups/rooms
  departmentId?: string     // auto-created from department
  departmentName?: string   // human-readable department label
  departmentColor?: string
  topic?: string            // channel topic / description
  pinned?: boolean
  memberIds: string[]
  memberNames?: string[]    // denormalized for display
  createdByUserId?: string  // who created the channel (for admin/delete checks)
  createdAt: string
  lastMessageAt?: string
  lastMessagePreview?: string
  lastMessageSenderName?: string
  lastMessageSenderType?: InternalSenderType
  unreadCount: number       // per-user, computed by backend
}

export type InternalMessageType = 'text' | 'image' | 'file' | 'system'

export type InternalSenderType = 'user' | 'copilot' | 'system'

export interface InternalMessageReaction {
  emoji: string
  userIds: string[]
}

export interface InternalMessage {
  id: string
  channelId: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string
  senderType?: InternalSenderType
  body: string
  type: InternalMessageType
  fileUrl?: string
  fileName?: string
  fileSize?: number
  replyToId?: string
  replyToPreview?: string   // short snippet of the replied message
  replyToSenderName?: string
  reactions: InternalMessageReaction[]
  readBy: string[]
  editedAt?: string
  deletedAt?: string
  createdAt: string
}

export type UserPresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface UserPresence {
  userId: string
  status: UserPresenceStatus
  lastSeenAt: string
}

// ─── Multi-Agent Copilot Types ────────────────────────────────────────────────

export type CopilotIntentCategory =
  | 'crm_read' | 'crm_write' | 'analytics' | 'artifact'
  | 'web' | 'compose' | 'hybrid'

export type CopilotAgentId =
  | 'intent_classifier' | 'orchestrator' | 'crm_read' | 'crm_write'
  | 'analytics' | 'artifact' | 'composer' | 'web'
