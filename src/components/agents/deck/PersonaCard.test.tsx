// PersonaCard (A1/SCRUM-1012) — o que estes testes protegem é a REGRA DE
// HONESTIDADE do card: com o BE.7 ainda não implantado, tudo que depende dele
// (chip "N ao vivo", faixa ao vivo, rodapé de métricas) tem que sumir em vez
// de virar zero. Um card mostrando "0 ao vivo · Resolução 0%" para um agente
// saudável seria uma regressão silenciosa, e é exatamente o que o fallback
// pode produzir se alguém trocar `undefined` por um default numérico.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { PersonaCard } from './PersonaCard'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentMetrics } from '@/types/agentsOps'

const DAY = 24 * 60 * 60 * 1000

function agent(over: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'a1',
    tenant_id: 't1',
    created_by: null,
    name: 'Sofia',
    icon: 'bot',
    sector: 'Vendas',
    objective: null,
    status: 'active',
    system_prompt: '',
    handoff_rules: {} as AgentConfig['handoff_rules'],
    channels: {},
    wizard_config: {},
    test_count: 0,
    last_tested_at: new Date().toISOString(),
    conversation_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  } as AgentConfig
}

const live: AgentLiveInfo = {
  count: 3,
  latest: {
    conversationId: 'c1',
    contactName: 'Marina T.',
    snippet: 'queria o reembolso',
    at: new Date(Date.now() - 40_000).toISOString(),
    lastAction: 'awaiting_reply',
  },
}

const metrics: AgentMetrics = {
  started: 100,
  resolvedByAi: 82,
  transferred: 10,
  assistedSales: 2,
  avgResponseSec: 58,
  intents: [],
  deltaPct: 1,
}

describe('PersonaCard · agente ativo', () => {
  it('mostra chip "N ao vivo", a conversa do instante e o rodapé de 3 métricas', () => {
    render(<PersonaCard agent={agent()} live={live} metrics={metrics} onOpen={vi.fn()} />)

    expect(screen.getByText('3 ao vivo')).toBeInTheDocument()
    expect(screen.getByText('Marina T.')).toBeInTheDocument()
    expect(screen.getByText(/queria o reembolso/)).toBeInTheDocument()
    expect(screen.getByText('82')).toBeInTheDocument() // resolução 82/100
    expect(screen.getByText('58')).toBeInTheDocument() // resposta 58s
  })

  it('rotula a janela do rodapé como "7 dias", NUNCA como "Hoje"', () => {
    // O contrato do BE.7 não expõe o dia corrente por agente (só /metrics com
    // range de dias). O mockup diz "Hoje"; a implementação diz a verdade.
    render(<PersonaCard agent={agent()} live={live} metrics={metrics} onOpen={vi.fn()} />)

    expect(screen.getByText('7 dias')).toBeInTheDocument()
    expect(screen.queryByText('Hoje')).not.toBeInTheDocument()
  })

  it('sem dados do BE.7, omite chip, faixa ao vivo e rodapé em vez de mostrar zeros', () => {
    render(<PersonaCard agent={agent()} onOpen={vi.fn()} />)

    expect(screen.getByText('Sofia')).toBeInTheDocument()
    expect(screen.queryByText(/ao vivo/)).not.toBeInTheDocument()
    expect(screen.queryByText('Resolução')).not.toBeInTheDocument()
    expect(screen.queryByText('7 dias')).not.toBeInTheDocument()
  })

  it('mostra "—" na resolução quando não houve conversa no período (0/0 não é 0%)', () => {
    render(
      <PersonaCard
        agent={agent()}
        live={live}
        metrics={{ ...metrics, started: 0, resolvedByAi: 0 }}
        onOpen={vi.fn()}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('abre o agente ao clicar no topo do card', () => {
    const onOpen = vi.fn()
    render(<PersonaCard agent={agent()} live={live} onOpen={onOpen} />)

    fireEvent.click(screen.getByText('Sofia'))
    expect(onOpen).toHaveBeenCalledWith('a1')
  })
})

describe('PersonaCard · agente pausado', () => {
  const paused = agent({ id: 'a2', name: 'Rafa', status: 'paused', updated_at: new Date(Date.now() - 2 * DAY).toISOString() })

  it('fica esmaecido, troca o chip para "Pausado" e oferece Reativar', () => {
    const onResume = vi.fn()
    const { container } = render(<PersonaCard agent={paused} onOpen={vi.fn()} onResume={onResume} />)

    expect(container.querySelector('.opacity-75')).not.toBeNull()
    expect(screen.getByText('Pausado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))
    expect(onResume).toHaveBeenCalledWith('a2')
  })

  it('mostra a fila quando ela é conhecida', () => {
    render(<PersonaCard agent={paused} queue={14} onOpen={vi.fn()} />)

    expect(screen.getByText('Fila')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText(/14 conversas aguardando na fila/)).toBeInTheDocument()
  })

  it('omite a fila quando a linha do agente não é resolvível (não inventa 0)', () => {
    render(<PersonaCard agent={paused} onOpen={vi.fn()} />)

    expect(screen.queryByText('Fila')).not.toBeInTheDocument()
    expect(screen.queryByText(/aguardando na fila/)).not.toBeInTheDocument()
  })
})

describe('PersonaCard · rascunho', () => {
  it('desenha cartão tracejado com barra de progresso e CTA de continuar', () => {
    const draft = agent({
      id: 'a3',
      name: 'Rascunho sem nome',
      status: 'draft',
      wizard_config: { nome: 'x', setor: 'y', objetivo: 'z' },
    })
    const onOpen = vi.fn()
    const { container } = render(<PersonaCard agent={draft} onOpen={onOpen} />)

    expect(container.querySelector('.border-dashed')).not.toBeNull()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '8')
    expect(screen.getByText('Parou em 3 de 8')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continuar rascunho' }))
    expect(onOpen).toHaveBeenCalledWith('a3')
  })

  it('sem wizard_config, mostra o rascunho sem barra em vez de "0 de 8"', () => {
    const draft = agent({ id: 'a4', status: 'draft', wizard_config: undefined as unknown as Record<string, unknown> })
    render(<PersonaCard agent={draft} onOpen={vi.fn()} />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/Parou em/)).not.toBeInTheDocument()
  })
})
