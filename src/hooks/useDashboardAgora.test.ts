import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }
type ListResponse = { data: { data: unknown[]; total: number; hasMore: boolean } }
const state = vi.hoisted(() => ({ rounds: [[], []] as Array<Array<Deferred<ListResponse>>>, calls: 0 }))
const list = vi.hoisted(() => vi.fn())
const rounds = state.rounds

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

list.mockImplementation(() => {
  const round = state.calls++ < 6 ? 0 : 1
  const next = deferred<ListResponse>()
  rounds[round].push(next)
  return next.promise
})

vi.mock('@/services/api', () => ({
  api: { get: vi.fn(async () => ({ data: null })) },
  conversationsApi: { list },
  usersApi: { available: vi.fn(async () => ({ data: [] })) },
  whatsappNumbersApi: { listDetailed: vi.fn(async () => ({ data: [] })) },
}))
vi.mock('@/services/agentsApi', () => ({ listAgents: vi.fn(async () => []) }))
vi.mock('@/services/socket', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))

import { useDashboardAgora } from './useDashboardAgora'

afterEach(() => {
  rounds[0].length = 0
  rounds[1].length = 0
  state.calls = 0
  list.mockClear()
})

describe('LOG-FE-01 — geração da carga do painel Agora', () => {
  it('não deixa a carga A atrasada sobrescrever a carga B mais nova', async () => {
    const { result } = renderHook(() => useDashboardAgora())
    await waitFor(() => expect(rounds[0]).toHaveLength(6))
    act(() => result.current.recarregar())
    await waitFor(() => expect(rounds[1]).toHaveLength(6))

    await act(async () => {
      rounds[1].forEach((d) => d.resolve({ data: { data: [], total: 0, hasMore: false } }))
    })
    await waitFor(() => expect(result.current.totais?.esperando).toBe(0))
    const dataDaB = result.current.atualizadoEm

    await act(async () => {
      rounds[0].forEach((d) => d.resolve({ data: { data: [], total: 1, hasMore: false } }))
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.totais?.esperando).toBe(0)
    expect(result.current.atualizadoEm).toBe(dataDaB)
  })
})
