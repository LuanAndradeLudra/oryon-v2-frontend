import { describe, it, expect } from 'vitest'
import { baldeDeHoje, lerPeriodo, periodoPorExtenso, volumeSeguePeriodo } from './periodoDoPainel'
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

  it('"Hoje" do gráfico de volume usa a data UTC (a régua dos baldes do backend)', () => {
    // 22h de Brasília do dia 27 = 01h UTC do dia 28: o balde é o do dia 28.
    expect(baldeDeHoje(new Date('2026-09-28T01:00:00Z'))).toBe('2026-09-28')
  })

  it('o volume só segue o período até 7 dias', () => {
    expect(volumeSeguePeriodo('today')).toBe(true)
    expect(volumeSeguePeriodo('7d')).toBe(true)
    expect(volumeSeguePeriodo('30d')).toBe(false)
    expect(volumeSeguePeriodo('month')).toBe(false)
  })
})

describe('montarSnapshot', () => {
  it('usa os números do backend e cai nas contagens de stats sem snapshot', () => {
    const s = { conversationsOpen: 4, queueCount: 2, conversationsResolvedToday: 3, totalConversations: 12, appointmentsScheduled: 7 } as HomeStats
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
