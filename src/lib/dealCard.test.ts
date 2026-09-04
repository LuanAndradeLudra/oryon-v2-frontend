import { describe, it, expect } from 'vitest'
import { originInfo, movedByChip, humanDuration, timeInStage, boardStats, entrySources } from './dealCard'

const NOW = new Date('2026-08-28T15:00:00Z').getTime()
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString()
const H = 3_600_000

describe('dealCard — F8 (SCRUM-870/871)', () => {
  it('originInfo: campanha com nome, demais tipos pelo rótulo base; sem originKind deriva de createdByKind', () => {
    expect(originInfo({ originKind: 'campaign', originLabel: 'Confirmação 28/08' }).label).toBe('Campanha · Confirmação 28/08')
    expect(originInfo({ originKind: 'campaign', originLabel: null }).label).toBe('Campanha')
    expect(originInfo({ originKind: 'event' }).label).toBe('Evento')
    expect(originInfo({ originKind: 'ai' }).kind).toBe('ai')
    expect(originInfo({ createdByKind: 'ai' }).kind).toBe('ai')
    expect(originInfo({ createdByKind: 'automation' }).kind).toBe('event')
    expect(originInfo({}).label).toBe('Manual')
  })

  it('movedByChip: IA para ai, auto para eventos/automação/jornada/campanha/sistema, nada para humano; fallback por createdByKind', () => {
    expect(movedByChip({ lastMovedByKind: 'ai' })).toBe('ia')
    expect(movedByChip({ lastMovedByKind: 'automation' })).toBe('auto')
    expect(movedByChip({ lastMovedByKind: 'campaign' })).toBe('auto')
    expect(movedByChip({ lastMovedByKind: 'user' })).toBeNull()
    expect(movedByChip({ createdByKind: 'ai' })).toBe('ia')
    expect(movedByChip({ createdByKind: 'user' })).toBeNull()
  })

  it('humanDuration em PT-BR', () => {
    expect(humanDuration(30_000)).toBe('agora')
    expect(humanDuration(40 * 60_000)).toBe('40 min')
    expect(humanDuration(3 * H)).toBe('3 h')
    expect(humanDuration(24 * H)).toBe('1 dia')
    expect(humanDuration(49 * H)).toBe('2 dias')
  })

  it('timeInStage: aberto conta desde stageEnteredAt (fallback updatedAt/createdAt); fechado conta desde closedAt', () => {
    expect(timeInStage({ status: 'open', stageEnteredAt: iso(3 * H) }, NOW)).toBe('3 h na etapa')
    expect(timeInStage({ status: 'open', updatedAt: iso(2 * 24 * H) }, NOW)).toBe('2 dias na etapa')
    expect(timeInStage({ status: 'open', stageEnteredAt: iso(10_000) }, NOW)).toBe('agora na etapa')
    expect(timeInStage({ status: 'won', closedAt: iso(2 * H), stageEnteredAt: iso(5 * H) }, NOW)).toBe('fechado há 2 h')
    expect(timeInStage({ status: 'open' }, NOW)).toBeNull()
  })

  it('boardStats: abertos · concluídos hoje · cancelados', () => {
    const now = new Date('2026-08-28T15:00:00')
    const today = new Date('2026-08-28T09:00:00').toISOString()
    const yesterday = new Date('2026-08-27T20:00:00').toISOString()
    const stats = boardStats([
      { status: 'open' }, { status: 'open' },
      { status: 'won', closedAt: today }, { status: 'won', closedAt: yesterday },
      { status: 'lost', closedAt: today },
    ], now)
    expect(stats).toEqual({ open: 2, wonToday: 1, lost: 1 })
  })

  it('entrySources: origens sem repetição, na ordem de aparição', () => {
    expect(entrySources([
      { originKind: 'campaign', originLabel: 'Confirmação' },
      { originKind: 'manual' },
      { originKind: 'campaign', originLabel: 'Confirmação' },
      { originKind: 'event' },
    ])).toEqual(['campanha Confirmação', 'manual', 'evento'])
  })
})
