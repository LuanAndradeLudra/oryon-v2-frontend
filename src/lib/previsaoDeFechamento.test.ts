// Revisão 02/10: previsão gravada como meia-noite UTC não pode virar o dia
// anterior no fuso do Brasil.
import { describe, it, expect } from 'vitest'
import { diaDaPrevisao, previsaoCurta } from './previsaoDeFechamento'
import { matchesCloseDate } from './boardFilters'

const PREVISTO = '2026-10-02T00:00:00.000Z'

describe('previsão de fechamento é data de calendário', () => {
  it('lê o dia gravado, em qualquer fuso', () => {
    const d = diaDaPrevisao(PREVISTO)!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 2])
    expect(previsaoCurta(PREVISTO)).toBe('02/10')
  })

  it('no próprio dia previsto não está vencido; no dia seguinte, sim', () => {
    const deal = { expectedCloseAt: PREVISTO, status: 'open' as const }
    expect(matchesCloseDate(deal as never, 'overdue', new Date(2026, 9, 2, 10))).toBe(false)
    expect(matchesCloseDate(deal as never, 'overdue', new Date(2026, 9, 3, 10))).toBe(true)
  })

  it('previsão de 01/11 não conta em "este mês" de outubro', () => {
    const deal = { expectedCloseAt: '2026-11-01T00:00:00.000Z', status: 'open' as const }
    expect(matchesCloseDate(deal as never, 'month', new Date(2026, 9, 15))).toBe(false)
  })
})
