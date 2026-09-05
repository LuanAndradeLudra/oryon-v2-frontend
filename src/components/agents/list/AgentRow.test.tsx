// AgentRow (A4/SCRUM-1015) — a linha fechada da Lista.
//
// A regra que estes testes protegem é a mesma do Deck: sem o BE.7, as colunas
// numéricas e o chip somem, em vez de virarem zero. Uma linha dizendo
// "Resolução 0%" para um agente saudável é pior que uma linha sem a coluna.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { AgentRow } from './AgentRow'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentMetrics } from '@/types/agentsOps'

const DAY = 24 * 60 * 60 * 1000
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString()

function agent(over: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'a1', tenant_id: 't', created_by: null,
    name: 'Sofia', icon: 'bot', sector: 'Vendas', objective: 'E-commerce',
    status: 'active', system_prompt: '', handoff_rules: {}, channels: {}, wizard_config: {},
    test_count: 1, last_tested_at: ago(1), conversation_count: 0,
    created_at: ago(30), updated_at: ago(1),
    ...over,
  } as AgentConfig
}

const live: AgentLiveInfo = {
  count: 3,
  latest: { conversationId: 'c1', contactName: 'Marina T.', snippet: 'queria o reembolso', at: ago(0), lastAction: 'awaiting_reply' },
}

const metrics: AgentMetrics = {
  started: 100, resolvedByAi: 82, transferred: 10, assistedSales: 2,
  avgTimeToHumanResponseSec: 58, intents: [], deltaPct: 1,
}

describe('AgentRow · agente ativo', () => {
  it('mostra nome com a área, chip ao vivo e as duas colunas numéricas', () => {
    render(<AgentRow agent={agent()} expanded={false} onToggle={vi.fn()} live={live} metrics={metrics} />)

    expect(screen.getByText('Sofia')).toBeInTheDocument()
    expect(screen.getByText('3 ao vivo')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  it('rotula a janela como "7 dias", igual ao Deck, e nunca "Hoje"', () => {
    render(<AgentRow agent={agent()} expanded={false} onToggle={vi.fn()} live={live} metrics={metrics} />)

    expect(screen.getByText('7 dias')).toBeInTheDocument()
    expect(screen.queryByText('Hoje')).not.toBeInTheDocument()
  })

  it('sem BE.7, some com chip e colunas e diz quando o agente mudou', () => {
    render(<AgentRow agent={agent()} expanded={false} onToggle={vi.fn()} />)

    expect(screen.queryByText(/ao vivo/)).not.toBeInTheDocument()
    expect(screen.queryByText('Resolução')).not.toBeInTheDocument()
    expect(screen.queryByText('7 dias')).not.toBeInTheDocument()
    expect(screen.getByText(/Atualizado há 1d/)).toBeInTheDocument()
  })

  it('o chevron abre e fecha a linha, com aria-expanded e rótulo que mudam', () => {
    const onToggle = vi.fn()
    const { rerender } = render(<AgentRow agent={agent()} expanded={false} onToggle={onToggle} live={live} />)

    const abrir = screen.getByRole('button', { name: 'Ver detalhes de Sofia' })
    expect(abrir).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(abrir)
    expect(onToggle).toHaveBeenCalledWith('a1')

    rerender(<AgentRow agent={agent()} expanded onToggle={onToggle} live={live} />)
    expect(screen.getByRole('button', { name: 'Fechar detalhes de Sofia' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('renderiza o corpo expandido só quando aberta', () => {
    const { rerender } = render(
      <AgentRow agent={agent()} expanded={false} onToggle={vi.fn()}><p>corpo</p></AgentRow>,
    )
    expect(screen.queryByText('corpo')).not.toBeInTheDocument()

    rerender(<AgentRow agent={agent()} expanded onToggle={vi.fn()}><p>corpo</p></AgentRow>)
    expect(screen.getByText('corpo')).toBeInTheDocument()
  })
})

describe('AgentRow · agente pausado', () => {
  const pausado = agent({ id: 'a2', name: 'Rafa', status: 'paused', updated_at: ago(3) })

  it('troca as colunas para Fila e Resolução · 30d, e esmaece a linha', () => {
    const { container } = render(
      <AgentRow agent={pausado} expanded={false} onToggle={vi.fn()} metrics={{ ...metrics, started: 60, resolvedByAi: 46 }} queue={14} />,
    )

    expect(screen.getByText('Pausado')).toBeInTheDocument()
    expect(screen.getByText('Fila')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('Resolução · 30d')).toBeInTheDocument()
    expect(container.querySelector('.opacity-75')).not.toBeNull()
  })

  it('sem fila resolvível, omite a coluna em vez de mostrar 0', () => {
    render(<AgentRow agent={pausado} expanded={false} onToggle={vi.fn()} metrics={metrics} />)
    expect(screen.queryByText('Fila')).not.toBeInTheDocument()
  })

  it('quando aberta, a linha pausada deixa de ser esmaecida', () => {
    const { container } = render(<AgentRow agent={pausado} expanded onToggle={vi.fn()} />)
    expect(container.querySelector('.opacity-75')).toBeNull()
  })
})

describe('AgentRow · rascunho', () => {
  it('mostra o chip de rascunho e nenhuma métrica', () => {
    render(<AgentRow agent={agent({ id: 'a3', status: 'draft', name: 'Sem nome' })} expanded={false} onToggle={vi.fn()} />)

    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.queryByText('7 dias')).not.toBeInTheDocument()
    expect(screen.queryByText(/ao vivo/)).not.toBeInTheDocument()
  })
})
