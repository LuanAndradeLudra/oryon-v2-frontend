import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const getAgentInsights = vi.fn()
vi.mock('@/services/agentsApi', () => ({ getAgentInsights: (id: string) => getAgentInsights(id) }))

import { OndeOAgenteFalha } from './OndeOAgenteFalha'

const montar = () => render(<MemoryRouter><OndeOAgenteFalha agentId="a1" /></MemoryRouter>)

describe('OndeOAgenteFalha', () => {
  beforeEach(() => { getAgentInsights.mockReset(); getAgentInsights.mockResolvedValue(null) })

  it('lista conversas com problema com link e perguntas sem resposta com atalho para a base', async () => {
    getAgentInsights.mockResolvedValue({
      days: 30,
      logging: { executions: true, ragQueries: true },
      problems: [{ conversationId: 'c1', at: '2026-09-27T10:00:00Z', kind: 'deadline', reason: 'Não conseguiu responder a tempo' }],
      unanswered: [{ question: 'preço do retorno', count: 3, lastAt: '2026-09-27T11:00:00Z' }],
    })
    montar()
    expect(await screen.findByText('Não conseguiu responder a tempo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir conversa/i })).toHaveAttribute('href', '/conversations?id=c1')
    expect(screen.getByText('“preço do retorno”')).toBeInTheDocument()
    expect(screen.getByText('3 vezes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /completar a base/i })).toHaveAttribute('href', '/agents/a1/conhecimento')
  })

  it('registro desligado não vira "nenhum problema"', async () => {
    getAgentInsights.mockResolvedValue({ days: 30, logging: { executions: false, ragQueries: false }, problems: [], unanswered: [] })
    montar()
    expect(await screen.findByText('Registro de conversas desligado')).toBeInTheDocument()
    expect(screen.getByText('Registro de buscas desligado')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma conversa com problema')).not.toBeInTheDocument()
  })

  it('registro ligado e vazio diz que não houve problema', async () => {
    getAgentInsights.mockResolvedValue({ days: 30, logging: { executions: true, ragQueries: true }, problems: [], unanswered: [] })
    montar()
    expect(await screen.findByText('Nenhuma conversa com problema')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma pergunta ficou sem resposta')).toBeInTheDocument()
  })

  it('falha ao carregar mostra aviso', async () => {
    getAgentInsights.mockRejectedValue(new Error('x'))
    montar()
    expect(await screen.findByText('Não deu para carregar agora')).toBeInTheDocument()
  })
})
