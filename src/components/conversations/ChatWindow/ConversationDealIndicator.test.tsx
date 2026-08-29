// F10 (SCRUM-883) — o chip do cabeçalho passa a mostrar o registro desta conversa
// também depois de fechado (terminal + ícone de fechado) e recarrega no evento
// local `oryon:deals-invalidate` (antes do socket).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

const { api, socket } = vi.hoisted(() => ({
  api: { list: vi.fn() },
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi: api, pipelineRoutingApi: { list: vi.fn().mockResolvedValue({ data: [] }) } }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => true }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
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

beforeEach(() => { api.list.mockReset() })

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
})
