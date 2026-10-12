import { describe, it, expect } from 'vitest'
import { montarSnapshot } from './snapshotDoPainel'
import { KPI_CATALOG } from '@/types/dashboard'
import { formatKpiValue } from '@/components/dashboard/utils'
import type { HomeStats } from '@/types'

const valor = (snap: ReturnType<typeof montarSnapshot>, id: string) => snap.kpis.find((k) => k.id === id)?.value

describe('Dashboard onda 1 — montarSnapshot', () => {
  it('K1: lê os campos que o backend já calcula (antes iam como 0 fixo)', () => {
    const stats = {
      totalConversations: 40, conversationsOpen: 7, queueCount: 3, conversationsResolvedToday: 20,
      abandonedCount: 2, resolutionRate: 50, abandonRate: 5, avgResponseMinutes: 4, recontactRate: 10,
      botResolved: 6, botDeflectionRate: 30, campaignSent: 100, campaignDeliveryRate: 90, campaignReadRate: 60,
      campaignReplyRate: 12, messagesSentToday: 300, messagesReceivedToday: 280, newContactsThisWeek: 9,
      appointmentsScheduled: 4, appointmentsCancelled: 1, agentsOnline: null,
    } as unknown as HomeStats
    const snap = montarSnapshot(stats, { avgResolutionTimeTenant: 3600 })
    expect(valor(snap, 'active_conversations')).toBe(7)
    expect(valor(snap, 'queued')).toBe(3)
    expect(valor(snap, 'abandoned')).toBe(2)
    expect(valor(snap, 'abandon_rate')).toBe(5)
    expect(valor(snap, 'avg_resolution_time')).toBe(3600)
    expect(valor(snap, 'first_response_time')).toBe(240)
    expect(valor(snap, 'recontact_rate')).toBe(10)
    expect(valor(snap, 'bot_resolved')).toBe(6)
    expect(valor(snap, 'campaign_delivery_rate')).toBe(90)
  })

  it('K6-FE/regra 6: sem dado vira null → "—", nunca 0', () => {
    const snap = montarSnapshot({ agentsOnline: null, avgResponseMinutes: 0 } as unknown as HomeStats, null)
    expect(valor(snap, 'agents_online')).toBeNull()
    expect(valor(snap, 'first_response_time')).toBeNull()
    expect(valor(snap, 'avg_resolution_time')).toBeNull()
    expect(formatKpiValue(null, 'count')).toBe('—')
    expect(snap.csatChart).toEqual([])
  })

  it('K13-FE/K15 (D4): catálogo sem CSAT, NPS, SLA global, Ads, CTR, opt-out e utilização', () => {
    const ids = KPI_CATALOG.map((k) => k.id as string)
    for (const fora of ['csat', 'nps', 'sla_compliance', 'team_utilization', 'campaign_ctr', 'campaign_optout_rate', 'ads_total_spend']) {
      expect(ids).not.toContain(fora)
    }
    // Nada no catálogo sem fonte.
    expect(KPI_CATALOG.filter((k) => k.hasData === false)).toEqual([])
  })
})

