import { describe, it, expect } from 'vitest'
import { esperaNaFila, esperaPessoa, faixaDoPrazo, montarFila, formatarEspera, janelaFechando, janelaFechada } from './filaAgora'
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
const ana = { id: 'u', firstName: 'Ana', lastName: null }

describe('fila do Dashboard = pendentes que esperam alguém (alinhada à aba Fila, 28/09)', () => {
  it('pendente sem dono entra — mesmo que uma pessoa já tenha falado (é a aba Fila da inbox)', () => {
    expect(esperaNaFila(conv({ status: 'pending' }))).toBe(true)
    expect(esperaNaFila(conv({ status: 'pending', lastMessageSenderKind: 'ai' }))).toBe(true)
    expect(esperaNaFila(conv({ status: 'pending', lastAgentReplyAt: min(1), lastMessageAt: min(1) }))).toBe(true)
  })

  it('pendente com dono só entra se ninguém respondeu desde a última mensagem', () => {
    expect(esperaNaFila(conv({ status: 'pending', assignedUser: ana }))).toBe(true)
    expect(esperaNaFila(conv({ status: 'pending', assignedUser: ana, lastAgentReplyAt: min(1), lastMessageAt: min(1) }))).toBe(false)
  })

  it('o que não é pendente não entra (aberta, resolvida)', () => {
    expect(esperaNaFila(conv({ status: 'open' }))).toBe(false)
    expect(esperaNaFila(conv({ status: 'resolved' }))).toBe(false)
  })

  it('ordena da maior espera para a menor e marca sem dono e passada pela IA', () => {
    const fila = montarFila([
      conv({ id: 'a', lastMessageAt: min(3), status: 'pending' }),
      conv({ id: 'b', lastMessageAt: min(42), linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai' }),
      conv({ id: 'c', lastMessageAt: min(18), status: 'pending', assignedUser: ana }),
      conv({ id: 'd', lastMessageAt: min(60), linha: 'ia' }), // aberta, com a IA: fora
    ], IA, NOW)
    expect(fila.map((i) => i.conversa.id)).toEqual(['b', 'c', 'a'])
    expect(fila[0]).toMatchObject({ esperaMin: 42, faixa: 'atrasada', iaPassou: true, semDono: true })
    expect(fila[1]).toMatchObject({ semDono: false, iaPassou: false })
  })

  it('faixas de prazo com 15 min fixos', () => {
    expect(faixaDoPrazo(3)).toBe('no-prazo')
    expect(faixaDoPrazo(12)).toBe('vence-em-breve')
    expect(faixaDoPrazo(15)).toBe('atrasada')
  })

  it('marca a janela de 24h com a regra do produto (exata só quando o cliente falou por último)', () => {
    const [fechando, fechada, passou] = [
      montarFila([conv({ id: 'x', lastMessageAt: min(23 * 60), status: 'pending' })], IA, NOW)[0],
      montarFila([conv({ id: 'y', lastMessageAt: min(25 * 60), status: 'pending' })], IA, NOW)[0],
      montarFila([conv({ id: 'z', lastMessageAt: min(23 * 60), linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai' })], IA, NOW)[0],
    ]
    expect(janelaFechando(fechando)).toBe(true)
    expect(fechando.janela?.label).toBe('Fecha em 1h')
    expect(janelaFechada(fechada)).toBe(true)
    // A IA falou por último: a entrada do cliente é mais antiga, sem contagem.
    expect(janelaFechando(passou)).toBe(false)
    expect(passou.janela?.state).toBe('active')
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

describe('selo "sem resposta" da lista (esperaPessoa — regra própria, não é a fila)', () => {
  it('cliente falou por último e a IA não está atendendo', () => {
    expect(esperaPessoa(conv(), IA, NOW)).toBe(true) // linha sem IA
    expect(esperaPessoa(conv({ linha: 'ia' }), IA, NOW)).toBe(false) // IA atendendo
    expect(esperaPessoa(conv({ linha: 'ia', aiPausedUntil: new Date(NOW + 3_600_000).toISOString() }), IA, NOW)).toBe(true)
    expect(esperaPessoa(conv({ linha: 'ia', aiPausedUntil: new Date(NOW - 60_000).toISOString() }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ lastAgentReplyAt: min(1) }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ lastMessageSenderKind: 'operator' }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ lastMessageSenderKind: 'ai' }), IA, NOW)).toBe(false)
    expect(esperaPessoa(conv({ status: 'resolved' }), IA, NOW)).toBe(false)
  })

  it('a IA passou para a equipe (pendente): entra mesmo com a IA falando por último', () => {
    expect(esperaPessoa(conv({ linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai' }), IA, NOW)).toBe(true)
    expect(esperaPessoa(conv({ linha: 'ia', status: 'pending', lastMessageSenderKind: 'ai', lastAgentReplyAt: min(0) }), IA, NOW)).toBe(false)
  })
})
