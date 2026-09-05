// AgentRowExpanded (A4/SCRUM-1015) — os três blocos da linha aberta.
//
// Dois pontos que estes testes travam, e que são decisões, não detalhes:
//   · "Duplicar" fica OCULTO enquanto o AS.1 não existir — não desabilitado.
//     Um botão desabilitado promete uma ação que ninguém pode cumprir.
//   · cada linha do bloco Saúde só aparece com o dado correspondente; sem o
//     AS.2 sobra o que vem do próprio AgentConfig, e nada é inventado.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { AgentRowExpanded, AS1_DUPLICATE_DISPONIVEL } from './AgentRowExpanded'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentHealth } from '@/types/agentsOps'

const DAY = 24 * 60 * 60 * 1000
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString()
const emDias = (d: number) => new Date(Date.now() + d * DAY).toISOString()

function agent(over: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'a1', tenant_id: 't', created_by: null,
    name: 'Sofia', icon: 'bot', sector: 'Vendas', objective: null,
    status: 'active', system_prompt: '', handoff_rules: {}, channels: {}, wizard_config: {},
    test_count: 1, last_tested_at: ago(2), conversation_count: 0,
    created_at: ago(30), updated_at: ago(1),
    ...over,
  } as AgentConfig
}

const live: AgentLiveInfo = {
  count: 3,
  latest: { conversationId: 'c1', contactName: 'Marina T.', snippet: 'queria o reembolso', at: ago(0), lastAction: 'awaiting_reply' },
}

const health: AgentHealth = { last_test_at: ago(9), prompt_version: 3, knowledge_count: 4, tool_warnings: [] }

const props = {
  onOpenWorkspace: vi.fn(),
  onTest: vi.fn(),
  onToggleStatus: vi.fn(),
}

describe('AgentRowExpanded · conversas ao vivo', () => {
  it('traz a contagem no título e mostra a conversa que o contrato devolve', () => {
    render(<AgentRowExpanded agent={agent()} live={live} {...props} />)

    expect(screen.getByText('Conversas ao vivo · 3')).toBeInTheDocument()
    expect(screen.getByText('Marina T.')).toBeInTheDocument()
    expect(screen.getByText('queria o reembolso')).toBeInTheDocument()
    // O /live devolve uma só; o resto é dito em texto, não inventado em linhas.
    expect(screen.getByText('e mais 2 conversas neste momento')).toBeInTheDocument()
  })

  it('sem o endpoint, explica a ausência em vez de mostrar lista vazia', () => {
    render(<AgentRowExpanded agent={agent()} {...props} />)
    expect(screen.getByText(/Indisponível enquanto o painel de operação/)).toBeInTheDocument()
  })

  it('com o endpoint e nenhuma conversa, diz que não há conversa agora', () => {
    render(<AgentRowExpanded agent={agent()} live={{ count: 0, latest: null }} {...props} />)
    expect(screen.getByText('Nenhuma conversa em andamento agora.')).toBeInTheDocument()
  })
})

describe('AgentRowExpanded · ações', () => {
  it('abre o workspace e o simulador pelo id do agente', () => {
    const onOpenWorkspace = vi.fn()
    const onTest = vi.fn()
    render(<AgentRowExpanded agent={agent()} live={live} {...props} onOpenWorkspace={onOpenWorkspace} onTest={onTest} />)

    fireEvent.click(screen.getByRole('button', { name: /Abrir workspace/ }))
    expect(onOpenWorkspace).toHaveBeenCalledWith('a1')

    fireEvent.click(screen.getByRole('button', { name: /Testar no simulador/ }))
    expect(onTest).toHaveBeenCalledWith('a1')
  })

  it('oferece Pausar no agente ativo e Reativar no pausado', () => {
    const onToggleStatus = vi.fn()
    const { rerender } = render(<AgentRowExpanded agent={agent()} {...props} onToggleStatus={onToggleStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /Pausar agente/ }))
    expect(onToggleStatus).toHaveBeenCalledWith('a1', 'paused')

    rerender(<AgentRowExpanded agent={agent({ status: 'paused' })} {...props} onToggleStatus={onToggleStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /Reativar agente/ }))
    expect(onToggleStatus).toHaveBeenCalledWith('a1', 'active')
  })

  it('não mostra "Duplicar" enquanto o AS.1 não existir — oculto, não desabilitado', () => {
    expect(AS1_DUPLICATE_DISPONIVEL).toBe(false)
    render(<AgentRowExpanded agent={agent()} {...props} onDuplicate={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /Duplicar/ })).not.toBeInTheDocument()
  })
})

describe('AgentRowExpanded · saúde', () => {
  it('mostra prompt, conhecimento e último teste quando o health responde', () => {
    render(<AgentRowExpanded agent={agent()} health={health} {...props} />)

    expect(screen.getByText('v3')).toBeInTheDocument()
    expect(screen.getByText('4 fontes')).toBeInTheDocument()
    expect(screen.getByText('há 9 dias')).toBeInTheDocument()
  })

  it('sem health, sobra só o último teste vindo do próprio agente', () => {
    render(<AgentRowExpanded agent={agent()} {...props} />)

    expect(screen.getByText('Último teste')).toBeInTheDocument()
    expect(screen.getByText('há 2 dias')).toBeInTheDocument()
    expect(screen.queryByText('Prompt')).not.toBeInTheDocument()
    expect(screen.queryByText('Conhecimento')).not.toBeInTheDocument()
  })

  it('agente nunca testado diz "nunca", não "há 0 dias"', () => {
    render(<AgentRowExpanded agent={agent({ last_tested_at: null })} {...props} />)
    expect(screen.getByText('nunca')).toBeInTheDocument()
  })

  it('avisa token expirando e token expirado com textos diferentes', () => {
    const expirando: AgentHealth = { ...health, tool_warnings: [{ tool_id: 't1', kind: 'token_expiring', expires_at: emDias(4) }] }
    const { rerender } = render(<AgentRowExpanded agent={agent()} health={expirando} {...props} />)
    expect(screen.getByText('Ferramentas')).toBeInTheDocument()
    expect(screen.getByText(/token expira em/)).toBeInTheDocument()

    const expirado: AgentHealth = { ...health, tool_warnings: [{ tool_id: 't1', kind: 'token_expired', expires_at: ago(1) }] }
    rerender(<AgentRowExpanded agent={agent()} health={expirado} {...props} />)
    expect(screen.getByText('token expirado')).toBeInTheDocument()
  })

  it('não inventa a linha "Janela 24h": não existe fonte para ela', () => {
    render(<AgentRowExpanded agent={agent()} health={health} {...props} />)
    expect(screen.queryByText(/Janela 24h/)).not.toBeInTheDocument()
  })
})
