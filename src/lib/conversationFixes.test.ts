import { describe, it, expect } from 'vitest'
import { msRestantesDaJanela } from './whatsappWindow'
import { donoDoEvento, getAwaitingReply } from './conversationSignals'
import type { Conversation } from '@/types'

// Correções de Conversas de 28/09 (bugs 2 e 3 da auditoria, card no Jira).

const NOW = new Date('2026-09-28T12:00:00Z').getTime()
const h = (n: number) => new Date(NOW - n * 3_600_000).toISOString()
const min = (n: number) => new Date(NOW - n * 60_000).toISOString()
const H = 3_600_000

const msg = (direction: 'inbound' | 'outbound', sentAt: string, conversationId = 'c') => ({ conversationId, direction, sentAt })

describe('janela de 24h do composer (pela última mensagem do cliente)', () => {
  const base = { conversationId: 'c', carregando: false, temMais: false, now: NOW }

  it('cliente escreveu há 23h e a IA respondeu há 10 min: falta 1h, não 24h', () => {
    const ms = msRestantesDaJanela({
      ...base,
      mensagens: [msg('inbound', h(23)), msg('outbound', min(10))],
      lastMessageAt: min(10),
      lastMessageSenderKind: 'ai',
    })
    expect(Math.round(ms / H)).toBe(1)
  })

  it('cliente sumido há 3 dias e um modelo acabou de sair: continua fechada', () => {
    const ms = msRestantesDaJanela({
      ...base,
      mensagens: [msg('inbound', h(72)), msg('outbound', min(1))],
      lastMessageAt: min(1),
      lastMessageSenderKind: 'campaign',
    })
    expect(ms).toBeLessThanOrEqual(0)
  })

  it('cliente falou por último: exato mesmo sem as mensagens', () => {
    const ms = msRestantesDaJanela({ ...base, carregando: true, mensagens: [], lastMessageAt: h(20), lastMessageSenderKind: 'client' })
    expect(Math.round(ms / H)).toBe(4)
  })

  it('mensagens carregadas sem nenhuma do cliente: fechada (na dúvida, modelo)', () => {
    const ms = msRestantesDaJanela({ ...base, temMais: true, mensagens: [msg('outbound', min(30))], lastMessageAt: min(30), lastMessageSenderKind: 'operator' })
    expect(ms).toBe(0)
  })

  it('ignora mensagens de outra conversa ainda na memória (troca de conversa)', () => {
    const ms = msRestantesDaJanela({
      ...base,
      mensagens: [msg('inbound', min(5), 'outra')],
      lastMessageAt: h(30),
      lastMessageSenderKind: 'operator',
    })
    expect(ms).toBeLessThanOrEqual(0)
  })

  it('enquanto as mensagens chegam, vale a última mensagem da conversa', () => {
    const ms = msRestantesDaJanela({ ...base, carregando: true, mensagens: [], lastMessageAt: h(2), lastMessageSenderKind: 'ai' })
    expect(Math.round(ms / H)).toBe(22)
  })
})

const conv = (over: Partial<Conversation> = {}) => ({
  status: 'open', lastMessageAt: min(20), lastAgentReplyAt: null, lastMessageSenderKind: 'client', aiPausedUntil: null,
  whatsappNumber: { id: 'sem-ia' }, assignedUser: undefined, ...over,
}) as unknown as Conversation

describe('"sem resposta" na lista = a regra da fila do Dashboard', () => {
  const IA = new Set(['com-ia'])

  it('a IA ou uma campanha falou por último: não é "sem resposta"', () => {
    expect(getAwaitingReply(conv({ lastMessageSenderKind: 'ai' }), IA, NOW)).toBeNull()
    expect(getAwaitingReply(conv({ lastMessageSenderKind: 'campaign' }), IA, NOW)).toBeNull()
  })

  it('cliente falou por último numa linha sem IA: espera, com os minutos', () => {
    expect(getAwaitingReply(conv(), IA, NOW)).toEqual({ minutes: 20 })
  })

  it('linha com IA cuidando: não espera pessoa; a IA passou (pendente): espera', () => {
    const naIA = { whatsappNumber: { id: 'com-ia' } } as Partial<Conversation>
    expect(getAwaitingReply(conv(naIA), IA, NOW)).toBeNull()
    expect(getAwaitingReply(conv({ ...naIA, status: 'pending', lastMessageSenderKind: 'ai' }), IA, NOW)).toEqual({ minutes: 20 })
  })

  it('uma pessoa já respondeu depois: não espera', () => {
    expect(getAwaitingReply(conv({ lastAgentReplyAt: min(5), lastMessageAt: min(5), lastMessageSenderKind: 'operator' }), IA, NOW)).toBeNull()
  })

  it('abaixo de 2 minutos não acende', () => {
    expect(getAwaitingReply(conv({ lastMessageAt: min(1) }), IA, NOW)).toBeNull()
  })
})

describe('evento de atribuição nos dois formatos', () => {
  it('formato do frontend (assignedTo)', () => {
    expect(donoDoEvento({ conversationId: 'c', assignedTo: { id: 'u', firstName: 'Ana', lastName: null } })).toEqual({ id: 'u', firstName: 'Ana', lastName: null })
    expect(donoDoEvento({ conversationId: 'c', assignedTo: null })).toBeNull()
  })

  it('formato das automações (assignedUserId + nome)', () => {
    expect(donoDoEvento({ conversationId: 'c', assignedUserId: 'u', assignedUserName: 'Ana Prado Lima' })).toEqual({ id: 'u', firstName: 'Ana', lastName: 'Prado Lima' })
    expect(donoDoEvento({ conversationId: 'c', assignedUserId: null })).toBeNull()
  })

  it('evento sem dono informado não mexe em nada', () => {
    expect(donoDoEvento({ conversationId: 'c' })).toBeUndefined()
  })
})
