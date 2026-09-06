import { describe, it, expect } from 'vitest'
import {
  createCondition,
  createEmptyDefinition,
  createGroup,
  fromSegmentDefinition,
  hasAnyCondition,
  isConditionFilled,
  segmentBuilderReducer as reduce,
  toEvaluateGroups,
  toSegmentDefinition,
  type AudienceDefinition,
} from './segmentBuilder'

/** Definição de partida com 2 grupos: o primeiro com 2 condições, o segundo
 *  com 1 — o suficiente para exercitar índices de `perCondition` e remoções
 *  no meio da lista. */
function fixture(): AudienceDefinition {
  return {
    groups: [
      createGroup([
        createCondition('tags', 'includes_any', ['t1']),
        createCondition('stage', 'in', ['negociacao']),
      ]),
      createGroup([createCondition('source', 'in', ['whatsapp'])]),
    ],
    exclude: { optOut: true, campaignedWithinDays: 7 },
  }
}

describe('segmentBuilderReducer — grupos', () => {
  it('add_group acrescenta um grupo com uma condição em branco', () => {
    const next = reduce(createEmptyDefinition(), { type: 'add_group' })
    expect(next.groups).toHaveLength(2)
    expect(next.groups[1].conditions).toHaveLength(1)
    expect(next.groups[1].op).toBe('and')
  })

  it('remove_group nunca deixa a definição sem nenhum grupo', () => {
    const one = createEmptyDefinition()
    const next = reduce(one, { type: 'remove_group', groupId: one.groups[0].id })
    expect(next).toBe(one)
    expect(next.groups).toHaveLength(1)
  })

  it('remove_group remove o grupo pedido quando há mais de um', () => {
    const state = fixture()
    const next = reduce(state, { type: 'remove_group', groupId: state.groups[0].id })
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].id).toBe(state.groups[1].id)
  })

  it('set_group_op só altera o grupo endereçado', () => {
    const state = fixture()
    const next = reduce(state, { type: 'set_group_op', groupId: state.groups[0].id, op: 'or' })
    expect(next.groups[0].op).toBe('or')
    expect(next.groups[1].op).toBe('and')
    expect(next.groups[1]).toBe(state.groups[1])
  })
})

describe('segmentBuilderReducer — condições', () => {
  it('add_condition acrescenta ao grupo certo, com campo e operador dados', () => {
    const state = fixture()
    const next = reduce(state, {
      type: 'add_condition',
      groupId: state.groups[1].id,
      field: 'sentiment',
      operator: 'in',
      value: ['positive'],
    })
    expect(next.groups[0].conditions).toHaveLength(2)
    expect(next.groups[1].conditions).toHaveLength(2)
    expect(next.groups[1].conditions[1]).toMatchObject({
      field: 'sentiment',
      operator: 'in',
      value: ['positive'],
    })
  })

  it('update_condition altera por id, não por posição', () => {
    const state = fixture()
    const target = state.groups[0].conditions[1]
    const next = reduce(state, {
      type: 'update_condition',
      groupId: state.groups[0].id,
      conditionId: target.id,
      patch: { value: ['proposta', 'fechamento'] },
    })
    expect(next.groups[0].conditions[1].value).toEqual(['proposta', 'fechamento'])
    expect(next.groups[0].conditions[0]).toBe(state.groups[0].conditions[0])
  })

  it('update_condition descarta a contagem parcial quando o campo muda', () => {
    const withCount = reduce(fixture(), { type: 'apply_counts', perCondition: [[10, 20], [30]] })
    const target = withCount.groups[0].conditions[0]
    expect(target.count).toBe(10)

    const next = reduce(withCount, {
      type: 'update_condition',
      groupId: withCount.groups[0].id,
      conditionId: target.id,
      patch: { field: 'intent', operator: 'in', value: ['high'] },
    })
    expect(next.groups[0].conditions[0].count).toBeUndefined()
    // A condição não tocada mantém a contagem que já tinha.
    expect(next.groups[0].conditions[1].count).toBe(20)
  })

  it('remove_condition tira só a condição pedida', () => {
    const state = fixture()
    const next = reduce(state, {
      type: 'remove_condition',
      groupId: state.groups[0].id,
      conditionId: state.groups[0].conditions[0].id,
    })
    expect(next.groups[0].conditions).toHaveLength(1)
    expect(next.groups[0].conditions[0].field).toBe('stage')
  })
})

describe('segmentBuilderReducer — exclusões', () => {
  it('set_exclude faz merge raso, não substitui o objeto', () => {
    const next = reduce(fixture(), { type: 'set_exclude', patch: { activeAiConversation: true } })
    expect(next.exclude).toEqual({ optOut: true, campaignedWithinDays: 7, activeAiConversation: true })
  })

  it('set_exclude consegue desligar um motivo sem apagar os outros', () => {
    const next = reduce(fixture(), { type: 'set_exclude', patch: { campaignedWithinDays: undefined } })
    expect(next.exclude.optOut).toBe(true)
    expect(next.exclude.campaignedWithinDays).toBeUndefined()
  })
})

