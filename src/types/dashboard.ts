// ── Dashboard Types & Constants ───────────────────────────────────────────────

export type DateRange = 'today' | '7d' | '30d' | 'month'

export type KpiId =
  | 'total_conversations' | 'active_conversations' | 'queued'
  | 'resolved' | 'abandoned' | 'resolution_rate' | 'abandon_rate'
  | 'first_response_time' | 'human_first_response' | 'avg_resolution_time' | 'sla_compliance'
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
  /** Revisão 30/09: o que o número conta, em português (ⓘ do cartão). */
  help?: string
}

export interface KpiMetric extends KpiDefinition {
  /** `null` = sem dado (mostra "—"), nunca um 0 inventado (regra 6). */
  value: number | null
  /** Linha de apoio com dado real (ex.: "média 4 min · 3 sem resposta"). */
  detail?: string | null
  /** Meta do indicador (mesma unidade do valor) — dá o estado na meta/atenção/fora. */
  meta?: { alvo: number; sentido: 'menor' | 'maior' } | null
  /**
   * DC-5: variação contra o período anterior de mesma duração — `%` nas
   * contagens e tempos, pontos percentuais (`pp`) nas taxas. `null` = sem
   * comparação (indicador "agora", base zero ou sem dado).
   */
  trend: number | null
  trendUnit?: '%' | 'pp'
  /** DC-5: valor por dia do período (mais antigo → mais novo); vazio = sem série. */
  sparkline: number[]
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
  /** Atendimentos atuais iniciados no período, do dono atual. */
  conversationsToday: number
  resolvedToday: number
  /** Quantas 1ªs respostas humanas a pessoa deu no período (base do TMR e do SLA). */
  firstResponses?: number
  avgResponseTime: number | null   // seconds (1ª resposta humana, do repasse), null = sem dado
  avgResolutionTime: number | null // seconds, null = sem dado
  /** K8: % de 1ª resposta humana dentro do SLA (15 min); null = sem conversa respondida. */
  slaCompliance: number | null
  slaTargetMinutes?: number
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
  /** `null` quando /home/snapshot não veio; a UI mostra indisponibilidade. */
  statusDistribution: StatusDistribution | null
  tagVolumes: TagVolume[]
  csatChart: CsatDataPoint[]
  heatmap: HeatmapCell[]
  agentMetrics: AgentMetrics[]
  activityFeed: ActivityEvent[]
  realtime?: { agentsOnline: number; activeConversations: number; queueSize: number; avgWaitSeconds: number }
  /** K12: 'minhas' quando o painel mostra só as conversas do usuário. */
  escopo?: 'empresa' | 'minhas'
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
  { id: 'total_conversations',  label: 'Atendimentos',             category: 'Atendimento', unit: 'count',      trendIsGood: 'up',
    help: 'Atendimentos iniciados no período: contatos novos mais os clientes que voltaram (conversa reaberta). Cada volta do cliente é um atendimento.' },
  { id: 'active_conversations', label: 'Conversas Ativas',         category: 'Atendimento', unit: 'count',      trendIsGood: 'neutral',
    help: 'Conversas abertas neste momento (não segue o período).' },
  { id: 'queued',               label: 'Em Fila',                  category: 'Atendimento', unit: 'count',      trendIsGood: 'down',
    help: 'Conversas pendentes sem dono neste momento — a mesma aba Fila das Conversas (não segue o período).' },
  { id: 'resolved',             label: 'Resolvidas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'up',
    help: 'Conversas marcadas como resolvidas dentro do período (e que seguem resolvidas).' },
  { id: 'abandoned',            label: 'Arquivadas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'down',
    help: 'Conversas arquivadas no período — encerradas pela IA ou por uma pessoa porque o cliente parou de responder. Não mede cliente que desistiu de esperar.' },
  { id: 'resolution_rate',      label: 'Taxa de Resolução',        category: 'Atendimento', unit: 'percent',    trendIsGood: 'up',
    help: 'Dos atendimentos iniciados no período, quantos já estão resolvidos. Não é "Resolvidas ÷ Atendimentos": Resolvidas conta também atendimentos de antes do período.' },
  { id: 'abandon_rate',         label: 'Taxa de Arquivamento',     category: 'Atendimento', unit: 'percent',    trendIsGood: 'down',
    help: 'Dos atendimentos iniciados no período, quantos foram arquivados.' },
  { id: 'first_response_time',  label: 'Tempo de Resposta',        category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre o cliente começar a falar e a primeira resposta da IA ou de uma pessoa. Resposta automática por regra e campanha não contam; quem ficou sem resposta aparece à parte.' },
  { id: 'human_first_response', label: '1ª Resposta Humana',       category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo até a primeira mensagem de uma pessoa em cada atendimento, contado de quando a conversa passou para a equipe (ou do início, se a pessoa assumiu antes). O tempo em que a IA atendia não entra.' },
  { id: 'avg_resolution_time',  label: 'Tempo de Resolução',       category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre o início do atendimento e a resolução, nas conversas resolvidas no período. Cliente que voltou conta do dia em que voltou, não do primeiro contato.' },
  { id: 'recontact_rate',       label: 'Taxa de Recontato',        category: 'Qualidade',   unit: 'percent',    trendIsGood: 'down',
    help: 'Conversas que o cliente reabriu no período, sobre as resolvidas mais as reabertas. Nunca passa de 100%.' },
  { id: 'msgs_received',        label: 'Msgs Recebidas',           category: 'Volume',      unit: 'count',      trendIsGood: 'neutral',
    help: 'Mensagens que os clientes mandaram no período.' },
  { id: 'msgs_sent',            label: 'Msgs Enviadas',            category: 'Volume',      unit: 'count',      trendIsGood: 'neutral',
    help: 'Mensagens que saíram no período (sem as que falharam): de pessoas, da IA, de respostas automáticas e de campanhas.' },
  { id: 'new_contacts',         label: 'Novos Contatos',           category: 'Volume',      unit: 'count',      trendIsGood: 'up',
    help: 'Contatos cadastrados no período.' },
  { id: 'bot_deflection',       label: 'Resolução pela IA',        category: 'Bot',         unit: 'percent',    trendIsGood: 'up',
    help: 'Das conversas resolvidas no período, quantas a IA atendeu sem nenhuma mensagem de pessoa no atendimento. Conversa que a IA passou para a equipe não conta como sucesso da IA.' },
  { id: 'bot_resolved',         label: 'Resolvidas pela IA',       category: 'Bot',         unit: 'count',      trendIsGood: 'up',
    help: 'Conversas resolvidas no período em que a IA respondeu e nenhuma pessoa escreveu no atendimento.' },
  { id: 'agents_online',        label: 'Pessoas Online',           category: 'Equipe',      unit: 'count',      trendIsGood: 'neutral',
    help: 'Pessoas da equipe com o Oryon aberto agora (não inclui os agentes de IA).' },
  // ── Campanhas (Meta WhatsApp Business API) ──────────────────────────────────
  { id: 'campaign_sent',          label: 'Disparos Enviados',         category: 'Disparos',   unit: 'count',      trendIsGood: 'up',
    help: 'Mensagens de campanha que saíram no período, contando as que a Meta recusou (mesma regra do relatório da campanha). Inclui campanhas interrompidas.' },
  { id: 'campaign_delivery_rate', label: 'Taxa de Entrega',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos enviados no período, quantos chegaram ao celular (entregue, lida ou respondida).' },
  { id: 'campaign_read_rate',     label: 'Taxa de Leitura',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos entregues, quantos foram lidos (quem desligou a confirmação de leitura não aparece).' },
  { id: 'campaign_reply_rate',    label: 'Taxa de Resposta',          category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos entregues, quantos tiveram resposta do cliente.' },
  // ── Clínica (agentes de WhatsApp: agendar/cancelar consulta) ────────────────
  { id: 'appointments_scheduled', label: 'Agendamentos Marcados',     category: 'Clínica',    unit: 'count',      trendIsGood: 'up',
    help: 'Agendamentos que os agentes de IA marcaram no período.' },
  { id: 'appointments_cancelled', label: 'Cancelamentos',             category: 'Clínica',    unit: 'count',      trendIsGood: 'down',
    help: 'Agendamentos cancelados pelos agentes de IA no período.' },
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
    trend: null,
    sparkline: [],
  }))
  return {
    kpis,
    volumeChart: [],
    statusDistribution: null,
    tagVolumes: [],
    csatChart: [],
    heatmap: [],
    agentMetrics: [],
    activityFeed: [],
  }
}
