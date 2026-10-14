// ─── BillingSettings — status e ausência de autoatendimento ─────────────────────
// 5.4: se getPaymentStatus falha, mostra estado de erro (não assume "novo cliente").
// SCRUM-1204 (Termos 4.1 c): a tela não oferece contratar, trocar de plano nem
// comprar créditos — isso passa pela equipe a partir da Proposta.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
vi.mock('@/services/billingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/billingApi')>()),
  billingApi: {
    getPlans: vi.fn(), getPaymentStatus: vi.fn(), getCreditPacks: vi.fn(),
    getBilling: vi.fn(), getTransactions: vi.fn(), getInvoices: vi.fn(),
    getContract: vi.fn(), getInvoice: vi.fn(), disputeInvoice: vi.fn(),
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
  mockApi.getContract.mockResolvedValue({ contract: null, state: { suspended: false }, usage: {}, cycle: null, nextInvoice: null })
})

describe('BillingSettings — status indisponível (5.4)', () => {
  it('mostra banner de erro', async () => {
    mockApi.getPaymentStatus.mockRejectedValue(new Error('down'))

    render(<MemoryRouter><BillingSettings /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Status de cobrança indisponível')).toBeInTheDocument())
  })
})

describe('BillingSettings — sem autoatendimento (SCRUM-1204, Termos 4.1 c)', () => {
  it('não oferece contratar, fazer upgrade nem comprar pacote', async () => {
    mockApi.getPaymentStatus.mockResolvedValue({ ...OK_STATUS, subscribed: false })

    render(<MemoryRouter><BillingSettings /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Mudar de plano ou comprar créditos')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /contratar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/comprar créditos avulsos/i)).not.toBeInTheDocument()
    expect(mockApi.getCreditPacks).not.toHaveBeenCalled()
  })

  it('A5/A18 — sem botão de cancelar: o cliente é orientado a falar com a equipe', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)

    render(<MemoryRouter><BillingSettings /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText(/Para cancelar ou não renovar, fale com a equipe Oryon/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /cancelar assinatura/i })).not.toBeInTheDocument()
  })

  it('SCRUM-1210 — mostra o preço CONTRATADO e os limites do contrato com o uso', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    mockApi.getContract.mockResolvedValue({
      contract: {
        displayName: 'Professional Clínica', tier: 'professional', term: 'annual', termMonths: 12, installments: 12,
        contractedMonthlyCents: 250000, paymentMethod: 'pix_invoice', billingDay: 10, startsAt: '2026-10-01', endsAt: '2027-10-01',
        autoRenew: true, monthlyCredits: 3000, overage: { priceCents: 50, onNextInvoice: true, policy: 'charge' },
        entitlements: { waNumbers: 2 }, modules: { copilot: true, marketing: false }, proposalRef: null, status: 'active',
      },
      state: { suspended: false }, usage: { waNumbers: 1 },
      cycle: { creditsTotal: 3000, creditsUsed: 100, overageCredits: 0, startsAt: null, resetsAt: null, pendingOverageCredits: 0 },
      nextInvoice: null,
    })
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Oryon Professional Clínica')).toBeInTheDocument())
    expect(screen.getByText(/R\$\s?2\.500,00/)).toBeInTheDocument()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
    expect(screen.getByText('Fatura mensal por Pix', { exact: false })).toBeInTheDocument()
  })

  it('não menciona gateway mock', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Plano atual')).toBeInTheDocument())
    expect(screen.queryByText(/mock/i)).not.toBeInTheDocument()
  })
})

describe('BillingSettings — faturas (SCRUM-1209)', () => {
  const base = {
    number: null, currency: 'BRL', paidAt: null, competenceMonth: null, description: null,
    createdAt: '2026-09-01T12:00:00Z', disputeResolution: null, daysLate: 0, overdue: false,
  }

  it('"Vencida" e a faixa de atraso seguem o `overdue` do backend, não o dueAt local', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    mockApi.getInvoices.mockResolvedValue([
      // Venceu pelo relógio local, mas o backend diz que não está em atraso (ex.: abatida por nota de crédito).
      { ...base, id: 'a', number: 'F-1', kind: 'subscription', amount: '100.00', status: 'pending', dueAt: '2020-01-01T00:00:00Z', netDueCents: 0 },
      { ...base, id: 'b', number: 'F-2', kind: 'subscription', amount: '200.00', status: 'past_due', dueAt: '2020-02-01T00:00:00Z', netDueCents: 20000, daysLate: 3, overdue: true },
    ])
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Pagamento em atraso')).toBeInTheDocument())
    expect(screen.getByText(/1 fatura\(s\) vencida\(s\)/)).toBeInTheDocument()
    expect(screen.getAllByText('Vencida')).toHaveLength(1)
    expect(screen.getByText('Em aberto')).toBeInTheDocument()
  })

  it('nota de crédito aparece negativa, com referência, e nunca como "Paga"', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    mockApi.getInvoices.mockResolvedValue([
      { ...base, id: 'orig', number: 'F-9', kind: 'subscription', amount: '100.00', status: 'paid', dueAt: null, netDueCents: 5000 },
      { ...base, id: 'nc', number: 'NC-1', kind: 'credit_note', amount: '50.00', status: 'paid', dueAt: null, netDueCents: 5000, referenceInvoiceId: 'orig' },
    ])
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/NC-1/)).toBeInTheDocument())
    expect(screen.getByText(/-R\$\s?50,00/)).toBeInTheDocument()
    expect(screen.getByText(/Estorno da fatura F-9/)).toBeInTheDocument()
    expect(screen.getAllByText('Paga')).toHaveLength(1) // só a fatura original
    expect(screen.getAllByText('Nota de crédito').length).toBeGreaterThan(0)
  })
})

describe('BillingSettings — falha de carga e estado da conta (CL6)', () => {
  it('falha ao carregar faturas mostra erro com "Tentar novamente", não "nenhuma fatura"; tentar recarrega', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    mockApi.getInvoices.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce([])
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Não foi possível carregar as faturas')).toBeInTheDocument())
    expect(screen.queryByText('Nenhuma fatura emitida ainda.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByText('Nenhuma fatura emitida ainda.')).toBeInTheDocument())
    expect(mockApi.getInvoices).toHaveBeenCalledTimes(2)
  })

  it('falha ao carregar o contrato mostra erro com "Tentar novamente"', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    mockApi.getContract.mockRejectedValueOnce(new Error('rede'))
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Não foi possível carregar o seu contrato')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('evento de socket billing:account-state recarrega contrato, faturas e status (suspensão aparece sem F5)', async () => {
    mockApi.getPaymentStatus.mockResolvedValue(OK_STATUS)
    render(<MemoryRouter><BillingSettings /></MemoryRouter>)
    await waitFor(() => expect(mockApi.getContract).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Conta suspensa por pendência financeira')).not.toBeInTheDocument()

    mockApi.getContract.mockResolvedValue({ contract: null, state: { suspended: true }, usage: {}, cycle: null, nextInvoice: null })
    act(() => { window.dispatchEvent(new Event('billing:account-state')) })

    await waitFor(() => expect(screen.getByText('Conta suspensa por pendência financeira')).toBeInTheDocument())
    expect(mockApi.getInvoices).toHaveBeenCalledTimes(2)
    expect(mockApi.getPaymentStatus).toHaveBeenCalledTimes(2)
  })
})
