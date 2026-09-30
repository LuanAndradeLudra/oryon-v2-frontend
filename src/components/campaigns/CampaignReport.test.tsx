// SCRUM-1142 / FE-2 — o relatório com o payload REAL de `GET /campaigns/:id/analytics`
// (funnel/failures/replies…, sem os campos legados). Antes, `analytics.churnBreakdown.optOut`
// lançava TypeError e derrubava o relatório; agora renderiza os números e as falhas por motivo.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { getAnalytics, getConversations } = vi.hoisted(() => ({
  getAnalytics: vi.fn(),
  getConversations: vi.fn(),
}))
vi.mock('@/services/api', () => ({
  campaignsApi: { getAnalytics, getConversations },
}))
vi.mock('@/hooks/useChartColors', () => ({
  useChartColors: () =>
    new Proxy({}, { get: () => '#888' }) as Record<string, string>,
}))

import { CampaignReport } from './CampaignReport'
import type { Campaign } from '@/types'

const campaign = {
  id: 'c1',
  name: 'Lembrete',
  templateName: 'lembrete',
  status: 'sent',
  sentAt: '2026-09-01T12:00:00Z',
  stats: { total: 10, sent: 10, delivered: 8, read: 5, failed: 2, replied: 1 },
} as unknown as Campaign

describe('CampaignReport com o payload real do backend', () => {
  it('não quebra sem os campos legados e mostra números reais + falhas por motivo', async () => {
    getAnalytics.mockResolvedValue({
      data: {
        campaignId: 'c1',
        campaignName: 'Lembrete',
        stats: campaign.stats,
        funnel: { sent: 10, delivered: 8, read: 5, replied: 1 },
        avgTimeToReadMinutes: 12.5,
        readHeatmap: [],
        failures: [{ code: '131026', reason: 'Mensagem não entregável', count: 2 }],
        replies: [],
      },
    })
    getConversations.mockResolvedValue({ data: [] })

    render(
      <MemoryRouter>
        <CampaignReport campaign={campaign} onClose={() => undefined} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText(/Falhas por motivo/)).toBeTruthy())
    expect(screen.getByText('Mensagem não entregável')).toBeTruthy()
    expect(screen.getByText(/12,5 min/)).toBeTruthy()
    // números reais do funil (delivered=8/read=5) aparecem, não zeros
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
  })

  it('prefere o stats do /analytics ao da lista (que pode estar velho)', async () => {
    getAnalytics.mockResolvedValue({
      data: {
        campaignId: 'c1',
        // a lista ainda tinha delivered=0/read=0; o analytics já tem os valores atuais
        stats: { total: 10, sent: 10, delivered: 7, read: 3, failed: 0 },
        failures: [],
      },
    })
    getConversations.mockResolvedValue({ data: [] })
    const stale = { ...campaign, stats: { total: 10, sent: 10, delivered: 0, read: 0, failed: 0 } } as unknown as Campaign
    render(
      <MemoryRouter>
        <CampaignReport campaign={stale} onClose={() => undefined} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByText('7').length).toBeGreaterThan(0))
  })

  it('mostra o motivo da pausa automática e os contatos excluídos (SCRUM-1149/1150)', async () => {
    getAnalytics.mockResolvedValue({
      data: {
        campaignId: 'c1',
        status: 'stopped',
        stopReason: 'Pausada automaticamente: 12 de 20 envios (60%) falharam por problema da conta ou do template.',
        stats: { total: 20, sent: 8, delivered: 8, read: 2, failed: 12, excluded: 3 },
        failures: [{ code: '132015', reason: 'Template pausado', count: 12 }],
      },
    })
    getConversations.mockResolvedValue({ data: [] })
    render(
      <MemoryRouter>
        <CampaignReport campaign={campaign} onClose={() => undefined} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toContain('Pausada automaticamente')
    expect(screen.getByText(/ficaram de fora/)).toBeTruthy()
    expect(screen.getByText('Template pausado')).toBeTruthy()
  })
})
