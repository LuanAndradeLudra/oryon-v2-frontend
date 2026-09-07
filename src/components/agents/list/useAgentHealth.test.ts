// useAgentHealth (A4/SCRUM-1015) — achados 1 e 4 do Lince, mesma raiz.
//
// A primeira versão marcava o agente como "já buscado" ANTES da requisição
// resolver. Isso produzia dois defeitos silenciosos:
//   · um 500 transitório escondia a saúde daquela linha pelo resto da sessão —
//     fechar e reabrir não refazia a busca;
//   · não havia como reagir a um teste, que muda `last_test_at`, então a linha
//     continuava dizendo "Último teste: nunca" depois de testar.
//
// Estes testes provam os dois pelo comportamento observável do hook, não por
// leitura: contam quantas vezes o endpoint foi realmente chamado.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const health = vi.fn()

vi.mock('@/services/agentsOpsApi', () => ({
  agentDraftApi: { health: (id: string) => health(id) },
}))

import { useAgentHealth } from './useAgentHealth'

const OK = { last_test_at: '2026-09-01T00:00:00.000Z', prompt_version: 3, knowledge_count: 4, tool_warnings: [] }

beforeEach(() => { health.mockReset() })

describe('useAgentHealth', () => {
  it('busca uma vez por linha e reaproveita ao reabrir a mesma', async () => {
    health.mockResolvedValue(OK)
    const { result, rerender } = renderHook(({ id }) => useAgentHealth(id), {
      initialProps: { id: 'a1' as string | null },
    })

    await waitFor(() => expect(result.current.health).toEqual(OK))
    expect(health).toHaveBeenCalledTimes(1)

    rerender({ id: null })
    rerender({ id: 'a1' })
    await waitFor(() => expect(result.current.health).toEqual(OK))
    expect(health).toHaveBeenCalledTimes(1)
  })

  // O achado 4. Um erro que não é 404/501 propaga pelo withFallback; o que não
  // pode acontecer é a linha ficar cega até o próximo F5.
  it('depois de um 500, reabrir a linha TENTA DE NOVO em vez de ficar cego', async () => {
    health.mockRejectedValueOnce({ status: 500 })
    const { result, rerender } = renderHook(({ id }) => useAgentHealth(id), {
      initialProps: { id: 'a1' as string | null },
    })

    await waitFor(() => expect(health).toHaveBeenCalledTimes(1))
    expect(result.current.health).toBeUndefined()

    health.mockResolvedValue(OK)
    rerender({ id: null })
    rerender({ id: 'a1' })

    await waitFor(() => expect(result.current.health).toEqual(OK))
    expect(health).toHaveBeenCalledTimes(2)
  })

  // O achado 1: testar envelhece a saúde, e sem isto a linha mentia "nunca".
  it('invalidar força nova busca da mesma linha', async () => {
    health.mockResolvedValue(OK)
    const { result } = renderHook(() => useAgentHealth('a1'))

    await waitFor(() => expect(result.current.health).toEqual(OK))
    expect(health).toHaveBeenCalledTimes(1)

    const novo = { ...OK, last_test_at: '2026-09-06T00:00:00.000Z' }
    health.mockResolvedValue(novo)
    act(() => { result.current.invalidar('a1') })

    await waitFor(() => expect(result.current.health).toEqual(novo))
    expect(health).toHaveBeenCalledTimes(2)
  })

  it('sem linha aberta, não busca nada', async () => {
    renderHook(() => useAgentHealth(null))
    await waitFor(() => expect(health).not.toHaveBeenCalled())
  })
})
