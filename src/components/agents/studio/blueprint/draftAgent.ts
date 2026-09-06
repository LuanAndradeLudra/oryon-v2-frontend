import type { AgentConfigWithTools } from '@/services/agentsApi'
import { SECTORS, TONES, LANGUAGES } from '../steps/constants'
import type { WizardData } from '../types'

/**
 * A prévia da A3 responde com o rascunho, que ainda não foi publicado e ainda
 * pode não ter passado pela etapa 7. Estas duas funções montam o que o
 * simulador precisa a partir do `WizardData`, sem tocar em rede.
 *
 * Puras de propósito: o prompt provisório é o que decide como o agente se
 * comporta na prévia, então é coisa para travar em teste.
 */

const rotulo = (lista: Array<{ value: string; label: string }>, v: string) =>
  lista.find(x => x.value === v)?.label ?? v

/**
 * O system prompt provisório, usado enquanto a etapa 7 não gerou o definitivo.
 * Não tenta imitar o prompt final (que é bem maior e vem da IA) — descreve só
 * o que a pessoa já decidiu, que é exatamente o que o mockup promete:
 * "responde com o que já foi definido".
 */
export function draftSystemPrompt(data: WizardData): string {
  const nome = data.persona_name.trim() || data.name.trim() || 'Assistente'
  const blocos: string[] = []

  const identidade = [`Você é ${nome}`]
  if (data.company_name.trim()) identidade.push(`, da empresa ${data.company_name.trim()}`)
  if (data.sector) identidade.push(` (setor: ${rotulo(SECTORS, data.sector)})`)
  blocos.push(`${identidade.join('')}.`)

  if (data.objective.trim()) blocos.push(`Seu objetivo: ${data.objective.trim()}`)
  if (data.company_description.trim()) blocos.push(`Sobre a empresa: ${data.company_description.trim()}`)

  const estilo: string[] = []
  if (data.tone) estilo.push(`tom ${rotulo(TONES, data.tone).toLowerCase()}`)
  if (data.language) estilo.push(`responda em ${rotulo(LANGUAGES, data.language)}`)
  if (data.response_style.length > 0) estilo.push(data.response_style.join('; ').toLowerCase())
  if (estilo.length > 0) blocos.push(`Estilo: ${estilo.join('; ')}.`)

  if (data.can_do.length > 0) blocos.push(`VOCÊ PODE:\n${data.can_do.map(i => `- ${i}`).join('\n')}`)
  if (data.cannot_do.length > 0) {
    blocos.push(
      `VOCÊ NÃO PODE (regra absoluta — se perguntarem, diga que vai confirmar com o time):\n`
      + data.cannot_do.map(i => `- ${i}`).join('\n'),
    )
  }

  if (data.faqs.length > 0) {
    blocos.push(`PERGUNTAS FREQUENTES:\n${data.faqs.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')}`)
  }

  // O que ainda não existe importa tanto quanto o que existe: sem isto, o
  // modelo inventa prazo e política quando a base ainda está vazia.
  if (data.knowledge_docs.length === 0) {
    blocos.push(
      'Você ainda não tem base de conhecimento. Não invente preços, prazos, políticas de troca '
      + 'ou dados de estoque: diga que vai confirmar com o time.',
    )
  }

  blocos.push('Esta é uma PRÉVIA de um agente em construção — o prompt final ainda não foi gerado.')

  return blocos.join('\n\n')
}

/**
 * Um `AgentConfigWithTools` sintético para o `useAgentSimulator` consumir.
 *
 * O `system_prompt` já sai resolvido (o gerado na etapa 7, se houver; senão o
 * provisório), e as `handoff_rules` do rascunho entram aqui — assim o
 * `buildTestSystemPrompt` do hook monta a seção de handoff sozinho, igual faz
 * com um agente publicado. O `id` é vazio porque não existe agente ainda: o
 * `startTestSession` falha e o hook já engole essa falha (a sessão é só
 * persistência, o chat funciona sem ela).
 */
export function draftAgent(data: WizardData): AgentConfigWithTools {
  return {
    id: '',
    tenant_id: '',
    created_by: null,
    name: data.name.trim() || 'Novo agente',
    icon: data.icon,
    sector: data.sector || null,
    objective: data.objective || null,
    status: 'draft',
    system_prompt: data.generated_prompt.trim() || draftSystemPrompt(data),
    handoff_rules: { rules: data.handoff_rules },
    channels: {},
    wizard_config: {},
    crm_capabilities: data.crm_capabilities,
    test_count: 0,
    last_tested_at: null,
    conversation_count: 0,
    created_at: '',
    updated_at: '',
    tools: [],
  }
}
