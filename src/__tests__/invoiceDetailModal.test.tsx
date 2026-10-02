// ─── Detalhe da fatura do cliente — CL4 e CL7 ─────────────────────────────────
// CL4: `charges.principalCents` já vem LÍQUIDO do backend (lateChargesFor usa
//      netDueCents). "Valor" mostra a face; "Notas de crédito abatidas" = face − líquido.
// CL7: uma contestação por fatura — com `disputedAt` preenchido, sem "Contestar".

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { InvoiceDetailView } from '@/services/billingApi'

vi.mock('@/services/billingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/billingApi')>()),
  billingApi: { getInvoice: vi.fn(), disputeInvoice: vi.fn() },
  openInvoicePdf: vi.fn(),
}))
vi.mock('@/hooks/useToast', () => ({ showToast: vi.fn() }))

import { billingApi } from '@/services/billingApi'
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal'

const getInvoice = billingApi.getInvoice as unknown as ReturnType<typeof vi.fn>

function detail(over: Partial<InvoiceDetailView['invoice']> = {}, principalCents = 100000): InvoiceDetailView {
  return {
    invoice: {
      id: 'inv1', number: 'F-1', kind: 'subscription', amount: '1000.00', amountCents: 100000, currency: 'BRL',
      status: 'pending', dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), paidAt: null,
      competenceMonth: '2026-10-01', description: null, createdAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(), disputeResolution: null, netDueCents: 100000, daysLate: 0, overdue: false,
      lines: [], usageReport: null, disputeReason: null, disputedAt: null,
      ...over,
    },
    charges: { daysLate: 0, principalCents, fineCents: 0, interestCents: 0, correctionCents: 0, totalCents: principalCents, missingIndexMonths: [] },
    paymentInstructions: 'Pix',
  } as InvoiceDetailView
}

beforeEach(() => { getInvoice.mockReset() })

// Intl usa espaço não separável entre "R$" e o número.
const money = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s?'))

describe('InvoiceDetailModal — CL4', () => {
  it('fatura de R$ 1.000 com R$ 300 de nota de crédito: Valor = face; abatido R$ 300; saldo R$ 700', async () => {
    // Backend: principal = líquido (70000), netDueCents = 70000, amountCents = 100000.
    getInvoice.mockResolvedValue(detail({ netDueCents: 70000 }, 70000))
    render(<InvoiceDetailModal invoiceId="inv1" onClose={() => {}} />)

    await screen.findByText(/Notas de crédito abatidas/)
    expect(screen.getByText(money('R$ 1.000,00'))).toBeInTheDocument()
    expect(screen.getByText(/Notas de crédito abatidas: -R\$\s?300,00/)).toBeInTheDocument()
    expect(screen.getByText(money('R$ 700,00'))).toBeInTheDocument()
  })

  it('sem nota de crédito: nada de "abatidas"', async () => {
    getInvoice.mockResolvedValue(detail())
    render(<InvoiceDetailModal invoiceId="inv1" onClose={() => {}} />)
    await screen.findByText(money('R$ 1.000,00'))
    expect(screen.queryByText(/Notas de crédito abatidas/)).not.toBeInTheDocument()
  })
})

describe('InvoiceDetailModal — CL7', () => {
  it('fatura em aberto dentro do prazo e nunca contestada: oferece "Contestar"', async () => {
    getInvoice.mockResolvedValue(detail())
    render(<InvoiceDetailModal invoiceId="inv1" onClose={() => {}} />)
    expect(await screen.findByRole('button', { name: /contestar/i })).toBeInTheDocument()
  })

  it('já contestada e respondida (volta a "Em aberto" com disputedAt): sem "Contestar"', async () => {
    getInvoice.mockResolvedValue(detail({ disputedAt: new Date().toISOString(), disputeResolution: 'Mantida.' }))
    render(<InvoiceDetailModal invoiceId="inv1" onClose={() => {}} />)
    await screen.findByText('Mantida.')
    expect(screen.queryByRole('button', { name: /contestar/i })).not.toBeInTheDocument()
  })
})
