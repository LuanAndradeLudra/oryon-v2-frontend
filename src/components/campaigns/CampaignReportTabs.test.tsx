import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { getRecipients } = vi.hoisted(() => ({ getRecipients: vi.fn() }))
vi.mock('@/services/api', () => ({ campaignsApi: { getRecipients } }))

import { RecipientsTab, RepliesTab } from './CampaignReportTabs'

describe('RecipientsTab (T2 + D9)', () => {
  it('lista com o motivo da falha e filtra Excluídos pelo endpoint existente', async () => {
    getRecipients.mockResolvedValueOnce({
      data: {
        data: [{
          id: 'r1', contactId: 'ct1', contactName: 'Ana', status: 'failed', errorCode: '131050', replyText: null,
          sentAt: null, deliveredAt: null, readAt: null, failedAt: '2026-09-29T12:00:00Z',
        }],
        total: 1, page: 1, limit: 50,
      },
    })
    render(
      <MemoryRouter>
        <RecipientsTab campaignId="c1" failures={[{ code: '131050', reason: 'Saiu de marketing', count: 1 }]} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())
    expect(screen.getByText('Saiu de marketing')).toBeTruthy()
    expect(getRecipients).toHaveBeenLastCalledWith('c1', undefined, 1, 50)

    getRecipients.mockResolvedValueOnce({
      data: { data: [{ contactId: 'ct2', contactName: 'Bruno', reason: 'invalid_number', since: null }], total: 1, page: 1, limit: 50 },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Excluídos' }))
    await waitFor(() => expect(screen.getByText('Bruno')).toBeTruthy())
    expect(getRecipients).toHaveBeenLastCalledWith('c1', 'excluded', 1, 50)
    expect(screen.getByText('Número inválido')).toBeTruthy()
    expect(screen.getByText(/situação\s+atual/)).toBeTruthy()
  })
})

describe('RepliesTab', () => {
  it('sem respostas: estado vazio honesto', () => {
    render(<RepliesTab replies={[]} />)
    expect(screen.getByText('Ninguém respondeu ainda')).toBeTruthy()
  })
})
