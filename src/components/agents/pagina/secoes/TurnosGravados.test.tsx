import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const listAgentTurns = vi.fn()
const replayAgentTurn = vi.fn()
const getAgentRuntimeFlags = vi.fn()
vi.mock('@/services/agentsApi', () => ({
  listAgentTurns: (id: string) => listAgentTurns(id),
  replayAgentTurn: (a: string, t: string) => replayAgentTurn(a, t),
  getAgentRuntimeFlags: () => getAgentRuntimeFlags(),
}))

import { TurnosGravados } from './TurnosGravados'

const TURNO = {
  id: 't1', conversationId: 'c1', sessionId: null, model: 'm', finalStatus: 'answered', toolsCalled: 1,
  createdAt: '2026-09-27T10:00:00Z', expiresAt: '2026-10-12T10:00:00Z', lastUserText: 'Tem horário amanhã?', finalReply: 'Tenho 9h.',
}

describe('TurnosGravados', () => {
  beforeEach(() => {
    listAgentTurns.mockReset(); replayAgentTurn.mockReset()
    getAgentRuntimeFlags.mockReset(); getAgentRuntimeFlags.mockResolvedValue({ catalogInjection: false, turnRecord: true })
  })

  it('repete um turno e mostra o que mudou', async () => {
    listAgentTurns.mockResolvedValue([TURNO])
    replayAgentTurn.mockResolvedValue({
      instructions: 'current', text: 'Tenho 10h.', turns: 2, textChanged: true, toolsChanged: false,
      toolCalls: [{ name: 'agenda', input: {}, source: 'recorded' }],
      recorded: { text: 'Tenho 9h.', toolCalls: [{ name: 'agenda', input: {} }] },
    })
    render(<TurnosGravados agentId="a1" />)
    expect(await screen.findByText('“Tem horário amanhã?”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /repetir/i }))
    expect(await screen.findByText('A resposta mudou; as ferramentas foram as mesmas.')).toBeInTheDocument()
    expect(screen.getByText('Tenho 9h.')).toBeInTheDocument()
    expect(screen.getByText('Tenho 10h.')).toBeInTheDocument()
    expect(replayAgentTurn).toHaveBeenCalledWith('a1', 't1')
  })

  it('aponta ferramenta sem resultado gravado', async () => {
    listAgentTurns.mockResolvedValue([TURNO])
    replayAgentTurn.mockResolvedValue({
      instructions: 'current_not_applied', text: 'x', turns: 2, textChanged: true, toolsChanged: true,
      toolCalls: [{ name: 'agenda', input: { dia: 'sábado' }, source: 'missing' }],
      recorded: { text: 'y', toolCalls: [] },
    })
    render(<TurnosGravados agentId="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /repetir/i }))
    expect(await screen.findByText('O agente pediu ferramentas diferentes das gravadas.')).toBeInTheDocument()
    expect(screen.getByText(/repetido com as de quando aconteceu/)).toBeInTheDocument()
    expect(screen.getByText(/Sem resultado gravado \(não executadas\): agenda/)).toBeInTheDocument()
  })

  it('gravação desligada é dita, não "nenhum turno"', async () => {
    listAgentTurns.mockResolvedValue([])
    getAgentRuntimeFlags.mockResolvedValue({ catalogInjection: false, turnRecord: false })
    render(<TurnosGravados agentId="a1" />)
    expect(await screen.findByText('Gravação de turnos desligada')).toBeInTheDocument()
  })

  it('servidor sem o recurso mostra aviso', async () => {
    listAgentTurns.mockImplementation(() => Promise.reject(new Error('Erro 404')))
    render(<TurnosGravados agentId="a1" />)
    expect(await screen.findByText('Turnos gravados indisponíveis')).toBeInTheDocument()
  })
})
