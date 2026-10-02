// ─── /first-access — portão e dados da empresa (CL2, CL3) ──────────────────────
// CL2: status "não precisa" com o portão em cache "precisa" → loop /home ⇄
//      /first-access. A página invalida o cache antes de ir para /home.
// CL3: GET fiscal falhou → nada de resumo nem "Está correto" (A20: o dono
//      confirma o que VIU); erro com "Tentar de novo"; "Corrigir" abre o
//      formulário com os dados carregados.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/services/firstAccessApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/firstAccessApi')>()),
  firstAccessApi: {
    status: vi.fn(), getFiscal: vi.fn(), saveFiscal: vi.fn(), confirmFiscal: vi.fn(), complete: vi.fn(), resendLink: vi.fn(),
  },
}))
vi.mock('@/lib/firstAccessGate', () => ({ invalidateFirstAccessStatus: vi.fn() }))
vi.mock('@/services/termsApi', () => ({ termsApi: { accept: vi.fn() }, DOCUMENT_LABEL: {} }))

import { firstAccessApi } from '@/services/firstAccessApi'
import { invalidateFirstAccessStatus } from '@/lib/firstAccessGate'
import { FirstAccessPage } from '@/pages/FirstAccessPage'

const fa = firstAccessApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const invalidate = invalidateFirstAccessStatus as unknown as ReturnType<typeof vi.fn>

const STATUS_COMPANY = {
  required: true, isOwner: true,
  steps: { terms: { done: true, pending: [] }, company: { done: false, complete: true, confirmedAt: null } },
}
const FISCAL = {
  documentType: 'cnpj', taxId: '11222333000181', legalName: 'ACME LTDA', stateRegistration: '123',
  municipalRegistration: null, billingEmail: 'fin@acme.com', billingContact: 'Ana', billingPhone: null,
  addressZip: '01001000', addressStreet: 'Praça da Sé', addressNumber: '1', addressComplement: null,
  addressDistrict: 'Sé', addressCity: 'São Paulo', addressState: 'SP', addressIbgeCode: null,
  complete: true, confirmedAt: null,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/first-access']}>
      <Routes>
        <Route path="/first-access" element={<FirstAccessPage />} />
        <Route path="/home" element={<p>HOME</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  Object.values(fa).forEach((f) => f.mockReset())
  invalidate.mockReset()
})

describe('FirstAccessPage — CL2', () => {
  it('status "não precisa": invalida o cache do portão antes de ir para /home', async () => {
    fa.status.mockResolvedValue({ ...STATUS_COMPANY, required: false })
    fa.getFiscal.mockResolvedValue(FISCAL)
    renderPage()
    await screen.findByText('HOME')
    expect(invalidate).toHaveBeenCalledTimes(1)
  })
})

describe('FirstAccessPage — CL3', () => {
  it('GET fiscal falhou: sem "Está correto"/"Corrigir"/formulário; "Tentar de novo" recarrega e mostra o resumo', async () => {
    fa.status.mockResolvedValue(STATUS_COMPANY)
    fa.getFiscal.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(FISCAL)
    renderPage()

    const retry = await screen.findByRole('button', { name: 'Tentar de novo' })
    expect(screen.queryByRole('button', { name: 'Está correto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Corrigir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salvar e continuar/i })).not.toBeInTheDocument()

    fireEvent.click(retry)
    await screen.findByRole('button', { name: 'Está correto' })
    expect(screen.getByText('ACME LTDA')).toBeInTheDocument()
    expect(fa.getFiscal).toHaveBeenCalledTimes(2)
    expect(fa.confirmFiscal).not.toHaveBeenCalled()
  })

  it('"Corrigir" abre o formulário com os dados carregados (opcionais preservados)', async () => {
    fa.status.mockResolvedValue(STATUS_COMPANY)
    fa.getFiscal.mockResolvedValue(FISCAL)
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }))
    await waitFor(() => expect(screen.getByDisplayValue('ACME LTDA')).toBeInTheDocument())
    expect(screen.getByDisplayValue('123')).toBeInTheDocument() // inscrição estadual (opcional)
    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument()
  })
})
