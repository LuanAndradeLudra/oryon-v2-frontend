import { describe, it, expect } from 'vitest'
import { normalizeCampaignAnalytics, formatMinutes } from './campaignAnalytics'

describe('normalizeCampaignAnalytics', () => {
  it('payload real do backend (sem campos legados) não deixa nada undefined', () => {
    const a = normalizeCampaignAnalytics({
      campaignId: 'c1',
      failures: [{ code: '131026', reason: 'Não entregável', count: 2 }],
      avgTimeToReadMinutes: 12.5,
    })!
    // o que o relatório acessava e que lançava TypeError:
    expect(a.churnBreakdown.optOut).toBe(0)
    expect(a.churnBreakdown.noInteraction).toBe(0)
    expect(a.engagementTimeline).toEqual([])
    expect(a.conversionEvents).toEqual([])
    expect(a.attributionBreakdown).toEqual([])
    // o que veio é preservado:
    expect(a.failures).toEqual([{ code: '131026', reason: 'Não entregável', count: 2 }])
    expect(a.avgTimeToReadMinutes).toBe(12.5)
  })

  it('preserva churnBreakdown parcial completando o resto com zero', () => {
    const a = normalizeCampaignAnalytics({ campaignId: 'c1', churnBreakdown: { optOut: 3 } as never })!
    expect(a.churnBreakdown).toMatchObject({ optOut: 3, blocked: 0, invalidNumber: 0 })
  })

  it('null/undefined → null (relatório segue sem analytics)', () => {
    expect(normalizeCampaignAnalytics(null)).toBeNull()
    expect(normalizeCampaignAnalytics(undefined)).toBeNull()
  })
})

describe('formatMinutes', () => {
  it('formata minutos, horas e ausência', () => {
    expect(formatMinutes(null)).toBe('—')
    expect(formatMinutes(1.5)).toBe('1,5 min')
    expect(formatMinutes(42)).toBe('42 min')
    expect(formatMinutes(190)).toBe('3 h 10 min')
    expect(formatMinutes(120)).toBe('2 h')
  })
})
