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
  | 'template'
  | 'interactive'
  | 'unsupported'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export type UserRole = 'business_admin' | 'admin' | 'agent' | 'supervisor'

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
  unreadCount: number
  assignedUser?: User
  tags?: Tag[]
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
  metadata?: Record<string, unknown>
  sentAt: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  errorCode?: string
  sentByUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>
  createdAt: string
}

export interface ConversationFilters {
  status?: ConversationStatus | 'all'
  assignedTo?: 'me' | 'unassigned' | 'all'
  tagId?: string
  contactId?: string
  search?: string
  /** Scope listings to a single WhatsApp line. Set by the TopBar workspace
   *  switcher on the client; backend intersects with the user's allowed
   *  lines (department gating) so clients can never widen their own
   *  access. Omit to fetch across every line the user is authorized to
   *  see (admin "All lines" mode, or agent with no line restriction). */
  whatsappNumberId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface SendMessageDto {
  body?: string
  file?: File
  mediaCaption?: string
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

export type TemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW' | 'COPY_CODE'

export type TemplateCategoryType = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export interface TemplateButton {
  type: TemplateButtonType
  text: string
  url?: string
  phoneNumber?: string
  flowId?: string
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
