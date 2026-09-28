import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const getAgentSpecForAgent = vi.fn()
const listAgentTestRuns = vi.fn()
const rodarBateria = vi.fn()
vi.mock('@/services/agentsApi', () => ({
  getAgentSpecForAgent: (id: string) => getAgentSpecForAgent(id),
  listAgentTestRuns: (id: string) => listAgentTestRuns(id),
}))
vi.mock('@/components/agents/bateria/bateria', () => ({ rodarBateria: (a: unknown) => rodarBateria(a) }))

import { BateriaDeTestes } from './BateriaDeTestes'

const AGENT = { id: 'a1', system_prompt: 'Texto' } as never
const RUN = {
  id: 'r1', specVersion: 2, trigger: 'publish', total: 2, changed: 1, failed: 0, createdAt: '2026-09-28T10:00:00Z',
  results: [
    { question: 'Preço?', answer: 'R$ 180', toolCalls: [], approvedAnswer: 'R$ 155', similarity: 0.2, answerChanged: true, toolsChanged: null, error: null },
    { question: 'Horário?', answer: 'Das 8 às 18', toolCalls: ['agenda'], approvedAnswer: null, similarity: 1, answerChanged: false, toolsChanged: false, error: null },
  ],
}

describe('BateriaDeTestes', () => {
  beforeEach(() => {
    getAgentSpecForAgent.mockReset(); listAgentTestRuns.mockReset(); rodarBateria.mockReset()
    getAgentSpecForAgent.mockResolvedValue({ spec: { tests: [{ question: 'Preço?' }, { question: 'Horário?' }] }, version: 2 })
  })

  it('mostra a última execução e o que mudou', async () => {
    listAgentTestRuns.mockResolvedValue([RUN])
    render(<BateriaDeTestes agent={AGENT} />)
    expect(await screen.findByText(/1 de 2 mudaram/)).toBeInTheDocument()
    expect(screen.getByText('Resposta mudou')).toBeInTheDocument()
    expect(screen.getByText('Igual')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Preço?'))
    expect(screen.getByText('Aprovada no ensaio')).toBeInTheDocument()
    expect(screen.getByText('R$ 155')).toBeInTheDocument()
  })

  it('"Rodar agora" usa a última execução como referência', async () => {
    listAgentTestRuns.mockResolvedValue([RUN])
    rodarBateria.mockResolvedValue({ ...RUN, id: 'r2', trigger: 'manual', changed: 0 })
    render(<BateriaDeTestes agent={AGENT} />)
    fireEvent.click(await screen.findByRole('button', { name: /rodar agora/i }))
    expect(await screen.findByText(/nada mudou/)).toBeInTheDocument()
    expect(rodarBateria.mock.calls[0][0]).toMatchObject({ trigger: 'manual', specVersion: 2, anterior: { id: 'r1' } })
  })

  it('sem perguntas de teste explica de onde elas vêm', async () => {
    getAgentSpecForAgent.mockResolvedValue({ spec: { tests: [] }, version: null })
    listAgentTestRuns.mockResolvedValue([])
    render(<BateriaDeTestes agent={AGENT} />)
    expect(await screen.findByText('Nenhuma pergunta de teste')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rodar agora/i })).not.toBeInTheDocument()
  })
})
