import { describe, it, expect } from 'vitest'
import { conversationMatchesFilters } from './conversationFilterPredicate'
import { semFiltros } from './filtrosDaInbox'
import type { Conversation } from '@/types'

// 28/09 — o predicado do tempo real concorda com a lista do servidor.

const conv = (over: Partial<Conversation> = {}) => ({
  id: 'c', status: 'open', unreadCount: 0, lastMessageAt: '2026-09-28T10:00:00Z', lastAgentReplyAt: null,
  contact: { id: 'k', displayName: 'Mariana Sá', waId: '5547999007010' }, tags: [],
  ...over,
}) as unknown as Conversation

describe('predicado do tempo real', () => {
  it('busca: só confere quem ENTRA na lista, por nome (sem acento) ou telefone', () => {
    const f = { search: 'mariana sa' }
    expect(conversationMatchesFilters(conv(), f, null, { entrada: true })).toBe(true)
    expect(conversationMatchesFilters(conv(), { search: '9990070' }, null, { entrada: true })).toBe(true)
    expect(conversationMatchesFilters(conv(), { search: 'joana' }, null, { entrada: true })).toBe(false)
    // Linha que o servidor trouxe (pode ter batido pelo texto de uma mensagem): fica.
    expect(conversationMatchesFilters(conv(), { search: 'joana' }, null)).toBe(true)
  })

  it('etiqueta: entra e sai pela etiqueta da conversa', () => {
    const comTag = conv({ tags: [{ id: 't1', name: 'Unimed', color: '#fff' }] as Conversation['tags'] })
    expect(conversationMatchesFilters(comTag, { tagId: 't1' })).toBe(true)
    expect(conversationMatchesFilters(conv(), { tagId: 't1' })).toBe(false)
  })

  it('"aguardando" usa a regra do servidor (sem resposta humana desde a última mensagem)', () => {
    expect(conversationMatchesFilters(conv(), { awaitingReply: true })).toBe(true)
    expect(conversationMatchesFilters(conv({ lastAgentReplyAt: '2026-09-28T10:00:00Z' }), { awaitingReply: true })).toBe(false)
    expect(conversationMatchesFilters(conv({ status: 'resolved' }), { awaitingReply: true })).toBe(false)
    // A IA falou por último e nenhuma pessoa respondeu: o servidor inclui, o predicado também.
    expect(conversationMatchesFilters(conv({ lastMessageSenderKind: 'ai' }), { awaitingReply: true })).toBe(true)
  })
})

describe('"Limpar filtros" único', () => {
  it('mantém busca, contato e linha; zera o resto', () => {
    expect(semFiltros({
      status: 'pending', assignedTo: 'unassigned', unreadOnly: true, needsReview: true, tagId: 't',
      search: 'ana', contactId: 'k', whatsappNumberId: 'w', startDate: 'a', endDate: 'b',
    })).toEqual({ status: 'all', search: 'ana', contactId: 'k', whatsappNumberId: 'w' })
  })
})
