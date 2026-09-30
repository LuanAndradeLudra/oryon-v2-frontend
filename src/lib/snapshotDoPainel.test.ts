import { describe, it, expect } from 'vitest'
import { montarSnapshot } from './snapshotDoPainel'
import { KPI_CATALOG } from '@/types/dashboard'
import { formatKpiValue } from '@/components/dashboard/utils'
import type { HomeStats } from '@/types'

const valor = (snap: ReturnType<typeof montarSnapshot>, id: string) => snap.kpis.find((k) => k.id === id)?.value

describe('Dashboard onda 1 — montarSnapshot', () => {
  it('K1: lê os campos que o backend já calcula (antes iam como 0 fixo)', () => {
    const stats = {
      totalConversations: 40, conversationsOpenInRange: 7, queueCountInRange: 3, conversationsResolvedToday: 20,
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
