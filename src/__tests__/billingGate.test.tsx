// ─── useBilling / useCreditGate — SCRUM-172 (itens 5.2 e 5.3) ───────────────
// 5.3: useCreditGate é fail-CLOSED — sem snapshot válido do ledger (API falha),
//      hasCredits=false + unavailable=true (não libera consumo por indisponib.).
// 5.2: resetBillingState() limpa o store module-scoped (evita vazar saldo entre
//      sessões/tenants no logout).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { BillingSnapshot } from '@/services/billingApi'

vi.mock('@/services/billingApi', () => ({
  billingApi: { getBilling: vi.fn(), getTransactions: vi.fn() },
}))

import { billingApi } from '@/services/billingApi'
import { useCreditGate } from '@/hooks/usePlanGate'
import { resetBillingState, useBilling } from '@/hooks/useBilling'

const mockApi = billingApi as unknown as {
  getBilling: ReturnType<typeof vi.fn>
  getTransactions: ReturnType<typeof vi.fn>
}

function snapshot(over: Partial<BillingSnapshot>): BillingSnapshot {
  return {
    plan: {
      tier: 'start', displayName: 'Start', priceMonthlyCents: 0, currency: 'BRL',
      monthlyCredits: 100, tokensPerCredit: 7000, features: {},
    },
    creditsTotal: 100,
    creditsUsed: 0,
    remaining: 100,
    planResetsAt: null,
    status: 'active',
    ...over,
  }
}

beforeEach(() => {
  resetBillingState()
  mockApi.getBilling.mockReset()
  mockApi.getTransactions.mockReset().mockResolvedValue([])
})

describe('useCreditGate — fail-closed (5.3)', () => {
  it('bloqueia (unavailable) quando a API de billing falha', async () => {
    mockApi.getBilling.mockRejectedValue(new Error('billing down'))
    const { result } = renderHook(() => useCreditGate())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasCredits).toBe(false)
    expect(result.current.unavailable).toBe(true)
  })

  it('libera quando há snapshot válido com saldo', async () => {
    mockApi.getBilling.mockResolvedValue(snapshot({ creditsTotal: 100, creditsUsed: 40 }))
    const { result } = renderHook(() => useCreditGate())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasCredits).toBe(true)
    expect(result.current.unavailable).toBe(false)
    expect(result.current.percentUsed).toBe(40)
  })

  it('bloqueia (sem unavailable) quando o saldo está esgotado', async () => {
    mockApi.getBilling.mockResolvedValue(snapshot({ creditsTotal: 100, creditsUsed: 100 }))
    const { result } = renderHook(() => useCreditGate())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasCredits).toBe(false)
    expect(result.current.unavailable).toBe(false)
  })
})

describe('resetBillingState (5.2)', () => {
  it('limpa o snapshot carregado (não vaza entre sessões)', async () => {
    mockApi.getBilling.mockResolvedValue(snapshot({ creditsUsed: 10 }))
    const { result } = renderHook(() => useBilling())
    await waitFor(() => expect(result.current.billing).not.toBeNull())

    act(() => resetBillingState())
    expect(result.current.billing).toBeNull()
    expect(result.current.transactions).toEqual([])
  })
})
