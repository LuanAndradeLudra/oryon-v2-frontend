// ─── BillingSettings — status e ausência de autoatendimento ─────────────────────
// 5.4: se getPaymentStatus falha, mostra estado de erro (não assume "novo cliente").
// SCRUM-1204 (Termos 4.1 c): a tela não oferece contratar, trocar de plano nem
// comprar créditos — isso passa pela equipe a partir da Proposta.

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
    getBilling: vi.fn(), getTransactions: vi.fn(), getInvoices: vi.fn(), cancel: vi.fn(),
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
  mockApi.getInvoices.mockResolvedValue([])
})

describe('BillingSettings — status indisponível (5.4)', () => {
  it('mostra banner de erro', async () => {
    mockApi.getPaymentStatus.mockRejectedValue(new Error('down'))

    render(<BillingSettings />)

    await waitFor(() => expect(screen.getByText('Status de cobrança indisponível')).toBeInTheDocument())
  })
})

describe('BillingSettings — sem autoatendimento (SCRUM-1204, Termos 4.1 c)', () => {
  it('não oferece contratar, fazer upgrade nem comprar pacote', async () => {
    mockApi.getPaymentStatus.mockResolvedValue({ ...OK_STATUS, subscribed: false })

    render(<BillingSettings />)

    await waitFor(() => expect(screen.getByText('Mudar de plano ou comprar créditos')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /contratar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/comprar créditos avulsos/i)).not.toBeInTheDocument()
    expect(mockApi.getCreditPacks).not.toHaveBeenCalled()
  })

  it('não menciona gateway mock', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    render(<BillingSettings />)
    await waitFor(() => expect(screen.getByText('Plano atual')).toBeInTheDocument())
    expect(screen.queryByText(/mock/i)).not.toBeInTheDocument()
  })
})
