import {
  chatWithAgent, saveAgentTestRun,
  type AgentSpec, type AgentTestRun, type AgentTestRunResult,
} from '@/services/agentsApi'

/**
 * Bateria de testes do agente (onda 5, M18). Cada pergunta de `spec.tests`
 * roda sozinha pelo /chat — mesmo caminho da bancada — com as ferramentas
 * simuladas (`stubTools`): nada de agendar, mover negócio ou chamar
 * integração de verdade. A comparação é por palavras, sem outro modelo
 * julgando: "mudou" quer dizer "vale você olhar", não "está errado".
 */

/** Abaixo disto a resposta conta como mudada. */
export const LIMIAR_PARECIDA = 0.6

const PALAVRA = /[\p{L}\p{N}]+/gu

function palavras(texto: string): Set<string> {
  const norm = texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '')
  return new Set((norm.match(PALAVRA) ?? []).filter((p) => p.length >= 3 || /\d/.test(p)))
}

/** Números da resposta (preço, horário, data): trocar um deles é sempre mudança. */
function numeros(texto: string): string {
  return [...new Set(texto.match(/\d+(?:[.,:]\d+)*/g) ?? [])].sort().join('|')
}

/** Parecença de 0 a 1 (Jaccard das palavras). Dois textos vazios = 1. */
export function similaridade(a: string, b: string): number {
  const A = palavras(a)
  const B = palavras(b)
  if (A.size === 0 && B.size === 0) return 1
  let comum = 0
  for (const p of A) if (B.has(p)) comum++
  return comum / (A.size + B.size - comum)
}

type Teste = AgentSpec['tests'][number]

/** Compara uma resposta nova com a aprovada (ou, sem ela, com a execução anterior). */
export function compararResultado(
  teste: Teste,
  resposta: { answer: string; toolCalls: string[]; error: string | null },
  anterior: AgentTestRunResult | undefined,
): AgentTestRunResult {
  const aprovada = teste.verdict === 'boa' && teste.answer ? teste.answer : null
  const referencia = aprovada ?? (anterior && !anterior.error ? anterior.answer : null)
  const sim = !resposta.error && referencia != null ? similaridade(resposta.answer, referencia) : null
  return {
    question: teste.question,
    answer: resposta.answer,
    toolCalls: resposta.toolCalls,
    approvedAnswer: aprovada,
    similarity: sim,
    answerChanged: sim == null ? null : sim < LIMIAR_PARECIDA || numeros(resposta.answer) !== numeros(referencia ?? ''),
    toolsChanged: resposta.error || !anterior || anterior.error ? null : anterior.toolCalls.join('|') !== resposta.toolCalls.join('|'),
    error: resposta.error,
  }
}

export interface RodarBateria {
  agent: { id: string; system_prompt: string }
  tests: Teste[]
  anterior?: AgentTestRun | null
  trigger: 'publish' | 'manual'
  specVersion?: number | null
  onProgresso?: (feitas: number, total: number) => void
}

/** Roda uma pergunta por vez (não enche o servidor) e guarda a execução. */
export async function rodarBateria({ agent, tests, anterior, trigger, specVersion, onProgresso }: RodarBateria): Promise<AgentTestRun> {
  const porPergunta = new Map((anterior?.results ?? []).map((r) => [r.question, r]))
  const resultados: AgentTestRunResult[] = []
  const lista = tests.filter((t) => t.question.trim()).slice(0, 50)
  for (const [i, t] of lista.entries()) {
    let resposta: { answer: string; toolCalls: string[]; error: string | null }
    try {
      const r = await chatWithAgent(agent.system_prompt, [{ role: 'user', content: t.question }], { agentId: agent.id, stubTools: true })
      resposta = { answer: r.message, toolCalls: r.toolCalls.filter((c) => c.kind !== 'kb').map((c) => c.name), error: null }
    } catch (e) {
      resposta = { answer: '', toolCalls: [], error: e instanceof Error ? e.message : 'Falhou' }
    }
    resultados.push(compararResultado(t, resposta, porPergunta.get(t.question)))
    onProgresso?.(i + 1, lista.length)
  }
  return saveAgentTestRun(agent.id, { trigger, specVersion: specVersion ?? null, results: resultados })
}
