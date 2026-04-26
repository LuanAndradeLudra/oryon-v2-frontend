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

export type KpiUnit = 'count' | 'percent' | 'seconds' | 'csat_score' | 'nps_score' | 'currency'

export interface KpiDefinition {
  id: KpiId
  label: string
  category: 'Atendimento' | 'Velocidade' | 'Qualidade' | 'Volume' | 'Bot' | 'Equipe' | 'Disparos' | 'Marketing'
  unit: KpiUnit
  trendIsGood: 'up' | 'down' | 'neutral' // whether an increasing trend is good
}

export interface KpiMetric extends KpiDefinition {
  value: number
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
  departmentName: string
  isOnline: boolean
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

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  actorName: string
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

export const KPI_CATALOG: KpiDefinition[] = [
  { id: 'total_conversations',  label: 'Total de Conversas',      category: 'Atendimento', unit: 'count',      trendIsGood: 'up'     },
  { id: 'active_conversations', label: 'Conversas Ativas',        category: 'Atendimento', unit: 'count',      trendIsGood: 'neutral'},
  { id: 'queued',               label: 'Em Fila',                  category: 'Atendimento', unit: 'count',      trendIsGood: 'down'   },
  { id: 'resolved',             label: 'Resolvidas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'up'     },
  { id: 'abandoned',            label: 'Abandonadas',              category: 'Atendimento', unit: 'count',      trendIsGood: 'down'   },
  { id: 'resolution_rate',      label: 'Taxa de Resolução',        category: 'Atendimento', unit: 'percent',    trendIsGood: 'up'     },
  { id: 'abandon_rate',         label: 'Taxa de Abandono',         category: 'Atendimento', unit: 'percent',    trendIsGood: 'down'   },
  { id: 'first_response_time',  label: 'TMR (1ª Resposta)',        category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down'   },
  { id: 'avg_resolution_time',  label: 'Tempo Médio Resolução',    category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down'   },
  { id: 'sla_compliance',       label: 'SLA Compliance',           category: 'Velocidade',  unit: 'percent',    trendIsGood: 'up'     },
  { id: 'csat',                 label: 'Satisfação (CSAT)',        category: 'Qualidade',   unit: 'csat_score', trendIsGood: 'up'     },
  { id: 'nps',                  label: 'NPS',                      category: 'Qualidade',   unit: 'nps_score',  trendIsGood: 'up'     },
  { id: 'recontact_rate',       label: 'Taxa de Recontato',        category: 'Qualidade',   unit: 'percent',    trendIsGood: 'down'   },
  { id: 'msgs_received',        label: 'Msgs Recebidas',           category: 'Volume',      unit: 'count',      trendIsGood: 'neutral'},
  { id: 'msgs_sent',            label: 'Msgs Enviadas',            category: 'Volume',      unit: 'count',      trendIsGood: 'neutral'},
  { id: 'new_contacts',         label: 'Novos Contatos',           category: 'Volume',      unit: 'count',      trendIsGood: 'up'     },
  { id: 'bot_deflection',       label: 'Deflexão do Bot',          category: 'Bot',         unit: 'percent',    trendIsGood: 'up'     },
  { id: 'bot_resolved',         label: 'Resolvidas pelo Bot',      category: 'Bot',         unit: 'count',      trendIsGood: 'up'     },
  { id: 'agents_online',        label: 'Agentes Online',           category: 'Equipe',      unit: 'count',      trendIsGood: 'neutral'},
  { id: 'team_utilization',     label: 'Utilização da Equipe',     category: 'Equipe',      unit: 'percent',    trendIsGood: 'neutral'},
  // ── Campanhas (Meta WhatsApp Business API) ──────────────────────────────────
  // Signals available via status webhooks (sent/delivered/read/failed) and
  // Meta's template analytics endpoint (clicks, replies, opt-outs).
  { id: 'campaign_sent',          label: 'Msgs Enviadas (Disparos)',  category: 'Disparos',   unit: 'count',      trendIsGood: 'up'     },
  { id: 'campaign_delivery_rate', label: 'Taxa de Entrega',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'campaign_read_rate',     label: 'Taxa de Leitura',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'campaign_reply_rate',    label: 'Taxa de Resposta',          category: 'Disparos',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'campaign_ctr',           label: 'Click-through Rate (CTR)',  category: 'Disparos',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'campaign_fail_rate',     label: 'Taxa de Falha',             category: 'Disparos',   unit: 'percent',    trendIsGood: 'down'   },
  { id: 'campaign_optout_rate',   label: 'Taxa de Opt-out',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'down'   },
  { id: 'campaigns_active',       label: 'Disparos Ativos',           category: 'Disparos',   unit: 'count',      trendIsGood: 'neutral'},
  { id: 'campaigns_total',        label: 'Total de Disparos',         category: 'Disparos',   unit: 'count',      trendIsGood: 'up'     },
  { id: 'campaign_reach',         label: 'Alcance Total (Disparos)',  category: 'Disparos',   unit: 'count',      trendIsGood: 'up'     },
  // ── Marketing (Meta Ads + Google Ads) ──────────────────────────────────────
  { id: 'ads_leads_meta',         label: 'Leads (Meta Ads)',          category: 'Marketing',   unit: 'count',      trendIsGood: 'up'     },
  { id: 'ads_leads_google',       label: 'Leads (Google Ads)',        category: 'Marketing',   unit: 'count',      trendIsGood: 'up'     },
  { id: 'ads_total_spend',        label: 'Investimento Total',        category: 'Marketing',   unit: 'currency',   trendIsGood: 'neutral'},
  { id: 'ads_avg_cpl',            label: 'CPL Médio',                 category: 'Marketing',   unit: 'currency',   trendIsGood: 'down'   },
  { id: 'ads_avg_roas',           label: 'ROAS Médio',                category: 'Marketing',   unit: 'count',      trendIsGood: 'up'     },
  { id: 'ads_conversion_rate',    label: 'Taxa de Conversão (Ads)',   category: 'Marketing',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'ads_qualified_rate',     label: 'Taxa de Qualificação',      category: 'Marketing',   unit: 'percent',    trendIsGood: 'up'     },
  { id: 'ads_customer_rate',      label: 'Taxa de Fechamento',        category: 'Marketing',   unit: 'percent',    trendIsGood: 'up'     },
]

export const DEFAULT_KPI_SLOTS: KpiId[] = [
  'total_conversations',
  'active_conversations',
  'queued',
  'resolved',
  'resolution_rate',
  'first_response_time',
  'csat',
  'sla_compliance',
  'new_contacts',
  'bot_deflection',
  // Campaign defaults (Meta WhatsApp metrics)
  'campaign_delivery_rate',
  'campaign_read_rate',
  'campaign_reply_rate',
  'campaign_ctr',
  'campaign_optout_rate',
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
