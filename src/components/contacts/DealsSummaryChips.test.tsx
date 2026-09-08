// F11 (SCRUM-884, prancheta 6) — coluna "Funis": um chip "● Funil · Etapa" por
// registro aberto, com ícone do tipo (densidade `chip` do `DealSummary`
// compartilhado, B3 · SCRUM-929). Lê só o dealsSummary já carregado (sem
// fetch) para MOSTRAR.
//
// B2 (SCRUM-928): clique abre a FICHA do negócio, não mais o board.
// C1/C2 (SCRUM-932/933): o resumo em lote passou a trazer `openStages` com o
// `dealId` de cada aberto — o clique abre direto, sem o `GET /deals?contactId=`
// que existia só para descobrir qual era o negócio (e que, com N abertos no
// mesmo funil, escolheria um deles no chute).
//
// SCRUM-929 (item 6): sem nenhum aberto, a célula fica vazia — o chip
// tracejado "nenhum aberto" saiu por não ter ação nenhuma atrás dele.
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

const row = (
  pipelineId: string, pipelineName: string, openCount: number,
  openStages: Array<{ dealId: string; stageKey: string; stageLabel: string }> = [],
) => ({ pipelineId, pipelineName, pipelineColor: '#000', count: 1, openCount, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0, openStages })

const at = (dealId: string, stageLabel: string) => ({ dealId, stageKey: 's1', stageLabel })

beforeEach(() => {
  openDeal.mockReset(); dealsApi.list.mockReset(); toast.mockReset()
})

describe('DealsSummaryChips (F11-884)', () => {
  it('contato em 2 funis → 2 chips "Funil · Etapa" com ícone do tipo', () => {
    render(<DealsSummaryChips contact={contact([
      row('p', 'Suporte', 1, [at('d-sup', 'Em atendimento')]),
      row('v', 'Vendas', 1, [at('d-ven', 'Proposta')]),
    ])} />)
    expect(screen.getByTestId('pipeline-chip-d-sup')).toHaveTextContent('Suporte· Em atendimento')
    expect(screen.getByTestId('pipeline-chip-d-ven')).toHaveTextContent('Vendas· Proposta')
    expect(screen.getByLabelText('Processo')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendas')).toBeInTheDocument()
  })

  // C2 (SCRUM-933): o caso que a multiplicidade criou — dois abertos no MESMO
  // funil. Antes o resumo trazia um rótulo só e o segundo negócio sumia.
  it('dois abertos no mesmo funil → dois chips, um por negócio', () => {
    render(<DealsSummaryChips contact={contact([
      row('v', 'Vendas', 2, [at('d1', 'Proposta'), at('d2', 'Negociação')]),
    ])} />)
    expect(screen.getByTestId('pipeline-chip-d1')).toHaveTextContent('Vendas· Proposta')
    expect(screen.getByTestId('pipeline-chip-d2')).toHaveTextContent('Vendas· Negociação')
  })

  it('clique abre a ficha direto pelo dealId do resumo, sem consultar /deals', async () => {
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 1, [at('d-vendas', 'Proposta')])])} />)

    fireEvent.click(screen.getByTestId('pipeline-chip-d-vendas'))

    await waitFor(() => expect(openDeal).toHaveBeenCalledWith('d-vendas'))
    expect(dealsApi.list).not.toHaveBeenCalled()
  })

  it('funil só com registro fechado não vira chip; sem nenhum aberto e sem onAddToPipeline → célula vazia', () => {
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 0)])} />)
    expect(screen.queryByTestId('pipeline-chip-d1')).toBeNull()
    expect(screen.queryByTestId('pipeline-chip-none')).toBeNull()
    expect(screen.queryByTestId('pipeline-chip-add')).toBeNull()
  })

  it('sem nenhum aberto, com onAddToPipeline (desktop) → ação "Novo negócio" no hover', () => {
    const onAddToPipeline = vi.fn()
    render(<DealsSummaryChips contact={contact([])} onAddToPipeline={onAddToPipeline} />)
    const btn = screen.getByTestId('pipeline-chip-add')
    expect(btn).toHaveTextContent('Novo negócio')
    fireEvent.click(btn)
    expect(onAddToPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
      expect.objectContaining({ id: 'v', kind: 'sales' }),
    )
  })
})
