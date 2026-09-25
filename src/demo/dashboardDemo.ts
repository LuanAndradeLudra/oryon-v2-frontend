/**
 * O DASHBOARD da demonstração — dados FICTÍCIOS da Vértice Software, coerentes
 * com a história (a Ana, o funil Vendas, as etiquetas, a campanha de setembro).
 *
 * Só alimenta o que o Dashboard real lê de verdade: `/home/stats`,
 * `/home/snapshot`, `/activity-feed` e o overview do funil. Os indicadores que
 * o próprio produto ainda fixa em zero (CSAT, SLA, abandono…) ficam fora do
 * recorte da landing — não inventamos números para eles.
 *
 * Os números são de uma operação pequena e plausível; não são alegações de
 * resultado (a página diz que os dados são fictícios).
 */
import type { HomeStats, Deal } from '@/types'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import {
  HERO_PIPELINE, HERO_PIPELINE_STAGES, HERO_TAGS, HERO_USER, heroConversations, heroDealsByStage, reached,
} from '@/components/landing/stage/hero/heroRealData'
import type { HeroState } from '@/components/landing/stage/hero/heroStory'
import { hoursAgo, minutesAgo } from '@/components/landing/stage/hero/heroClock'

/** Os números de hoje. Mudam com a história: a Ana assume e fecha a venda.
 *  Abertas e na fila são CONTADAS da mesma lista de Conversas da história —
 *  o Dashboard não pode dizer 14 ativas enquanto Conversas mostra 6. */
export function heroHomeStats(at: HeroState): HomeStats {
  const fechou = reached(at, 'ganho')
  const lista = heroConversations(at)
  const naFila = lista.filter((c) => c.status === 'pending').length
  return {
    conversationsOpen: lista.filter((c) => c.status === 'open').length,
    conversationsResolvedToday: fechou ? 38 : 37,
    messagesSentToday: 412,
    messagesReceivedToday: 388,
    newContactsThisWeek: 64,
    agentsOnline: 4,
    agentsActive: 5,
    agentsPending: 0,
    avgResponseMinutes: 1,
    queueCount: naFila,
    planUsed: 0,
    planLimit: 0,
    myConversationsOpen: 5,
    myConversationsResolvedToday: fechou ? 9 : 8,
    myAvgResponseMinutes: 2,
    myMessagesSentToday: 96,
    totalConversations: 51 + naFila,
    unassignedCount: naFila,
  } as HomeStats
}

const EQUIPE = [
  { userId: HERO_USER.id, name: `${HERO_USER.firstName} ${HERO_USER.lastName ?? ''}`.trim(), conversations: 11, resolved: 8, online: true },
  { userId: 'demo-user-2', name: 'Bruno Lima', conversations: 9, resolved: 7, online: true },
  { userId: 'demo-user-3', name: 'Carla Mendes', conversations: 7, resolved: 6, online: true },
  { userId: 'demo-user-4', name: 'Diego Souza', conversations: 4, resolved: 3, online: false },
]

/** Volume diário dos últimos 7 dias (entrada × saída) — o máximo que o
 *  endpoint real devolve e que o gráfico espera. */
function volume() {
  const base = [44, 38, 85, 93, 88, 79, 97]
  return base.map((v, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (base.length - 1 - i))
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` // data LOCAL, como o filtro "Hoje"
    return { date, inbound: v, outbound: Math.round(v * 1.08) }
  })
}

export function heroHomeSnapshot(at: HeroState) {
  const s = heroHomeStats(at)
  return {
    statusDistribution: { open: s.conversationsOpen, pending: s.queueCount, resolved: s.conversationsResolvedToday, abandoned: 0 },
    tagVolumes: HERO_TAGS.map((t, i) => ({ tagId: t.id, tagName: t.name, color: t.color, count: [18, 11, 7, 5][i] ?? 3 })),
    agentMetrics: EQUIPE.map((m) => ({
      userId: m.userId, name: m.name, role: 'agent', departmentName: 'Comercial', isOnline: m.online,
      conversationsToday: m.conversations + (m.userId === HERO_USER.id && reached(at, 'humano') ? 1 : 0),
      resolvedToday: m.resolved + (m.userId === HERO_USER.id && reached(at, 'ganho') ? 1 : 0),
      avgResponseTime: 90, avgResolutionTime: 0, csat: 0, slaCompliance: 0, utilization: 0,
    })),
    volumeChart: volume(),
    heatmap: [],
    csatChart: [],
  }
}

/** Linhas do feed de atividade (últimas horas), no formato de `/activity-feed`. */
export function heroActivityFeed(at: HeroState) {
  const linhas = [
    { id: 'af-1', type: 'conversation_resolved', timestamp: hoursAgo(2), actor: 'Bruno Lima', subject: 'Clínica Norte', summary: 'Bruno Lima resolveu a conversa com Clínica Norte' },
    { id: 'af-2', type: 'conversation_assigned', timestamp: hoursAgo(1), actor: 'Agente Vendas', subject: 'Móveis Aurora', summary: 'Agente Vendas atribuiu a conversa com Móveis Aurora a Carla Mendes' },
  ]
  if (reached(at, 'assumido')) linhas.push({ id: 'af-3', type: 'conversation_assigned', timestamp: minutesAgo(2), actor: 'Agente Vendas', subject: 'Marina Alves', summary: 'Agente Vendas chamou Ana Prado para a conversa com Marina Alves' })
  if (reached(at, 'ganho')) linhas.push({ id: 'af-4', type: 'conversation_resolved', timestamp: minutesAgo(0), actor: 'Ana Prado', subject: 'Marina Alves', summary: 'Ana Prado fechou o negócio com Marina Alves' })
  return linhas.reverse().map((l) => ({ ...l, metadata: { actorType: l.actor.startsWith('Agente') ? 'ai' : 'user' } }))
}

/** O overview do funil Vendas: abertos por etapa e fechados, do mesmo quadro. */
export function heroPipelineOverview(at: HeroState): PipelineOverview {
  const porEtapa = heroDealsByStage(at)
  const soma = (l: Deal[]) => l.reduce((n, d) => n + (d.amountCents ?? 0), 0)
  const stages = HERO_PIPELINE_STAGES.filter((s) => !s.isWon && !s.isLost).map((s) => {
    const l = porEtapa[s.id] ?? []
    return { stageId: s.id, stageKey: s.key, stageLabel: s.label, order: s.order, open: { count: l.length, amountCents: soma(l), weightedAmountCents: soma(l) } }
  })
  const abertos = stages.reduce((n, s) => n + s.open.count, 0)
  const ganhos = (porEtapa[HERO_PIPELINE_STAGES.find((s) => s.isWon)?.id ?? ''] ?? [])
  return {
    pipelineId: HERO_PIPELINE.id, pipelineName: HERO_PIPELINE.name, pipelineKind: 'sales',
    period: { from: null, to: null }, ownerUserId: null, stages,
    totalOpen: { count: abertos, amountCents: stages.reduce((n, s) => n + (s.open as { amountCents: number }).amountCents, 0), weightedAmountCents: 0 },
    closed: { won: { total: { count: ganhos.length, amountCents: soma(ganhos) }, byReason: [] }, lost: { total: { count: 0 }, byReason: [] } },
    conversion: [], cycle: { closedCohort: { avgDaysToClose: null, closedCount: 0 }, perStageCohort: [] }, byOwner: [],
  } as PipelineOverview
}
