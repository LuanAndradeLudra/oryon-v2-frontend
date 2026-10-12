// SCRUM-1097 (Direção A, #33) — definição dos segmentos e montagem da query.
import { describe, it, expect } from 'vitest'
import {
  CONTACT_SEGMENTS, availableSegments, getSegment, buildSegmentQuery, buildSegmentCountArgs,
  type SegmentKey,
} from './contactSegments'

describe('CONTACT_SEGMENTS', () => {
  it('declara os 5 segmentos do mockup, na ordem das abas', () => {
    expect(CONTACT_SEGMENTS.map((s) => s.key)).toEqual(['all', 'hot', 'mine', 'unanswered', 'newToday'])
    expect(CONTACT_SEGMENTS.map((s) => s.label)).toEqual(['Todos', 'Quentes', 'Meus', 'Sem resposta', 'Novos hoje'])
  })

  it('só Todos e Quentes estão disponíveis hoje', () => {
    expect(availableSegments().map((s) => s.key)).toEqual(['all', 'hot'])
  })

  it('todo segmento indisponível explica o motivo; disponível não tem motivo', () => {
    for (const s of CONTACT_SEGMENTS) {
      if (s.available) expect(s.unavailableReason).toBeUndefined()
      else {
        expect(s.unavailableReason).toBeTruthy()
        expect(s.params).toEqual({}) // nada de params "de mentira" num segmento que não funciona
      }
    }
  })

  it('getSegment devolve o segmento e lança para chave desconhecida', () => {
    expect(getSegment('hot').label).toBe('Quentes')
    expect(() => getSegment('nope' as SegmentKey)).toThrow(/desconhecido/)
  })
})

describe('buildSegmentQuery', () => {
  it('Todos: ordena por última interação, sem filtro', () => {
    expect(buildSegmentQuery('all')).toEqual({ sortBy: 'lastContactedAt', sortDir: 'desc' })
  })

  it('Quentes: intent=high ordenado por lead score desc', () => {
    expect(buildSegmentQuery('hot')).toEqual({ intent: 'high', sortBy: 'leadScore', sortDir: 'desc' })
  })

  it('preserva os filtros do usuário (busca, etapa, etiquetas, origem…)', () => {
    const base = { search: 'maria', stage: ['novo'], tagId: ['t1', 't2'], source: 'meta_ads' as const, optIn: true }
    expect(buildSegmentQuery('hot', base)).toEqual({ ...base, intent: 'high', sortBy: 'leadScore', sortDir: 'desc' })
  })

  it('o filtro do segmento manda: Quentes sobrescreve uma intenção manual diferente', () => {
    expect(buildSegmentQuery('hot', { intent: 'low' }).intent).toBe('high')
  })

  it('a ordenação escolhida pelo usuário vale sobre a do segmento — coluna e direção juntas', () => {
    const q = buildSegmentQuery('hot', { sortBy: 'displayName', sortDir: 'asc' })
    expect(q).toEqual({ intent: 'high', sortBy: 'displayName', sortDir: 'asc' })
  })

  it('sortBy do usuário sem sortDir não herda a direção do segmento', () => {
    const q = buildSegmentQuery('hot', { sortBy: 'createdAt' })
    expect(q.sortBy).toBe('createdAt')
    expect(q.sortDir).toBeUndefined()
  })

  it('não muta o objeto de entrada', () => {
    const base = { search: 'x' }
    buildSegmentQuery('all', base)
    expect(base).toEqual({ search: 'x' })
  })

  it.each(['mine', 'unanswered', 'newToday'] as const)('segmento indisponível "%s" lança, em vez de devolver a lista inteira', (key) => {
    expect(() => buildSegmentQuery(key, { search: 'x' })).toThrow(/indisponível/)
  })
})

describe('buildSegmentCountArgs', () => {
  it('pede 1 registro da página 1 com os filtros do segmento (só p/ o total da aba)', () => {
    expect(buildSegmentCountArgs('hot', { search: 'a' })).toEqual({
      filters: { search: 'a', intent: 'high', sortBy: 'leadScore', sortDir: 'desc' },
      page: 1,
      limit: 1,
    })
  })

  it('também lança para segmento indisponível', () => {
    expect(() => buildSegmentCountArgs('mine')).toThrow(/indisponível/)
  })
})
