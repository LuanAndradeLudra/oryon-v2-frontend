// 2ª revisão do SCRUM-1200 — catálogo (AD3, AD11).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { CatalogPlan } from '@/services/adminBillingApi'

const { api, toast } = vi.hoisted(() => ({
  api: {
    listCatalog: vi.fn(), packs: vi.fn(), catalogHistory: vi.fn(), catalogWarnings: vi.fn(),
    upsertPlan: vi.fn(), upsertPack: vi.fn(),
  },
  toast: vi.fn(),
}))
vi.mock('@/services/adminBillingApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminBillingApi')>()),
  adminBillingApi: api,
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

import { CatalogManager } from './CatalogManager'

const plan = (tier: CatalogPlan['tier'], displayName: string, updatedAt: string): CatalogPlan => ({
  id: tier, tier, displayName, priceMonthlyCents: 100000, monthlyCredits: 1000, tokensPerCredit: 1000,
  features: {}, active: true, updatedAt,
})
const T1 = '2026-10-01T10:00:00.000Z'

beforeEach(() => {
  vi.clearAllMocks()
  api.packs.mockResolvedValue([{ id: 'pk1', credits: 1000, valueCents: 20000, active: true, sortOrder: 0, updatedAt: T1 }])
  api.catalogHistory.mockResolvedValue([])
  api.catalogWarnings.mockResolvedValue([])
  api.upsertPlan.mockResolvedValue({ warnings: [] })
  api.upsertPack.mockResolvedValue({ warnings: [] })
})

describe('AD3 — rascunho leva o updatedAt de quando foi lido', () => {
  it('salvar um plano não tira a proteção 409 do rascunho de outro', async () => {
    api.listCatalog
      .mockResolvedValueOnce([plan('start', 'Start', T1), plan('scale', 'Scale', T1)])
      // Depois de salvar o Start, a lista relida já traz o Scale salvo por um colega.
      .mockResolvedValue([plan('start', 'Start', '2026-10-01T11:00:00.000Z'), plan('scale', 'Scale do colega', '2026-10-01T10:30:00.000Z')])
    render(<CatalogManager />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Salvar plano-modelo/ })).toHaveLength(2))

    fireEvent.change(screen.getAllByLabelText('Nome')[1], { target: { value: 'Scale meu' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Salvar plano-modelo/ })[0])
    await waitFor(() => expect(api.listCatalog).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getAllByRole('button', { name: /Salvar plano-modelo/ })[1])
    await waitFor(() => expect(api.upsertPlan).toHaveBeenCalledTimes(2))
    const [tier, body] = api.upsertPlan.mock.calls[1]
    expect(tier).toBe('scale')
    expect(body.displayName).toBe('Scale meu')
    expect(body.expectedUpdatedAt).toBe(T1) // o backend responde 409 em vez de sobrescrever o colega
    expect(body).not.toHaveProperty('updatedAt')
  })
})

describe('AD11 — adicionar pacote', () => {
  beforeEach(() => { api.listCatalog.mockResolvedValue([plan('start', 'Start', T1)]) })

  it('quantidade já existente não sobrescreve: orienta a editar na tabela', async () => {
    render(<CatalogManager />)
    const credits = await screen.findByLabelText('Créditos do pacote novo')
    fireEvent.change(credits, { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Valor do pacote novo'), { target: { value: '15000' } })
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
    expect(screen.getByText(/Já existe um pacote de/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(api.upsertPack).not.toHaveBeenCalled()
  })

  it('exige valor maior que zero; com valor, cria o pacote novo', async () => {
    render(<CatalogManager />)
    const credits = await screen.findByLabelText('Créditos do pacote novo')
    fireEvent.change(credits, { target: { value: '2000' } })
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Valor do pacote novo'), { target: { value: '35000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    await waitFor(() => expect(api.upsertPack).toHaveBeenCalledWith(2000, { valueCents: 35000, active: true, expectedUpdatedAt: undefined }))
  })
})
