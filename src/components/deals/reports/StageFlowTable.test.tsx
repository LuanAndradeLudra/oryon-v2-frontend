import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StageFlowTable } from './StageFlowTable'

describe('StageFlowTable (Funis, 27/09)', () => {
  it('mostra entradas, quem ainda está, para onde seguiu e o tempo médio da etapa', () => {
    render(
      <StageFlowTable
        conversion={[{
          fromStageId: 's1', fromStageKey: 'novo', fromStageLabel: 'Novo', enteredCount: 4, stillHere: 1,
          outcomes: [
            { toStageId: 's2', toStageKey: 'av', toStageLabel: 'Avaliação', count: 2, rate: 0.5 },
            { toStageId: 's9', toStageKey: 'perd', toStageLabel: 'Perdido', count: 1, rate: 0.25 },
          ],
        }]}
        durations={[{ stageId: 's1', stageKey: 'novo', stageLabel: 'Novo', completedVisits: 3, avgDays: 2.5 }]}
      />,
    )
    const linha = screen.getByText('Novo').closest('tr')!
    expect(within(linha).getByText('4')).toBeInTheDocument()
    expect(within(linha).getByText('1')).toBeInTheDocument()
    expect(linha).toHaveTextContent(/Avaliação\s*2 · 50%/)
    expect(linha).toHaveTextContent('2,5 d')
  })

  it('sem negócios no período, diz isso em vez de uma tabela vazia', () => {
    render(<StageFlowTable conversion={[]} durations={[]} />)
    expect(screen.getByText(/Nenhum negócio criado neste período/)).toBeInTheDocument()
  })
})
