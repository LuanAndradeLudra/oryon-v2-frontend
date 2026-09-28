import type { AgentGoal, AgentSpec, AgentTone, HandoffSituation } from '@/services/agentsApi'
import type { CrmCapabilityId } from '@/services/agentsApi'

/**
 * Regras puras do assistente novo (onda 4). O servidor é quem normaliza e
 * compila a especificação de verdade; aqui ficam só os padrões por objetivo,
 * os textos de exemplo e a prévia usada no ensaio.
 */

export const ETAPAS = [
  'Ponto de partida',
  'Quem é o agente',
  'O que ele pode fazer',
  'O que ele sabe',
  'Quando chamar uma pessoa',
  'Ensaio',
  'Colocar no ar',
] as const

export function specVazia(): AgentSpec {
  return {
    schemaVersion: 1,
    identity: { name: '', goal: 'atender_agendar', segment: '' },
    persona: { tone: 'acolhedor', text: '' },
    flow: { text: '' },
    capabilities: [],
    knowledge: { useCompanyProfile: true, useCatalog: true, usePractitioners: true },
    handoff: { situations: ['pediu_humano'], sectorName: null, message: null },
    channel: { whatsappNumberId: null },
    tests: [],
  }
}

export const OBJETIVOS: Array<{ id: AgentGoal; rotulo: string; descricao: string }> = [
  { id: 'atender_agendar', rotulo: 'Atender e agendar', descricao: 'Responde dúvidas e marca horários.' },
  { id: 'tirar_duvidas', rotulo: 'Tirar dúvidas', descricao: 'Explica serviços, preços e como funciona.' },
  { id: 'qualificar', rotulo: 'Qualificar interessados', descricao: 'Entende o que a pessoa precisa e passa para a equipe.' },
  { id: 'outro', rotulo: 'Outro', descricao: 'Você descreve na próxima etapa.' },
]

/** O que o objetivo sugere — o dono pode mudar tudo depois. */
export const PADRAO_POR_OBJETIVO: Record<AgentGoal, { capacidades: CrmCapabilityId[]; situacoes: HandoffSituation[] }> = {
  atender_agendar: { capacidades: ['assign_conversation_to_user', 'manage_conversation_tags'], situacoes: ['pediu_humano', 'reclamacao', 'urgencia'] },
  tirar_duvidas: { capacidades: ['assign_conversation_to_user'], situacoes: ['pediu_humano', 'fora_do_escopo'] },
  qualificar: { capacidades: ['assign_conversation_to_user', 'tag_contact', 'manage_deal_pipeline'], situacoes: ['pediu_humano'] },
  outro: { capacidades: [], situacoes: ['pediu_humano'] },
}

export const TONS: Array<{ id: AgentTone; rotulo: string; exemplo: string }> = [
  { id: 'acolhedor', rotulo: 'Acolhedor', exemplo: 'Oi! Que bom falar com você 😊 Me conta, como posso ajudar hoje?' },
  { id: 'direto', rotulo: 'Direto', exemplo: 'Olá. Posso ajudar com agendamentos e dúvidas. O que você precisa?' },
  { id: 'formal', rotulo: 'Formal', exemplo: 'Olá, seja bem-vindo(a). Em que posso ser útil?' },
  { id: 'descontraido', rotulo: 'Descontraído', exemplo: 'E aí, tudo certo? Bora resolver o que você precisa!' },
]

export const SITUACOES: Array<{ id: HandoffSituation; rotulo: string; descricao: string }> = [
  { id: 'pediu_humano', rotulo: 'Pediu para falar com uma pessoa', descricao: '"quero um atendente", "falar com alguém"' },
  { id: 'reclamacao', rotulo: 'Reclamação', descricao: '"insatisfeito", "Procon", "absurdo"' },
  { id: 'urgencia', rotulo: 'Urgência', descricao: '"urgente", "emergência"' },
  { id: 'fora_do_escopo', rotulo: 'Assunto fora do que ele atende', descricao: 'O agente percebe e chama a equipe em vez de improvisar' },
]

/** Perguntas de ensaio por objetivo (o dono pode escrever as dele). */
export const PERGUNTAS_DE_ENSAIO: Record<AgentGoal, string[]> = {
  atender_agendar: ['Quanto custa uma consulta?', 'Tem horário amanhã de manhã?', 'Quero falar com uma pessoa'],
  tirar_duvidas: ['Como funciona o serviço?', 'Vocês atendem aos sábados?', 'Isso está fora do que vocês fazem?'],
  qualificar: ['Quero um orçamento', 'Tenho uma empresa de 20 pessoas', 'Quero falar com um vendedor'],
  outro: ['Oi, tudo bem?', 'O que vocês fazem?', 'Quero falar com uma pessoa'],
}

const TOM_LINHA: Record<AgentTone, string> = {
  acolhedor: 'Tom acolhedor e próximo, frases curtas, sem exagero de emojis.',
  direto: 'Tom direto e objetivo: responda o que foi perguntado, sem rodeios.',
  formal: 'Tom formal e respeitoso, sem gírias.',
  descontraido: 'Tom leve e descontraído, sem perder a clareza.',
}

/**
 * Texto do agente para o ensaio, antes de publicar. Espelha o compileSpec do
 * servidor; o que vai ao ar é o que o servidor compilar na publicação.
 */
export function textoParaEnsaio(spec: AgentSpec): string {
  const partes = [
    `## Quem você é\n${spec.persona.text.trim()}\n\n${TOM_LINHA[spec.persona.tone]}`,
    `## Como conduzir a conversa\n${spec.flow.text.trim()}`,
  ]
  if (spec.handoff.situations.includes('fora_do_escopo')) {
    partes.push('## Quando chamar uma pessoa\nSe o assunto estiver fora do que você atende, ou faltar a informação para responder com segurança, transfira para a equipe em vez de improvisar.')
  }
  return partes.join('\n\n')
}

/** O que falta nesta etapa para seguir (vazio = pode seguir). */
export function faltaNaEtapa(etapa: number, spec: AgentSpec): string | null {
  if (etapa === 1 && !spec.identity.segment?.trim()) return 'Conte o tipo de negócio.'
  if (etapa === 2) {
    if (!spec.identity.name.trim()) return 'Dê um nome ao agente.'
    if (spec.persona.text.trim().length < 20) return 'Descreva quem é o agente (ou use "Escrever com IA").'
    if (spec.flow.text.trim().length < 20) return 'Descreva como ele conduz a conversa.'
  }
  return null
}
