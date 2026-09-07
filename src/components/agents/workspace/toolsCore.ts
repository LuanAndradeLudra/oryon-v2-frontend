// ─── Núcleo da seção "Ferramentas" do Workspace (A2 / SCRUM-1013) ────────────
// Lógica pura, testável sem rede nem render.
//
// O QUE O MOCKUP PEDE E NÃO EXISTE: `p2a-agentes.html:162` abre com um banner
// âmbar — "O token de Rastreio de entregas expira em 4 dias" — e o terceiro
// card traz o chip "Expira em 4d". Validade de credencial é o `health` do AS.3,
// e o agent-server não tem uma linha escrita. Banner e chip de expiração ficam
// OCULTOS: capacidade inexistente não vira "em breve".
//
// O QUE EXISTE: `GET /metrics/tools` (`getToolMetrics`), que devolve por
// ferramenta o total de execuções, sucessos e falhas na janela. Dá para dizer
// se a integração está RESPONDENDO — que é o que o chip verde do mockup afirma.
//
// A pegadinha que este arquivo evita: o endpoint é admin-only no backend e
// falha para quem não é. Sem métrica, o card NÃO mostra chip nenhum — porque
// afirmação sem lastro é pior que silêncio.
//
// A primeira versão só evitava METADE dela: garantia que não haveria chip
// VERDE sem medição, e deixava passar o cinza "Sem uso na janela", que é uma
// constatação igualmente sem lastro — e mais daninha, porque acusa. O Nível
// pegou. Não basta não elogiar sem medir; não se pode CONSTATAR sem medir.

import type { Accent } from '@/components/ui/accentColor'
import type { AgentTool, ToolMetricRow } from '@/services/agentsApi'

export type ToolStatusKind = 'desligada' | 'sem-uso' | 'ok' | 'instavel' | 'falhando'

export interface ToolStatus {
  kind: ToolStatusKind
  label: string
  /**
   * Acento do chip, no vocabulário de `ui/accentColor` — não uma cor solta.
   * `null` = chip neutro, sem cor de estado.
   */
  accent: Accent | null
}

const DESLIGADA: ToolStatus = { kind: 'desligada', label: 'Desligada', accent: null }
const SEM_USO: ToolStatus = { kind: 'sem-uso', label: 'Sem uso na janela', accent: null }

/**
 * A medição da janela, ou `null` quando não houve medição nenhuma —
 * `/metrics/tools` é admin-only e o não-admin recebe 403, e durante o
 * carregamento ainda não se olhou.
 *
 * O TIPO É QUE IMPEDE A CONFUSÃO, e essa distinção é a correção de um defeito
 * meu: antes, esta função recebia `row: ToolMetricRow | undefined`, e o
 * `undefined` significava DUAS coisas — "medi a janela e esta ferramenta não
 * aparece" e "não medi nada". O chamador colapsava as duas com
 * `metricas ? porNome.get(nome) : undefined`, e o resultado era o chip "Sem uso
 * na janela" aparecendo para quem NUNCA OLHOU a janela: uma constatação
 * negativa sobre um período que o leitor não tem acesso a inspecionar, dita
 * sobre integrações que podem estar perfeitas. Não é "não sei", é "nada rodou
 * em 7 dias" — e manda o operador investigar problema que não existe.
 *
 * Mesma lição de `HandoffRules.rules`: quando um valor ausente significa duas
 * coisas opostas, o conserto é o tipo separá-las, não a disciplina de quem
 * chama lembrar da diferença.
 */
export type MedicaoDaJanela = Map<string, ToolMetricRow> | null

/**
 * @returns `null` quando não há nada honesto a dizer sobre a execução — e o
 *   chamador então não desenha chip nenhum. Silêncio é o estado correto de quem
 *   não pôde medir; o rodapé da seção explica por quê, uma vez, em vez de cada
 *   card afirmar uma coisa falsa.
 */
export function toolStatus(tool: AgentTool, medicao: MedicaoDaJanela): ToolStatus | null {
  // Desligada ganha de tudo, e NÃO depende de medição: sai de `agent.tools`,
  // que quem abre a tela já tem. Uma ferramenta que o agente não chama não tem
  // estado de execução a reportar, mesmo que a janela guarde chamadas velhas.
  if (!tool.enabled) return DESLIGADA
  // Sem medição, a única coisa verdadeira é o silêncio.
  if (medicao === null) return null
  const row = medicao.get(tool.name)
  if (!row || row.total === 0) return SEM_USO
  if (row.failures === 0) return { kind: 'ok', label: 'Respondendo', accent: 'green' }
  if (row.successes === 0) return { kind: 'falhando', label: 'Falhando', accent: 'rose' }
  return {
    kind: 'instavel',
    label: `${row.failures} ${row.failures === 1 ? 'falha' : 'falhas'}`,
    accent: 'amber',
  }
}

/** Índice por nome, que é a chave que o backend usa em `/metrics/tools`. */
export function indexarMetricas(rows: ToolMetricRow[]): Map<string, ToolMetricRow> {
  return new Map(rows.map((r) => [r.tool_name, r]))
}

/**
 * Host da URL, que é o que identifica a integração para quem lê o card — o
 * caminho é detalhe do editor. URL inválida devolve a string crua em vez de
 * explodir: o campo é livre e já existe base com valor torto.
 */
export function hostDe(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Ligadas primeiro, depois alfabética — a ordem do backend é de criação. */
export function ordenarFerramentas(tools: AgentTool[]): AgentTool[] {
  return [...tools].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}
