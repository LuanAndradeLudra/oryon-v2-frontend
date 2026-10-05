// Revisão 02/10: trocar de conversa rápido (J/K) deixava a resposta atrasada
// da conversa anterior sobrescrever a lista — o atendente lia o histórico de
// outro cliente. O retorno de um envio também caía na conversa errada.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from './useMessages'
import type { Message } from '@/types'

type Pendente = { resolve: (v: unknown) => void }
const listas: Record<string, Pendente[]> = {}
const envios: Pendente[] = []

vi.mock('@/lib/utils', async (orig) => ({
  ...(await orig<typeof import('@/lib/utils')>()),
  withRetry: (fn: () => unknown) => fn(),
}))

vi.mock('@/services/api', () => ({
  messagesApi: {
    list: vi.fn((conversationId: string) => new Promise((resolve) => {
      (listas[conversationId] ??= []).push({ resolve })
    })),
    send: vi.fn(() => new Promise((resolve) => { envios.push({ resolve }) })),
  },
}))

const msg = (id: string, conversationId: string): Partial<Message> => ({
  id, conversationId, direction: 'inbound', type: 'text', status: 'delivered', body: id,
  sentAt: '2026-10-02T10:00:00Z', createdAt: '2026-10-02T10:00:00Z',
})

beforeEach(() => {
  for (const k of Object.keys(listas)) delete listas[k]
  envios.length = 0
})

describe('useMessages — troca de conversa no meio da carga', () => {
  it('a resposta atrasada da conversa anterior não sobrescreve a atual', async () => {
    const { result, rerender } = renderHook(({ id }) => useMessages(id), { initialProps: { id: 'A' } })
    rerender({ id: 'B' })
    await waitFor(() => expect(listas.B?.length).toBe(1))

    // B responde primeiro; A (atrasada) responde depois.
    await act(async () => { listas.B[0].resolve({ data: { data: [msg('b1', 'B')] } }) })
    await act(async () => { listas.A[0].resolve({ data: { data: [msg('a1', 'A')] } }) })

    expect(result.current.messages.map((m) => m.id)).toEqual(['b1'])
  })

  it('o retorno de um envio feito em A não entra na lista de B', async () => {
    const { result, rerender } = renderHook(({ id }) => useMessages(id), { initialProps: { id: 'A' } })
    await act(async () => { listas.A[0].resolve({ data: { data: [] } }) })

    let envio: Promise<void> | undefined
    act(() => { envio = result.current.sendMessage({ body: 'oi' } as never) })
    rerender({ id: 'B' })
    await act(async () => { listas.B[0].resolve({ data: { data: [msg('b1', 'B')] } }) })
    await act(async () => { envios[0].resolve({ data: { ...msg('a-enviada', 'A'), direction: 'outbound' } }); await envio })

    expect(result.current.messages.map((m) => m.id)).toEqual(['b1'])
  })
})
