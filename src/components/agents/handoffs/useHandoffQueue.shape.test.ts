// ─── 200 com corpo que não tem `items` (SCRUM-992) ───────────────────────────
//
// O caminho RELIGADO confiava no corpo da resposta: `setItens(lista.data.items)`
// sem guarda, dez linhas acima de um ramo degradado que guarda
// (`conversas.data.data ?? []`). **A assimetria era o defeito** — quem confia é
// justamente o caminho que vai ao ar quando a BE.6 subir.
//
// A consequência não é campo vazio: é CRASH. `undefined` entra no estado e o
// render seguinte morre em `useChipsDeFila` (`itens.filter(...)`), derrubando a
// tela inteira no ErrorBoundary.
//
// POR QUE ISSO É PIOR QUE A ARMADILHA CONHECIDA: "200 com shape velho" é o risco
// clássico de religamento, porque o `withFallback` só reage a 404/501 e não
// dispara. Aqui, além de não disparar, a tela NÃO DEGRADA — ela morre antes de
// alcançar o modo reduzido, que existe, está pronto e é bom. O resultado de um
// religamento em cima disto não seria a luz de emergência: seria tela branca.
//
// Nenhum teste cobria resposta 200 malformada. Foi por aí que passou.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const listaHandoffs = vi.fn()
const listaConversas = vi.fn()
const resumoHandoffs = vi.fn()

vi.mock('@/services/agentsOpsApi', () => ({
  handoffsApi: {
    list: (...a: unknown[]) => listaHandoffs(...a),
    summary: (...a: unknown[]) => resumoHandoffs(...a),
  },
}))
vi.mock('@/services/api', () => ({
  conversationsApi: { list: (...a: unknown[]) => listaConversas(...a) },
}))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => Promise.resolve([]) }))

const { useHandoffQueue, useChipsDeFila } = await import('./useHandoffQueue')

beforeEach(() => {
  vi.resetAllMocks()
  resumoHandoffs.mockResolvedValue({ data: null })
  listaConversas.mockResolvedValue({ data: { data: [], total: 0 } })
})

/** O que o BE.6 promete e que o caminho religado consumia sem conferir. */
const CORPO_BOM = { items: [], total: 0 }

describe('useHandoffQueue · 200 cujo corpo não traz `items`', () => {
  it('CONTROLE: com o corpo certo, a fila fica disponível e não quebra', async () => {
    listaHandoffs.mockResolvedValue({ data: CORPO_BOM })
    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))

    expect(r.result.current.disponivel).toBe(true)
    expect(r.result.current.itens).toEqual([])
    expect(r.result.current.total).toBe(0)
  })

  it('`items` AUSENTE não pode virar `undefined` no estado', async () => {
    // 200, `available: true`, e um corpo sem `items`. É o shape que o
    // `withFallback` não pega, por desenho: ele reage a status, não a corpo.
    listaHandoffs.mockResolvedValue({ data: { total: 0 } })
    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))

    expect(r.result.current.itens).toEqual([])
    // E continua RELIGADA: o corpo veio torto, mas o endpoint respondeu. Cair
    // no modo degradado aqui seria mentir sobre a disponibilidade do BE.6.
    expect(r.result.current.disponivel).toBe(true)
  })

  it('`total` ausente não vira `undefined` — ele alimenta comparação numérica', async () => {
    // `total` não crasha, mas `total <= itens.length` com `undefined` devolve
    // `false` em silêncio, e a barra de chips decide por ele. Número ausente
    // que vira decisão errada é a mesma família do chip que mente.
    listaHandoffs.mockResolvedValue({ data: { items: [] } })
    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))

    expect(r.result.current.total).toBe(0)
    expect(typeof r.result.current.total).toBe('number')
  })

  it('o corpo INTEIRO ausente também não derruba', async () => {
    listaHandoffs.mockResolvedValue({ data: {} })
    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))

    expect(r.result.current.itens).toEqual([])
    expect(r.result.current.total).toBe(0)
  })

  it('e o consumidor que crashava sobrevive ao estado resultante', async () => {
    // A prova de ponta: era `useChipsDeFila` quem morria, em `itens.filter`,
    // com a tela inteira indo para o ErrorBoundary. Aqui ele recebe o estado
    // que o hook produz no caso malformado e tem de responder normalmente.
    listaHandoffs.mockResolvedValue({ data: { total: 3 } })
    const fila = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(fila.result.current.carregando).toBe(false))

    const chips = renderHook(() =>
      useChipsDeFila(fila.result.current.itens, fila.result.current.total),
    )
    expect(chips.result.current.filas).toEqual([])
  })
})
