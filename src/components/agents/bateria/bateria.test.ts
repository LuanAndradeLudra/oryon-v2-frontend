import { describe, it, expect, vi, beforeEach } from 'vitest'

const chatWithAgent = vi.fn()
const saveAgentTestRun = vi.fn()
vi.mock('@/services/agentsApi', () => ({
  chatWithAgent: (...a: unknown[]) => chatWithAgent(...a),
  saveAgentTestRun: (...a: unknown[]) => saveAgentTestRun(...a),
}))

import { compararResultado, rodarBateria, similaridade } from './bateria'

describe('similaridade', () => {
  it('ignora caixa, acento e palavrinhas; números contam', () => {
    expect(similaridade('A consulta custa R$ 155.', 'a CONSULTA custa r$ 155')).toBe(1)
    expect(similaridade('Não atendemos sábado', 'Nao atendemos sabado')).toBe(1)
    expect(similaridade('custa 155', 'custa 180')).toBeLessThan(0.6)
    expect(similaridade('', '')).toBe(1)
  })
})

describe('compararResultado', () => {
  const ok = (answer: string, toolCalls: string[] = []) => ({ answer, toolCalls, error: null })

  it('compara com a resposta aprovada (veredito boa)', () => {
    const r = compararResultado({ question: 'Preço?', answer: 'A consulta custa 155 reais', verdict: 'boa' }, ok('A consulta custa 180 reais'), undefined)
    expect(r.approvedAnswer).toBe('A consulta custa 155 reais')
    expect(r.answerChanged).toBe(true)
    expect(r.toolsChanged).toBeNull()
  })

  it('sem aprovada, compara com a execução anterior e aponta ferramentas diferentes', () => {
    const anterior = { question: 'Tem horário?', answer: 'Tenho amanhã às 9', toolCalls: ['agenda'], approvedAnswer: null, similarity: null, answerChanged: null, toolsChanged: null, error: null }
    const r = compararResultado({ question: 'Tem horário?', verdict: 'ruim' }, ok('Tenho amanhã às 9', []), anterior)
    expect(r.answerChanged).toBe(false)
    expect(r.toolsChanged).toBe(true)
  })

  it('primeira vez sem aprovada: nada a comparar', () => {
    const r = compararResultado({ question: 'Oi?' }, ok('Olá'), undefined)
    expect(r.answerChanged).toBeNull()
    expect(r.toolsChanged).toBeNull()
  })
})

describe('rodarBateria', () => {
  beforeEach(() => {
    chatWithAgent.mockReset()
    saveAgentTestRun.mockReset()
    saveAgentTestRun.mockImplementation(async (_id: string, run: unknown) => ({ id: 'run', ...(run as object) }))
  })

  it('uma pergunta por vez, com ferramentas simuladas; busca na base não conta como ferramenta; erro não derruba', async () => {
    chatWithAgent
      .mockResolvedValueOnce({ message: 'R$ 155', toolCalls: [{ name: 'search_knowledge_base', kind: 'kb', success: true }, { name: 'agenda', kind: 'skill', success: false }] })
      .mockImplementationOnce(() => Promise.reject(new Error('Erro 500')))
    const progresso = vi.fn()
    await rodarBateria({
      agent: { id: 'a1', system_prompt: 'Texto' },
      tests: [{ question: 'Preço?' }, { question: 'Horário?' }, { question: '   ' }],
      trigger: 'publish', specVersion: 3, onProgresso: progresso,
    })
    expect(chatWithAgent).toHaveBeenCalledTimes(2)
    expect(chatWithAgent.mock.calls[0]).toEqual(['Texto', [{ role: 'user', content: 'Preço?' }], { agentId: 'a1', stubTools: true }])
    const [agentId, run] = saveAgentTestRun.mock.calls[0] as [string, { trigger: string; specVersion: number; results: Array<{ toolCalls: string[]; error: string | null }> }]
    expect(agentId).toBe('a1')
    expect(run.trigger).toBe('publish')
    expect(run.specVersion).toBe(3)
    expect(run.results[0].toolCalls).toEqual(['agenda'])
    expect(run.results[1].error).toBe('Erro 500')
    expect(progresso).toHaveBeenLastCalledWith(2, 2)
  })
})
