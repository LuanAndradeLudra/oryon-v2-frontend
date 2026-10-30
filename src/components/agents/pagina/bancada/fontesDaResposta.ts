import type { AgentConfigWithTools, ChatTurnDebug, ToolCall } from '@/services/agentsApi'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'

/**
 * "O que a IA usou nesta resposta" — o turno de teste em linguagem de quem
 * configura o agente, não de quem o programou. Puro: recebe o debug do /chat
 * e devolve linhas prontas para mostrar.
 */
export type TipoDeFonte = 'conhecimento' | 'crm' | 'skill' | 'integracao' | 'outra' | 'transferencia' | 'verificacao' | 'instrucoes' | 'regra'

export interface FonteDaResposta {
  tipo: TipoDeFonte
  rotulo: string
  /** Falhou (ferramenta com erro) ou foi retida (verificação). */
  alerta?: boolean
}

const ROTULO_CRM = new Map<string, string>(CRM_CAPABILITIES_CATALOG.map((c) => [c.id, c.label]))

/** "buscar_base_conhecimento" → "buscar base conhecimento" (sem inventar nome). */
function legivel(nome: string): string {
  return nome.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Ferramentas que mudam algo fora daqui: na bancada, o servidor não executa. */
const SIMULAVEIS: ReadonlySet<ToolCall['kind']> = new Set(['crm', 'skill', 'http'])

function daFerramenta(t: ToolCall, simuladas: boolean): FonteDaResposta {
  // P1 — com `stub_tools` o servidor devolve uma falha fixa ("não foi
  // executada"): não é erro, e mostrar "(falhou)" em âmbar faria a pessoa
  // procurar um defeito que não existe.
  if (simuladas && SIMULAVEIS.has(t.kind)) {
    const nome = t.kind === 'crm' ? ROTULO_CRM.get(t.name) ?? legivel(t.name) : legivel(t.name)
    const prefixo = t.kind === 'crm' ? 'CRM' : t.kind === 'skill' ? 'Skill' : 'Integração'
    const tipo: TipoDeFonte = t.kind === 'http' ? 'integracao' : t.kind === 'crm' ? 'crm' : 'skill'
    return { tipo, rotulo: `${prefixo}: ${nome} (simulada: não foi executada)` }
  }
  const alerta = !t.success
  switch (t.kind) {
    case 'kb':
      return { tipo: 'conhecimento', rotulo: alerta ? 'Tentou consultar a base de conhecimento (falhou)' : 'Consultou a base de conhecimento', alerta }
    case 'crm': {
      const nome = ROTULO_CRM.get(t.name) ?? legivel(t.name)
      return { tipo: 'crm', rotulo: alerta ? `CRM: ${nome} (não deu certo)` : `CRM: ${nome}`, alerta }
    }
    case 'skill':
      return { tipo: 'skill', rotulo: `Skill: ${legivel(t.name)}${alerta ? ' (falhou)' : ''}`, alerta }
    case 'http':
      return { tipo: 'integracao', rotulo: `Integração: ${legivel(t.name)}${alerta ? ' (falhou)' : ''}`, alerta }
    default:
      return { tipo: 'outra', rotulo: `${legivel(t.name)}${alerta ? ' (falhou)' : ''}`, alerta }
  }
}

export function fontesDaResposta(
  debug: ChatTurnDebug | undefined,
  /** O turno rodou com as ferramentas simuladas (bancada, P1). Testes antigos não. */
  { simuladas = false }: { simuladas?: boolean } = {},
): FonteDaResposta[] {
  if (!debug) return []
  const out: FonteDaResposta[] = []
  // Onda 3 — uma regra ou FAQ respondeu antes do modelo, como em produção.
  const sim = debug.simulated
  if (sim) {
    const quem = sim.kind === 'faq' ? `Resposta rápida "${sim.ruleName}"` : `Regra "${sim.ruleName}"`
    out.push({ tipo: 'regra', rotulo: `${quem} respondeu pelo texto configurado; o modelo não foi chamado` })
    if (sim.transfers) out.push({ tipo: 'transferencia', rotulo: 'Em produção, a conversa iria para uma pessoa da equipe' })
    return out
  }
  // A mesma ferramenta chamada várias vezes no turno vira uma linha só.
  const vistas = new Set<string>()
  for (const t of debug.toolCalls ?? []) {
    const f = daFerramenta(t, simuladas)
    if (vistas.has(f.rotulo)) continue
    vistas.add(f.rotulo)
    out.push(f)
  }
  const g = debug.guard
  if (g) {
    out.push(g.handoffRequested
      ? { tipo: 'transferencia', rotulo: 'Chamou uma pessoa da equipe em vez de responder', alerta: true }
      : { tipo: 'verificacao', rotulo: 'A verificação corrigiu a resposta antes de enviar', alerta: true })
  }
  if (out.length === 0) out.push({ tipo: 'instrucoes', rotulo: 'Respondeu só com as instruções' })
  return out
}

/**
 * O prompt usado no teste: só as instruções salvas. O resto (regras da
 * plataforma, empresa, catálogo) o agent-server monta igual à produção, e as
 * regras de transferência são avaliadas antes do modelo (simulate_rules) — não
 * viram mais um bloco "prioridade máxima" que a produção nunca teve.
 */
export function promptDeTeste(agent: AgentConfigWithTools): string {
  return agent.system_prompt
}
