// F7 (SCRUM-867) — board recém-criado: colunas visíveis + empty state
// "Adicionar contato ao funil" só sem NENHUM card, dados carregados e CTA
// fornecido; vocabulário por tipo ("negócio" × "registro").
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

import { DealsBoard } from './DealsBoard'
import type { Deal, PipelineStage } from '@/types'

const stage = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#6366f1', order: 0, isWon: false, isLost: false, ...extra,
})
const STAGES = [
  stage('s1', 'Novo chamado'),
  stage('s2', 'Em atendimento'),
  stage('s3', 'Aguardando cliente'),
  stage('s4', 'Concluído', { isWon: true }),
  stage('s5', 'Cancelado', { isLost: true }),
]

describe('DealsBoard — empty state do funil (F7)', () => {
  it('renderiza as 5 colunas E o empty state com o CTA quando não há cards', () => {
    const onAddContact = vi.fn()
    render(<DealsBoard stages={STAGES} dealsByStage={{}} onMoveStage={vi.fn()} onAddContact={onAddContact} itemNoun="registro" />)
    for (const st of STAGES) expect(screen.getByText(st.label)).toBeInTheDocument()
    const empty = screen.getByTestId('deals-board-empty')
    expect(empty).toHaveTextContent('Nenhum registro neste funil ainda')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar contato ao funil' }))
    expect(onAddContact).toHaveBeenCalledTimes(1)
  })

  it('usa "negócio" por padrão (funil de venda)', () => {
    render(<DealsBoard stages={STAGES} dealsByStage={{}} onMoveStage={vi.fn()} onAddContact={vi.fn()} />)
    expect(screen.getByTestId('deals-board-empty')).toHaveTextContent('Nenhum negócio neste funil ainda')
  })

  it('não mostra o empty state durante o loading, com algum card, ou sem o CTA', () => {
    const { rerender } = render(<DealsBoard stages={STAGES} dealsByStage={{}} onMoveStage={vi.fn()} onAddContact={vi.fn()} loading />)
    expect(screen.queryByTestId('deals-board-empty')).toBeNull()

    const deal = { id: 'd1', tenantId: 't', contactId: 'c', title: 'Plano', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 0 } as unknown as Deal
    rerender(<DealsBoard stages={STAGES} dealsByStage={{ s1: [deal] }} onMoveStage={vi.fn()} onAddContact={vi.fn()} />)
    expect(screen.queryByTestId('deals-board-empty')).toBeNull()

    rerender(<DealsBoard stages={STAGES} dealsByStage={{}} onMoveStage={vi.fn()} />)
    expect(screen.queryByTestId('deals-board-empty')).toBeNull()
  })
})
