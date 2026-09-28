import { buildEmptySnapshot, type DashboardSnapshot, type KpiMetric } from '@/types/dashboard'
import type { HomeStats } from '@/types'

/**
 * Monta o snapshot da aba Relatórios a partir de `/home/stats` e
 * `/home/snapshot` (ambos já pedidos com `?range=`). É o mesmo mapeamento que
 * morava dentro do componente, sem rede — só saiu para poder ser testado e
 * para a busca (hook) e a tela (componente) não se misturarem.
 *
 * Os valores dos KPIs NÃO mudaram aqui: o que está errado neles (R1–R3, R6,
 * R11 do SCRUM-1161) é da frente do dev externo.
 *
 * `atividade` não entra: tem janela própria (4 h) e é buscada à parte.
 */
// O snapshot cru do backend não tem tipo exportado no frontend.
type SnapshotCru = {
  statusDistribution?: { open?: number; pending?: number; resolved?: number; abandoned?: number }
  tagVolumes?: DashboardSnapshot['tagVolumes']
  agentMetrics?: DashboardSnapshot['agentMetrics']
  volumeChart?: DashboardSnapshot['volumeChart']
  heatmap?: DashboardSnapshot['heatmap']
  csatChart?: DashboardSnapshot['csatChart']
} | null

export function montarSnapshot(s: HomeStats, db: SnapshotCru): DashboardSnapshot {
  const snap = buildEmptySnapshot()

  const realKpis: Record<string, number> = {
    'total_conversations':      s.totalConversations ?? ((s.conversationsOpen ?? 0) + (s.conversationsResolvedToday ?? 0) + (s.queueCount ?? 0)),
    'active_conversations':     s.conversationsOpen ?? 0,
    'queued':                   s.queueCount ?? 0,
    'resolved':                 s.conversationsResolvedToday ?? 0,
    'abandoned':                0,
    'resolution_rate':          s.totalConversations ? Math.round(((s.conversationsResolvedToday ?? 0) / Math.max(s.totalConversations, 1)) * 100) : 0,
    'abandon_rate':             0,
    'first_response_time':      (s.avgResponseMinutes ?? 0) * 60,
    'avg_resolution_time':      0,
    'sla_compliance':           0,
    'csat':                     0,
    'nps':                      0,
    'recontact_rate':           0,
    'msgs_received':            s.messagesReceivedToday ?? 0,
    'msgs_sent':                s.messagesSentToday ?? 0,
    'new_contacts':             s.newContactsThisWeek ?? 0,
    'bot_deflection':           0,
    'bot_resolved':             0,
    'agents_online':            s.agentsOnline ?? 0,
    'team_utilization':         0,
    'campaign_sent':            0,
    'campaign_delivery_rate':   0,
    'campaign_read_rate':       0,
    'campaign_reply_rate':      0,
    'campaign_ctr':             0,
    'campaign_optout_rate':     0,
    'appointments_scheduled':   s.appointmentsScheduled ?? 0,
    'appointments_cancelled':   s.appointmentsCancelled ?? 0,
  }
  snap.kpis = snap.kpis.map((kpi: KpiMetric) => {
    const val = realKpis[kpi.id]
    return val !== undefined ? { ...kpi, value: val, trend: 0 } : { ...kpi, value: 0, trend: 0 }
  })

  const sd = db?.statusDistribution
  snap.statusDistribution = sd
    ? { open: sd.open ?? 0, pending: sd.pending ?? 0, resolved: sd.resolved ?? 0, abandoned: sd.abandoned ?? 0 }
    : { open: s.conversationsOpen ?? 0, pending: s.queueCount ?? 0, resolved: s.conversationsResolvedToday ?? 0, abandoned: 0 }

  snap.tagVolumes = Array.isArray(db?.tagVolumes) ? db.tagVolumes : []
  snap.agentMetrics = Array.isArray(db?.agentMetrics) ? db.agentMetrics : []
  snap.realtime = {
    agentsOnline:        s.agentsOnline ?? 0,
    activeConversations: s.conversationsOpen ?? 0,
    queueSize:           s.queueCount ?? 0,
    avgWaitSeconds:      (s.avgResponseMinutes ?? 0) * 60,
  }
  snap.volumeChart = Array.isArray(db?.volumeChart) ? db.volumeChart : []
  snap.heatmap     = Array.isArray(db?.heatmap)     ? db.heatmap     : []
  snap.csatChart   = Array.isArray(db?.csatChart)   ? db.csatChart   : []
  snap.activityFeed = []
  return snap
}
