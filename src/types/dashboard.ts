// ── Dashboard Types & Constants ───────────────────────────────────────────────

export type DateRange = 'today' | '7d' | '30d' | 'month' | '90d' | 'last_month'

/** Indicadores fixos, calculados no `/home/stats` e `/home/snapshot`. */
export type KpiIdFixo =
  | 'total_conversations' | 'active_conversations' | 'queued'
  | 'resolved' | 'abandoned' | 'resolution_rate' | 'abandon_rate'
  | 'first_response_time' | 'human_first_response' | 'avg_resolution_time' | 'sla_compliance'
  // Auditoria do Dashboard (12/11): 1ª resposta só da IA e os alertas de verificação vencidos.
  | 'ai_first_response' | 'expired_review_alerts'
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
  // ── Clínica (agentes de WhatsApp: agendar/cancelar/confirmar consulta) ──────
  | 'appointments_scheduled' | 'appointments_cancelled' | 'appointments_confirmed'

/**
 * SCRUM-1465: além dos fixos, as métricas do negócio publicadas para o cliente
 * (`/home/metrics`) — a chave vem do servidor. As da clínica reaproveitam os
 * ids dos cards fixos (`appointments_*`) e os substituem quando publicadas.
 */
export type KpiId = KpiIdFixo | (string & {})

export type KpiUnit = 'count' | 'percent' | 'seconds' | 'csat_score' | 'nps_score' | 'currency'

export type KpiCategoriaFixa = 'Atendimento' | 'Velocidade' | 'Qualidade' | 'Volume' | 'Bot' | 'Equipe' | 'Disparos' | 'Marketing' | 'Clínica'
/** SCRUM-1465: a métrica do negócio traz o próprio grupo (ex.: "Do seu negócio"). */
export type KpiCategoria = KpiCategoriaFixa | (string & {})

/** SCRUM-1465: o que só a métrica do negócio tem — estado, partes e a explicação. */
export interface DadosDoNegocio {
  /** `carregando` só existe na tela: o catálogo chegou e os valores ainda não. */
  estado: 'ok' | 'sem_dado' | 'base_pequena' | 'periodo_curto' | 'erro' | 'tempo_esgotado' | 'carregando'
  partes: Record<string, number>
  /** `valor` na mesma unidade do cartão (moeda já em reais). */
  quebra: Array<{ chave: string | null; rotulo: string; valor: number | null; partes: Record<string, number> }>
  /** "Como calculamos", em português, sem LLM. */
  explicacao: string
  selos: Array<'estimado' | 'pela_ia'>
  /** Métrica de estado ("agora"), não do período (A17). */
  deEstado: boolean
  /** Na conversão: as datas da coorte que o número cobre (A6). */
  janela: { inicio: string; fim: string } | null
  /** ISO do primeiro dado que a métrica usa; `null` = nenhum ainda. */
  desde: string | null
  versao: number
  publicadaEm: string | null
}

