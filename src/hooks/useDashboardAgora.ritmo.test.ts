// Revisão 02/10: mensagem chegando a cada 2 s não pode disparar a carga
// inteira do painel a cada 2 s; e aba escondida não carrega.
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { listDetailed, handlers } = vi.hoisted(() => ({
  listDetailed: vi.fn(async () => ({ data: [] })),
  handlers: new Map<string, () => void>(),
}))
vi.mock('@/services/api', () => ({
  api: { get: vi.fn(async () => ({ data: null })) },
  conversationsApi: { list: vi.fn(async () => ({ data: { data: [], total: 0, hasMore: false } })) },
  usersApi: { available: vi.fn(async () => ({ data: [] })) },
  whatsappNumbersApi: { listDetailed },
}))
vi.mock('@/services/agentsApi', () => ({ listAgents: vi.fn(async () => []) }))
vi.mock('@/services/socket', () => ({
  connectSocket: () => ({ on: (e: string, fn: () => void) => handlers.set(e, fn), off: vi.fn() }),
}))

import { useDashboardAgora } from './useDashboardAgora'

const emitir = () => handlers.get('message:new')?.()
const cargas = () => listDetailed.mock.calls.length

beforeEach(() => { vi.useFakeTimers(); listDetailed.mockClear(); handlers.clear() })
afterEach(() => { vi.useRealTimers(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }) })

describe('painel Agora · ritmo das recargas', () => {
  it('evento a cada 2 s por 10 s: no máximo uma carga a cada 5 s', async () => {
    renderHook(() => useDashboardAgora())
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(cargas()).toBe(1)
    for (let i = 0; i < 5; i++) {
      await act(async () => { emitir(); await vi.advanceTimersByTimeAsync(2_000) })
    }
    expect(cargas()).toBeLessThanOrEqual(3)
  })

  it('aba escondida não carrega por evento; ao voltar, carrega uma vez', async () => {
    renderHook(() => useDashboardAgora())
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    for (let i = 0; i < 5; i++) {
      await act(async () => { emitir(); await vi.advanceTimersByTimeAsync(2_000) })
    }
    expect(cargas()).toBe(1)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(6_000) })
    expect(cargas()).toBe(2)
  })
})
