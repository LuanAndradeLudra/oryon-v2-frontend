import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Conversation } from '@/types'

const getConversations = vi.fn()
vi.mock('@/services/api', () => ({ contactsApi: { getConversations: (...a: unknown[]) => getConversations(...a) } }))

import { pickConversationEntry, resolveConversationEntry, windowMsLeft, WHATSAPP_WINDOW_MS } from './conversationEntry'

const NOW = Date.parse('2026-09-24T12:00:00Z')
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const conv = (over: Partial<Conversation> & { id: string }): Conversation =>
  ({ status: 'open', lastMessageAt: ago(1), lastMessageSenderKind: 'client', ...over }) as Conversation

describe('windowMsLeft', () => {
  it('mesma conta do composer: 24h - idade da última mensagem', () => {
    expect(windowMsLeft(ago(1), NOW)).toBe(WHATSAPP_WINDOW_MS - 3_600_000)
    expect(windowMsLeft(ago(24), NOW)).toBe(0)
    expect(windowMsLeft(ago(30), NOW)).toBeLessThan(0)
  })
})

describe('pickConversationEntry', () => {
  it('sem conversas: nada aberto, janela fechada, sem inbound', () => {
    expect(pickConversationEntry([], NOW)).toEqual({ openConversationId: null, windowOpen: false, lastInboundAt: null })
  })

  it('conversa aberta recente do cliente: abre, janela aberta, lastInboundAt = lastMessageAt', () => {
    const e = pickConversationEntry([conv({ id: 'a', lastMessageAt: ago(2) })], NOW)
    expect(e).toEqual({ openConversationId: 'a', windowOpen: true, lastInboundAt: ago(2) })
  })

  it('última mensagem do operador: janela pela regra do composer, mas lastInboundAt fica null (não adivinha)', () => {
    const e = pickConversationEntry([conv({ id: 'a', lastMessageSenderKind: 'operator' })], NOW)
    expect(e.windowOpen).toBe(true)
    expect(e.lastInboundAt).toBeNull()
  })

  it('pendente também conta como ativa; resolvida/abandonada não', () => {
    expect(pickConversationEntry([conv({ id: 'p', status: 'pending' })], NOW).openConversationId).toBe('p')
    expect(pickConversationEntry([conv({ id: 'r', status: 'resolved' })], NOW).openConversationId).toBeNull()
    expect(pickConversationEntry([conv({ id: 'x', status: 'abandoned' })], NOW).openConversationId).toBeNull()
  })

  it('várias: escolhe a ativa mais recente; janela vem da mais recente de qualquer status', () => {
    const e = pickConversationEntry([
      conv({ id: 'velha-aberta', status: 'open', lastMessageAt: ago(50) }),
      conv({ id: 'nova-resolvida', status: 'resolved', lastMessageAt: ago(3) }),
      conv({ id: 'meio-aberta', status: 'open', lastMessageAt: ago(10) }),
    ], NOW)
    expect(e.openConversationId).toBe('meio-aberta')
    expect(e.windowOpen).toBe(true)
    expect(e.lastInboundAt).toBe(ago(3))
  })

  it('janela fechada com mais de 24h', () => {
    expect(pickConversationEntry([conv({ id: 'a', lastMessageAt: ago(25) })], NOW).windowOpen).toBe(false)
  })
})

describe('resolveConversationEntry', () => {
  // chaves: o retorno de mockReset() (o próprio mock) viraria função de cleanup do vitest
  beforeEach(() => { getConversations.mockReset() })

  it('usa contactsApi.getConversations e devolve a entrada', async () => {
    getConversations.mockResolvedValue({ data: { data: [conv({ id: 'a', lastMessageAt: new Date().toISOString() })] } })
    const e = await resolveConversationEntry('c1')
    expect(getConversations).toHaveBeenCalledWith('c1')
    expect(e.openConversationId).toBe('a')
    expect(e.windowOpen).toBe(true)
  })

  it('erro de rede propaga (não vira "sem conversa")', async () => {
    getConversations.mockRejectedValue(new Error('boom'))
    await expect(resolveConversationEntry('c1')).rejects.toThrow('boom')
  })
})
