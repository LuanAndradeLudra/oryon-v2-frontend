// F11 (SCRUM-884, prancheta 6) — coluna "Funis": um chip "● Funil · Etapa" por
// registro aberto, com ícone do tipo; sem aberto → chip tracejado "nenhum
// aberto". Lê só o dealsSummary já carregado (sem fetch) para MOSTRAR.
//
// B2 (SCRUM-928): clique abre a FICHA do negócio, não mais o board. O resumo
// em lote não traz `dealId` — resolve via `GET /deals?contactId=` ao clicar.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { openDeal, dealsApi, toast } = vi.hoisted(() => ({
  openDeal: vi.fn(),
  dealsApi: { list: vi.fn() },
  toast: vi.fn(),
}))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))
vi.mock('@/services/api', () => ({ dealsApi }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => true }))
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({
    pipelines: [
      { id: 'p', name: 'Suporte', color: '#14b8a6', kind: 'process', stages: [] },
      { id: 'v', name: 'Vendas', color: '#6366f1', kind: 'sales', stages: [] },
    ],
    stages: [],
  }),
}))

import { DealsSummaryChips } from './ContactRow'
import type { Contact, Deal } from '@/types'

const contact = (byPipeline: NonNullable<Contact['dealsSummary']>['byPipeline']): Contact => ({
  id: 'c1', tenantId: 't', displayName: 'Mariana', waId: '5511', optIn: true,
  dealsSummary: { count: byPipeline.length, openCount: 0, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0, byPipeline },
} as unknown as Contact)

const row = (pipelineId: string, pipelineName: string, openCount: number, stageLabel?: string) =>
  ({ pipelineId, pipelineName, pipelineColor: '#000', count: 1, openCount, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0, stageLabel })

const deal = (id: string, pipelineId: string, status: Deal['status'] = 'open'): Deal =>
  ({ id, contactId: 'c1', title: 'x', status, pipelineId, stageId: 's1', amountCents: 0 })

beforeEach(() => {
  openDeal.mockReset(); dealsApi.list.mockReset(); toast.mockReset()
})

describe('DealsSummaryChips (F11-884)', () => {
  it('contato em 2 funis → 2 chips "Funil · Etapa" com ícone do tipo', () => {
    render(<DealsSummaryChips contact={contact([row('p', 'Suporte', 1, 'Em atendimento'), row('v', 'Vendas', 1, 'Proposta')])} />)
    expect(screen.getByTestId('pipeline-chip-p')).toHaveTextContent('Suporte· Em atendimento')
    expect(screen.getByTestId('pipeline-chip-v')).toHaveTextContent('Vendas· Proposta')
    expect(screen.getByLabelText('Processo')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendas')).toBeInTheDocument()
  })

  it('clique resolve o negócio ABERTO deste (contato, funil) via GET /deals?contactId= e abre a ficha', async () => {
    dealsApi.list.mockResolvedValue({ data: [deal('d-suporte', 'p'), deal('d-vendas', 'v'), deal('d-vendas-old', 'v', 'won')] })
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 1, 'Proposta')])} />)

    fireEvent.click(screen.getByTestId('pipeline-chip-v'))

    await waitFor(() => expect(openDeal).toHaveBeenCalledWith('d-vendas'))
    expect(dealsApi.list).toHaveBeenCalledWith('c1')
  })

  it('se o negócio já não estiver mais aberto (corrida), avisa em vez de abrir nada', async () => {
    dealsApi.list.mockResolvedValue({ data: [deal('d-vendas-old', 'v', 'won')] })
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 1)])} />)

    fireEvent.click(screen.getByTestId('pipeline-chip-v'))

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('não está mais aberto'), 'error'))
    expect(openDeal).not.toHaveBeenCalled()
  })

  it('funil só com registro fechado não vira chip; sem nenhum aberto → "nenhum aberto"', () => {
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 0)])} />)
    expect(screen.queryByTestId('pipeline-chip-v')).toBeNull()
    expect(screen.getByTestId('pipeline-chip-none')).toHaveTextContent('nenhum aberto')
  })
})