describe('segmentBuilderReducer — apply_counts', () => {
  it('casa as contagens por posição de grupo e de condição', () => {
    const next = reduce(fixture(), { type: 'apply_counts', perCondition: [[1412, 618], [318]] })
    expect(next.groups[0].conditions.map((c) => c.count)).toEqual([1412, 618])
    expect(next.groups[1].conditions.map((c) => c.count)).toEqual([318])
  })

  it('ignora índices que não existem mais depois de uma remoção', () => {
    // Resposta calculada para 2 condições no primeiro grupo chegando depois
    // de o operador ter apagado uma delas: a sobrevivente não pode herdar a
    // contagem da que sumiu de forma silenciosa.
    const state = fixture()
    const shrunk = reduce(state, {
      type: 'remove_condition',
      groupId: state.groups[0].id,
      conditionId: state.groups[0].conditions[0].id,
    })
    const next = reduce(shrunk, { type: 'apply_counts', perCondition: [[1412, 618], [318]] })
    expect(next.groups[0].conditions).toHaveLength(1)
    // Posição 0 do grupo 0 agora é a condição de `stage`, e recebe 1412 —
    // é o preço de um contrato posicional. O hook evita isso descartando
    // respostas fora de data; o redutor só garante que não estoura.
    expect(next.groups[0].conditions[0].field).toBe('stage')
    expect(next.groups[0].conditions[0].count).toBe(1412)
  })

  it('não inventa contagem quando a resposta tem menos grupos que o estado', () => {
    const next = reduce(fixture(), { type: 'apply_counts', perCondition: [[1412, 618]] })
    expect(next.groups[1].conditions[0].count).toBeUndefined()
  })

  it('pula os grupos vazios, que não foram enviados, em vez de deslocar tudo', () => {
    // A resposta é posicional na ordem de `toEvaluateGroups`, que descarta
    // grupo sem condição. Um grupo vazio ANTES dos outros era o caso que
    // fazia a contagem de C pousar na primeira condição de B — número errado
    // ao lado do filtro errado, que é pior do que contagem nenhuma.
    const vazio = createGroup([])
    const b = createGroup([
      createCondition('tags', 'includes_any', ['t1']),
      createCondition('stage', 'in', ['negociacao']),
    ])
    const c = createGroup([createCondition('source', 'in', ['whatsapp'])])
    const state: AudienceDefinition = { groups: [vazio, b, c], exclude: {} }

    // Exatamente o que a API devolve para esse estado: 2 linhas, uma por
    // grupo enviado — o vazio não vai.
    const next = reduce(state, { type: 'apply_counts', perCondition: [[10, 20], [30]] })

    expect(next.groups[1].conditions.map((x) => x.count)).toEqual([10, 20])
    expect(next.groups[2].conditions.map((x) => x.count)).toEqual([30])
    expect(next.groups[1].conditions[0].count).not.toBe(30)
  })

  it('guarda null como "avaliei e ignorei", apagando a contagem anterior', () => {
    // Decisão D38: condição sem valor é ignorada pelo evaluate mas mantém a
    // posição e volta `null`. Guardar o `null` é o que faz a linha mostrar
    // travessão; manter o número velho exibiria uma contagem que não vale
    // mais, e número indistinguível de dado verdadeiro é pior que a ausência
    // declarada.
    const comNumero = reduce(fixture(), { type: 'apply_counts', perCondition: [[10, 20], [30]] })
    expect(comNumero.groups[0].conditions[0].count).toBe(10)

    const depois = reduce(comNumero, { type: 'apply_counts', perCondition: [[null, 20], [30]] })
    expect(depois.groups[0].conditions[0].count).toBeNull()
    expect(depois.groups[0].conditions[1].count).toBe(20)
  })

  it('não confunde "sem resposta ainda" com "ignorada pela API"', () => {
    // Resposta mais curta que o grupo não é `null`: é silêncio sobre aquela
    // condição, e o que havia continua valendo até a próxima avaliação.
    const comNumero = reduce(fixture(), { type: 'apply_counts', perCondition: [[10, 20], [30]] })
    const curta = reduce(comNumero, { type: 'apply_counts', perCondition: [[99], [30]] })

    expect(curta.groups[0].conditions[0].count).toBe(99)
    expect(curta.groups[0].conditions[1].count).toBe(20)
  })

  it('mantém o alinhamento com um grupo vazio no meio da lista', () => {
    const a = createGroup([createCondition('tags', 'includes_any', ['t1'])])
    const vazio = createGroup([])
    const c = createGroup([createCondition('source', 'in', ['whatsapp'])])
    const state: AudienceDefinition = { groups: [a, vazio, c], exclude: {} }

    const next = reduce(state, { type: 'apply_counts', perCondition: [[7], [99]] })

    expect(next.groups[0].conditions[0].count).toBe(7)
    expect(next.groups[1].conditions).toHaveLength(0)
    expect(next.groups[2].conditions[0].count).toBe(99)
  })
})

