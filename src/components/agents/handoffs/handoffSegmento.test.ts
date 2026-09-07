// ─── Segmento × fonte degradada (A6 / SCRUM-1017) ────────────────────────────
// As duas funções puras que traduzem "Aguardando / Em atendimento / Resolvidas
// hoje" para o que `GET /conversations` sabe responder quando o BE.6 está fora.
//
// A sonda do Calibre (`useHandoffQueue.degradado.test.ts`) prova o hook de
// ponta a ponta em `waiting` e `resolved`. Estes casos cobrem o que ela não
// alcança: o segmento do meio, e a ASSIMETRIA que decidiu a regra — foi ela que
// a primeira versão do conserto errou, esvaziando a fila.

import { describe, it, expect } from 'vitest'
import type { Conversation } from '@/types'
import { filtroDegradado, pertenceAoSegmento } from './useHandoffQueue'

const conversa = (over: Partial<Conversation> = {}) => ({ id: 'c1', ...over }) as Conversation
const comDono = { id: 'u1', firstName: 'Rita', lastName: null }

describe('filtroDegradado · o que se pede ao servidor', () => {
  it('os três segmentos pedem coisas DIFERENTES — era esse o defeito', () => {
    const pedidos = (['waiting', 'claimed', 'resolved'] as const).map((s) => JSON.stringify(filtroDegradado(s)))
    expect(new Set(pedidos).size).toBe(3)
  })

  it('todos partem de aiHandling=paused: a fila degradada É a conversa com IA pausada', () => {
    for (const s of ['waiting', 'claimed', 'resolved'] as const) {
      expect(filtroDegradado(s).aiHandling).toBe('paused')
    }
  })

  it('"aguardando" pede sem responsável; "resolvidas" pede resolvida', () => {
    expect(filtroDegradado('waiting')).toMatchObject({ status: 'open', assignedTo: 'unassigned' })
    expect(filtroDegradado('resolved')).toMatchObject({ status: 'resolved' })
  })

  it('"em atendimento" NÃO manda assignedTo: não existe "de qualquer um" no filtro', () => {
    // `assignedTo` aceita me | unassigned | all | <id>. Mandar `me` estreitaria
    // a fila do time para a fila de uma pessoa, calado. A peneira sai na linha.
    expect(filtroDegradado('claimed').assignedTo).toBeUndefined()
    expect(filtroDegradado('claimed').status).toBe('open')
  })
})

describe('pertenceAoSegmento · quem afirma a mais, prova', () => {
  it('"resolvidas" exige o fato: sem status, a linha NÃO entra', () => {
    expect(pertenceAoSegmento(conversa(), 'resolved')).toBe(false)
    expect(pertenceAoSegmento(conversa({ status: 'resolved' }), 'resolved')).toBe(true)
    expect(pertenceAoSegmento(conversa({ status: 'open' }), 'resolved')).toBe(false)
  })

  it('"em atendimento" exige o fato: sem responsável, a linha NÃO entra', () => {
    expect(pertenceAoSegmento(conversa({ status: 'open' }), 'claimed')).toBe(false)
    expect(pertenceAoSegmento(conversa({ status: 'open', assignedUser: comDono }), 'claimed')).toBe(true)
  })

  it('"aguardando" é o segmento BASE: campo ausente é ignorância, não negação', () => {
    // Este é o caso que a primeira versão do conserto reprovava, e era ele que
    // esvaziava a tela. Numa fonte degradada não se apaga a fila por falta de
    // um campo que a fonte pode simplesmente não mandar.
    expect(pertenceAoSegmento(conversa(), 'waiting')).toBe(true)
    expect(pertenceAoSegmento(conversa({ status: 'open' }), 'waiting')).toBe(true)
  })

  it('mas "aguardando" recusa o que está COMPROVADAMENTE noutro lugar', () => {
    expect(pertenceAoSegmento(conversa({ status: 'resolved' }), 'waiting')).toBe(false)
    expect(pertenceAoSegmento(conversa({ status: 'open', assignedUser: comDono }), 'waiting')).toBe(false)
  })

  it('nenhuma linha cai em dois segmentos ao mesmo tempo', () => {
    const linhas = [
      conversa(),
      conversa({ status: 'open' }),
      conversa({ status: 'open', assignedUser: comDono }),
      conversa({ status: 'resolved' }),
      conversa({ status: 'resolved', assignedUser: comDono }),
    ]
    for (const c of linhas) {
      const em = (['waiting', 'claimed', 'resolved'] as const).filter((s) => pertenceAoSegmento(c, s))
      expect(em.length).toBeLessThanOrEqual(1)
    }
  })
})
