// ─── CheckoutModal — cartão bloqueado (SCRUM-154 / item 5.6) ────────────────
// Sem VITE_BILLING_CARD_ENABLED, o método cartão fica desabilitado e NENHUM
// dado de cartão (PAN/CVV) é coletado ou enviado — só Pix. Evita trafegar
// cartão pelo nosso backend antes da tokenização server-side (risco PCI).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/services/billingApi', () => ({
  billingApi: { buyCredits: vi.fn(), subscribe: vi.fn(), changePlan: vi.fn() },
}))
import { billingApi } from '@/services/billingApi'
import { CheckoutModal } from '@/components/settings/modals/CheckoutModal'

const mockApi = billingApi as unknown as { buyCredits: ReturnType<typeof vi.fn> }

beforeEach(() => {
  mockApi.buyCredits.mockReset().mockResolvedValue({
    payment: { id: 'p', status: 'PENDING', value: 125, billingType: 'PIX', pix: { encodedImage: '', payload: 'x' } },
  })
})

const intent = { kind: 'credits', packCredits: 250, valueCents: 12500 } as const

describe('CheckoutModal — cartão bloqueado (5.6)', () => {
  it('desabilita o método cartão e não revela campos de PAN/CVV', () => {
    render(<CheckoutModal open intent={intent} onClose={() => {}} onDone={() => {}} />)
    const cardBtn = screen.getByText('Cartão (em breve)').closest('button')!
    expect(cardBtn).toBeDisabled()
    fireEvent.click(cardBtn)
    expect(screen.queryByText('Número do cartão')).not.toBeInTheDocument()
    expect(screen.queryByText('CVV')).not.toBeInTheDocument()
  })

  it('compra via Pix sem enviar dados de cartão', async () => {
    render(<CheckoutModal open intent={intent} onClose={() => {}} onDone={() => {}} />)
    fireEvent.click(screen.getByText('Gerar Pix').closest('button')!)
    await waitFor(() => expect(mockApi.buyCredits).toHaveBeenCalledTimes(1))
    const arg = mockApi.buyCredits.mock.calls[0][0]
    expect(arg.card).toBeUndefined()
    expect(arg.billingType).toBe('PIX')
  })
})
