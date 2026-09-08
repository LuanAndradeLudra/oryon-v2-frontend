// C2 (SCRUM-933) — quando o cabeçalho da conversa vira seletor de negócio.
import { describe, it, expect } from 'vitest'
import { pickIndicatorDeals, needsDealSelector, selectableDeals, linkedDeal } from './dealIndicator'
import type { Deal } from '@/types'

const d = (over: Partial<Deal>): Deal => ({
  id: 'd', contactId: 'c', title: 'Negócio', status: 'open', pipelineId: 'p', stageId: 's', amountCents: 0, ...over,
})

describe('needsDealSelector (C2)', () => {
  it('não pede seletor com um aberto por funil — o caso de todo tenant sem multiplicidade', () => {
    expect(needsDealSelector([d({ id: '1', pipelineId: 'p1' })])).toBe(false)
    expect(needsDealSelector([d({ id: '1', pipelineId: 'p1' }), d({ id: '2', pipelineId: 'p2' })])).toBe(false)
  })

  it('pede seletor com dois abertos no MESMO funil', () => {
    expect(needsDealSelector([d({ id: '1', pipelineId: 'p1' }), d({ id: '2', pipelineId: 'p1' })])).toBe(true)
  })

  it('fechados não contam — dois no mesmo funil, um deles fechado, não é ambiguidade', () => {
    expect(needsDealSelector([
      d({ id: '1', pipelineId: 'p1' }),
      d({ id: '2', pipelineId: 'p1', status: 'won' }),
    ])).toBe(false)
  })
})

describe('linkedDeal / selectableDeals (C2)', () => {
  const deals = [
    d({ id: 'b', pipelineId: 'p1', title: 'Bravo' }),
    d({ id: 'a', pipelineId: 'p1', title: 'Alfa', originConversationId: 'conv-1' }),
    d({ id: 'z', pipelineId: 'p1', title: 'Zulu', status: 'lost' }),
  ]

  it('linkedDeal acha o aberto vinculado a esta conversa', () => {
    expect(linkedDeal(deals, 'conv-1')?.id).toBe('a')
    expect(linkedDeal(deals, 'conv-outra')).toBeNull()
    expect(linkedDeal(deals, undefined)).toBeNull()
  })

  it('selectableDeals lista só abertos, com o vinculado no topo e o resto por título', () => {
    expect(selectableDeals(deals, 'conv-1').map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('sem vínculo, a ordem é estável por título — não depende da ordem do backend', () => {
    expect(selectableDeals(deals, 'conv-outra').map((x) => x.title)).toEqual(['Alfa', 'Bravo'])
  })
})

describe('pickIndicatorDeals (F10, inalterado pela C2)', () => {
  it('abertos sempre; fechado só o que nasceu nesta conversa', () => {
    const deals = [
      d({ id: '1' }),
      d({ id: '2', status: 'won', originConversationId: 'conv-1' }),
      d({ id: '3', status: 'won', originConversationId: 'outra' }),
    ]
    expect(pickIndicatorDeals(deals, 'conv-1').map((x) => x.id)).toEqual(['1', '2'])
  })
})
