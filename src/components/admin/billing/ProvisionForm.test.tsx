// 2ª revisão do SCRUM-1200 — criar conta pelo console (AD1, AD4, AD5, AD8, AD9, AD14).
// O corpo da prévia (POST /provision/preview) e do envio é o que o backend
// recebe: os testes conferem o corpo, não só a tela.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ProvisionPreview } from '@/services/adminBillingApi'

const { api, toast, cnpj } = vi.hoisted(() => ({
  api: { listCatalog: vi.fn(), vendableMatrix: vi.fn(), preview: vi.fn(), provision: vi.fn() },
  toast: vi.fn(),
  cnpj: vi.fn(),
}))
vi.mock('@/services/adminBillingApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminBillingApi')>()),
  adminBillingApi: api,
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))
vi.mock('@/lib/brDocuments', async (orig) => ({
  ...(await orig<typeof import('@/lib/brDocuments')>()),
  lookupCnpj: cnpj,
}))

import { ProvisionForm } from './ProvisionForm'

const PLAN = {
  id: 'p1', tier: 'professional', displayName: 'Professional', priceMonthlyCents: 100000, monthlyCredits: 5000,
  tokensPerCredit: 1000, features: { entitlements: { users: 5 } }, active: true,
}
const combo = (term: string, paymentMode: string) => ({ term, paymentMode, discountPct: 0, rollover: false, setupWaivable: false, sellable: true, showcase: true })
const MATRIX = [
  combo('annual', 'installments'), combo('annual', 'monthly'), combo('annual', 'upfront'),
  combo('semiannual', 'installments'), combo('monthly', 'monthly'),
]
const PREVIEW: ProvisionPreview = {
  termMonths: 12, installments: 12, contractedMonthlyCents: 100000, discountPct: 0, setupFeeCents: 0, paymentMethod: 'pix_invoice',
  summary: { monthlyCents: 100000, totalContractCents: 1200000, setupCents: 0, firstInvoiceCents: 100000, installmentCents: 100000, installments: 12 },
}

const lastPreviewBody = () => api.preview.mock.calls.at(-1)![0]
const submitBtn = () => screen.getByRole('button', { name: /Criar conta e gerar link/ })
const switchOf = (label: string) => within(screen.getByText(label).parentElement!).getByRole('switch')
// Formulário inteiro + prévia com debounce: na suíte completa (máquina
// carregada) os 5 s padrão do vitest estouravam.
vi.setConfig({ testTimeout: 20_000 })
const W = { timeout: 8000 }

async function renderForm() {
  render(<ProvisionForm />)
  await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/^Nome da conta/), { target: { value: 'Clínica X' } })
  fireEvent.change(screen.getByLabelText(/^Nome\*?$/), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText(/^E-mail\*?$/), { target: { value: 'ana@x.com' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.listCatalog.mockResolvedValue([PLAN])
  api.vendableMatrix.mockResolvedValue(MATRIX)
  api.preview.mockResolvedValue(PREVIEW)
  api.provision.mockResolvedValue({ organizationId: 'o', contractId: 'c', activationUrl: 'https://x/a', adminUserId: 'u', summary: PREVIEW.summary })
})

describe('AD1 — Buscar CNPJ não põe campo desconhecido no company', () => {
  it('mapeia phone/email para billingPhone/billingEmail e o envio não leva tradeName/email/phone', async () => {
    cnpj.mockResolvedValue({
      legalName: 'Clínica X LTDA', tradeName: 'Clínica X', email: 'fin@x.com', phone: '1133334444',
      addressZip: '01310100', addressCity: 'São Paulo', addressState: 'SP',
    })
    await renderForm()
    fireEvent.change(screen.getByLabelText(/^CNPJ/), { target: { value: '11.222.333/0001-81' } })
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }))
    await waitFor(() => expect(screen.getByLabelText(/^Nome da conta/)).toHaveValue('Clínica X'))
    fireEvent.change(screen.getByLabelText(/^Nome\*?$/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/^E-mail\*?$/), { target: { value: 'ana@x.com' } })
    await waitFor(() => expect(submitBtn()).toBeEnabled(), W)
    fireEvent.click(submitBtn())
    await waitFor(() => expect(api.provision).toHaveBeenCalled())
    const company = api.provision.mock.calls[0][0].company
    expect(company).not.toHaveProperty('tradeName')
    expect(company).not.toHaveProperty('email')
    expect(company).not.toHaveProperty('phone')
    expect(company).toMatchObject({ billingPhone: '1133334444', billingEmail: 'fin@x.com', legalName: 'Clínica X LTDA', taxId: '11222333000181' })
  })
})

