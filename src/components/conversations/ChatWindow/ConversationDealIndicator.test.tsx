// F10 (SCRUM-883) — o chip do cabeçalho passa a mostrar o registro desta conversa
// também depois de fechado (terminal + ícone de fechado) e recarrega no evento
// local `oryon:deals-invalidate` (antes do socket).
//
// B4 (SCRUM-930): clique abre a ficha em painel (`useDealPanel`) — não navega
// mais pro board. `react-router-dom` nem precisa de mock aqui (o componente
// não usa mais `useNavigate`).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'

const { api, socket, openDeal } = vi.hoisted(() => ({
  api: { list: vi.fn() },
  socket: { on: vi.fn(), off: vi.fn() },
  openDeal: vi.fn(),
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => true }))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({
    pipelines: [{
      id: 'p', name: 'Vendas', color: '#6366f1', stages: [
        { id: 's1', label: 'Novo', color: '#111', isWon: false, isLost: false },
        { id: 's-won', label: 'Ganho', color: '#10b981', isWon: true, isLost: false },
      ],
    }],
  }),
}))

import { ConversationDealIndicator } from './ConversationDealIndicator'
import { pickIndicatorDeals } from '@/lib/dealIndicator'
import { DEALS_INVALIDATE_EVENT } from '@/hooks/useResolveWithOutcome'
import type { Deal } from '@/types'

const base: Deal = { id: 'd', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 0 }

beforeEach(() => { api.list.mockReset(); openDeal.mockReset() })

describe('pickIndicatorDeals', () => {
  it('abertos sempre; fechados só quando nasceram nesta conversa', () => {
    const deals: Deal[] = [
      { ...base, id: 'open' },
      { ...base, id: 'won-here', status: 'won', stageId: 's-won', originConversationId: 'conv-1' },
      { ...base, id: 'won-elsewhere', status: 'won', stageId: 's-won', originConversationId: 'conv-2' },
      { ...base, id: 'lost-no-origin', status: 'lost' },
    ]
    expect(pickIndicatorDeals(deals, 'conv-1').map((d) => d.id)).toEqual(['open', 'won-here'])
    expect(pickIndicatorDeals(deals).map((d) => d.id)).toEqual(['open'])
  })
})

describe('ConversationDealIndicator (F10-883)', () => {
  it('registro ganho nesta conversa vira chip no terminal com ícone de fechado; evento local recarrega', async () => {
    api.list.mockResolvedValueOnce({ data: [{ ...base }] })
    render(<ConversationDealIndicator contactId="c1" conversationId="conv-1" />)
    await waitFor(() => expect(screen.getByTestId('deal-chip-open')).toHaveTextContent('Vendas · Novo'))

    api.list.mockResolvedValueOnce({ data: [{ ...base, status: 'won', stageId: 's-won', originConversationId: 'conv-1' }] })
    act(() => { window.dispatchEvent(new CustomEvent(DEALS_INVALIDATE_EVENT, { detail: { contactId: 'c1' } })) })
    await waitFor(() => expect(screen.getByTestId('deal-chip-closed')).toHaveTextContent('Vendas · Ganho'))
    expect(screen.getByLabelText('Fechado como ganho')).toBeInTheDocument()
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('B4 (SCRUM-930): clique no chip abre a ficha em painel (useDealPanel), não navega', async () => {
    api.list.mockResolvedValueOnce({ data: [{ ...base }] })
    render(<ConversationDealIndicator contactId="c1" conversationId="conv-1" />)
    const chip = await screen.findByTestId('deal-chip-open')
    fireEvent.click(chip)
    expect(openDeal).toHaveBeenCalledWith('d')
  })

  it('F11-887: destaque é o registro que nasceu nesta conversa (sem consultar roteamento)', async () => {
    api.list.mockResolvedValueOnce({ data: [
      { ...base, id: 'other', pipelineId: 'p' },
      { ...base, id: 'mine', originConversationId: 'conv-1' },
    ] })
    render(<ConversationDealIndicator contactId="c1" whatsappNumberId="wa-1" conversationId="conv-1" />)
    await waitFor(() => expect(screen.getAllByTestId('deal-chip-open')).toHaveLength(2))
    const chips = screen.getAllByTestId('deal-chip-open')
    expect(chips[0]).toHaveAttribute('data-origin', 'true')
    expect(chips[0].getAttribute('title')).toContain('registro desta conversa')
    expect(chips[1]).not.toHaveAttribute('data-origin')
  })
})
