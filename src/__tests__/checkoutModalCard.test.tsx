// Pix e cartão convivem no mesmo checkout. O número do cartão não é coletado:
// o pagamento abre no checkout hospedado da Gates2b.

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

describe('CheckoutModal — Pix e cartão', () => {
  it('oferece os dois meios e não coleta PAN/CVV', () => {
    render(<CheckoutModal open intent={intent} onClose={() => {}} onDone={() => {}} />)
    expect(screen.getByText('Pix').closest('button')).toBeEnabled()
    expect(screen.getByText('Cartão').closest('button')).toBeEnabled()
    fireEvent.click(screen.getByText('Cartão'))
    expect(screen.queryByText('Número do cartão')).not.toBeInTheDocument()
    expect(screen.queryByText('CVV')).not.toBeInTheDocument()
    expect(screen.getByText(/checkout da Gates2b/)).toBeInTheDocument()
  })

  it('compra via Pix sem enviar dados de cartão', async () => {
    render(<CheckoutModal open intent={intent} onClose={() => {}} onDone={() => {}} />)
    fireEvent.click(screen.getByText('Gerar Pix').closest('button')!)
    await waitFor(() => expect(mockApi.buyCredits).toHaveBeenCalledTimes(1))
    const arg = mockApi.buyCredits.mock.calls[0][0]
    expect(arg.card).toBeUndefined()
    expect(arg.billingType).toBe('PIX')
  })

  it('compra no cartão só informando o meio, sem PAN', async () => {
    render(<CheckoutModal open intent={intent} onClose={() => {}} onDone={() => {}} />)
    fireEvent.click(screen.getByText('Cartão'))
    fireEvent.click(screen.getByText('Pagar com cartão'))
    await waitFor(() => expect(mockApi.buyCredits).toHaveBeenCalledTimes(1))
    const arg = mockApi.buyCredits.mock.calls[0][0]
    expect(arg.card).toBeUndefined()
    expect(arg.billingType).toBe('CREDIT_CARD')
  })
})
