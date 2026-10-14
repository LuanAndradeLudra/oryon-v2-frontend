// Nova conta em quatro passos (onda C do SCRUM-1200). Herda as regressões do
// ProvisionForm (2ª revisão: AD1, AD4, AD5, AD8, AD9, AD14) e acrescenta as
// regras do fluxo novo: obrigatoriedade dos dados da 1ª fatura, Pix fixo,
// Enterprise só com preço negociado e passo na URL. O corpo da prévia (POST
// /provision/preview) e do envio é o que o backend recebe: os testes conferem
// o corpo, não só a tela.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

import { ProvisionWizard } from './ProvisionWizard'

const PLAN = {
  id: 'p1', tier: 'professional', displayName: 'Professional', priceMonthlyCents: 100000, monthlyCredits: 5000,
  tokensPerCredit: 1000, features: { entitlements: { users: 5 } }, active: true,
}
const ENTERPRISE = { ...PLAN, id: 'p2', tier: 'enterprise', displayName: 'Enterprise', priceMonthlyCents: 0, monthlyCredits: null }
const combo = (term: string, paymentMode: string, extra = {}) => ({ term, paymentMode, discountPct: 0, rollover: false, setupWaivable: false, sellable: true, showcase: true, ...extra })
const MATRIX = [
  combo('annual', 'installments'), combo('annual', 'monthly'), combo('annual', 'upfront', { discountPct: 10 }),
  combo('semiannual', 'installments'), combo('monthly', 'monthly'), combo('semiannual', 'monthly', { sellable: false }),
]
const PREVIEW: ProvisionPreview = {
  termMonths: 12, installments: 12, contractedMonthlyCents: 100000, discountPct: 0, setupFeeCents: 0, paymentMethod: 'pix_invoice',
  summary: { monthlyCents: 100000, totalContractCents: 1200000, setupCents: 0, firstInvoiceCents: 100000, installmentCents: 100000, installments: 12 },
}
const LOOKUP = {
  legalName: 'Clínica X LTDA', tradeName: 'Clínica X', email: 'fin@x.com', phone: '1133334444',
  addressZip: '01310100', addressStreet: 'Av. Paulista', addressNumber: '1000', addressDistrict: 'Bela Vista',
  addressCity: 'São Paulo', addressState: 'SP',
}

vi.setConfig({ testTimeout: 20_000 })
const W = { timeout: 8000 }
const lastPreviewBody = () => api.preview.mock.calls.at(-1)![0]
const btn = (name: RegExp) => screen.getByRole('button', { name })
const opcao = (titulo: string) => screen.getByRole('button', { name: new RegExp(titulo) })

function renderWizard(passo = 1) {
  return render(
    <MemoryRouter initialEntries={[`/admin/billing?passo=${passo}`]}>
      <ProvisionWizard />
    </MemoryRouter>,
  )
}

/** Passo 1 completo pela busca do CNPJ (o caminho mais comum do operador). */
async function preencherCliente() {
  cnpj.mockResolvedValue(LOOKUP)
  fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '11.222.333/0001-81' } })
  fireEvent.click(btn(/^Buscar$/))
  await waitFor(() => expect(screen.getByLabelText(/^Nome da conta/)).toHaveValue('Clínica X'))
  fireEvent.change(screen.getByLabelText(/^Nome\*?$/), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText(/^E-mail\*?/), { target: { value: 'ana@x.com' } })
}

async function irAteRevisar() {
  renderWizard(1)
  await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
  await preencherCliente()
  fireEvent.click(btn(/Continuar/))
  await screen.findByText('Condição de pagamento')
}

beforeEach(() => {
  vi.clearAllMocks()
  api.listCatalog.mockResolvedValue([PLAN, ENTERPRISE])
  api.vendableMatrix.mockResolvedValue(MATRIX)
  api.preview.mockResolvedValue(PREVIEW)
  api.provision.mockResolvedValue({ organizationId: 'o', contractId: 'c', activationUrl: 'https://x/a', adminUserId: 'u', summary: PREVIEW.summary })
})

