import { buildEmptySnapshot, type DashboardSnapshot, type KpiMetric } from '@/types/dashboard'
import type { HomeStats } from '@/types'
import { formatKpiValue } from '@/components/dashboard/utils'
import { metasDosIndicadores, type MetasDoPainel } from '@/lib/metasDoPainel'

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
 *
 * DC-5 (01/10): com `?compare=1`, cada indicador do período ganha a variação
 * contra o período anterior de MESMA duração (o backend recorta), e as
 * contagens ganham a série diária (`dailySeries`) para a linha de tendência.
 * DC-6: as metas da empresa (`goals`) dão o estado de cada cartão.
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
  dailySeries?: Array<Record<string, number | string | null>>
  previousPeriod?: { values?: { avgResolutionTimeTenant?: number | null; medianResolutionTimeTenant?: number | null } } | null
} | null

/** Indicadores "agora" (não seguem o período) e os sem período anterior: sem variação. */
const SEM_VARIACAO = new Set(['active_conversations', 'queued', 'agents_online', 'appointments_scheduled', 'appointments_cancelled'])

/** Coluna da série diária de cada contagem (DC-3 no backend). */
const SERIE_DO_KPI: Record<string, string> = {
  total_conversations: 'atendimentos',
  resolved:            'resolvidas',
  msgs_received:       'recebidas',
  msgs_sent:           'enviadas',
  new_contacts:        'contatos',
  campaign_sent:       'disparos',
}

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

/** Valor de cada indicador a partir dos números de um período (atual ou anterior). */
function valoresDe(x: Record<string, unknown>, resolucao: { media: number | null; mediana: number | null }): Record<string, number | null> {
  return {
    'total_conversations':    n(x.totalConversations),
    // Estes três são "agora" (a faixa diz), não do período.
    'active_conversations':   n(x.conversationsOpen),
    'queued':                 n(x.queueCount),
    'agents_online':          n(x.agentsOnline),
    'resolved':               n(x.conversationsResolvedToday),
    'abandoned':              n(x.abandonedCount),
    'resolution_rate':        n(x.resolutionRate),
    'abandon_rate':           n(x.abandonRate),
    'first_response_time':    tempo(x.medianResponseSeconds, x.medianResponseMinutes ?? x.avgResponseMinutes, (n(x.respondedCycles) ?? 0) > 0),
    'human_first_response':   tempo(x.humanFirstResponseMedianSeconds, x.humanFirstResponseMedianMinutes, (n(x.humanFirstResponseCount) ?? 0) > 0),
    // Mediana 0 com resolução registrada = menos de 1 s ("<1s"), não "sem dado".
    'avg_resolution_time':    tempo(resolucao.mediana, null, resolucao.media !== null) ?? resolucao.media,
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
}

/**
 * Variação contra o período anterior. Taxas: diferença em pontos percentuais.
 * Contagens e tempos: % — com base zero não há % honesto (0 → 5 não é
 * "+∞%"), então fica sem variação. Mudança menor que 0,05 = estável (0).
 */
export function variacao(atual: number | null, anterior: number | null, unidade: string): { trend: number | null; trendUnit?: '%' | 'pp' } {
  if (atual === null || anterior === null) return { trend: null }
  if (unidade === 'percent') {
    const pp = Math.round((atual - anterior) * 10) / 10
    return { trend: pp, trendUnit: 'pp' }
  }
  if (anterior <= 0) return { trend: null }
  const pct = Math.round(((atual - anterior) / anterior) * 1000) / 10
  return { trend: pct, trendUnit: '%' }
}

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

  const valores = valoresDe(x, { media: mediaResolucao, mediana: n(db?.medianResolutionTimeTenant) })
  const ant = (x.previousPeriod ?? null) as { values?: Record<string, unknown> } | null
  const resolucaoAnt = db?.previousPeriod?.values
  const anteriores = ant?.values
    ? valoresDe(ant.values, { media: n(resolucaoAnt?.avgResolutionTimeTenant), mediana: n(resolucaoAnt?.medianResolutionTimeTenant) })
    : null
  // O tempo de resolução vem do outro endpoint: sem o anterior dele, sem variação.
  if (anteriores && !resolucaoAnt) anteriores['avg_resolution_time'] = null
  const serie = Array.isArray(db?.dailySeries) ? db.dailySeries : []

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

  // DC-6: metas da empresa; a 1ª resposta humana cai no SLA (15 min padrão).
  const metas = metasDosIndicadores((x.goals ?? null) as MetasDoPainel | null, n(x.slaTargetMinutes))

  snap.kpis = snap.kpis.map((kpi: KpiMetric) => {
    const value = valores[kpi.id] ?? null
    const coluna = SERIE_DO_KPI[kpi.id]
    const pontos = coluna ? serie.map((d) => n(d[coluna])) : []
    return {
      ...kpi,
      value,
      detail: detalhes[kpi.id] ?? null,
      meta: metas[kpi.id] ?? null,
      ...(anteriores && !SEM_VARIACAO.has(kpi.id)
        ? variacao(value, anteriores[kpi.id] ?? null, kpi.unit)
        : { trend: null }),
      // Série só com 2+ dias e sem buraco (null = sem acesso, ex.: disparos do atendente).
      sparkline: pontos.length >= 2 && pontos.every((v) => v !== null) ? (pontos as number[]) : [],
    }
  })

  const sd = db?.statusDistribution
  snap.statusDistribution = sd
    ? { open: sd.open ?? 0, pending: sd.pending ?? 0, resolved: sd.resolved ?? 0, abandoned: sd.abandoned ?? 0 }
    // UI-FE-01: stats e snapshot têm recortes diferentes; sem o snapshot, não
    // há distribuição honesta para desenhar.
    : null

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
