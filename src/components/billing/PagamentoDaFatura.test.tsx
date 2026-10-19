// Integração 1200 + gateway Gates2B (19/10): como pagar a fatura na tela.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/services/billingApi', async (orig) => ({
  ...(await orig<typeof import('@/services/billingApi')>()),
  billingApi: { getInvoicePayment: vi.fn() },
}))
vi.mock('@/hooks/useToast', () => ({ showToast: vi.fn() }))

import { billingApi } from '@/services/billingApi'
import { showToast } from '@/hooks/useToast'
import { PagamentoDaFatura } from './PagamentoDaFatura'

const getPayment = billingApi.getInvoicePayment as unknown as ReturnType<typeof vi.fn>
const base = { amountCents: 149700, expiresAt: '2026-10-21T02:59:59.999Z', pixPayload: null, pixImage: null, checkoutUrl: null }

beforeEach(() => { getPayment.mockReset() })

describe('PagamentoDaFatura', () => {
  it('Pix: QR, copia e cola e copiar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    getPayment.mockResolvedValue({ ...base, method: 'PIX', pixPayload: '00020126PIX', pixImage: 'iVBOR' })
    render(<PagamentoDaFatura invoiceId="i1" instrucoes="Chave X" />)
    expect(await screen.findByText('00020126PIX')).toBeInTheDocument()
    expect(screen.getByAltText('QR Code do Pix desta fatura')).toHaveAttribute('src', 'data:image/png;base64,iVBOR')
    expect(screen.getByText(/R\$\s?1\.497,00 com Pix/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Copiar código/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('00020126PIX'))
    expect(showToast).toHaveBeenCalledWith('Código Pix copiado.', 'success')
    expect(screen.queryByText('Chave X')).toBeNull()
  })

  it('cartão: link do checkout hospedado em nova aba', async () => {
    getPayment.mockResolvedValue({ ...base, method: 'CREDIT_CARD', checkoutUrl: 'https://pay.test/x' })
    render(<PagamentoDaFatura invoiceId="i1" instrucoes="Chave X" />)
    const link = await screen.findByRole('link', { name: /Pagar com cartão/ })
    expect(link).toHaveAttribute('href', 'https://pay.test/x')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('sem gateway ou com falha: instruções de pagamento', async () => {
    getPayment.mockResolvedValueOnce(null)
    const { unmount } = render(<PagamentoDaFatura invoiceId="i1" instrucoes="Chave X" />)
    expect(await screen.findByText('Chave X')).toBeInTheDocument()
    unmount()
    getPayment.mockRejectedValueOnce(new Error('503'))
    render(<PagamentoDaFatura invoiceId="i2" instrucoes="Chave Y" />)
    expect(await screen.findByText('Chave Y')).toBeInTheDocument()
  })
})
