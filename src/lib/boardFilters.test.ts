import { describe, it, expect } from 'vitest'
import { matchesOwner, matchesCloseDate, boardSummary } from './boardFilters'

const NOW = new Date(2026, 8, 21, 15, 0, 0) // 21/09/2026

describe('matchesOwner', () => {
  it('all deixa passar tudo; none só sem dono; id só o dono', () => {
    expect(matchesOwner({ ownerUserId: 'u1' }, 'all')).toBe(true)
    expect(matchesOwner({ ownerUserId: null }, 'none')).toBe(true)
    expect(matchesOwner({ ownerUserId: 'u1' }, 'none')).toBe(false)
    expect(matchesOwner({ ownerUserId: 'u1' }, 'u1')).toBe(true)
    expect(matchesOwner({ ownerUserId: 'u2' }, 'u1')).toBe(false)
  })
})

describe('matchesCloseDate', () => {
  const at = (iso: string | null, status: 'open' | 'won' | 'lost' = 'open') =>
    ({ expectedCloseAt: iso, status }) as Parameters<typeof matchesCloseDate>[0]

  it('vencido: só aberto com previsão anterior a hoje', () => {
    expect(matchesCloseDate(at('2026-09-10T12:00:00'), 'overdue', NOW)).toBe(true)
    expect(matchesCloseDate(at('2026-09-10T12:00:00', 'won'), 'overdue', NOW)).toBe(false)
    expect(matchesCloseDate(at('2026-09-21T18:00:00'), 'overdue', NOW)).toBe(false)
  })
  it('próximos 7 dias inclui hoje e exclui o oitavo dia', () => {
    expect(matchesCloseDate(at('2026-09-21T18:00:00'), 'week', NOW)).toBe(true)
    expect(matchesCloseDate(at('2026-09-27T18:00:00'), 'week', NOW)).toBe(true)
    expect(matchesCloseDate(at('2026-09-28T18:00:00'), 'week', NOW)).toBe(false)
  })
  it('este mês e sem previsão', () => {
    expect(matchesCloseDate(at('2026-09-30T12:00:00'), 'month', NOW)).toBe(true)
    expect(matchesCloseDate(at('2026-10-01T12:00:00'), 'month', NOW)).toBe(false)
    expect(matchesCloseDate(at(null), 'none', NOW)).toBe(true)
    expect(matchesCloseDate(at(null), 'week', NOW)).toBe(false)
    expect(matchesCloseDate(at('2026-09-30T12:00:00'), 'none', NOW)).toBe(false)
  })
})

describe('boardSummary', () => {
  it('soma aberto e ganhos do mês corrente', () => {
    const s = boardSummary(
      [
        { status: 'open', amountCents: 1000, closedAt: null },
        { status: 'open', amountCents: 500, closedAt: null },
        { status: 'won', amountCents: 2000, closedAt: '2026-09-02T10:00:00' },
        { status: 'won', amountCents: 9000, closedAt: '2026-08-30T10:00:00' },
        { status: 'lost', amountCents: 7000, closedAt: '2026-09-03T10:00:00' },
      ] as Parameters<typeof boardSummary>[0],
      NOW,
    )
    expect(s).toEqual({ total: 5, openCents: 1500, wonMonthCents: 2000 })
  })
})
