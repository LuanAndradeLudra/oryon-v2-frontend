// ─── Revalidação do saldo — SCRUM-805 (F5) ──────────────────────────────────
//
// O saldo carregava uma vez por sessão do app e nunca mais: o `started` é de
// módulo, e não havia gatilho de recarga nenhum. O número na tela podia estar
// parado desde que o usuário abriu o painel, enquanto o consumo corria o dia
// inteiro.
//
// O teste que mais importa aqui não é "recarrega?" — é o que NÃO recarrega.
// Ler billing exige business_admin desde a SCRUM-694; sem a guarda de
// snapshot, cada turno de IA dispararia um 403 no navegador de todo agente
// conectado ao tenant.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { BillingSnapshot } from '@/services/billingApi'

vi.mock('@/services/billingApi', () => ({
  billingApi: { getBilling: vi.fn(), getTransactions: vi.fn() },
}))

import { billingApi } from '@/services/billingApi'
import { resetBillingState, useBilling } from '@/hooks/useBilling'

const mockApi = billingApi as unknown as {
  getBilling: ReturnType<typeof vi.fn>
  getTransactions: ReturnType<typeof vi.fn>
}

const snapshot = (): BillingSnapshot => ({
  plan: {
    tier: 'start', displayName: 'Start', priceMonthlyCents: 0, currency: 'BRL',
    monthlyCredits: 100, tokensPerCredit: 7000, features: {},
  },
  creditsTotal: 100, creditsUsed: 0, remaining: 100,
  planResetsAt: null, status: 'active',
})

/** Só a data é falsa; timers e microtasks continuam reais para os awaits. */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  resetBillingState()
  mockApi.getBilling.mockReset().mockResolvedValue(snapshot())
  mockApi.getTransactions.mockReset().mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

async function montarCarregado() {
  const h = renderHook(() => useBilling())
  await waitFor(() => expect(h.result.current.loading).toBe(false))
  mockApi.getBilling.mockClear()
  return h
}

const sinalDoSocket = () =>
  act(() => { window.dispatchEvent(new CustomEvent('billing:balance-updated')) })

const focoDaJanela = () =>
  act(() => { window.dispatchEvent(new Event('focus')) })

describe('o socket diz que MUDOU — recarrega sempre', () => {
  it('sinal recarrega o snapshot', async () => {
    await montarCarregado()
    sinalDoSocket()
    await waitFor(() => expect(mockApi.getBilling).toHaveBeenCalledTimes(1))
  })

  it('ignora a janela de frescor — acabou de carregar e recarrega assim mesmo', async () => {
    // Consumo é evento, não suspeita. Adiar por 15s aqui seria mostrar um
    // número que já se sabe errado.
    await montarCarregado()
    sinalDoSocket()
    await waitFor(() => expect(mockApi.getBilling).toHaveBeenCalledTimes(1))
  })
})

describe('foco da janela é só suspeita — respeita a janela de frescor', () => {
  it('recém-carregado NÃO refaz o fetch', async () => {
    await montarCarregado()
    focoDaJanela()
    await Promise.resolve()
    expect(mockApi.getBilling).not.toHaveBeenCalled()
  })

  it('passados 15s, refaz', async () => {
    await montarCarregado()
    vi.setSystemTime(Date.now() + 16_000)
    focoDaJanela()
    await waitFor(() => expect(mockApi.getBilling).toHaveBeenCalledTimes(1))
  })
})

describe('o que NÃO pode acontecer', () => {
  it('sem snapshot, o sinal não dispara fetch nenhum', async () => {
    // Quem não é business_admin toma 403 e nunca tem snapshot. Sem esta
    // guarda, cada turno de IA vira um 403 no navegador dele.
    mockApi.getBilling.mockReset().mockRejectedValue(new Error('403'))
    const h = renderHook(() => useBilling())
    await waitFor(() => expect(h.result.current.loading).toBe(false))
    expect(h.result.current.billing).toBeNull()
    mockApi.getBilling.mockClear()

    sinalDoSocket()
    focoDaJanela()
    await Promise.resolve()
    expect(mockApi.getBilling).not.toHaveBeenCalled()
  })

  it('rajada de sinais não empilha requisição', async () => {
    await montarCarregado()
    let resolver: (v: BillingSnapshot) => void = () => {}
    mockApi.getBilling.mockImplementation(() => new Promise((r) => { resolver = r }))

    sinalDoSocket(); sinalDoSocket(); sinalDoSocket()
    expect(mockApi.getBilling).toHaveBeenCalledTimes(1)

    await act(async () => { resolver(snapshot()) })
  })

  it('logout zera o relógio — a próxima sessão não herda o frescor da anterior', async () => {
    await montarCarregado()
    act(() => resetBillingState())
    const h = renderHook(() => useBilling())
    await waitFor(() => expect(h.result.current.loading).toBe(false))
    expect(h.result.current.billing).not.toBeNull()
  })
})
