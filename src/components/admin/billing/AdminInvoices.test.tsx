// 2ª revisão do SCRUM-1200 — faturas do operador (AD2, AD7, AD12, AD13).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { AdminInvoiceRow } from '@/services/adminBillingApi'

const { api, toast } = vi.hoisted(() => ({
  api: {
    listInvoices: vi.fn(), indexRates: vi.fn(), indexRatesStatus: vi.fn(), invoiceDetail: vi.fn(),
    registerPayment: vi.fn(), upsertIndexRate: vi.fn(), creditNote: vi.fn(), resolveDispute: vi.fn(), runIssuance: vi.fn(),
  },
  toast: vi.fn(),
}))
vi.mock('@/services/adminBillingApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminBillingApi')>()),
  adminBillingApi: api,
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

import { AdminInvoices } from './AdminInvoices'

// Vencimento como o backend grava: 12:00 de Brasília (15:00 UTC).
const row = (id: string, extra: Partial<AdminInvoiceRow> = {}): AdminInvoiceRow => ({
  id, tenantId: 'tenant-1', companyName: `Cliente ${id}`, contractId: 'c', number: `F-${id}`, kind: 'subscription',
  status: 'pending', amountCents: 100000, competenceMonth: '2026-10-01', dueAt: '2026-10-10T15:00:00.000Z',
  paidAt: null, paidAmountCents: null, disputeReason: null, disputedAmountCents: null, description: null,
  issuedAt: '2026-10-01T12:00:00.000Z', ...extra,
})
const rowOf = (number: string) => screen.getByText(number).closest('tr')!

beforeEach(() => {
  vi.clearAllMocks()
  api.indexRates.mockResolvedValue([])
  api.indexRatesStatus.mockResolvedValue({ correctionEnabled: false })
})
afterEach(() => { vi.useRealTimers() })

describe('AD7 — "Vencida" só a partir do dia seguinte ao vencimento', () => {
  it('na tarde do dia do vencimento segue "Em aberto"; no dia seguinte vira "Vencida"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T19:00:00.000Z')) // 16:00 de Brasília, dia do vencimento
    api.listInvoices.mockResolvedValue([row('1')])
    const { unmount } = render(<AdminInvoices />)
    await waitFor(() => expect(screen.getByText('F-1')).toBeInTheDocument())
    expect(within(rowOf('F-1')).getByText('Em aberto')).toBeInTheDocument()
    unmount()

    vi.setSystemTime(new Date('2026-10-11T03:30:00.000Z')) // 00:30 de Brasília do dia seguinte
    render(<AdminInvoices />)
    await waitFor(() => expect(screen.getByText('F-1')).toBeInTheDocument())
    expect(within(rowOf('F-1')).getByText('Vencida')).toBeInTheDocument()
  })
})

describe('AD13 — nota de crédito não aparece em fatura contestada', () => {
  it('contestada mostra "Resolver" e não "Nota de crédito"; em aberto mostra', async () => {
    api.listInvoices.mockResolvedValue([row('1'), row('2', { status: 'disputed', disputeReason: 'valor errado', disputedAmountCents: 1000 })])
    render(<AdminInvoices />)
    await waitFor(() => expect(screen.getByText('F-2')).toBeInTheDocument())
    expect(within(rowOf('F-1')).getByTitle('Nota de crédito')).toBeInTheDocument()
    expect(within(rowOf('F-2')).queryByTitle('Nota de crédito')).not.toBeInTheDocument()
    expect(within(rowOf('F-2')).getByRole('button', { name: /Resolver/ })).toBeInTheDocument()
  })
})

describe('AD2 — baixa com a data de hoje', () => {
  it('antes do meio-dia, "hoje" não manda meio-dia (data no futuro): omite paidAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 2, 9, 0)) // 02/10 09:00 local
    api.listInvoices.mockResolvedValue([row('1')])
    api.invoiceDetail.mockResolvedValue({
      invoice: { ...row('1'), lines: [], usageReport: null },
      charges: { daysLate: 0, principalCents: 100000, fineCents: 0, interestCents: 0, correctionCents: 0, totalCents: 100000, missingIndexMonths: [] },
      paymentInstructions: '',
    })
    api.registerPayment.mockResolvedValue({ reactivated: false, remainingOverdue: 0 })
    render(<AdminInvoices />)
    await waitFor(() => expect(screen.getByText('F-1')).toBeInTheDocument())
    fireEvent.click(within(rowOf('F-1')).getByRole('button', { name: /Baixa/ }))
    const submit = await screen.findByRole('button', { name: 'Registrar baixa' })
    fireEvent.click(submit)
    await waitFor(() => expect(api.registerPayment).toHaveBeenCalled())
    const body = api.registerPayment.mock.calls[0][1]
    expect(body.paidAt).toBeUndefined()
    expect(body.amountCents).toBe(100000)
  })
})

describe('AD12 — IPCA exige a taxa', () => {
  it('taxa vazia não salva 0%', async () => {
    api.listInvoices.mockResolvedValue([])
    render(<AdminInvoices />)
    fireEvent.change(screen.getByLabelText('Mês (AAAA-MM)'), { target: { value: '2026-09' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(api.upsertIndexRate).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('taxa'), 'error')
  })

  it('"0,44" salva 0.44', async () => {
    api.listInvoices.mockResolvedValue([])
    api.upsertIndexRate.mockResolvedValue({})
    render(<AdminInvoices />)
    fireEvent.change(screen.getByLabelText('Mês (AAAA-MM)'), { target: { value: '2026-09' } })
    fireEvent.change(screen.getByLabelText('Taxa (%)'), { target: { value: '0,44' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.upsertIndexRate).toHaveBeenCalledWith('2026-09', 0.44))
  })
})
