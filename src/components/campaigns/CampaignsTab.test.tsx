// Plano MA (MA-6.3): campanha interrompida (template pausado pela Meta ou
// disjuntor) mostra o motivo e "Ver relatório" — e NÃO "Enviar": o backend
// recusava com 400, e a decisão do PO é que parada não retoma.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Campaign } from '@/types'

const stats = { total: 120, sent: 50, delivered: 40, read: 20, failed: 0, replied: 3 }
const CAMPANHAS = [
  { id: 'p', name: 'Promo de outubro', templateName: 'promo', status: 'stopped', stopReason: 'Template "promo" foi pausado pela Meta: primeira pausa por baixa qualidade', stats, createdAt: '2026-09-30T12:00:00Z', whatsappNumberId: 'l1' },
  { id: 'r', name: 'Rascunho de novembro', templateName: 'promo', status: 'draft', stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }, createdAt: '2026-09-30T12:00:00Z', whatsappNumberId: 'l1' },
] as unknown as Campaign[]

vi.mock('@/services/api', () => ({
  campaignsApi: { list: () => Promise.resolve({ data: CAMPANHAS }) },
}))
vi.mock('@/contexts/WorkspaceNumberContext', () => ({
  useWorkspaceNumber: () => ({ numbers: [{ id: 'l1', displayPhoneNumber: '+55 11 0000-0000' }], loading: false, refresh: vi.fn() }),
}))
vi.mock('@/contexts/TopBarActionsContext', () => ({ useRegisterTopBarActions: () => undefined }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/common/WhatsappLineChip', () => ({ WhatsappLineChip: () => null }))
vi.mock('./CampaignWizard', () => ({ CampaignWizard: () => null }))
vi.mock('./CampaignReport', () => ({ CampaignReport: () => null }))

import { CampaignsTab } from './CampaignsTab'

afterEach(() => cleanup())

describe('CampaignsTab — interrompida (MA-6.3)', () => {
  it('mostra o motivo e o relatório, sem botão de enviar', async () => {
    render(<MemoryRouter><CampaignsTab /></MemoryRouter>)
    const card = (await screen.findByText('Promo de outubro')).closest('div.rounded-lg') as HTMLElement
    expect(card).toHaveTextContent('Interrompida')
    expect(card).toHaveTextContent('foi pausado pela Meta: primeira pausa por baixa qualidade')
    expect(card.querySelector('button')).not.toBeNull()
    expect([...card.querySelectorAll('button')].map((b) => b.textContent?.trim())).toContain('Ver relatório')
    expect([...card.querySelectorAll('button')].some((b) => /^Enviar/.test(b.textContent?.trim() ?? ''))).toBe(false)
  })

  it('o rascunho continua com "Enviar"', async () => {
    render(<MemoryRouter><CampaignsTab /></MemoryRouter>)
    const card = (await screen.findByText('Rascunho de novembro')).closest('div.rounded-lg') as HTMLElement
    expect([...card.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Enviar')).toBe(true)
  })

  it('tem o filtro "Interrompidas"', async () => {
    render(<MemoryRouter><CampaignsTab /></MemoryRouter>)
    await screen.findByText('Promo de outubro')
    fireEvent.click(screen.getByRole('tab', { name: 'Interrompidas' }))
    await waitFor(() => expect(screen.queryByText('Rascunho de novembro')).toBeNull())
    expect(screen.getByText('Promo de outubro')).toBeInTheDocument()
  })
})
