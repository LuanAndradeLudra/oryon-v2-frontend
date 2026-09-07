// ─── SONDA F1 do #157 — o modo degradado ignora o filtro de status ──────────
//
// Escrita pelo Calibre na revisão do #157 (`7e68b82`) e entregue à Tecelã como
// TESTE DE REGRESSÃO do conserto. Copie para
//   src/components/agents/handoffs/useHandoffQueue.degradado.test.ts
//
// COMO ELA ESTÁ HOJE: C1 FALHA (é o defeito), C2 e C3 passam.
// COMO ELA TEM QUE FICAR: os três passam.
//
// C1 é o defeito. C2 é o CONTROLE — prova que o `status` chega no endpoint
// quando o BE.6 está no ar, ou seja, o defeito é só do ramo degradado.
// C3 é a GUARDA CONTRA CORREÇÃO EXAGERADA e NÃO é opcional: sem ele, "zerar a
// lista fora de waiting" passa no C1 e esvazia a tela.
//
// Ajuste o `expect` do C1 ao que você decidir que cada segmento significa sem
// BE.6 — o que ele não pode voltar a ser é "os três devolvem a mesma coisa".

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const listaHandoffs = vi.fn()
const listaConversas = vi.fn()

vi.mock('@/services/agentsOpsApi', () => ({
  handoffsApi: {
    list: (...a: unknown[]) => listaHandoffs(...a),
    summary: () => Promise.resolve({ data: null }),
  },
}))
vi.mock('@/services/api', () => ({
  conversationsApi: { list: (...a: unknown[]) => listaConversas(...a) },
}))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => Promise.resolve([]) }))

const { useHandoffQueue } = await import('./useHandoffQueue')

const conversa = (id: string, nome: string) => ({
  id, contact: { id: 'c', displayName: nome, waId: '5511999999977' },
  lastMessageAt: new Date(Date.now() - 60_000).toISOString(),
})

// 404 = "o BE.6 não subiu ainda". `withFallback` só engole 404/501.
const erro404 = Object.assign(new Error('nope'), { response: { status: 404 } })

beforeEach(() => {
  listaHandoffs.mockReset(); listaConversas.mockReset()
  listaConversas.mockResolvedValue({ data: { data: [conversa('c1', 'Ana')], total: 1 } })
})

describe('useHandoffQueue — modo degradado × filtro de status', () => {
  it('C1 DEFEITO: waiting e resolved não podem produzir a mesma lista', async () => {
    listaHandoffs.mockRejectedValue(erro404)

    const a = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(a.result.current.carregando).toBe(false))
    const idsWaiting = a.result.current.itens.map((i) => i.id)
    const argsWaiting = JSON.stringify(listaConversas.mock.calls.at(-1))

    const b = renderHook(() => useHandoffQueue('resolved'))
    await waitFor(() => expect(b.result.current.carregando).toBe(false))
    const idsResolved = b.result.current.itens.map((i) => i.id)
    const argsResolved = JSON.stringify(listaConversas.mock.calls.at(-1))

    // Guarda de vacuidade: se o fallback não tivesse sido exercitado, os dois
    // lados seriam `undefined` e "são diferentes" passaria em vazio.
    expect(listaConversas).toHaveBeenCalledTimes(2)
    expect(a.result.current.disponivel).toBe(false)
    expect(b.result.current.disponivel).toBe(false)

    expect(argsResolved).not.toBe(argsWaiting)
    expect(idsResolved).not.toEqual(idsWaiting)
  })

  it('C2 CONTROLE: com o BE.6 no ar, o status CHEGA no endpoint', async () => {
    listaHandoffs.mockResolvedValue({ data: { items: [], total: 0 } })
    const r = renderHook(() => useHandoffQueue('resolved'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))
    expect(listaHandoffs.mock.calls[0][0]).toMatchObject({ status: 'resolved' })
    expect(r.result.current.disponivel).toBe(true)
  })

  it('C3 GUARDA: waiting degradado continua listando — não esvaziar para "consertar"', async () => {
    listaHandoffs.mockRejectedValue(erro404)
    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))
    expect(r.result.current.itens.map((i) => i.id)).toEqual(['conv:c1'])
    expect(r.result.current.disponivel).toBe(false)
  })
})
