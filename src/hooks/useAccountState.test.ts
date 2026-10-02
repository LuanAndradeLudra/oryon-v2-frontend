// Estado da conta (SCRUM-1210): troca de usuário com um fetch em voo não pode
// deixar o novo usuário sem estado (o portão de suspensão ficaria aberto).
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const pending: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(
      () =>
        new Promise((resolve, reject) => {
          pending.push({ resolve, reject })
        }),
    ),
  },
}))

let auth = { user: { id: 'A' }, isAuthenticated: true }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }))

import { useAccountState, resetAccountState } from './useAccountState'

const state = (suspended: boolean) => ({
  data: { status: suspended ? 'suspended' : 'active', suspended, canCreateResources: !suspended, isOwner: true, modules: {} },
})

describe('useAccountState — troca de usuário', () => {
  it('resposta de A chegando depois do login de B não é usada, e B carrega o próprio estado', async () => {
    const { result, rerender } = renderHook(() => useAccountState())
    expect(pending).toHaveLength(1) // fetch de A em voo

    act(() => resetAccountState()) // logout de A
    auth = { user: { id: 'B' }, isAuthenticated: true }
    rerender()
    expect(pending).toHaveLength(2) // B não reaproveita o fetch de A

    await act(async () => pending[0].resolve(state(false)))
    expect(result.current.state).toBeNull()

    await act(async () => pending[1].resolve(state(true)))
    await waitFor(() => expect(result.current.state?.suspended).toBe(true))
  })
})

describe('useAccountState — carga a frio (SCRUM-1210)', () => {
  it('só fica "carregado" depois da resposta; falha também conta (nada trava)', async () => {
    act(() => resetAccountState())
    auth = { user: { id: 'C' }, isAuthenticated: true }
    const before = pending.length
    const { result } = renderHook(() => useAccountState())
    expect(result.current.loaded).toBe(false)
    expect(pending.length).toBe(before + 1)

    await act(async () => pending[before].reject(new Error('rede')))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.state).toBeNull()
  })
})
