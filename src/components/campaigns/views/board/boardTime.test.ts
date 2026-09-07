import { describe, it, expect } from 'vitest'
import { boardWhen, whenOf } from './boardTime'

// Relógio fixo: quinta, 3 de setembro de 2026, 18:31.
const agora = new Date(2026, 8, 3, 18, 31)

describe('boardWhen', () => {
  it('diz "hoje" em vez do dia da semana', () => {
    expect(boardWhen(new Date(2026, 8, 3, 20, 30), agora)).toBe('hoje · 20:30')
  })

  it('diz "amanhã" e "ontem" para os vizinhos', () => {
    expect(boardWhen(new Date(2026, 8, 4, 9, 0), agora)).toBe('amanhã · 09:00')
    expect(boardWhen(new Date(2026, 8, 2, 10, 30), agora)).toBe('ontem · 10:30')
  })

  // `EEE` em ptBR devolve "terça", não "ter" — o erro que já me pegou uma vez
  // no trilho da Agenda. Só `EEEEEE` dá as três letras do mockup.
  it('abrevia o dia da semana em três letras', () => {
    expect(boardWhen(new Date(2026, 8, 8, 18, 0), agora)).toBe('ter 8 · 18:00')
  })

  // Dias de CALENDÁRIO: às 18:31 de quinta, a meia-noite de sexta é "amanhã"
  // mesmo faltando menos de 6 horas, e a de sábado não vira "amanhã" por
  // faltar menos de 48.
  it('conta dia de calendário, não bloco de 24 horas', () => {
    expect(boardWhen(new Date(2026, 8, 4, 0, 5), agora)).toBe('amanhã · 00:05')
    // "sab", sem acento: é o que o `EEEEEE` do ptBR do date-fns devolve.
    // O trilho da Agenda (#131) já emite a mesma forma — as duas telas
    // concordarem vale mais que o acento, e a correção seria na biblioteca.
    expect(boardWhen(new Date(2026, 8, 5, 0, 5), agora)).toBe('sab 5 · 00:05')
  })
})

describe('whenOf', () => {
  it('prefere a data de envio à de agendamento', () => {
    const d = whenOf({ sentAt: '2026-09-03T12:00:00.000Z', scheduledAt: '2026-09-01T12:00:00.000Z' })
    expect(d?.toISOString()).toBe('2026-09-03T12:00:00.000Z')
  })

  it('cai na criação quando não há envio nem agendamento', () => {
    const d = whenOf({ createdAt: '2026-08-31T12:00:00.000Z' })
    expect(d?.toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })

  it('devolve null em vez de uma data inválida', () => {
    expect(whenOf({})).toBeNull()
    expect(whenOf({ createdAt: 'nem data nem nada' })).toBeNull()
  })
})
