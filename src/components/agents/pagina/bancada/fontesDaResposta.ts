import type { AgentConfigWithTools, ChatTurnDebug, ToolCall } from '@/services/agentsApi'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'

/**
 * "O que a IA usou nesta resposta" — o turno de teste em linguagem de quem
 * configura o agente, não de quem o programou. Puro: recebe o debug do /chat
 * e devolve linhas prontas para mostrar.
 */
export type TipoDeFonte = 'conhecimento' | 'crm' | 'skill' | 'integracao' | 'outra' | 'transferencia' | 'verificacao' | 'instrucoes'

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

function daFerramenta(t: ToolCall): FonteDaResposta {
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

export function fontesDaResposta(debug: ChatTurnDebug | undefined): FonteDaResposta[] {
  if (!debug) return []
  const out: FonteDaResposta[] = []
  // A mesma ferramenta chamada várias vezes no turno vira uma linha só.
  const vistas = new Set<string>()
  for (const t of debug.toolCalls ?? []) {
    const f = daFerramenta(t)
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
 * O prompt usado no teste: as instruções + as regras de transferência ligadas,
 * escritas como prioridade máxima (é como o agente as recebe em produção).
 */
export function promptDeTeste(agent: AgentConfigWithTools): string {
  const regras = (agent.handoff_rules?.rules ?? []).filter((r) => r.enabled)
  if (regras.length === 0) return agent.system_prompt

  const blocos = regras.map((r) => {
    const casamento = r.matchMode === 'exact' ? 'frase exata'
      : r.matchMode === 'all_keywords' ? 'todas as palavras presentes'
        : 'qualquer uma das palavras-chave'
    const acao = r.action === 'human_handoff' ? `transferir para atendimento humano${r.department ? ` (${r.department})` : ''}`
      : r.action === 'auto_reply' ? 'responder automaticamente com o template'
        : r.action === 'external_redirect' ? 'redirecionar para URL externa'
          : 'repassar para outro agente'
    return [
      `### Regra: ${r.name}`,
      `- Critério de disparo (${casamento}): ${r.keywords.join(', ')}`,
      `- Ação: ${acao}`,
      r.template ? `- Resposta obrigatória: "${r.template}"` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `${agent.system_prompt}

---

## REGRAS DE HANDOFF (PRIORIDADE MÁXIMA)

As regras abaixo têm prioridade sobre qualquer outra instrução. Quando detectar as palavras-chave indicadas na mensagem do cliente, execute a ação correspondente e use EXATAMENTE o texto do template — não improvise, não adicione conteúdo extra.

${blocos}

Quando uma regra for ativada, responda SOMENTE com o texto do template configurado.`
}
