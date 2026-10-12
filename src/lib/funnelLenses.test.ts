import { describe, it, expect } from 'vitest'
import { matchesLens, lensCounts, isRecentlyClosed, isFunnelLens } from './funnelLenses'

const NOW = new Date('2026-09-27T12:00:00')
const dias = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const base = { status: 'open' as const, expectedCloseAt: null, ownerUserId: null, stageEnteredAt: dias(1), updatedAt: dias(1), createdAt: dias(10) }

describe('lentes do funil', () => {
  it('reconhece só as lentes conhecidas (URL)', () => {
    expect(isFunnelLens('esfriando')).toBe(true)
    expect(isFunnelLens('qualquer')).toBe(false)
    expect(isFunnelLens(null)).toBe(false)
  })

  it('esfriando: aberto há 5 dias ou mais na etapa; fechado nunca esfria', () => {
    expect(matchesLens({ ...base, stageEnteredAt: dias(6) }, 'esfriando', null, NOW)).toBe(true)
    expect(matchesLens({ ...base, stageEnteredAt: dias(2) }, 'esfriando', null, NOW)).toBe(false)
    expect(matchesLens({ ...base, status: 'won', stageEnteredAt: dias(20) }, 'esfriando', null, NOW)).toBe(false)
  })

  it('previsão vencida: aberto com data antes de hoje; hoje ainda não venceu', () => {
    expect(matchesLens({ ...base, expectedCloseAt: dias(2) }, 'previsao-vencida', null, NOW)).toBe(true)
    expect(matchesLens({ ...base, expectedCloseAt: '2026-09-27T09:00:00' }, 'previsao-vencida', null, NOW)).toBe(false)
    expect(matchesLens({ ...base, status: 'lost', expectedCloseAt: dias(2) }, 'previsao-vencida', null, NOW)).toBe(false)
  })

  it('sem previsão só conta aberto; meus exige usuário', () => {
    expect(matchesLens(base, 'sem-previsao', null, NOW)).toBe(true)
    expect(matchesLens({ ...base, status: 'won' }, 'sem-previsao', null, NOW)).toBe(false)
    expect(matchesLens({ ...base, ownerUserId: 'u1' }, 'meus', 'u1', NOW)).toBe(true)
    expect(matchesLens({ ...base, ownerUserId: 'u1' }, 'meus', null, NOW)).toBe(false)
  })

  it('conta cada lente de uma vez', () => {
    const c = lensCounts([
      { ...base, stageEnteredAt: dias(7) },
      { ...base, expectedCloseAt: dias(1), ownerUserId: 'u1' },
      { ...base, status: 'won' },
    ], 'u1', NOW)
    expect(c).toEqual({ todos: 3, esfriando: 1, 'sem-previsao': 1, 'previsao-vencida': 1, meus: 1 })
  })

  it('fechados: só os últimos 30 dias; sem data conta como recente; aberto sempre aparece', () => {
    expect(isRecentlyClosed({ status: 'won', closedAt: dias(10) }, NOW)).toBe(true)
    expect(isRecentlyClosed({ status: 'lost', closedAt: dias(45) }, NOW)).toBe(false)
    expect(isRecentlyClosed({ status: 'won', closedAt: null }, NOW)).toBe(true)
    expect(isRecentlyClosed({ status: 'open', closedAt: null }, NOW)).toBe(true)
  })
})
