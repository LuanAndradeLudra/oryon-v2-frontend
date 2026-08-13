// ─── BillingSettings — status pagamento + packs do backend (5.4 e 5.5) ──────────
// 5.4: se getPaymentStatus falha, mostra estado de erro e desabilita os CTAs de
//      pagamento (não assume "novo cliente" → evita cobrança duplicada).
// 5.5: os pacotes de crédito vêm do backend (getCreditPacks), não hardcoded.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { BillingSnapshot } from '@/services/billingApi'

const SNAP: BillingSnapshot = {
  plan: {
    tier: 'start', displayName: 'Start', priceMonthlyCents: 0, currency: 'BRL',
    monthlyCredits: 100, tokensPerCredit: 7000, features: {},
  },
  creditsTotal: 100, creditsUsed: 10, remaining: 90, planResetsAt: null, status: 'active',
}

vi.mock('@/hooks/useBilling', () => ({
  useBilling: () => ({ billing: SNAP, transactions: [], loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@/services/billingApi', () => ({
  billingApi: {
    getPlans: vi.fn(), getPaymentStatus: vi.fn(), getCreditPacks: vi.fn(),
    getBilling: vi.fn(), getTransactions: vi.fn(),
  },
}))

import { billingApi } from '@/services/billingApi'
import { BillingSettings } from '@/components/settings/sections/BillingSettings'

const mockApi = billingApi as unknown as Record<string, ReturnType<typeof vi.fn>>

const OK_STATUS = {
  subscribed: true, tier: 'start', status: 'active', billingType: 'PIX',
  nextDueDate: null, pendingTier: null, autoRechargeEnabled: false,
}

beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockReset())
  mockApi.getPlans.mockResolvedValue([])
})

describe('BillingSettings — status indisponível (5.4)', () => {
  it('mostra banner de erro e desabilita a compra de pacotes', async () => {
    mockApi.getCreditPacks.mockResolvedValue([{ credits: 250, valueCents: 12500 }])
    mockApi.getPaymentStatus.mockRejectedValue(new Error('down'))

    render(<BillingSettings />)

    await waitFor(() => expect(screen.getByText('Status de cobrança indisponível')).toBeInTheDocument())
    const packBtn = screen.getByText('250').closest('button')!
    expect(packBtn).toBeDisabled()
  })
})

describe('BillingSettings — packs do backend (5.5)', () => {
  it('renderiza os pacotes vindos do backend (não a lista hardcoded)', async () => {
    mockApi.getCreditPacks.mockResolvedValue([{ credits: 300, valueCents: 15000 }])
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)

    render(<BillingSettings />)

    await waitFor(() => expect(screen.getByText('300')).toBeInTheDocument())
    // o valor hardcoded antigo (250) não deve aparecer
    expect(screen.queryByText('250')).not.toBeInTheDocument()
    const packBtn = screen.getByText('300').closest('button')!
    expect(packBtn).not.toBeDisabled()
  })
})