describe('AD4 — excedente na fatura Pix seguinte', () => {
  it('não vai no corpo enquanto o operador não mexe; o padrão segue parcelas ≥ meses', async () => {
    await renderForm()
    expect(lastPreviewBody().overage).not.toHaveProperty('onNextInvoice')
    const label = 'Excedente entra na fatura Pix seguinte'
    expect(switchOf(label)).toHaveAttribute('aria-checked', 'true') // 12× Pix: fatura todo mês

    fireEvent.change(screen.getByLabelText('Parcelas'), { target: { value: '3' } })
    await waitFor(() => expect(lastPreviewBody().installments).toBe(3), W)
    expect(lastPreviewBody().overage).not.toHaveProperty('onNextInvoice')
    expect(switchOf(label)).toHaveAttribute('aria-checked', 'false') // 3×: excedente esperaria meses

    fireEvent.click(switchOf(label))
    await waitFor(() => expect(lastPreviewBody().overage.onNextInvoice).toBe(true), W)
  })
})

describe('AD5 — mensalidade: parcelas = meses do prazo', () => {
  it('de mensal para anual na mensalidade, as parcelas voltam a 12 (não ficam presas em 1)', async () => {
    await renderForm()
    fireEvent.change(screen.getByLabelText(/^Prazo/), { target: { value: 'monthly' } })
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ term: 'monthly', paymentMode: 'monthly', installments: 1 }), W)
    fireEvent.change(screen.getByLabelText(/^Prazo/), { target: { value: 'annual' } })
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ term: 'annual', paymentMode: 'monthly', installments: 12 }), W)
    expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument()
  })

  it('no parcelado, trocar o prazo volta as parcelas ao padrão do prazo novo', async () => {
    await renderForm()
    fireEvent.change(screen.getByLabelText('Parcelas'), { target: { value: '3' } })
    await waitFor(() => expect(lastPreviewBody().installments).toBe(3), W)
    fireEvent.change(screen.getByLabelText(/^Prazo/), { target: { value: 'semiannual' } })
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ term: 'semiannual', installments: 6 }), W)
  })
})

describe('AD8 — Criar conta só com a prévia dos valores atuais', () => {
  it('mudar um valor desabilita o botão até a prévia nova chegar', async () => {
    await renderForm()
    fillRequired()
    await waitFor(() => expect(submitBtn()).toBeEnabled(), W)
    fireEvent.change(screen.getByLabelText(/^Desconto/), { target: { value: '5' } })
    expect(submitBtn()).toBeDisabled()
    await waitFor(() => expect(lastPreviewBody().discountPct).toBe(5), W)
    await waitFor(() => expect(submitBtn()).toBeEnabled(), W)
  })

  it('preço fechado ligado com R$ 0 bloqueia o envio', async () => {
    await renderForm()
    fillRequired()
    await waitFor(() => expect(submitBtn()).toBeEnabled(), W)
    fireEvent.click(switchOf('Preço fechado por mês'))
    await waitFor(() => expect(lastPreviewBody().contractedMonthlyCents).toBe(0), W)
    expect(submitBtn()).toBeDisabled()
    expect(screen.getAllByText(/Informe o preço fechado/).length).toBeGreaterThan(0)
  })
})

describe('AD9 — percentuais com decimal', () => {
  it('"7,5" de desconto e "2,5" de rollover vão como 7.5 e 2.5 (não 75 e 25)', async () => {
    await renderForm()
    fireEvent.change(screen.getByLabelText(/^Desconto/), { target: { value: '7,5' } })
    fireEvent.change(screen.getByLabelText(/^Rollover/), { target: { value: '2,5' } })
    fireEvent.change(screen.getByLabelText(/^Teto do excedente/), { target: { value: '12,5' } })
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ discountPct: 7.5, rolloverPct: 2.5 }), W)
    expect(lastPreviewBody().overage.ceilingPct).toBe(12.5)
    expect(screen.getByLabelText(/^Desconto/)).toHaveValue('7,5')
  })
})

describe('AD14 — signatário e limite ilimitado', () => {
  it('signatário pela metade avisa e bloqueia o envio (não é descartado calado)', async () => {
    await renderForm()
    fillRequired()
    await waitFor(() => expect(submitBtn()).toBeEnabled(), W)
    fireEvent.change(screen.getByLabelText(/^Signatário — nome/), { target: { value: 'Carlos' } })
    expect(submitBtn()).toBeDisabled()
    expect(screen.getAllByText(/Preencha nome, CPF e e-mail do signatário/).length).toBe(2)
  })

  it('"Ilimitado" envia null explícito para o limite (sobrepõe o plano-modelo)', async () => {
    await renderForm()
    fireEvent.click(screen.getByLabelText('Usuários ilimitado'))
    await waitFor(() => expect(lastPreviewBody().entitlements).toEqual({ users: null }), W)
    fireEvent.click(screen.getByLabelText('Usuários ilimitado'))
    await waitFor(() => expect(lastPreviewBody().entitlements).toBeUndefined(), W)
  })
})
