// ─── Núcleo da "Visão geral" do Workspace (A2 / SCRUM-1013) ──────────────────
// Lógica pura, testável sem renderizar. O componente só desenha.
//
// O QUE ESTA SEÇÃO **NÃO** MOSTRA, e por quê: o mockup (`p2a-agentes.html:141`)
// abre com três KPIs — "Conversas · 7d 142 +11%", "Resolvidas pela IA 82% +4
// p.p.", "Transferências 21 −6". Todos os três, e principalmente as VARIAÇÕES,
// vêm do BE.7, que ficou fora da linha de chegada do épico. Não há de onde
// tirar nem o recorte de 7 dias nem o delta.
//
// A tentação era encher os mesmos três quadrados com o que existe:
// `agent.conversation_count` é um número de conversas e caberia debaixo do
// rótulo "Conversas". Mas ele é acumulado desde sempre, não 7 dias — e um
// número no lugar de outro, com o rótulo do outro, é a mesma família do chip
// que mente. Capacidade inexistente fica OCULTA; o que sobra é mostrado pelo
// que é.
//
// Então esta seção lista ESTADO, não desempenho, e cada linha diz exatamente o
// recorte que tem: "desde sempre" onde é acumulado, "n de m" onde é proporção.

import type { AgentConfigWithTools } from '@/services/agentsApi'

export interface EstadoRow {
  id: string
  label: string
  value: string
  /** Recorte do número. Ausente quando o rótulo já é completo sozinho. */
  hint?: string
  /** Zero/vazio fica apagado: linha sem lastro não compete com as que têm. */
  ativo: boolean
}

/** `null` → "nunca"; senão, distância legível em pt-BR. */
export function relativo(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return 'nunca'
  const ms = agora.getTime() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** `n de m` — e "nenhuma" quando m é 0, que não é o mesmo que "0 de 0". */
export function proporcao(ligados: number, total: number, plural: string): string {
  if (total === 0) return `nenhuma ${plural}`
  return `${ligados} de ${total}`
}

export function estadoRows(agent: AgentConfigWithTools, agora: Date = new Date()): EstadoRow[] {
  const tools = agent.tools ?? []
  const toolsLigadas = tools.filter((t) => t.enabled).length

  // `handoff_rules` é objeto com `rules`, não array — o mesmo formato que o
  // RulesTab consome. Ausente em agente que nunca configurou regra nenhuma.
  const regras = agent.handoff_rules?.rules ?? []
  const regrasLigadas = regras.filter((r) => r.enabled).length

  return [
    {
      id: 'conversas',
      label: 'Conversas atendidas',
      value: agent.conversation_count.toLocaleString('pt-BR'),
      hint: 'desde sempre',
      ativo: agent.conversation_count > 0,
    },
    {
      id: 'testes',
      label: 'Testes no simulador',
      value: agent.test_count.toLocaleString('pt-BR'),
      hint: 'desde sempre',
      ativo: agent.test_count > 0,
    },
    {
      id: 'ultimo-teste',
      label: 'Último teste',
      value: relativo(agent.last_tested_at, agora),
      ativo: !!agent.last_tested_at,
    },
    {
      id: 'ferramentas',
      label: 'Ferramentas ligadas',
      value: proporcao(toolsLigadas, tools.length, 'ferramenta'),
      ativo: toolsLigadas > 0,
    },
    {
      id: 'regras',
      label: 'Regras de transferência ligadas',
      value: proporcao(regrasLigadas, regras.length, 'regra'),
      ativo: regrasLigadas > 0,
    },
  ]
}
