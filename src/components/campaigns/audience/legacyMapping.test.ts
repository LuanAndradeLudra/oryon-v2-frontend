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

  it('marca como não suportada a condição de opt-in que o imposto INVERTE', () => {
    // Campanha de re-permissão: "quem NÃO deu opt-in". O motor novo devolveria
    // perto de zero; o legado, com `filterOptIn: true`, devolve todo mundo que
    // DEU opt-in — o público oposto, e o maior possível. Como o passo seguinte
    // é disparar, a linha não pode aparecer como honrada.
    const condicao = createCondition('optIn', 'eq', false)
    const { segment, unsupported } = toLegacySegment(def([createGroup([condicao])], { optOut: true }))

    expect(unsupported).toContain(condicao.id)
    expect(segment.filterOptIn).toBe(true)
  })

  it('não marca nada quando a condição de opt-in concorda com o imposto', () => {
    // "quem deu opt-in" + opt-out imposto dão o mesmo recorte: não há
    // contradição a sinalizar, e esmaecer a linha aqui seria ruído.
    const condicao = createCondition('optIn', 'eq', true)
    const { segment, unsupported } = toLegacySegment(def([createGroup([condicao])], { optOut: true }))

    expect(unsupported).toEqual([])
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