describe('Passo 1 — dados da primeira fatura', () => {
  it('sem razão social e endereço o "Continuar" fica bloqueado e o painel diz o que falta', async () => {
    renderWizard(1)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '11.222.333/0001-81' } })
    fireEvent.change(screen.getByLabelText(/^Nome da conta/), { target: { value: 'Clínica X' } })
    fireEvent.change(screen.getByLabelText(/^Nome\*?$/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/^E-mail\*?/), { target: { value: 'ana@x.com' } })
    expect(btn(/Continuar/)).toBeDisabled()
    expect(screen.getByText(/Falta: razão social e endereço/)).toBeInTheDocument()
  })

  it('busca do CNPJ incompleta avisa e mantém os campos abertos para completar', async () => {
    cnpj.mockResolvedValue({ legalName: 'Clínica X LTDA', addressCity: 'São Paulo', addressState: 'SP' })
    renderWizard(1)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '11.222.333/0001-81' } })
    fireEvent.click(btn(/^Buscar$/))
    expect(await screen.findByText(/A consulta não trouxe todos os dados/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Rua/)).toHaveValue('')
  })
})

describe('AD1 — Buscar CNPJ não põe campo desconhecido no company', () => {
  it('mapeia phone/email para billingPhone/billingEmail e o envio não leva tradeName/email/phone', async () => {
    await irAteRevisar()
    fireEvent.click(btn(/Continuar/))
    fireEvent.click(await screen.findByRole('button', { name: /^Revisar$/ }))
    const criar = await screen.findByRole('button', { name: /Criar conta e gerar link/ })
    await waitFor(() => expect(criar).toBeEnabled(), W)
    fireEvent.click(criar)
    await waitFor(() => expect(api.provision).toHaveBeenCalled())
    const body = api.provision.mock.calls[0][0]
    expect(body.company).not.toHaveProperty('tradeName')
    expect(body.company).not.toHaveProperty('email')
    expect(body.company).not.toHaveProperty('phone')
    expect(body.company).toMatchObject({ billingPhone: '1133334444', billingEmail: 'fin@x.com', legalName: 'Clínica X LTDA', taxId: '11222333000181', addressZip: '01310100' })
    expect(body.paymentMethod).toBe('pix_invoice') // Pix fixo até o checkout hospedado
    expect(await screen.findByText('Conta criada')).toBeInTheDocument()
  })
})

describe('AD4 — excedente na fatura Pix seguinte', () => {
  it('não vai no corpo enquanto o operador não mexe; o padrão segue parcelas ≥ meses', async () => {
    renderWizard(3)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    const sw = () => screen.getByRole('switch', { name: 'Excedente entra na fatura Pix seguinte' })
    expect(lastPreviewBody().overage).not.toHaveProperty('onNextInvoice')
    expect(sw()).toHaveAttribute('aria-checked', 'true') // 12× Pix: fatura todo mês
    fireEvent.click(sw())
    await waitFor(() => expect(lastPreviewBody().overage.onNextInvoice).toBe(false), W)
  })

  it('com 3 parcelas o padrão vira "não" (o excedente esperaria meses)', async () => {
    renderWizard(2)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    fireEvent.change(await screen.findByLabelText(/^Parcelas/), { target: { value: '3' } })
    await waitFor(() => expect(lastPreviewBody().installments).toBe(3), W)
    expect(lastPreviewBody().overage).not.toHaveProperty('onNextInvoice')
  })
})

