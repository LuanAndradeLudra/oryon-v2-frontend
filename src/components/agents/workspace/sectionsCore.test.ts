// Núcleos puros das seções "Visão geral" e "Ferramentas" (A2 / SCRUM-1013).
//
// O que estes casos protegem não é formatação: é a REGRA DE HONESTIDADE que
// decidiu as duas seções. Número sem lastro não aparece; medição ausente não
// vira estado verde. Cada caso abaixo é uma dessas duas afirmações.

import { describe, it, expect } from 'vitest'
import type { AgentConfigWithTools, AgentTool, ToolMetricRow } from '@/services/agentsApi'
import { estadoRows, proporcao, relativo } from './overviewCore'
import { hostDe, indexarMetricas, ordenarFerramentas, toolStatus } from './toolsCore'

function ferramenta(over: Partial<AgentTool> = {}): AgentTool {
  return {
    id: 't1', agent_id: 'a1', name: 'Estoque', description: '',
    method: 'GET', url: 'https://api.loja.com/v1/estoque', headers: {},
    body_template: null, parameters: [], response_hint: null,
    enabled: true, created_at: '', updated_at: '',
    ...over,
  }
}

function metrica(over: Partial<ToolMetricRow> = {}): ToolMetricRow {
  return { tool_name: 'Estoque', total: 10, successes: 10, failures: 0, avg_duration_ms: 90, p95_duration_ms: 120, ...over }
}

function agente(over: Partial<AgentConfigWithTools> = {}): AgentConfigWithTools {
  return {
    id: 'a1', tenant_id: 't1', created_by: null, name: 'Sofia', icon: 'bot',
    sector: 'Vendas', objective: null, status: 'active', system_prompt: '',
    handoff_rules: {} as AgentConfigWithTools['handoff_rules'], channels: {}, wizard_config: {},
    test_count: 0, last_tested_at: null, conversation_count: 0,
    created_at: '', updated_at: '', tools: [],
    ...over,
  } as AgentConfigWithTools
}

describe('overviewCore · o que a Visão geral pode afirmar', () => {
  it('cada número acumulado DECLARA que é acumulado', () => {
    const rows = estadoRows(agente({ conversation_count: 142, test_count: 8 }))
    const conversas = rows.find((r) => r.id === 'conversas')!
    // O mockup pede "Conversas · 7d". Sem o BE.7 não há recorte de 7 dias, e o
    // número que existe é de sempre — então ele aparece dizendo isso. Um valor
    // acumulado sob rótulo de janela seria a mesma família do chip que mente.
    expect(conversas.value).toBe('142')
    expect(conversas.hint).toBe('desde sempre')
  })

  it('nenhuma linha inventa variação: o delta do mockup não existe sem BE.7', () => {
    const rows = estadoRows(agente({ conversation_count: 142 }))
    for (const row of rows) {
      expect(Object.keys(row)).not.toContain('delta')
      expect(row.value).not.toMatch(/[+−%]|p\.p\./)
    }
  })

  it('zero fica apagado, para não competir com o que tem lastro', () => {
    const rows = estadoRows(agente({ conversation_count: 0, test_count: 3 }))
    expect(rows.find((r) => r.id === 'conversas')!.ativo).toBe(false)
    expect(rows.find((r) => r.id === 'testes')!.ativo).toBe(true)
  })

  it('"nenhuma" não é "0 de 0" — sem ferramenta nenhuma, a proporção não faz sentido', () => {
    expect(proporcao(0, 0, 'ferramenta')).toBe('nenhuma ferramenta')
    expect(proporcao(0, 3, 'ferramenta')).toBe('0 de 3')
    expect(proporcao(2, 3, 'ferramenta')).toBe('2 de 3')
  })

  it('conta só as ferramentas e regras LIGADAS', () => {
    const rows = estadoRows(agente({
      tools: [ferramenta({ id: '1' }), ferramenta({ id: '2', enabled: false })],
      handoff_rules: { rules: [
        { enabled: true }, { enabled: false }, { enabled: true },
      ] } as unknown as AgentConfigWithTools['handoff_rules'],
    }))
    expect(rows.find((r) => r.id === 'ferramentas')!.value).toBe('1 de 2')
    expect(rows.find((r) => r.id === 'regras')!.value).toBe('2 de 3')
  })

  it('"nunca" testado é diferente de "há 0 min"', () => {
    const agora = new Date('2026-09-06T12:00:00Z')
    expect(relativo(null, agora)).toBe('nunca')
    expect(relativo('2026-09-06T11:30:00Z', agora)).toBe('há 30 min')
    expect(relativo('2026-09-06T09:00:00Z', agora)).toBe('há 3 h')
    expect(relativo('2026-09-04T12:00:00Z', agora)).toBe('há 2 d')
  })
})

describe('toolsCore · o chip só afirma o que foi medido', () => {
  it('sem métrica, NÃO existe estado verde — ausência de medição não é sucesso', () => {
    const status = toolStatus(ferramenta(), undefined)
    expect(status.kind).toBe('sem-uso')
    // O `accent: null` é o ponto inteiro: sem cor de estado, o card não afirma
    // que conferiu. É este campo que impede o "OK" otimista de quem não é
    // admin e por isso nunca recebeu as métricas.
    expect(status.accent).toBeNull()
  })

  it('janela vazia também não vira verde', () => {
    expect(toolStatus(ferramenta(), metrica({ total: 0, successes: 0 })).accent).toBeNull()
  })

  it('desligada ganha de qualquer execução velha na janela', () => {
    const status = toolStatus(ferramenta({ enabled: false }), metrica({ total: 50, failures: 50, successes: 0 }))
    expect(status.kind).toBe('desligada')
  })

  it('separa falhando de instável — perder metade não é o mesmo que perder tudo', () => {
    expect(toolStatus(ferramenta(), metrica({ total: 5, successes: 0, failures: 5 })).kind).toBe('falhando')
    const instavel = toolStatus(ferramenta(), metrica({ total: 5, successes: 3, failures: 2 }))
    expect(instavel.kind).toBe('instavel')
    expect(instavel.label).toBe('2 falhas')
    expect(toolStatus(ferramenta(), metrica({ total: 5, successes: 4, failures: 1 })).label).toBe('1 falha')
  })

  it('só é "Respondendo" com execução de verdade e zero falha', () => {
    const ok = toolStatus(ferramenta(), metrica())
    expect(ok.kind).toBe('ok')
    expect(ok.accent).toBe('green')
  })

  it('a métrica é casada pelo NOME, que é a chave do backend', () => {
    const idx = indexarMetricas([metrica({ tool_name: 'Cupom' }), metrica({ tool_name: 'Estoque' })])
    expect(idx.get('Estoque')).toBeDefined()
    expect(idx.get('inexistente')).toBeUndefined()
  })

  it('URL torta não derruba o card', () => {
    expect(hostDe('https://api.loja.com/v1/estoque')).toBe('api.loja.com')
    expect(hostDe('nao é url')).toBe('nao é url')
  })

  it('ligadas primeiro; a ordem do backend é de criação', () => {
    const nomes = ordenarFerramentas([
      ferramenta({ id: '1', name: 'Zebra' }),
      ferramenta({ id: '2', name: 'Alfa', enabled: false }),
      ferramenta({ id: '3', name: 'Beta' }),
    ]).map((t) => t.name)
    expect(nomes).toEqual(['Beta', 'Zebra', 'Alfa'])
  })
})
