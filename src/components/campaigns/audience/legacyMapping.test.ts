import { describe, it, expect } from 'vitest'
import { toLegacySegment } from './legacyMapping'
import { createCondition, createGroup, type AudienceDefinition } from './segmentBuilder'

function def(groups: AudienceDefinition['groups'], exclude: AudienceDefinition['exclude'] = {}): AudienceDefinition {
  return { groups, exclude }
}

describe('toLegacySegment — campos com equivalente direto', () => {
  it('traduz os filtros que o motor antigo já conhece', () => {
    const { segment, unsupported } = toLegacySegment(
      def([
        createGroup([
          createCondition('tags', 'includes_any', ['t1', 't2']),
          createCondition('stage', 'in', ['negociacao', 'proposta']),
          createCondition('source', 'in', ['whatsapp']),
          createCondition('intent', 'in', ['high']),
          createCondition('sentiment', 'in', ['positive']),
          createCondition('search', 'contains', 'Marina'),
          createCondition('hasConversations', 'eq', true),
        ]),
      ]),
    )

    expect(segment).toEqual({
      type: 'filter',
      filterTagIds: ['t1', 't2'],
      filterStages: ['negociacao', 'proposta'],
      filterSource: ['whatsapp'],
      filterIntent: ['high'],
      filterSentiment: ['positive'],
      filterContactSearch: 'Marina',
      filterHasConversations: true,
    })
    expect(unsupported).toEqual([])
  })

  it('trata `eq` escalar como lista de um', () => {
    const { segment } = toLegacySegment(def([createGroup([createCondition('stage', 'eq', 'negociacao')])]))
    expect(segment.filterStages).toEqual(['negociacao'])
  })

  it('omite critério ainda não preenchido em vez de filtrar por lista vazia', () => {
    const { segment, unsupported } = toLegacySegment(
      def([createGroup([createCondition('tags', 'includes_any', []), createCondition('search', 'contains', '  ')])]),
    )
    expect(segment).toEqual({ type: 'filter' })
    expect(unsupported).toEqual([])
  })
})

describe('toLegacySegment — o que o motor antigo não representa', () => {
  it('marca operadores sem equivalente como não suportados', () => {
    const semEquivalente = [
      createCondition('tags', 'includes_all', ['t1']),
      createCondition('tags', 'excludes', ['t1']),
      createCondition('stage', 'not_in', ['perdido']),
      createCondition('lastActivityAt', 'within_days', 30),
      createCondition('custom:cidade', 'eq', 'São Paulo'),
    ]
    const { segment, unsupported } = toLegacySegment(def([createGroup(semEquivalente)]))
    expect(unsupported).toEqual(semEquivalente.map((c) => c.id))
    expect(segment).toEqual({ type: 'filter' })
  })

  it('descarta grupos além do primeiro — não existe OU entre grupos na API antiga', () => {
    const segundo = createGroup([createCondition('source', 'in', ['instagram'])])
    const { segment, unsupported } = toLegacySegment(
      def([createGroup([createCondition('tags', 'includes_any', ['t1'])]), segundo]),
    )
    expect(segment.filterTagIds).toEqual(['t1'])
    expect(segment.filterSource).toBeUndefined()
    expect(unsupported).toEqual([segundo.conditions[0].id])
  })

  it('ignora grupos vazios ao escolher o primeiro grupo traduzível', () => {
    const { segment } = toLegacySegment(
      def([createGroup([]), createGroup([createCondition('stage', 'in', ['ativo'])])]),
    )
    expect(segment.filterStages).toEqual(['ativo'])
  })
})

describe('toLegacySegment — opt-out imposto', () => {
  it('vira `filterOptIn: true` quando a exclusão de opt-out está ligada', () => {
    const { segment } = toLegacySegment(def([createGroup([])], { optOut: true }))
    expect(segment.filterOptIn).toBe(true)
  })

  it('sobrepõe uma condição de opt-in montada no grupo — exclusão ganha de inclusão', () => {
    const { segment } = toLegacySegment(
      def([createGroup([createCondition('optIn', 'eq', false)])], { optOut: true }),
    )
    expect(segment.filterOptIn).toBe(true)
  })

  it('respeita a condição do usuário quando não há exclusão de opt-out', () => {
    const { segment } = toLegacySegment(def([createGroup([createCondition('optIn', 'eq', false)])]))
    expect(segment.filterOptIn).toBe(false)
  })

  it('não tenta representar os motivos que dependem de BE.1/BE.3', () => {
    const { segment } = toLegacySegment(
      def([createGroup([])], { campaignedWithinDays: 7, activeAiConversation: true }),
    )
    expect(segment).toEqual({ type: 'filter' })
  })
})
