// deriveAttention (A1/SCRUM-1012) — a regra da coluna "Atenção".
//
// O BE.7 não tem endpoint de atenção, então esta regra local É a feature, não
// um paliativo. Os testes fixam as três condições e — o mais importante — que
// ausência de dado nunca vira alerta: sem `health`, nenhum item de token.

import { describe, it, expect, vi } from 'vitest'

// `useDeckData` importa services/api (axios com interceptors) só para os
// fetches; aqui se exercita a função pura, então os módulos de rede são
// neutralizados para o import não montar nada.
vi.mock('@/services/api', () => ({ api: {}, conversationsApi: {}, whatsappNumbersApi: {} }))
vi.mock('@/services/agentsOpsApi', () => ({ agentsOpsApi: {}, agentDraftApi: {} }))

import { deriveAttention } from './useDeckData'
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
