// Correção 4 da auditoria de Conversas (28/09): a lista em tempo real.
//   - mensagem nova atualiza remetente e última resposta humana;
//   - atribuição feita por outra pessoa (nos dois formatos do evento) e
//     resolução corrigem a linha e a tiram do filtro quando não cabe mais;
//   - reconectar o socket relê a lista.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Conversation, ConversationFilters, SocketMessageNew } from '@/types'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

vi.mock('@/services/api', () => ({
  conversationsApi: {
    list: vi.fn(),
    get: vi.fn(),
    markAsRead: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

const ouvintes = new Map<string, Array<() => void>>()
vi.mock('@/services/socket', () => ({
  connectSocket: () => ({
    on: (ev: string, fn: () => void) => { ouvintes.set(ev, [...(ouvintes.get(ev) ?? []), fn]) },
    off: (ev: string, fn: () => void) => { ouvintes.set(ev, (ouvintes.get(ev) ?? []).filter((f) => f !== fn)) },
  }),
}))

import { useConversations } from '@/hooks/useConversations'
import { conversationsApi } from '@/services/api'

const listMock = vi.mocked(conversationsApi.list)

function conv(id: string, over: Partial<Conversation> = {}): Conversation {
  return { id, status: 'open', unreadCount: 0, lastMessageAt: '2026-09-28T10:00:00.000Z', ...over } as Conversation
}
const resposta = (data: Conversation[]) => ({
  data: { data, hasMore: false, statusCounts: { all: data.length, open: data.length, pending: 0, resolved: 0 }, needsReviewCount: 0 },
})

async function montar(filtros: ConversationFilters, linhas: Conversation[]) {
  listMock.mockResolvedValue(resposta(linhas) as never)
  const view = renderHook(() => useConversations(filtros))
  await act(async () => { await Promise.resolve() })
  return view
}

beforeEach(() => { listMock.mockReset(); ouvintes.clear() })

describe('useConversations — tempo real', () => {
  it('mensagem humana nova grava remetente e última resposta humana (a linha não volta a "sem resposta")', async () => {
    const { result } = await montar({}, [conv('c1', { lastMessageSenderKind: 'client', lastAgentReplyAt: null })])
    act(() => {
      result.current.handleNewMessage({
        conversationId: 'c1',
        unreadCount: 0,
        message: { id: 'm', conversationId: 'c1', direction: 'outbound', sentByUserId: 'user-1', body: 'oi', sentAt: '2026-09-28T10:05:00.000Z', type: 'text' },
      } as unknown as SocketMessageNew)
    })
    const c = result.current.conversations[0]
    expect(c.lastMessageSenderKind).toBe('operator')
    expect(c.lastAgentReplyAt).toBe('2026-09-28T10:05:00.000Z')
  })

  it('mensagem da IA não mexe na última resposta humana', async () => {
    const { result } = await montar({}, [conv('c1', { lastAgentReplyAt: null })])
    act(() => {
      result.current.handleNewMessage({
        conversationId: 'c1',
        unreadCount: 0,
        message: { id: 'm', conversationId: 'c1', direction: 'outbound', senderKind: 'ai', body: 'oi', sentAt: '2026-09-28T10:05:00.000Z', type: 'text' },
      } as unknown as SocketMessageNew)
    })
    expect(result.current.conversations[0].lastMessageSenderKind).toBe('ai')
    expect(result.current.conversations[0].lastAgentReplyAt).toBeNull()
  })

  it('atribuição de um colega tira a linha de "Fila" (sem dono) — formato das automações', async () => {
    const { result } = await montar({ assignedTo: 'unassigned' }, [conv('c1'), conv('c2')])
    act(() => { result.current.handleAssigned({ conversationId: 'c1', assignedUserId: 'u9', assignedUserName: 'Bruno Lima' }) })
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c2'])
  })

  it('atribuição em "Todas" só corrige o dono da linha', async () => {
    const { result } = await montar({}, [conv('c1')])
    act(() => { result.current.handleAssigned({ conversationId: 'c1', assignedTo: { id: 'u9', firstName: 'Bruno', lastName: 'Lima' } }) })
    expect(result.current.conversations[0].assignedUser?.firstName).toBe('Bruno')
  })

  it('resolução feita em outro lugar tira a linha de "Abertas"', async () => {
    const { result } = await montar({ status: 'open' }, [conv('c1'), conv('c2')])
    act(() => { result.current.handleResolved({ conversationId: 'c2' }) })
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c1'])
  })

  it('reconectar o socket relê a lista', async () => {
    await montar({}, [conv('c1')])
    const antes = listMock.mock.calls.length
    await act(async () => { for (const fn of ouvintes.get('connect') ?? []) fn(); await Promise.resolve() })
    expect(listMock.mock.calls.length).toBe(antes + 1)
  })
})