describe('R4 — duração em segundos', () => {
  it('negativo ou zero vira "—"; horas e dias legíveis', () => {
    expect(formatKpiValue(-222102, 'seconds')).toBe('—')
    expect(formatKpiValue(0, 'seconds')).toBe('—')
    expect(formatKpiValue(45, 'seconds')).toBe('45s')
    expect(formatKpiValue(3 * 3600 + 600, 'seconds')).toBe('3h 10m')
    expect(formatKpiValue(222102, 'seconds')).toBe('2d 14h')
    expect(formatKpiValue(172000, 'seconds')).toBe('2d')
  })

  it('revisão 30/09: tempos pela mediana, detalhe real na linha de apoio e a base de cada taxa', () => {
    const stats = {
      totalConversations: 12, newConversations: 9, reopenedConversations: 3, cohortConversations: 10,
      conversationsResolvedToday: 8, resolutionRate: 60, abandonRate: 10,
      avgResponseMinutes: 12, medianResponseMinutes: 2, unansweredCycles: 4,
      humanFirstResponseMedianMinutes: 6, humanFirstResponseCount: 5, humanFirstResponseSlaRate: 80, slaTargetMinutes: 15,
      botResolved: 3, botDeflectionRate: 38, newContactsInPeriod: 7, newContactsThisWeek: 99,
      messagesSentToday: 30, messagesSentBy: { operator: 10, ai: 15, rule: 5, campaign: 0 },
    } as unknown as HomeStats
    const snap = montarSnapshot(stats, { avgResolutionTimeTenant: 7200, medianResolutionTimeTenant: 3600 })
    const kpi = (id: string) => snap.kpis.find((k) => k.id === id)!
    expect(kpi('total_conversations').detail).toBe('9 novos · 3 voltaram')
    expect(kpi('resolution_rate').detail).toBe('de 10 atendimentos iniciados')
    expect(kpi('first_response_time').value).toBe(120) // mediana, não a média de 12 min
    expect(kpi('first_response_time').detail).toBe('média 12m · 4 sem resposta')
    expect(kpi('human_first_response').value).toBe(360)
    expect(kpi('human_first_response').detail).toBe('80% em até 15 min · 5 atendimentos')
    expect(kpi('avg_resolution_time').value).toBe(3600)
    expect(kpi('avg_resolution_time').detail).toBe('média 2h')
    expect(kpi('bot_deflection').detail).toBe('3 de 8 resolvidas')
    expect(kpi('new_contacts').value).toBe(7) // do período, não os 7 dias fixos
    expect(kpi('msgs_sent').detail).toBe('pessoas 10 · IA 15 · automáticas 5')
    expect(kpi('abandoned').label).toBe('Arquivadas')
    expect(KPI_CATALOG.every((d) => !!d.help)).toBe(true)
  })

  it('revisão 30/09: sem resposta humana no período diz isso, em vez de um tempo inventado', () => {
    const snap = montarSnapshot({ humanFirstResponseCount: 0, humanFirstResponseMedianMinutes: null } as unknown as HomeStats, null)
    const h = snap.kpis.find((k) => k.id === 'human_first_response')!
    expect(h.value).toBeNull()
    expect(h.detail).toBe('nenhuma resposta de pessoa no período')
  })

  it('revisão de código 01/10: tempo em segundos — resposta da IA em 2 s não some; instantânea vira "<1s"', () => {
    const k = (stats: Record<string, unknown>, id: string) =>
      montarSnapshot(stats as unknown as HomeStats, null).kpis.find((x) => x.id === id)!
    const rapida = k({ medianResponseMinutes: 0, medianResponseSeconds: 2, avgResponseSeconds: 4, respondedCycles: 10 }, 'first_response_time')
    expect(rapida.value).toBe(2)
    expect(formatKpiValue(rapida.value, 'seconds')).toBe('2s')
    expect(rapida.detail).toContain('média 4s')
    const instantanea = k({ medianResponseMinutes: 0, medianResponseSeconds: 0, respondedCycles: 3 }, 'first_response_time')
    expect(formatKpiValue(instantanea.value, 'seconds')).toBe('<1s')
    // Sem nenhuma resposta: continua "—".
    expect(k({ medianResponseSeconds: null, respondedCycles: 0 }, 'first_response_time').value).toBeNull()
    // Backend antigo (só minutos) segue funcionando.
    expect(k({ medianResponseMinutes: 3 }, 'first_response_time').value).toBe(180)
  })
})

