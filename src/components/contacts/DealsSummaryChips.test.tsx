// F11 (SCRUM-884, prancheta 6) — coluna "Funis": um chip "● Funil · Etapa" por
// registro aberto, com ícone do tipo; clique abre o board; sem aberto → chip
// tracejado "nenhum aberto". Lê só o dealsSummary já carregado (sem fetch).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
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
import type { Contact } from '@/types'

const contact = (byPipeline: NonNullable<Contact['dealsSummary']>['byPipeline']): Contact => ({
  id: 'c1', tenantId: 't', displayName: 'Mariana', waId: '5511', optIn: true,
  dealsSummary: { count: byPipeline.length, openCount: 0, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0, byPipeline },
} as unknown as Contact)

const row = (pipelineId: string, pipelineName: string, openCount: number, stageLabel?: string) =>
  ({ pipelineId, pipelineName, pipelineColor: '#000', count: 1, openCount, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0, stageLabel })

describe('DealsSummaryChips (F11-884)', () => {
  it('contato em 2 funis → 2 chips "Funil · Etapa" com ícone do tipo; clique abre o board certo', () => {
    render(<DealsSummaryChips contact={contact([row('p', 'Suporte', 1, 'Em atendimento'), row('v', 'Vendas', 1, 'Proposta')])} />)
    expect(screen.getByTestId('pipeline-chip-p')).toHaveTextContent('Suporte· Em atendimento')
    expect(screen.getByTestId('pipeline-chip-v')).toHaveTextContent('Vendas· Proposta')
    expect(screen.getByLabelText('Processo')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendas')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('pipeline-chip-v'))
    expect(navigate).toHaveBeenCalledWith('/contacts?pipeline=v')
  })

  it('funil só com registro fechado não vira chip; sem nenhum aberto → "nenhum aberto"', () => {
    render(<DealsSummaryChips contact={contact([row('v', 'Vendas', 0)])} />)
    expect(screen.queryByTestId('pipeline-chip-v')).toBeNull()
    expect(screen.getByTestId('pipeline-chip-none')).toHaveTextContent('nenhum aberto')
  })
})
