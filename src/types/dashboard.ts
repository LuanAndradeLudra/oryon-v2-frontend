// ── Dashboard Types & Constants ───────────────────────────────────────────────

export type DateRange = 'today' | '7d' | '30d' | 'month'

export type KpiId =
  | 'total_conversations' | 'active_conversations' | 'queued'
  | 'resolved' | 'abandoned' | 'resolution_rate' | 'abandon_rate'
  | 'first_response_time' | 'avg_resolution_time' | 'sla_compliance'
  | 'csat' | 'nps' | 'recontact_rate'
  | 'msgs_received' | 'msgs_sent' | 'new_contacts'
  | 'bot_deflection' | 'bot_resolved'
  | 'agents_online' | 'team_utilization'
  // ── Campanhas (Meta WhatsApp Business API) ──────────────────────────────────
  | 'campaign_sent' | 'campaign_delivery_rate' | 'campaign_read_rate'
  | 'campaign_reply_rate' | 'campaign_ctr' | 'campaign_fail_rate'
  | 'campaign_optout_rate' | 'campaigns_active' | 'campaigns_total'
  | 'campaign_reach'
  // ── Marketing (Meta Ads + Google Ads) ───────────────────────────────────────
  | 'ads_leads_meta' | 'ads_leads_google' | 'ads_total_spend'
  | 'ads_avg_cpl' | 'ads_avg_roas' | 'ads_conversion_rate'
  | 'ads_qualified_rate' | 'ads_customer_rate'
  // ── Clínica (agentes de WhatsApp: agendar/cancelar consulta) ────────────────
  | 'appointments_scheduled' | 'appointments_cancelled'

export type KpiUnit = 'count' | 'percent' | 'seconds' | 'csat_score' | 'nps_score' | 'currency'

export interface KpiDefinition {
  id: KpiId
  label: string
  category: 'Atendimento' | 'Velocidade' | 'Qualidade' | 'Volume' | 'Bot' | 'Equipe' | 'Disparos' | 'Marketing' | 'Clínica'
  unit: KpiUnit
  trendIsGood: 'up' | 'down' | 'neutral' // whether an increasing trend is good
  /** PL-C2-FAR-3 (P14): false quando `DashboardPage.fetchDashboard` não tem
   *  nenhuma fonte real pra este id (fica em 0 pra sempre — bot/CSAT/NPS/SLA/
   *  disparos/marketing ainda não têm dado no backend). Omitido = true. O
   *  customizador usa isto pra não oferecer como se fosse um KPI de verdade. */
  hasData?: boolean
}

export interface KpiMetric extends KpiDefinition {
  /** `null` = sem dado (mostra "—"), nunca um 0 inventado (regra 6). */
  value: number | null
  trend: number    // % change vs previous period
  sparkline: number[] // 7 data points (oldest → newest)
}

export interface VolumeDataPoint {
  date: string
  inbound: number
  outbound: number
}

export interface StatusDistribution {
  pending: number
  open: number
  resolved: number
  abandoned: number
}

export interface TagVolume {
  tagId: string
  tagName: string
  color: string
  count: number
}

export interface CsatDataPoint {
  date: string
  csat: number  // 0-5
  nps: number   // -100 to 100
}

export interface HeatmapCell {
  day: number   // 0=Mon … 6=Sun
  hour: number  // 0-23
  value: number
}

export interface AgentMetrics {
  userId: string
  name: string
  role: string
  departmentName: string | null
  /** `null` = sem rastreio de presença ainda (mostra "—", não "Offline"). */
  isOnline: boolean | null
  conversationsToday: number
  resolvedToday: number
  avgResponseTime: number   // seconds
  avgResolutionTime: number // seconds
  csat: number              // 0-5
  slaCompliance: number     // 0-100
  utilization: number       // 0-100
}

export type ActivityEventType =
  | 'conversation_resolved'
  | 'conversation_assigned'
  | 'new_conversation'
  | 'agent_online'
  | 'agent_offline'
  | 'sla_breach'
  | 'csat_received'
  | 'bot_deflection'
  // Catch-all for backend `action` names that don't fit the curated set
  // above (stage_created, tag_updated, conversation_ai_pause_updated, etc.).
  // The feed renderer falls back to the row's `summary` text so we surface
  // the activity instead of dropping it from the panel.
  | 'system_event'

/**
 * Subset of the backend's ActivityActorType. We only care about three
 * buckets for icon-picking:
 *   • user  — a human operator (default)
 *   • agent — the WhatsApp / Copilot AI agent
 *   • system — non-human / non-AI source (cron, webhook, job)
 * Other backend values collapse into 'system' downstream.
 */
export type ActivityActorKind = 'user' | 'agent' | 'system'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  actorName: string
  /** Drives the badge icon at the bottom-right of the activity card. */
  actorType: ActivityActorKind
  subject: string
  timestamp: string
}

export interface RealtimeStatus {
  agentsOnline: number
  agentsTotal: number
  activeConversations: number
  queued: number
  avgWaitSeconds: number
}

export interface DashboardSnapshot {
  kpis: KpiMetric[]
  volumeChart: VolumeDataPoint[]
  statusDistribution: StatusDistribution
  tagVolumes: TagVolume[]
  csatChart: CsatDataPoint[]
  heatmap: HeatmapCell[]
  agentMetrics: AgentMetrics[]
  activityFeed: ActivityEvent[]
  realtime?: { agentsOnline: number; activeConversations: number; queueSize: number; avgWaitSeconds: number }
  csatTimeline?: CsatDataPoint[]
}

