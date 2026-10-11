import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const list = vi.fn()
const ouvintes = new Map<string, Set<() => void>>()
vi.mock('@/services/api', () => ({ conversationsApi: { list: (...a: unknown[]) => list(...a) } }))
vi.mock('@/services/socket', () => ({
  getSocket: () => ({
    on: (c: string, f: () => void) => { if (!ouvintes.has(c)) ouvintes.set(c, new Set()); ouvintes.get(c)!.add(f) },
    off: (c: string, f: () => void) => { ouvintes.get(c)?.delete(f) },
  }),
}))

import { useContagensDaFila, lerContagensDaFila } from './useContagensDaFila'

const resposta = (pending: number, pendingCounts?: { queue: number; mine: number }) =>
  ({ data: { data: [], statusCounts: { all: 0, open: 0, pending, resolved: 0 }, pendingCounts } })

async function passar(ms = 600) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

describe('contagens "na fila · aguardando você" (revisão 11/10)', () => {
  beforeEach(() => { vi.useFakeTimers(); list.mockReset(); ouvintes.clear() })
  afterEach(() => vi.useRealTimers())

  it('C5: com pendingCounts no retorno, UMA chamada basta', async () => {
    list.mockResolvedValue(resposta(99, { queue: 3, mine: 2 }))
    expect(await lerContagensDaFila()).toEqual({ naFila: 3, suas: 2 })
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('backend antigo: cai nas 2 chamadas com limit=1', async () => {
    list.mockResolvedValueOnce(resposta(4)).mockResolvedValueOnce(resposta(1))
    expect(await lerContagensDaFila('linha-1')).toEqual({ naFila: 4, suas: 1 })
    expect(list).toHaveBeenNthCalledWith(2, { whatsappNumberId: 'linha-1', assignedTo: 'me', status: 'pending' }, 1, 1)
  })

  it('com as contagens da lista, usa direto e não pede nada', async () => {
    const { result } = renderHook(() => useContagensDaFila({ queue: 5, mine: 0 }))
    await passar()
    expect(result.current).toEqual({ naFila: 5, suas: 0 })
    expect(list).not.toHaveBeenCalled()
  })

  it('relê ao Assumir (evento local) e ao chegar conversa nova (socket), com debounce', async () => {
    list.mockResolvedValue(resposta(0, { queue: 2, mine: 0 }))
    const { result } = renderHook(() => useContagensDaFila(null))
    await passar()
    expect(result.current).toEqual({ naFila: 2, suas: 0 })

    list.mockResolvedValue(resposta(0, { queue: 1, mine: 1 }))
    act(() => { window.dispatchEvent(new CustomEvent('oryon:activity-invalidate', { detail: { conversationId: 'c1' } })) })
    act(() => { ouvintes.get('conversation:assigned')?.forEach((f) => f()) })
    await passar()
    expect(result.current).toEqual({ naFila: 1, suas: 1 })
    expect(list).toHaveBeenCalledTimes(2) // a rajada virou UMA releitura

    list.mockResolvedValue(resposta(0, { queue: 2, mine: 1 }))
    act(() => { ouvintes.get('conversation:new')?.forEach((f) => f()) })
    await passar()
    expect(result.current).toEqual({ naFila: 2, suas: 1 })
  })
})