describe('AD5 — parcelas e condição', () => {
  it('trocar a condição volta as parcelas ao padrão do prazo novo; mensalidade não mostra parcelas', async () => {
    renderWizard(2)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    fireEvent.change(await screen.findByLabelText(/^Parcelas/), { target: { value: '3' } })
    await waitFor(() => expect(lastPreviewBody().installments).toBe(3), W)
    fireEvent.click(opcao('Semestral parcelado'))
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ term: 'semiannual', paymentMode: 'installments', installments: 6 }), W)
    fireEvent.click(opcao('Anual, pago mês a mês'))
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ term: 'annual', paymentMode: 'monthly', installments: 12 }), W)
    expect(screen.queryByLabelText(/^Parcelas/)).not.toBeInTheDocument()
  })

  it('só aparecem as condições vendáveis da matriz', async () => {
    renderWizard(2)
    await screen.findByText('Condição de pagamento')
    expect(screen.queryByRole('button', { name: /Semestral, pago mês a mês/ })).not.toBeInTheDocument()
  })
})

describe('AD8 — Criar conta só com a prévia dos valores atuais', () => {
  it('preço fechado com R$ 0 bloqueia o avanço e não calcula', async () => {
    await irAteRevisar()
    fireEvent.click(screen.getByRole('tab', { name: 'Negociado' }))
    await waitFor(() => expect(lastPreviewBody().contractedMonthlyCents).toBe(0), W)
    expect(btn(/Continuar/)).toBeDisabled()
    expect(screen.getByText(/Falta: preço fechado/)).toBeInTheDocument()
  })

  it('Enterprise (sem preço de tabela) só tem preço negociado', async () => {
    await irAteRevisar()
    fireEvent.click(opcao('Enterprise'))
    await waitFor(() => expect(screen.queryByRole('tab', { name: 'Tabela' })).not.toBeInTheDocument())
    expect(screen.getByText(/O Enterprise não tem preço de tabela/)).toBeInTheDocument()
    expect(btn(/Continuar/)).toBeDisabled()
  })
})

describe('AD9 — percentuais com decimal', () => {
  it('"7,5" de desconto, "2,5" de rollover e "12,5" de teto vão como 7.5, 2.5 e 12.5', async () => {
    await irAteRevisar()
    fireEvent.click(screen.getByRole('tab', { name: 'Negociado' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Desconto' }))
    fireEvent.change(screen.getByLabelText(/^Desconto/), { target: { value: '7,5' } })
    await waitFor(() => expect(lastPreviewBody().discountPct).toBe(7.5), W)
    expect(screen.getByLabelText(/^Desconto/)).toHaveValue('7,5')
    fireEvent.click(btn(/Continuar/))
    fireEvent.change(await screen.findByLabelText(/^Créditos não usados/), { target: { value: '2,5' } })
    fireEvent.change(screen.getByLabelText(/^Teto do excedente/), { target: { value: '12,5' } })
    await waitFor(() => expect(lastPreviewBody()).toMatchObject({ rolloverPct: 2.5 }), W)
    expect(lastPreviewBody().overage.ceilingPct).toBe(12.5)
  })
})

describe('AD14 — signatário e limite ilimitado', () => {
  it('signatário pela metade avisa e bloqueia o avanço (não é descartado calado)', async () => {
    await irAteRevisar()
    fireEvent.change(screen.getByLabelText(/^Signatário — nome/), { target: { value: 'Carlos' } })
    expect(btn(/Continuar/)).toBeDisabled()
    expect(screen.getAllByText(/Preencha nome, CPF e e-mail do signatário/).length).toBe(2)
  })

  it('"Ilimitado" envia null explícito para o limite e desligar volta ao plano-modelo', async () => {
    renderWizard(3)
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), W)
    fireEvent.click(await screen.findByRole('switch', { name: 'Usuários ilimitado' }))
    await waitFor(() => expect(lastPreviewBody().entitlements).toEqual({ users: null }), W)
    fireEvent.click(screen.getByRole('switch', { name: 'Usuários ilimitado' }))
    await waitFor(() => expect(lastPreviewBody().entitlements).toBeUndefined(), W)
  })
})