describe('segmentBuilderReducer — load_definition', () => {
  it('troca a definição inteira', () => {
    const outra: AudienceDefinition = { groups: [createGroup()], exclude: {} }
    expect(reduce(fixture(), { type: 'load_definition', definition: outra })).toBe(outra)
  })
})

describe('serialização para a API', () => {
  it('toEvaluateGroups descarta id e count, preservando campo/operador/valor', () => {
    const withCount = reduce(fixture(), { type: 'apply_counts', perCondition: [[10, 20], [30]] })
    expect(toEvaluateGroups(withCount)).toEqual([
      {
        op: 'and',
        conditions: [
          { field: 'tags', operator: 'includes_any', value: ['t1'] },
          { field: 'stage', operator: 'in', value: ['negociacao'] },
        ],
      },
      { op: 'and', conditions: [{ field: 'source', operator: 'in', value: ['whatsapp'] }] },
    ])
  })

  it('toEvaluateGroups omite grupos sem nenhuma condição', () => {
    const state: AudienceDefinition = {
      groups: [createGroup([createCondition('tags', 'includes_any', ['t1'])]), createGroup([])],
      exclude: {},
    }
    expect(toEvaluateGroups(state)).toHaveLength(1)
  })

  it('toSegmentDefinition leva junto as exclusões', () => {
    expect(toSegmentDefinition(fixture()).exclude).toEqual({ optOut: true, campaignedWithinDays: 7 })
  })

  it('fromSegmentDefinition mantém o opt-out conservador quando o salvo é omisso', () => {
    // Um segmento salvo que não fala de opt-out não pode render um público
    // mais permissivo do que um construtor recém-aberto, que já nasce com a
    // exclusão ligada.
    const omisso = fromSegmentDefinition({ groups: [], exclude: {} })
    expect(omisso.exclude.optOut).toBe(true)
    expect(createEmptyDefinition().exclude.optOut).toBe(true)

    // Mas um `false` explícito é uma escolha de quem salvou, e continua valendo.
    const explicito = fromSegmentDefinition({ groups: [], exclude: { optOut: false } })
    expect(explicito.exclude.optOut).toBe(false)
  })

  it('fromSegmentDefinition gera ids únicos e sobrevive a uma definição sem grupos', () => {
    const carregada = fromSegmentDefinition({
      groups: [{ op: 'or', conditions: [{ field: 'tags', operator: 'includes_any', value: ['x'] }] }],
      exclude: { optOut: true },
    })
    expect(carregada.groups[0].op).toBe('or')
    expect(carregada.groups[0].conditions[0].id).toBeTruthy()

    const vazia = fromSegmentDefinition({ groups: [], exclude: {} })
    expect(vazia.groups).toHaveLength(1)
  })

  it('ida e volta preserva o conteúdo avaliável', () => {
    const original = fixture()
    const roundTrip = fromSegmentDefinition(toSegmentDefinition(original))
    expect(toEvaluateGroups(roundTrip)).toEqual(toEvaluateGroups(original))
    expect(roundTrip.exclude).toEqual(original.exclude)
  })
})

describe('isConditionFilled', () => {
  it('reconhece valor de verdade em cada tipo de campo', () => {
    expect(isConditionFilled(createCondition('tags', 'includes_any', ['t1']))).toBe(true)
    expect(isConditionFilled(createCondition('search', 'contains', 'Marina'))).toBe(true)
    expect(isConditionFilled(createCondition('lastActivityAt', 'within_days', 30))).toBe(true)
    // Booleano preenchido é `false` tanto quanto `true` — "opt-in é não" é
    // um critério, não uma linha em branco.
    expect(isConditionFilled(createCondition('optIn', 'eq', false))).toBe(true)
  })

  it('recusa o que a pessoa ainda não preencheu', () => {
    expect(isConditionFilled(createCondition('tags', 'includes_any', []))).toBe(false)
    expect(isConditionFilled(createCondition('search', 'contains', '   '))).toBe(false)
    expect(isConditionFilled(createCondition('lastActivityAt', 'within_days', Number.NaN))).toBe(false)
    expect(isConditionFilled(createCondition('tags', 'includes_any', undefined))).toBe(false)
  })
})

describe('hasAnyCondition', () => {
  it('é falso enquanto as condições existem mas estão em branco', () => {
    // O portão que segura o `evaluate`: o construtor recém-aberto já tem uma
    // linha, então contar `length` deixaria passar uma avaliação sem critério
    // nenhum — que devolve a base inteira e anuncia um público que ninguém
    // pediu.
    expect(hasAnyCondition(createEmptyDefinition())).toBe(false)
    expect(hasAnyCondition({ groups: [createGroup([])], exclude: {} })).toBe(false)
  })

  it('vira verdadeiro assim que uma condição ganha valor', () => {
    expect(hasAnyCondition(fixture())).toBe(true)
    const meio = {
      groups: [createGroup([createCondition('tags', 'includes_any', [])]), createGroup([createCondition('stage', 'in', ['ativo'])])],
      exclude: {},
    }
    expect(hasAnyCondition(meio)).toBe(true)
  })
})
