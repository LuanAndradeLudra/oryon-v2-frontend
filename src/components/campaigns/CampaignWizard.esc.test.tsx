// Revisão final 04/10: Esc não pode fechar o assistente de campanha com algo
// preenchido (apagava nome, modelo, segmento e variáveis sem aviso).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/services/appLogger', () => ({ appLogger: { logWizardEvent: vi.fn() } }))
vi.mock('@/services/api', () => ({
  campaignsApi: { create: vi.fn() },
  contactsApi: { list: vi.fn(async () => ({ data: { data: [], total: 0 } })) },
  templatesApi: { list: vi.fn(async () => ({ data: [] })), ensureFromMeta: vi.fn(async () => ({ data: [] })) },
  tagsApi: { list: vi.fn(async () => ({ data: [] })) },
  whatsappNumbersApi: { list: vi.fn(async () => ({ data: [] })), listDetailed: vi.fn(async () => ({ data: [] })) },
}))
vi.mock('@/hooks/useSmartLineDefault', () => ({ useSmartLineDefault: () => ({ lineId: null }) }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ stages: [], pipelines: [] }) }))
vi.mock('@/contexts/WorkspaceNumberContext', () => ({ useWorkspaceNumber: () => ({ numbers: [], findById: () => null, refresh: vi.fn(), loading: false }) }))

import { CampaignWizard } from './CampaignWizard'

describe('assistente de campanha · Esc', () => {
  it('vazio: Esc fecha', async () => {
    const onClose = vi.fn()
    render(<CampaignWizard open onClose={onClose} onCreated={vi.fn()} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('com o nome preenchido: Esc não fecha (sai só pelo X)', async () => {
    const onClose = vi.fn()
    render(<CampaignWizard open onClose={onClose} onCreated={vi.fn()} />)
    const nome = await waitFor(() => screen.getByPlaceholderText('Ex: Campanha Black Friday 2026'))
    fireEvent.change(nome, { target: { value: 'Retorno de pacientes' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
