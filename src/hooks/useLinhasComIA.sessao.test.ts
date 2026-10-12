// Revisão 02/10: o conjunto de linhas com IA é do módulo e sobrevivia ao
// logout (SPA). Sair zera; leitura em voo da conta anterior não grava depois.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const { listDetailed, listAgents } = vi.hoisted(() => ({ listDetailed: vi.fn(), listAgents: vi.fn() }))
vi.mock('@/services/api', () => ({ whatsappNumbersApi: { listDetailed } }))
vi.mock('@/services/agentsApi', () => ({ listAgents }))
vi.mock('@/lib/filaAgora', () => ({ calcularLinhasComIA: (n: Array<{ id: string }>) => new Set(n.map((x) => x.id)) }))

import { useLinhasDaIA, resetLinhasComIA } from './useLinhasComIA'

beforeEach(() => {
  resetLinhasComIA()
  listDetailed.mockReset(); listAgents.mockReset()
  listAgents.mockResolvedValue([])
})

describe('linhas com IA · troca de sessão', () => {
  it('sair esquece as linhas da conta anterior', async () => {
    listDetailed.mockResolvedValue({ data: [{ id: 'linha-da-conta-X' }] })
    const { result } = renderHook(() => useLinhasDaIA())
    await waitFor(() => expect(result.current.conhecidas).toBe(true))
    expect([...result.current.linhasComIA]).toEqual(['linha-da-conta-X'])
    act(() => resetLinhasComIA())
    expect(result.current.conhecidas).toBe(false)
    expect(result.current.linhasComIA.size).toBe(0)
  })

  it('leitura em voo da conta anterior não grava depois do reset', async () => {
    let soltar: (v: unknown) => void = () => {}
    listDetailed.mockReturnValue(new Promise((r) => { soltar = r }))
    const { result } = renderHook(() => useLinhasDaIA())
    act(() => resetLinhasComIA())
    await act(async () => { soltar({ data: [{ id: 'linha-da-conta-X' }] }); await new Promise((r) => setTimeout(r, 0)) })
    expect(result.current.conhecidas).toBe(false)
  })
})