describe('DC-5/DC-6 — comparação, série diária e metas', () => {
  const kpiDe = (snap: ReturnType<typeof montarSnapshot>, id: string) => snap.kpis.find((k) => k.id === id)!

  it('variação contra o período anterior: % nas contagens e tempos, p.p. nas taxas', () => {
    const stats = {
      totalConversations: 120, conversationsResolvedToday: 30, resolutionRate: 62.5, medianResponseSeconds: 90, respondedCycles: 5,
      conversationsOpen: 9, messagesReceivedToday: 10,
      previousPeriod: { values: {
        totalConversations: 100, conversationsResolvedToday: 0, resolutionRate: 60, medianResponseSeconds: 120, respondedCycles: 4,
        conversationsOpen: 3, messagesReceivedToday: null,
      } },
    } as unknown as HomeStats
    const snap = montarSnapshot(stats, { medianResolutionTimeTenant: 3000, avgResolutionTimeTenant: 3600, previousPeriod: { values: { medianResolutionTimeTenant: 6000, avgResolutionTimeTenant: 7000 } } })
    expect(kpiDe(snap, 'total_conversations')).toMatchObject({ trend: 20, trendUnit: '%' })
    expect(kpiDe(snap, 'resolution_rate')).toMatchObject({ trend: 2.5, trendUnit: 'pp' })
    expect(kpiDe(snap, 'first_response_time')).toMatchObject({ trend: -25, trendUnit: '%' })
    expect(kpiDe(snap, 'avg_resolution_time')).toMatchObject({ trend: -50, trendUnit: '%' })
    // Base zero: sem % honesto. Sem dado no anterior: sem variação.
    expect(kpiDe(snap, 'resolved').trend).toBeNull()
    expect(kpiDe(snap, 'msgs_received').trend).toBeNull()
    // "Agora" não compara com período nenhum.
    expect(kpiDe(snap, 'active_conversations').trend).toBeNull()
  })

  it('sem `previousPeriod` (backend antigo ou sem compare): nenhuma variação', () => {
    const snap = montarSnapshot({ totalConversations: 5 } as unknown as HomeStats, null)
    expect(snap.kpis.every((k) => k.trend === null)).toBe(true)
  })

  it('tempo de resolução sem o anterior do outro endpoint: sem variação', () => {
    const stats = { previousPeriod: { values: {} } } as unknown as HomeStats
    const snap = montarSnapshot(stats, { medianResolutionTimeTenant: 3000, avgResolutionTimeTenant: 3600 })
    expect(kpiDe(snap, 'avg_resolution_time').trend).toBeNull()
  })

  it('série diária vira a linha das contagens; 1 dia só ou buraco (null) não desenha', () => {
    const dia = (date: string, a: number, d: number | null) => ({ date, atendimentos: a, resolvidas: 1, recebidas: 2, enviadas: 3, contatos: 0, disparos: d })
    const snap = montarSnapshot({} as HomeStats, { dailySeries: [dia('2026-09-29', 4, null), dia('2026-09-30', 6, null), dia('2026-10-01', 2, null)] })
    expect(kpiDe(snap, 'total_conversations').sparkline).toEqual([4, 6, 2])
    expect(kpiDe(snap, 'msgs_sent').sparkline).toEqual([3, 3, 3])
    expect(kpiDe(snap, 'campaign_sent').sparkline).toEqual([])
    expect(kpiDe(snap, 'resolution_rate').sparkline).toEqual([])
    const umDia = montarSnapshot({} as HomeStats, { dailySeries: [dia('2026-10-01', 4, 1)] })
    expect(kpiDe(umDia, 'total_conversations').sparkline).toEqual([])
  })

  it('metas da empresa viram o alvo do cartão, na unidade do valor; 1ª humana cai no SLA', () => {
    const stats = {
      slaTargetMinutes: 15,
      goals: { tempoRespostaMin: 2, tempoResolucaoHoras: 4, taxaResolucao: 70, taxaRecontatoMax: 10, taxaEntrega: 95 },
    } as unknown as HomeStats
    const snap = montarSnapshot(stats, null)
    expect(kpiDe(snap, 'first_response_time').meta).toEqual({ alvo: 120, sentido: 'menor' })
    expect(kpiDe(snap, 'avg_resolution_time').meta).toEqual({ alvo: 14400, sentido: 'menor' })
    expect(kpiDe(snap, 'resolution_rate').meta).toEqual({ alvo: 70, sentido: 'maior' })
    expect(kpiDe(snap, 'recontact_rate').meta).toEqual({ alvo: 10, sentido: 'menor' })
    expect(kpiDe(snap, 'campaign_delivery_rate').meta).toEqual({ alvo: 95, sentido: 'maior' })
    expect(kpiDe(snap, 'human_first_response').meta).toEqual({ alvo: 900, sentido: 'menor' })
    expect(kpiDe(snap, 'bot_deflection').meta).toBeNull()
  })
})
