import { describe, it, expect } from 'vitest'
import { esperaPessoa, faixaDoPrazo, montarFila, formatarEspera } from './filaAgora'
import type { Conversation } from '@/types'

const NOW = new Date('2026-09-28T09:00:00Z').getTime()
const min = (n: number) => new Date(NOW - n * 60_000).toISOString()

/** `linha: 'ia'` = linha atendida por um agente ligado; `'sem-ia'` = só pessoas. */
const conv = (over: Partial<Conversation> & { linha?: 'ia' | 'sem-ia' } = {}): Conversation => {
  const { linha = 'sem-ia', ...rest } = over
  return {
    id: 'c', tenantId: 't', status: 'open', channel: 'whatsapp', lastMessageAt: min(5), lastMessagePreview: 'oi', unreadCount: 1,
    lastMessageSenderKind: 'client', aiPausedUntil: null,
    contact: { id: 'k', displayName: 'Carla' } as Conversation['contact'],
    whatsappNumber: { id: linha, displayPhoneNumber: '+55', status: 'connected' } as Conversation['whatsappNumber'],
    ...rest,
  } as Conversation
}

const IA = new Set(['ia'])

describe('fila do Dashboard', () => {
  it('só entra quem espera pessoa: cliente falou por último e a IA não está atendendo', () => {
    expect(esperaPessoa(conv(), IA, NOW)).toBe(true) // linha sem IA
    expect(esperaPessoa(conv({ linha: 'ia' }), IA, NOW)).toBe(false) // IA atendendo
    expect(esperaPessoa(conv({ linha: 'ia', aiPausedUntil: new Date(NOW + 3_600_000).toISOString() }), IA, NOW)).toBe(true) // pessoa assumiu, cliente respondeu
    expect(esperaPessoa(conv({ linha: 'ia', aiPausedUntil: new Date(NOW - 60_000).toISOString() }), IA, NOW)).toBe(false) // pausa venceu, IA voltou
    expect(esperaPessoa(conv({ lastAgentReplyAt: min(1) }), IA, NOW)).toBe(false) // uma pessoa já respondeu
    expect(esperaPessoa(conv({ lastMessageSenderKind: 'operator' }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ lastMessageSenderKind: 'ai' }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ status: 'resolved' }), IA, NOW)).toBe(false)
  })

  it('a IA passou para a equipe (pendente): entra mesmo com a IA falando por último', () => {
    expect(esperaPessoa(conv({ linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai' }), IA, NOW)).toBe(true)
    expect(esperaPessoa(conv({ linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai', lastAgentReplyAt: min(0) }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ status: 'pending', lastMessageSenderKind: 'operator', lastAgentReplyAt: min(5) }), IA, NOW)).toBe(false)
  })

  it('faixas de prazo com 15 min fixos', () => {
    expect(faixaDoPrazo(3)).toBe('no-prazo')
    expect(faixaDoPrazo(12)).toBe('vence-em-breve')
    expect(faixaDoPrazo(15)).toBe('atrasada')
  })

  it('ordena da maior espera para a menor e marca sem dono e passada pela IA', () => {
    const fila = montarFila([
      conv({ id: 'a', lastMessageAt: min(3) }),
      conv({ id: 'b', lastMessageAt: min(42), linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai' }),
      conv({ id: 'c', lastMessageAt: min(18), assignedUser: { id: 'u', firstName: 'Ana', lastName: null } }),
      conv({ id: 'd', lastMessageAt: min(60), linha: 'ia' }), // a IA está atendendo: fora
    ], IA, NOW)
    expect(fila.map((i) => i.conversa.id)).toEqual(['b', 'c', 'a'])
    expect(fila[0]).toMatchObject({ esperaMin: 42, faixa: 'atrasada', iaPassou: true, semDono: true })
    expect(fila[1]).toMatchObject({ semDono: false, iaPassou: false })
  })

  it('formata a espera', () => {
    expect(formatarEspera(0)).toBe('agora')
    expect(formatarEspera(42)).toBe('42 min')
    expect(formatarEspera(120)).toBe('2 h')
    expect(formatarEspera(125)).toBe('2 h 5 min')
    expect(formatarEspera(24 * 60)).toBe('1 d')
    expect(formatarEspera(2498 * 60 + 21)).toBe('104 d 2 h')
  })
})
