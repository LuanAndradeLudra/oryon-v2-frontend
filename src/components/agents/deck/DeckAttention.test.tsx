// DeckAttention + deriveAttention (A1/SCRUM-1012).
//
// A coluna "Atenção" é derivada 100% no cliente: o BE.7 não tem endpoint de
// atenção, então a regra AQUI é a feature, não um paliativo. Os testes fixam
// as três condições e — o mais importante — que ausência de dado nunca vira
// alerta: sem `health`, nenhum item de token; sem `last_tested_at` conhecido
// para um agente pausado, nenhum item de teste.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// `useDeckData` importa services/api (axios com interceptors) só para os
// fetches; o teste exercita a função pura, então os módulos de rede são
// neutralizados para o import não montar nada.
vi.mock('@/services/api', () => ({ api: {}, conversationsApi: {}, whatsappNumbersApi: {} }))
vi.mock('@/services/agentsOpsApi', () => ({ agentsOpsApi: {}, agentDraftApi: {} }))

import { DeckAttention } from './DeckAttention'
import { deriveAttention, type DeckAttentionItem } from './useDeckData'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentHealth } from '@/types/agentsOps'

const DAY = 24 * 60 * 60 * 1000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

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
    test_count: 1,
    last_tested_at: ago(1),
    conversation_count: 0,
    created_at: ago(30),
    updated_at: ago(1),
    ...over,
  } as AgentConfig
}

function health(over: Partial<AgentHealth> = {}): AgentHealth {
  return { last_test_at: null, prompt_version: 1, knowledge_count: 0, tool_warnings: [], ...over }
}

describe('deriveAttention', () => {
  it('não gera nada para um agente ativo, testado há pouco e sem avisos', () => {
    expect(deriveAttention([agent()], {})).toEqual([])
  })

  it('aponta agente pausado há mais de 48h', () => {
    const items = deriveAttention([agent({ status: 'paused', name: 'Rafa', updated_at: ago(3) })], {})
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('paused')
    expect(items[0].title).toBe('Rafa pausado há 3 dias')
    // Sem número de fila no texto: o dado não existe aqui.
    expect(items[0].description).not.toMatch(/\d+ conversas/)
  })

  it('ignora pausa recente (menos de 48h não é um problema ainda)', () => {
    expect(deriveAttention([agent({ status: 'paused', updated_at: ago(1) })], {})).toEqual([])
  })

  it('aponta agente ativo sem teste há mais de 7 dias, e o nunca testado', () => {
    const semTeste = deriveAttention([agent({ last_tested_at: ago(9) })], {})
    expect(semTeste[0].title).toBe('Sofia sem teste há 9 dias')

    const nunca = deriveAttention([agent({ last_tested_at: null })], {})
    expect(nunca[0].title).toBe('Sofia nunca foi testado')
  })

  it('não cobra teste de rascunho nem de pausado — a regra é só para agente ativo', () => {
    expect(deriveAttention([agent({ status: 'draft', last_tested_at: null })], {})).toEqual([])
    expect(deriveAttention([agent({ status: 'paused', last_tested_at: null, updated_at: ago(1) })], {})).toEqual([])
  })

  it('aponta token expirando a partir do health, e distingue expirado de expirando', () => {
    const expirando = deriveAttention([agent()], {
      a1: health({ tool_warnings: [{ tool_id: 't1', kind: 'token_expiring', expires_at: new Date(Date.now() + 4 * DAY).toISOString() }] }),
    })
    expect(expirando[0].kind).toBe('token_expiring')
    expect(expirando[0].title).toMatch(/está expirando/)

    const expirado = deriveAttention([agent()], {
      a1: health({ tool_warnings: [{ tool_id: 't1', kind: 'token_expired', expires_at: ago(1) }] }),
    })
    expect(expirado[0].title).toMatch(/expirou/)
  })

  it('sem health disponível (AS.2/AS.3 fora do ar), não inventa alerta de token', () => {
    const items = deriveAttention([agent({ last_tested_at: ago(9) })], {})
    expect(items.every((i) => i.kind !== 'token_expiring')).toBe(true)
  })

  it('ordena por criticidade: token → pausado → sem teste', () => {
    const items = deriveAttention(
      [
        agent({ id: 'a1', last_tested_at: ago(9) }),
        agent({ id: 'a2', status: 'paused', updated_at: ago(3) }),
        agent({ id: 'a3', last_tested_at: ago(1) }),
      ],
      { a3: health({ tool_warnings: [{ tool_id: 't', kind: 'token_expiring', expires_at: new Date(Date.now() + DAY).toISOString() }] }) },
    )
    expect(items.map((i) => i.kind)).toEqual(['token_expiring', 'paused', 'untested'])
  })
})

describe('DeckAttention', () => {
  const item = (over: Partial<DeckAttentionItem> = {}): DeckAttentionItem => ({
    id: 'i1',
    kind: 'paused',
    accent: 'amber',
    agentId: 'a1',
    agentName: 'Rafa',
    title: 'Rafa pausado há 3 dias',
    description: 'Ninguém está respondendo as conversas dele.',
    ...over,
  })

  it('lista os itens com o contador e o texto de cada um', () => {
    render(<DeckAttention items={[item(), item({ id: 'i2', kind: 'untested', title: 'Sofia sem teste há 9 dias' })]} onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)

    expect(screen.getByText('Rafa pausado há 3 dias')).toBeInTheDocument()
    expect(screen.getByText('Sofia sem teste há 9 dias')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('mostra estado tranquilo quando não há nada pedindo atenção', () => {
    render(<DeckAttention items={[]} onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)
    expect(screen.getByText('Nada pedindo atenção agora')).toBeInTheDocument()
  })

  it('só o item de pausado oferece Reativar, e a ação recebe o id do agente', () => {
    const onResume = vi.fn()
    render(<DeckAttention items={[item()]} onOpenAgent={vi.fn()} onResumeAgent={onResume} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))
    expect(onResume).toHaveBeenCalledWith('a1')
  })

  it('adapta o rótulo da ação secundária ao tipo do alerta', () => {
    const onOpen = vi.fn()
    const { rerender } = render(<DeckAttention items={[item({ kind: 'untested' })]} onOpenAgent={onOpen} onResumeAgent={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Testar agora' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reativar' })).not.toBeInTheDocument()

    rerender(<DeckAttention items={[item({ kind: 'token_expiring' })]} onOpenAgent={onOpen} onResumeAgent={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }))
    expect(onOpen).toHaveBeenCalledWith('a1')
  })

  it('mostra esqueleto enquanto a lista de agentes ainda está carregando', () => {
    const { container } = render(<DeckAttention items={[]} loading onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)
    expect(screen.queryByText('Nada pedindo atenção agora')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
