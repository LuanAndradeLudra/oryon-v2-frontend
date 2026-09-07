import { describe, it, expect } from 'vitest'
import { buildBoard, capped, BOARD_COLUMNS, COLUMN_CAP, type BoardColumnId } from './boardColumns'
import type { Campaign, CampaignStatus } from '@/types'

function make(over: Partial<Campaign> & { id: string; status: CampaignStatus }): Campaign {
  return {
    tenantId: 't1',
    name: over.id,
    templateId: 'tpl',
    templateName: 'tpl',
    segment: {} as Campaign['segment'],
    variableMappings: [],
    stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  }
}

function column(cs: Campaign[], id: BoardColumnId) {
  return buildBoard(cs).find((c) => c.def.id === id)!
}

const ids = (cs: Campaign[]) => cs.map((c) => c.id)

describe('buildBoard · onde cada status cai', () => {
  it('devolve sempre as cinco colunas, na ordem do fluxo', () => {
    expect(buildBoard([]).map((c) => c.def.id)).toEqual([
      'draft', 'scheduled', 'sending', 'sent', 'unfinished',
    ])
  })

  it('põe cada um dos sete status numa coluna, sem perder nenhum', () => {
    const todos: CampaignStatus[] = [
      'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'paused',
    ]
    const board = buildBoard(todos.map((status) => make({ id: status, status })))
    expect(board.reduce((n, c) => n + c.cards.length, 0)).toBe(7)
  })

  // A regra que o mockup não podia ter: ele é anterior à BE.2.
  it('pausada fica na coluna Enviando, e conta no cabeçalho', () => {
    const cs = [make({ id: 'p', status: 'paused' }), make({ id: 's', status: 'sending' })]
    expect(ids(column(cs, 'sending').cards).sort()).toEqual(['p', 's'])
  })

  // Omitir a cancelada faria um disparo cancelado no meio do envio sumir da
  // coluna Enviando sem deixar rastro.
  // Pertencimento, e SÓ isso: o `.sort()` é deliberado aqui, e a ordem tem
  // teste próprio logo abaixo. (Achado do Nível: um `.sort()` sem essa divisão
  // apagava a única prova da regra de desempate.)
  it('cancelada fica na última coluna, junto com a que falhou', () => {
    const cs = [make({ id: 'c', status: 'cancelled' }), make({ id: 'f', status: 'failed' })]
    expect(ids(column(cs, 'unfinished').cards).sort()).toEqual(['c', 'f'])
  })

  it('status que o quadro não conhece cai na última coluna em vez de sumir', () => {
    const cs = [make({ id: 'x', status: 'inventado' as CampaignStatus })]
    expect(ids(column(cs, 'unfinished').cards)).toEqual(['x'])
  })

  it('a última coluna não afirma que nada saiu', () => {
    const def = BOARD_COLUMNS.find((d) => d.id === 'unfinished')!
    expect(def.label).toBe('Não concluída')
  })
})

