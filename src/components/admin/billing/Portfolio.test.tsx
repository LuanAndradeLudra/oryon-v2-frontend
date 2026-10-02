// 2ª revisão do SCRUM-1200 — carteira (AD10).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { PortfolioRow } from '@/services/adminBillingApi'

const { api, toast } = vi.hoisted(() => ({
  api: { portfolio: vi.fn(), reconciliation: vi.fn(), cancelPreview: vi.fn(), cancelContract: vi.fn(), previewPlanChange: vi.fn() },
  toast: vi.fn(),
}))
vi.mock('@/services/adminBillingApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminBillingApi')>()),
  adminBillingApi: api,
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

import { Portfolio } from './Portfolio'

const row = (id: string): PortfolioRow => ({
  tenantId: `t-${id}`, contractId: `c-${id}`, companyName: `Conta ${id}`, tier: 'professional', displayName: 'Professional',
  term: 'annual', paymentMethod: 'pix_invoice', installments: 12, contractedMonthlyCents: 100000, status: 'active',
  suspended: false, startsAt: '2026-01-01T15:00:00.000Z', endsAt: '2027-01-01T15:00:00.000Z', autoRenew: true,
  cancellation: null, overdueCount: 0, overdueCents: 0, oldestDueAt: null,
})

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.portfolio.mockResolvedValue({ rows: [row('A'), row('B')], truncated: false })
})

describe('AD10 — prévia de cancelamento de uma conta não aparece no diálogo de outra', () => {
  it('resposta atrasada da conta A é descartada depois de abrir a conta B', async () => {
    type Preview = { afterRenewal: boolean; effectiveAt: string; currentEndsAt: string | null; alreadyCanceled: boolean; message: string }
    const a = deferred<Preview>()
    const b = deferred<Preview>()
    api.cancelPreview.mockImplementation((tenantId: string) => (tenantId === 't-A' ? a.promise : b.promise))
    render(<Portfolio />)
    await waitFor(() => expect(screen.getAllByTitle('Registrar cancelamento pedido pelo cliente')).toHaveLength(2))
    const [cancelA, cancelB] = screen.getAllByTitle('Registrar cancelamento pedido pelo cliente')

    fireEvent.click(cancelA)
    fireEvent.click(cancelB)
    const base = { afterRenewal: false, effectiveAt: '2027-01-01T15:00:00.000Z', currentEndsAt: null, alreadyCanceled: false }
    await act(async () => { b.resolve({ ...base, message: 'Prévia da conta B' }) })
    await act(async () => { a.resolve({ ...base, message: 'Prévia da conta A' }) })

    expect(screen.getByText('Prévia da conta B')).toBeInTheDocument()
    expect(screen.queryByText('Prévia da conta A')).not.toBeInTheDocument()
  })
})
