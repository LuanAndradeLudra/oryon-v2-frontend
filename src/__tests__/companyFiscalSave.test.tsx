// ─── CL1 — Configurações > Dados fiscais salva depois do primeiro acesso ───────
// O GET devolve `complete` e `confirmedAt` (A20). Se a tela guardar e reenviar
// isso no PUT, o backend recusa campo desconhecido e o dono nunca mais salva.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('@/services/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'business_admin' } }) }))
vi.mock('@/hooks/useToast', () => ({ showToast: vi.fn() }))

import { api } from '@/services/api'
import { CompanyFiscal } from '@/components/settings/sections/CompanyFiscal'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }

const SAVED = {
  documentType: 'cnpj', taxId: '11222333000181', legalName: 'ACME LTDA', stateRegistration: null,
  municipalRegistration: null, billingEmail: 'fin@acme.com', billingContact: 'Ana', billingPhone: null,
  addressZip: '01001000', addressStreet: 'Praça da Sé', addressNumber: '1', addressComplement: null,
  addressDistrict: 'Sé', addressCity: 'São Paulo', addressState: 'SP', addressIbgeCode: '3550308',
}

beforeEach(() => {
  mockApi.get.mockReset()
  mockApi.put.mockReset()
})

describe('CompanyFiscal — CL1', () => {
  it('depois do primeiro acesso (confirmedAt/complete no GET), o PUT só leva os campos do formulário', async () => {
    mockApi.get.mockResolvedValue({ data: { ...SAVED, complete: true, confirmedAt: '2026-10-01T12:00:00Z' } })
    mockApi.put.mockResolvedValue({ data: { ...SAVED, complete: true, confirmedAt: '2026-10-01T12:00:00Z' } })

    render(<CompanyFiscal />)
    const save = await screen.findByRole('button', { name: /salvar dados fiscais/i })
    fireEvent.click(save)

    await waitFor(() => expect(mockApi.put).toHaveBeenCalledTimes(1))
    const [url, body] = mockApi.put.mock.calls[0]
    expect(url).toBe('/organizations/current/fiscal')
    expect(body).not.toHaveProperty('confirmedAt')
    expect(body).not.toHaveProperty('complete')
    expect(body.legalName).toBe('ACME LTDA')
    expect(body.billingContact).toBe('Ana')
  })
})
