import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ list: vi.fn(), overview: vi.fn() }))
vi.mock('@/services/api', () => ({
  pipelinesApi: { list: () => h.list() },
  pipelineAnalyticsApi: { overview: () => h.overview() },
}))

import { SalesFunnelCard } from './SalesFunnelCard'

const etapa = (id: string, order: number, extra = {}) => ({ id, label: id.toUpperCase(), order, color: '#888', isWon: false, isLost: false, ...extra })

describe('SalesFunnelCard — K14', () => {
  it('diz "agora" e usa a taxa real de transição, não a razão entre estoques', async () => {
    h.list.mockResolvedValue({
      data: [{ id: 'p1', isDefault: true, isArchived: false, stages: [etapa('a', 1), etapa('b', 2), etapa('g', 3, { isWon: true })] }],
    })
    h.overview.mockResolvedValue({
      data: {
        stages: [{ stageId: 'a', open: { count: 2 } }, { stageId: 'b', open: { count: 6 } }],
        conversion: [
          { fromStageId: 'a', enteredCount: 10, stillHere: 2, outcomes: [{ toStageId: 'b', count: 4, rate: 0.4 }] },
          { fromStageId: 'b', enteredCount: 0, stillHere: 0, outcomes: [] },
        ],
      },
    })
    render(<MemoryRouter><SalesFunnelCard /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy())
    expect(screen.getByText('agora')).toBeTruthy()
    expect(screen.queryByText(/mês atual/)).toBeNull()
    // A → B: 4 de 10 que entraram = 40% (a razão de estoques daria 300%).
    expect(screen.getByText('40%')).toBeTruthy()
    expect(screen.queryByText('300%')).toBeNull()
  })
})
