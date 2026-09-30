import { describe, it, expect } from 'vitest'
import { lerPeriodo, periodoPorExtenso, volumeSeguePeriodo } from './periodoDoPainel'
import { montarSnapshot } from './snapshotDoPainel'
import type { HomeStats } from '@/types'

describe('período do Dashboard', () => {
  it('lê o período da URL e cai no padrão (7 dias) quando inválido', () => {
    expect(lerPeriodo('30d')).toBe('30d')
    expect(lerPeriodo('month')).toBe('month')
    expect(lerPeriodo(null)).toBe('7d')
    expect(lerPeriodo('90d')).toBe('7d')
  })

  it('escreve o período por extenso', () => {
    expect(periodoPorExtenso('today')).toBe('hoje')
    expect(periodoPorExtenso('month')).toBe('neste mês')
  })

  it('K11: o volume segue todos os períodos (o backend manda já recortado, em dias de Brasília)', () => {
    for (const p of ['today', '7d', '30d', 'month'] as const) expect(volumeSeguePeriodo(p)).toBe(true)
  })
})

describe('montarSnapshot', () => {
  it('usa os números do backend e cai nas contagens de stats sem snapshot', () => {
    // K1: a taxa vem do backend (resolutionRate), o front não recalcula.
    const s = { conversationsOpen: 4, queueCount: 2, conversationsResolvedToday: 3, totalConversations: 12, resolutionRate: 25, appointmentsScheduled: 7 } as unknown as HomeStats
    const snap = montarSnapshot(s, null)
    const kpi = (id: string) => snap.kpis.find((k) => k.id === id)?.value
    expect(kpi('active_conversations')).toBe(4)
    expect(kpi('resolved')).toBe(3)
    expect(kpi('resolution_rate')).toBe(25)
    expect(kpi('appointments_scheduled')).toBe(7)
    expect(snap.statusDistribution).toEqual({ open: 4, pending: 2, resolved: 3, abandoned: 0 })
    expect(snap.volumeChart).toEqual([])
  })
})