describe('buildBoard · ordem dentro da coluna', () => {
  it('Agendada sobe: o próximo a acontecer vem primeiro', () => {
    const cs = [
      make({ id: 'depois', status: 'scheduled', scheduledAt: '2026-09-10T18:00:00.000Z' }),
      make({ id: 'antes',  status: 'scheduled', scheduledAt: '2026-09-07T18:00:00.000Z' }),
    ]
    expect(ids(column(cs, 'scheduled').cards)).toEqual(['antes', 'depois'])
  })

  it('Enviada desce: a mais recente vem primeiro', () => {
    const cs = [
      make({ id: 'velha', status: 'sent', sentAt: '2026-08-31T09:00:00.000Z' }),
      make({ id: 'nova',  status: 'sent', sentAt: '2026-09-06T09:00:00.000Z' }),
    ]
    expect(ids(column(cs, 'sent').cards)).toEqual(['nova', 'velha'])
  })

  // O desempate por status é DECLARADO por coluna, não deduzido de a coluna ter
  // mais de um status. Antes ele alcançava a "Não concluída" também, onde os
  // dois estados são terminais e a data é o que a coluna promete.
  it('na coluna "Não concluída", quem manda é a data, não o status', () => {
    const cs = [
      make({ id: 'falha-velha', status: 'failed',    sentAt: '2026-09-01T10:00:00.000Z' }),
      make({ id: 'cancel-hoje', status: 'cancelled', sentAt: '2026-09-06T10:00:00.000Z' }),
    ]
    // Sem `.sort()`: é exatamente a ordem que está em teste.
    expect(ids(column(cs, 'unfinished').cards)).toEqual(['cancel-hoje', 'falha-velha'])
  })

  it('e o desempate por status vale só onde a coluna o declara', () => {
    const declaram = BOARD_COLUMNS.filter((d) => d.tiebreakByStatus).map((d) => d.id)
    expect(declaram).toEqual(['sending'])
    // A coluna que junta status SEM declarar o desempate continua existindo —
    // é o caso que a inferência antiga pegava por engano.
    const juntamStatus = BOARD_COLUMNS.filter((d) => d.statuses.length > 1).map((d) => d.id)
    expect(juntamStatus).toEqual(['sending', 'unfinished'])
  })

  it('na coluna Enviando, quem está enviando vem antes de quem está pausada', () => {
    const cs = [
      make({ id: 'pausada',  status: 'paused',  scheduledAt: '2026-09-01T10:00:00.000Z' }),
      make({ id: 'enviando', status: 'sending', scheduledAt: '2026-09-05T10:00:00.000Z' }),
    ]
    // A pausada é a mais antiga; ainda assim o status decide antes da data.
    expect(ids(column(cs, 'sending').cards)).toEqual(['enviando', 'pausada'])
  })

  it('campanha sem data afunda na coluna que sobe', () => {
    const cs = [
      make({ id: 'sem-data', status: 'scheduled', createdAt: '' }),
      make({ id: 'com-data', status: 'scheduled', scheduledAt: '2026-09-30T18:00:00.000Z' }),
    ]
    expect(ids(column(cs, 'scheduled').cards)).toEqual(['com-data', 'sem-data'])
  })

  it('campanha sem data afunda também na coluna que desce', () => {
    const cs = [
      make({ id: 'sem-data', status: 'sent', createdAt: '' }),
      make({ id: 'com-data', status: 'sent', sentAt: '2020-01-01T00:00:00.000Z' }),
    ]
    expect(ids(column(cs, 'sent').cards)).toEqual(['com-data', 'sem-data'])
  })

  it('rascunho, que não tem nem envio nem agendamento, se ordena por criação', () => {
    const cs = [
      make({ id: 'antigo', status: 'draft', createdAt: '2026-08-01T00:00:00.000Z' }),
      make({ id: 'novo',   status: 'draft', createdAt: '2026-09-05T00:00:00.000Z' }),
    ]
    expect(ids(column(cs, 'draft').cards)).toEqual(['novo', 'antigo'])
  })

  it('não reordena a lista que recebeu', () => {
    const cs = [
      make({ id: 'b', status: 'sent', sentAt: '2026-08-01T00:00:00.000Z' }),
      make({ id: 'a', status: 'sent', sentAt: '2026-09-01T00:00:00.000Z' }),
    ]
    buildBoard(cs)
    expect(ids(cs)).toEqual(['b', 'a'])
  })
})

describe('capped · o corte que mantém a altura significando gargalo', () => {
  const muitas = Array.from({ length: COLUMN_CAP + 5 }, (_, i) =>
    make({ id: `c${i}`, status: 'sent' }))

  it('mostra até o teto e diz quantas ficaram de fora', () => {
    const { shown, hidden } = capped(muitas, false)
    expect(shown).toHaveLength(COLUMN_CAP)
    expect(hidden).toBe(5)
  })

  it('expandida mostra todas e não esconde nada', () => {
    const { shown, hidden } = capped(muitas, true)
    expect(shown).toHaveLength(COLUMN_CAP + 5)
    expect(hidden).toBe(0)
  })

  it('coluna abaixo do teto não ganha rodapé de corte', () => {
    expect(capped(muitas.slice(0, 3), false)).toEqual({ shown: muitas.slice(0, 3), hidden: 0 })
  })

  // A contagem do cabeçalho é a REAL, não a exibida: o mockup mostra 3 cartões
  // sob um cabeçalho que diz 18.
  it('o corte não mexe na contagem da coluna', () => {
    const col = column(muitas, 'sent')
    expect(col.cards).toHaveLength(COLUMN_CAP + 5)
    expect(capped(col.cards, false).shown).toHaveLength(COLUMN_CAP)
  })
})