export interface KpiDefinition {
  id: KpiId
  label: string
  category: KpiCategoria
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
  /** SCRUM-1465: presente só nas métricas do negócio (vindas do servidor). */
  negocio?: DadosDoNegocio
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

/** Auditoria do Dashboard (12/11): como terminaram os atendimentos (sessões) do período. */
export interface DesfechoDosAtendimentos {
  resolvedByAiOnly: number
  resolvedWithTeam: number
  archived: number
  open: number
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
  /** Auditoria do Dashboard (12/11): o desfecho dos atendimentos do período; `null` = sem o dado. */
  desfecho?: DesfechoDosAtendimentos | null
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
  // Auditoria do Dashboard (12/11): os indicadores "agora" (conversas ativas, em fila, pessoas
  // online) saíram dos Relatórios — o lugar deles é a aba Agora. Faixas salvas com esses ids
  // simplesmente não os mostram mais (loadSlots).
  { id: 'total_conversations',  label: 'Atendimentos',             category: 'Atendimento', unit: 'count',      trendIsGood: 'up',
    help: 'Cada vez que um paciente procura a clínica: começa na mensagem dele e termina na resolução ou depois de 24 h sem mensagens. Lembretes e disparos que o paciente não respondeu não contam. É o mesmo número do painel do gestor.' },
  { id: 'resolved',             label: 'Resolvidas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'up',
    help: 'Conversas marcadas como resolvidas no período, pela IA ou pela equipe, uma vez por conversa — inclusive as que foram resolvidas e reabertas depois.' },
  { id: 'abandoned',            label: 'Arquivadas',               category: 'Atendimento', unit: 'count',      trendIsGood: 'down',
    help: 'Conversas arquivadas no período — encerradas pela IA ou por uma pessoa porque o cliente parou de responder. Não mede cliente que desistiu de esperar.' },
  { id: 'resolution_rate',      label: 'Taxa de resolução',        category: 'Atendimento', unit: 'percent',    trendIsGood: 'up',
    help: 'Dos atendimentos que começaram no período, quantos terminaram resolvidos (pela IA ou com a equipe). A base é a mesma do cartão Atendimentos.' },
  { id: 'abandon_rate',         label: 'Taxa de arquivamento',     category: 'Atendimento', unit: 'percent',    trendIsGood: 'down',
    help: 'Dos atendimentos iniciados no período, quantos foram arquivados.' },
  { id: 'ai_first_response',    label: '1ª resposta da IA',        category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre a mensagem do paciente e a primeira resposta da IA. Respostas de pessoas, mensagens automáticas por regra e campanhas não contam.' },
  { id: 'first_response_time',  label: 'Tempo de resposta (IA ou pessoa)', category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre o cliente começar a falar e a primeira resposta da IA ou de uma pessoa. Resposta automática por regra e campanha não contam; quem ficou sem resposta aparece à parte.' },
  { id: 'human_first_response', label: '1ª resposta da equipe',    category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre a IA passar o atendimento para a equipe e a primeira mensagem de uma pessoa (ou do início, se a pessoa assumiu antes). O tempo em que a IA atendia não entra. A média aparece na linha de baixo.' },
  { id: 'avg_resolution_time',  label: 'Tempo de resolução',       category: 'Velocidade',  unit: 'seconds',    trendIsGood: 'down',
    help: 'Mediana do tempo entre o início do atendimento e a resolução, nas conversas resolvidas no período. A média aparece na linha de baixo e sobe com poucos casos muito longos.' },
  { id: 'recontact_rate',       label: 'Reabertas depois de resolvidas', category: 'Atendimento', unit: 'percent', trendIsGood: 'down',
    help: 'Conversas em que o paciente voltou a escrever depois de a conversa ser resolvida, sobre as resolvidas mais as reabertas. Mostra se a resolução resolveu de fato. Lembretes e reaberturas automáticas não contam.' },
  { id: 'msgs_received',        label: 'Msgs recebidas',           category: 'Volume',      unit: 'count',      trendIsGood: 'neutral',
    help: 'Mensagens que os clientes mandaram no período.' },
  { id: 'msgs_sent',            label: 'Msgs enviadas',            category: 'Volume',      unit: 'count',      trendIsGood: 'neutral',
    help: 'Mensagens que saíram no período (sem as que falharam): de pessoas, da IA, de respostas automáticas e de campanhas.' },
  { id: 'new_contacts',         label: 'Novos contatos',           category: 'Volume',      unit: 'count',      trendIsGood: 'up',
    help: 'Contatos criados no período, mesmo os que ainda não conversaram (importados ou de campanha).' },
  { id: 'bot_deflection',       label: 'Resolução pela IA',        category: 'Bot',         unit: 'percent',    trendIsGood: 'up',
    help: 'Das conversas resolvidas no período, quantas a IA resolveu sozinha: nenhuma pessoa escreveu e o paciente não voltou pedindo ajuda em 24 h. Se o paciente volta, a resolução é descontada.' },
  { id: 'bot_resolved',         label: 'Resolvidas pela IA',       category: 'Bot',         unit: 'count',      trendIsGood: 'up',
    help: 'Conversas resolvidas no período em que a IA respondeu, nenhuma pessoa escreveu e o paciente não voltou pedindo ajuda em 24 h.' },
  { id: 'expired_review_alerts', label: 'Alertas não verificados', category: 'Bot',         unit: 'count',      trendIsGood: 'down',
    help: 'Vezes em que a IA disse ao paciente ter feito algo que o sistema não confirmou e ninguém da equipe tratou em 7 dias (sem resposta, sem resolver e sem marcar como verificada). Os casos recentes estão na aba Agora.' },
  // ── Campanhas (Meta WhatsApp Business API) ──────────────────────────────────
  { id: 'campaign_sent',          label: 'Disparos enviados',         category: 'Disparos',   unit: 'count',      trendIsGood: 'up',
    help: 'Mensagens de campanha que saíram no período, contando as que a Meta recusou (mesma regra do relatório da campanha). Inclui campanhas interrompidas.' },
  { id: 'campaign_delivery_rate', label: 'Taxa de entrega',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos enviados no período, quantos chegaram ao celular (entregue, lida ou respondida).' },
  { id: 'campaign_read_rate',     label: 'Taxa de leitura',           category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos entregues, quantos foram lidos (quem desligou a confirmação de leitura não aparece).' },
  { id: 'campaign_reply_rate',    label: 'Taxa de resposta',          category: 'Disparos',   unit: 'percent',    trendIsGood: 'up',
    help: 'Dos disparos entregues, quantos tiveram resposta do cliente.' },
  // ── Clínica (agentes de WhatsApp: agendar/cancelar/confirmar consulta) ──────
  { id: 'appointments_scheduled', label: 'Agendamentos marcados',     category: 'Clínica',    unit: 'count',      trendIsGood: 'up',
    help: 'Consultas que a IA gravou na agenda pelo WhatsApp no período. Não conta as marcadas pela equipe, por telefone ou no balcão — onde a equipe marca a maioria, este número é só uma parte.' },
  { id: 'appointments_cancelled', label: 'Cancelamentos',             category: 'Clínica',    unit: 'count',      trendIsGood: 'down',
    help: 'Consultas que a IA cancelou na agenda a pedido do paciente, no período.' },
  // SCRUM-1456: só conta quando a IA confirmou de fato — "já estava confirmada" não entra.
  { id: 'appointments_confirmed', label: 'Confirmações',              category: 'Clínica',    unit: 'count',      trendIsGood: 'up',
    help: 'Consultas confirmadas na agenda pelo WhatsApp no período. A maioria vem do botão "Sim, irei comparecer" do lembrete de 24 h.' },
]

// R2-DASH-07: a faixa do mock 1b tem 5 KPIs — o padrão acompanha (o usuário
// escolhe mais no "Personalizar"; cada 5 viram uma nova linha da mesma faixa).
// Auditoria do Dashboard (12/11): o padrão é o da prévia aprovada — Atendimento, Velocidade e IA.
export const DEFAULT_KPI_SLOTS: KpiIdFixo[] = [
  'total_conversations',
  'resolved',
  'resolution_rate',
  'recontact_rate',
  'ai_first_response',
  'human_first_response',
  'avg_resolution_time',
  'new_contacts',
  'bot_deflection',
  'expired_review_alerts',
]

/**
 * Auditoria do Dashboard (12/11): a faixa salva antes da auditoria. O "Tempo de resposta"
 * misturado dá lugar à 1ª resposta da IA, e entram uma vez (depois fica a escolha da pessoa)
 * os indicadores novos que explicam os números: reabertas e alertas não verificados.
 */
export const KPI_TROCADOS: Readonly<Record<string, KpiIdFixo>> = { first_response_time: 'ai_first_response' }
export const KPI_NOVOS_DA_AUDITORIA: Array<{ id: KpiIdFixo; depoisDe: KpiIdFixo }> = [
  { id: 'recontact_rate', depoisDe: 'resolution_rate' },
  { id: 'expired_review_alerts', depoisDe: 'bot_deflection' },
]

export function migrarFaixaDaAuditoria(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    const novo = KPI_TROCADOS[id] ?? id
    if (!out.includes(novo)) out.push(novo)
  }
  for (const { id, depoisDe } of KPI_NOVOS_DA_AUDITORIA) {
    if (out.includes(id)) continue
    // Só entra ao lado do indicador vizinho que a pessoa já escolheu (quem tirou a taxa de
    // resolução da faixa não ganha "Reabertas" do nada).
    const i = out.indexOf(depoisDe)
    if (i >= 0) out.splice(i + 1, 0, id)
  }
  return out
}

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