export const EMPTY_REALTIME_STATUS: RealtimeStatus = {
  agentsOnline: 0,
  agentsTotal: 0,
  activeConversations: 0,
  queued: 0,
  avgWaitSeconds: 0,
}

// ── KPI Catalog ───────────────────────────────────────────────────────────────

// K13-FE / K15 (release 2026-09-29): saíram do catálogo os indicadores sem
// fonte no backend e os que a D4 tirou (CSAT, NPS, SLA global, Ads, CTR,
// opt-out, utilização). Slots salvos com esses ids são ignorados (loadSlots).
export const KPI_CATALOG: KpiDefinition[] = [
  { id: 'total_conversations',  label: 'Total de Conversas',      category: 'Atendimento', unit: 'count',      trendIsGood: 'up'     },
  { id: 'active_conversations', label: 'Conversas Ativas',        category: 'Atendimento', unit: 'count',      trendIsGood: 'neutral'},
  { id: 'queued',               label: 'Em Fila',                  category: 'Atendimento', unit: 'count',      trendIsGood: 'down'   },
  { id: 'resolved',             label: 'Resolvidas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'up'     },
  { id: 'abandoned',            label: 'Abandonadas',              category: 'Atendimento', unit: 'count',      trendIsGood: 'down' },
  { id: 'resolution_rate',      label: 'Taxa de Resolução',        category: 'Atendimento', unit: 'percent',    trendIsGood: 'up'     },
  { id: 'abandon_rate',         label: 'Taxa de Abandono',         category: 'Atendimento', unit: 'percent',    trendIsGood: 'down' },
  { id: 'first_response_time',  label: 'TMR (1ª Resposta)',        category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down'   },
  { id: 'avg_resolution_time',  label: 'Tempo Médio Resolução',    category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down' },
  { id: 'recontact_rate',       label: 'Taxa de Recontato',        category: 'Qualidade',   unit: 'percent',    trendIsGood: 'down' },
  { id: 'msgs_received',        label: 'Msgs Recebidas',           category: 'Volume',      unit: 'count',      trendIsGood: 'neutral'},
  { id: 'msgs_sent',            label: 'Msgs Enviadas',            category: 'Volume',      unit: 'count',      trendIsGood: 'neutral'},
  { id: 'new_contacts',         label: 'Novos Contatos',           category: 'Volume',      unit: 'count',      trendIsGood: 'up'     },
  { id: 'bot_deflection',       label: 'Deflexão do Bot',          category: 'Bot',         unit: 'percent',    trendIsGood: 'up' },
  { id: 'bot_resolved',         label: 'Resolvidas pelo Bot',      category: 'Bot',         unit: 'count',      trendIsGood: 'up' },
  { id: 'agents_online',        label: 'Agentes Online',           category: 'Equipe',      unit: 'count',      trendIsGood: 'neutral'},
  // ── Campanhas (Meta WhatsApp Business API) ──────────────────────────────────
  // Signals available via status webhooks (sent/delivered/read/failed) and
  // Meta's template analytics endpoint (clicks, replies, opt-outs).
  // PL-C2-FAR-3: nenhum destes 8 é lido em `DashboardPage.fetchDashboard`
  // hoje (fica em `hasData: false` até o webhook/endpoint existir).
  { id: 'campaign_sent',          label: 'Msgs Enviadas (Disparos)',  category: 'Disparos',   unit: 'count',      trendIsGood: 'up' },
  { id: 'campaign_delivery_rate', label: 'Taxa de Entrega',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up' },
  { id: 'campaign_read_rate',     label: 'Taxa de Leitura',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up' },
  { id: 'campaign_reply_rate',    label: 'Taxa de Resposta',          category: 'Disparos',   unit: 'percent',    trendIsGood: 'up' },
  // ── Marketing (Meta Ads + Google Ads) ──────────────────────────────────────
  // PL-C2-FAR-3: nenhum destes 8 tem fonte hoje (Meta/Google Ads não
  // integrados no backend do Dashboard ainda).
  // ── Clínica (agentes de WhatsApp: agendar/cancelar consulta) ────────────────
  { id: 'appointments_scheduled', label: 'Agendamentos Marcados',     category: 'Clínica',    unit: 'count',      trendIsGood: 'up'     },
  { id: 'appointments_cancelled', label: 'Cancelamentos',             category: 'Clínica',    unit: 'count',      trendIsGood: 'down'   },
]

// R2-DASH-07: a faixa do mock 1b tem 5 KPIs — o padrão acompanha (o usuário
// escolhe mais no "Personalizar"; cada 5 viram uma nova linha da mesma faixa).
export const DEFAULT_KPI_SLOTS: KpiId[] = [
  'active_conversations',
  'resolved',
  'first_response_time',
  'queued',
  'resolution_rate',
]

/** Creates an empty dashboard snapshot with zero-valued KPIs from the catalog */
export function buildEmptySnapshot(): DashboardSnapshot {
  const kpis: KpiMetric[] = KPI_CATALOG.map((def) => ({
    ...def,
    value: 0,
    trend: 0,
    sparkline: [0, 0, 0, 0, 0, 0, 0],
  }))
  return {
    kpis,
    volumeChart: [],
    statusDistribution: { open: 0, pending: 0, resolved: 0, abandoned: 0 },
    tagVolumes: [],
    csatChart: [],
    heatmap: [],
    agentMetrics: [],
    activityFeed: [],
  }
}
