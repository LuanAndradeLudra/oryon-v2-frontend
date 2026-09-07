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
// "OK" sem medição é afirmação sem lastro, e é pior que silêncio: o chip verde
// diria "conferi e está bom" quando o que houve foi "não pude olhar".

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
 * @param row métrica da ferramenta na janela, ou `undefined` quando o endpoint
 *   não respondeu (admin-only, flag desligada) ou quando a ferramenta não
 *   aparece na janela. Os dois casos são diferentes e o chamador os separa:
 *   sem MEDIÇÃO nenhuma ele não chama esta função (ver `podeMedir`).
 */
export function toolStatus(tool: AgentTool, row: ToolMetricRow | undefined): ToolStatus {
  // Desligada ganha de tudo: uma ferramenta que o agente não chama não tem
  // estado de execução a reportar, mesmo que a janela guarde chamadas velhas.
  if (!tool.enabled) return DESLIGADA
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
