import { buildEmptySnapshot, type DashboardSnapshot, type KpiMetric } from '@/types/dashboard'
import type { HomeStats } from '@/types'

/**
 * Monta o snapshot da aba Relatórios a partir de `/home/stats` e
 * `/home/snapshot` (ambos já pedidos com `?range=`), sem rede — testável.
 *
 * K1 (release 2026-09-29): lê TODOS os campos que o backend já calcula (antes
 * vários iam como 0 fixo). Campo ausente ou `null` vira `null` → "—" na tela,
 * nunca um zero que parece dado real (regra 6). O PR #193 do dev externo foi
 * a especificação do mapeamento (D2).
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
  avgResolutionTimeTenant?: number | null
} | null

/** Número do backend ou `null` (ausente, nulo, NaN). */
function n(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function montarSnapshot(s: HomeStats, db: SnapshotCru): DashboardSnapshot {
  const snap = buildEmptySnapshot()
  const x = s as HomeStats & Record<string, unknown>
  const avgResp = n(x.avgResponseMinutes)

  const realKpis: Record<string, number | null> = {
    'total_conversations':    n(x.totalConversations),
    // Estes dois são "agora" (a faixa diz), não do período.
    'active_conversations':   n(x.conversationsOpen),
    // K7: fila = pendentes sem dono.
    'queued':                 n(x.queueCount),
    'resolved':               n(x.conversationsResolvedToday),
    'abandoned':              n(x.abandonedCount),
    'resolution_rate':        n(x.resolutionRate),
    'abandon_rate':           n(x.abandonRate),
    // Sem resposta nenhuma no período, o backend manda 0: é "sem dado", não "0 s".
    'first_response_time':    avgResp !== null && avgResp > 0 ? avgResp * 60 : null,
    'avg_resolution_time':    n(db?.avgResolutionTimeTenant) || null,
    'recontact_rate':         n(x.recontactRate),
    'msgs_received':          n(x.messagesReceivedToday),
    'msgs_sent':              n(x.messagesSentToday),
    'new_contacts':           n(x.newContactsThisWeek),
    'bot_deflection':         n(x.botDeflectionRate),
    'bot_resolved':           n(x.botResolved),
    // K6-FE: sem presença no backend ainda (null) → "—".
    'agents_online':          n(x.agentsOnline),
    'campaign_sent':          n(x.campaignSent),
    'campaign_delivery_rate': n(x.campaignDeliveryRate),
    'campaign_read_rate':     n(x.campaignReadRate),
    'campaign_reply_rate':    n(x.campaignReplyRate),
    'appointments_scheduled': n(x.appointmentsScheduled),
    'appointments_cancelled': n(x.appointmentsCancelled),
  }
  snap.kpis = snap.kpis.map((kpi: KpiMetric) => ({ ...kpi, value: realKpis[kpi.id] ?? null, trend: 0 }))

  const sd = db?.statusDistribution
  snap.statusDistribution = sd
    ? { open: sd.open ?? 0, pending: sd.pending ?? 0, resolved: sd.resolved ?? 0, abandoned: sd.abandoned ?? 0 }
    : { open: s.conversationsOpen ?? 0, pending: s.queueCount ?? 0, resolved: s.conversationsResolvedToday ?? 0, abandoned: 0 }

  snap.tagVolumes = Array.isArray(db?.tagVolumes) ? db.tagVolumes : []
  snap.agentMetrics = Array.isArray(db?.agentMetrics) ? db.agentMetrics : []
  snap.realtime = {
    agentsOnline:        n(x.agentsOnline) ?? 0,
    activeConversations: s.conversationsOpen ?? 0,
    queueSize:           s.queueCount ?? 0,
    avgWaitSeconds:      (s.avgResponseMinutes ?? 0) * 60,
  }
  snap.volumeChart = Array.isArray(db?.volumeChart) ? db.volumeChart : []
  snap.heatmap     = Array.isArray(db?.heatmap)     ? db.heatmap     : []
  // D4: CSAT sai — sem pesquisa de satisfação no backend.
  snap.csatChart   = []
  snap.activityFeed = []
  snap.escopo = s.escopo
  return snap
}
