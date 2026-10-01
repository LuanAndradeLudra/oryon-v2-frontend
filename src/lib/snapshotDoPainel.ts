import { buildEmptySnapshot, type DashboardSnapshot, type KpiMetric } from '@/types/dashboard'
import type { HomeStats } from '@/types'
import { formatKpiValue } from '@/components/dashboard/utils'

/**
 * Monta o snapshot da aba Relatórios a partir de `/home/stats` e
 * `/home/snapshot` (ambos já pedidos com `?range=`), sem rede — testável.
 *
 * K1 (release 2026-09-29): lê TODOS os campos que o backend já calcula. Campo
 * ausente ou `null` vira `null` → "—" na tela, nunca um zero que parece dado
 * real (regra 6).
 *
 * Revisão das métricas (30/09): tempos pela MEDIANA (a média vai na linha de
 * apoio — uma espera de madrugada não puxa o número), quem ficou sem resposta
 * aparece, e cada taxa diz a base dela. As definições estão no `help` do
 * catálogo e no cabeçalho do `dashboard.service.ts` do backend.
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
  medianResolutionTimeTenant?: number | null
} | null

/** Número do backend ou `null` (ausente, nulo, NaN). */
function n(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Minutos do backend → segundos; 0 ou ausente = sem dado. */
function seg(min: unknown): number | null {
  const m = n(min)
  return m !== null && m > 0 ? m * 60 : null
}

/**
 * Tempo em segundos, preferindo o campo `*Seconds` (o de minutos tem 1 casa:
 * uma resposta da IA em 2 s virava 0,0 e a tela mostrava "—"). Zero com
 * resposta registrada = menos de 1 s (meio segundo → "<1s"); sem resposta = null.
 */
function tempo(segundos: unknown, minutos: unknown, houveResposta: boolean): number | null {
  const s = n(segundos)
  if (s === null) return seg(minutos)
  if (s > 0) return s
  return houveResposta ? 0.5 : null
}

const fmtSeg = (s: number | null) => formatKpiValue(s, 'seconds')
const plural = (q: number, um: string, varios: string) => `${q.toLocaleString('pt-BR')} ${q === 1 ? um : varios}`

export function montarSnapshot(s: HomeStats, db: SnapshotCru): DashboardSnapshot {
  const snap = buildEmptySnapshot()
  const x = s as HomeStats & Record<string, unknown>

  const resolvidas = n(x.conversationsResolvedToday)
  const coorte = n(x.cohortConversations)
  const semResposta = n(x.unansweredCycles) ?? 0
  const humanas = n(x.humanFirstResponseCount) ?? 0
  const sla = n(x.humanFirstResponseSlaRate)
  const enviadasPor = (x.messagesSentBy ?? null) as { operator?: number; ai?: number; rule?: number; campaign?: number } | null
  const mediaResolucao = n(db?.avgResolutionTimeTenant)

  const valores: Record<string, number | null> = {
    'total_conversations':    n(x.totalConversations),
    // Estes três são "agora" (a faixa diz), não do período.
    'active_conversations':   n(x.conversationsOpen),
    'queued':                 n(x.queueCount),
    'agents_online':          n(x.agentsOnline),
    'resolved':               resolvidas,
    'abandoned':              n(x.abandonedCount),
    'resolution_rate':        n(x.resolutionRate),
    'abandon_rate':           n(x.abandonRate),
    'first_response_time':    tempo(x.medianResponseSeconds, x.medianResponseMinutes ?? x.avgResponseMinutes, (n(x.respondedCycles) ?? 0) > 0),
    'human_first_response':   tempo(x.humanFirstResponseMedianSeconds, x.humanFirstResponseMedianMinutes, humanas > 0),
    // Mediana 0 com resolução registrada = menos de 1 s ("<1s"), não "sem dado".
    'avg_resolution_time':    tempo(db?.medianResolutionTimeTenant, null, mediaResolucao !== null) ?? mediaResolucao,
    'recontact_rate':         n(x.recontactRate),
    'msgs_received':          n(x.messagesReceivedToday),
    'msgs_sent':              n(x.messagesSentToday),
    'new_contacts':           n(x.newContactsInPeriod ?? x.newContactsThisWeek),
    'bot_deflection':         n(x.botDeflectionRate),
    'bot_resolved':           n(x.botResolved),
    'campaign_sent':          n(x.campaignSent),
    'campaign_delivery_rate': n(x.campaignDeliveryRate),
    'campaign_read_rate':     n(x.campaignReadRate),
    'campaign_reply_rate':    n(x.campaignReplyRate),
    'appointments_scheduled': n(x.appointmentsScheduled),
    'appointments_cancelled': n(x.appointmentsCancelled),
  }

  const detalhes: Record<string, string | null> = {
    'total_conversations': n(x.newConversations) !== null && n(x.reopenedConversations) !== null
      ? `${plural(n(x.newConversations)!, 'novo', 'novos')} · ${plural(n(x.reopenedConversations)!, 'voltou', 'voltaram')}`
      : null,
    'resolution_rate': coorte !== null ? `de ${plural(coorte, 'atendimento iniciado', 'atendimentos iniciados')}` : null,
    'abandon_rate': coorte !== null ? `de ${plural(coorte, 'atendimento iniciado', 'atendimentos iniciados')}` : null,
    'first_response_time': [
      tempo(x.avgResponseSeconds, x.avgResponseMinutes, (n(x.respondedCycles) ?? 0) > 0) !== null
        ? `média ${fmtSeg(tempo(x.avgResponseSeconds, x.avgResponseMinutes, true))}`
        : null,
      semResposta > 0 ? `${plural(semResposta, 'sem resposta', 'sem resposta')}` : null,
    ].filter(Boolean).join(' · ') || null,
    'human_first_response': humanas > 0
      ? `${sla !== null ? `${sla}% em até ${n(x.slaTargetMinutes) ?? 15} min · ` : ''}${plural(humanas, 'atendimento', 'atendimentos')}`
      : 'nenhuma resposta de pessoa no período',
    'avg_resolution_time': mediaResolucao ? `média ${fmtSeg(mediaResolucao)}` : null,
    'bot_deflection': resolvidas !== null && resolvidas > 0 ? `${n(x.botResolved) ?? 0} de ${resolvidas} resolvidas` : null,
    'msgs_sent': enviadasPor
      ? [
          enviadasPor.operator ? `pessoas ${enviadasPor.operator.toLocaleString('pt-BR')}` : null,
          enviadasPor.ai ? `IA ${enviadasPor.ai.toLocaleString('pt-BR')}` : null,
          enviadasPor.rule ? `automáticas ${enviadasPor.rule.toLocaleString('pt-BR')}` : null,
          enviadasPor.campaign ? `campanhas ${enviadasPor.campaign.toLocaleString('pt-BR')}` : null,
        ].filter(Boolean).join(' · ') || null
      : null,
  }

  // Metas que já existem: o SLA da 1ª resposta humana (15 min no backend).
  const metaSlaMin = n(x.slaTargetMinutes)
  const metas: Record<string, KpiMetric['meta']> = {
    'human_first_response': metaSlaMin ? { alvo: metaSlaMin * 60, sentido: 'menor' } : null,
  }

  snap.kpis = snap.kpis.map((kpi: KpiMetric) => ({
    ...kpi,
    value: valores[kpi.id] ?? null,
    detail: detalhes[kpi.id] ?? null,
    meta: metas[kpi.id] ?? null,
    trend: 0,
  }))

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
