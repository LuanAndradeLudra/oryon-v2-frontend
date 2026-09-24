import { guardReasonTimelineLabel } from '@/lib/guardReason'

/**
 * Dados de DEMONSTRAÇÃO do palco (P14): nomes obviamente fictícios, telefones no
 * bloco 90000-xxxx (não existem), nenhum número de resultado. O quadro carrega o
 * rótulo permanente `STAGE_DEMO_LABEL`. Agente fictício: "Agente Vendas".
 */

export const DEMO_AGENT_NAME = 'Agente Vendas'
export const DEMO_OPERATOR = { firstName: 'Júlia', lastName: 'Exemplo' } as const

export interface DemoConversation {
  id: string
  name: string
  phone: string
  /** Prévia da última mensagem. */
  preview: string
  /** "IA" (Agente IA no controle) | "human" (atendente) | null. */
  actor: 'ai' | 'human' | null
  time: string
  unread?: number
  /** "Você" quando quem atende é o operador da demonstração. */
  tags?: string[]
}

/** Etiquetas como ponto de cor (mesma gramática da lista real). */
export const DEMO_TAG_COLORS = ['#14B8A6', '#F59E0B', '#60A5FA'] as const

/** Conversas que já estavam na lista antes da nova chegar. */
export const DEMO_EXISTING: DemoConversation[] = [
  { id: 'c-ana', name: 'Ana Modelo', phone: '+55 11 90000-0101', preview: 'Perfeito, obrigada!', actor: 'ai', time: '13:48', tags: ['a'] },
  { id: 'c-bruno', name: 'Bruno Amostra', phone: '+55 11 90000-0102', preview: 'Consigo receber ainda hoje?', actor: 'ai', time: '13:31' },
  { id: 'c-casa', name: 'Casa Exemplo', phone: '+55 11 90000-0103', preview: 'Você: Enviei a proposta atualizada.', actor: 'human', time: '12:57', tags: ['b'] },
  { id: 'c-diego', name: 'Diego Fictício', phone: '+55 11 90000-0104', preview: 'Ok, aguardo retorno.', actor: 'ai', time: '11:20' },
]

/** A conversa que chega e é operada durante a cena. */
export const DEMO_LEAD = {
  id: 'c-marina',
  name: 'Marina Exemplo',
  phone: '+55 11 90000-0100',
} as const

export const DEMO_MESSAGES = {
  inbound1: 'Oi! Vi o plano trimestral no site. Como funciona?',
  ai1: 'Oi, Marina! Sou o Agente Vendas. O plano trimestral inclui duas linhas de WhatsApp e relatórios. Quer que eu explique os detalhes?',
  inbound2: 'Prefiro falar com uma pessoa. Qual o valor para 3 usuários?',
  human: 'Oi, Marina! Aqui é a Júlia, do time. Já te passo o valor certinho.',
  times: { inbound1: '14:02', ai1: '14:02', inbound2: '14:03', human: '14:04' },
} as const

/** Mesma frase da linha do tempo real (guardReason.ts:168) — nunca uma cópia. */
export const DEMO_GUARD_LABEL = guardReasonTimelineLabel('vg_money_blocked', null)
export const DEMO_GUARD_SUB = 'Mensagem retida'

/** Preview da lista em cada ponto da cena. */
export const DEMO_LEAD_PREVIEW = {
  inbound1: DEMO_MESSAGES.inbound1,
  ai1: DEMO_MESSAGES.ai1,
  inbound2: DEMO_MESSAGES.inbound2,
  human: `Você: ${DEMO_MESSAGES.human}`,
} as const

/** Descrição textual (sr-only) do que o quadro mostra — o quadro em si é aria-hidden. */
export const INBOX_SR_DESCRIPTION =
  'Demonstração animada da tela de Conversas com dados fictícios: chega uma mensagem de cliente, ' +
  'o Agente IA responde, o cliente pede uma pessoa e a verificação retém uma resposta com valor; ' +
  'o atendente assume a conversa e responde.'

// ─── Funil (cena "Funis") ────────────────────────────────────────────────────

export interface DemoStage {
  id: string
  label: string
  /** Cor crua da etapa (hex) — o cabeçalho usa `tintaDaEtapa` como o board real. */
  color: string
  terminal?: 'won' | 'lost'
}

export const DEMO_STAGES: DemoStage[] = [
  { id: 's-novo', label: 'Novo lead', color: '#60A5FA' },
  { id: 's-qualificado', label: 'Qualificado', color: '#14B8A6' },
  { id: 's-proposta', label: 'Proposta enviada', color: '#F59E0B' },
  { id: 's-ganho', label: 'Ganho', color: '#22C55E', terminal: 'won' },
  { id: 's-perdido', label: 'Perdido', color: '#EF4444', terminal: 'lost' },
]

export interface DemoDeal {
  id: string
  title: string
  contact: string
  amountCents: number
  /** "dd/mm" — previsão de fechamento. */
  forecast?: string
  /** Tempo na etapa ("2 d"); `stuck` = "parado N d" em cor de perigo. */
  time?: string
  stuck?: boolean
  /** Movido pela IA (chip âmbar "IA"). */
  byAi?: boolean
  /** Iniciais do dono do negócio. */
  owner?: string
}

/** Negócios que já estavam no funil (id da etapa -> cards). */
export const DEMO_DEALS_BASE: Record<string, DemoDeal[]> = {
  's-novo': [
    { id: 'd-diego', title: 'Kit inicial · Diego Fictício', contact: 'Diego Fictício', amountCents: 89000, forecast: '03/10', time: '1 d', owner: 'JE' },
  ],
  's-qualificado': [
    { id: 'd-casa', title: 'Plano semestral · Casa Exemplo', contact: 'Casa Exemplo', amountCents: 420000, forecast: '30/09', time: '6 d', stuck: true, owner: 'JE' },
  ],
  's-proposta': [
    { id: 'd-ana', title: 'Plano anual · Ana Modelo', contact: 'Ana Modelo', amountCents: 780000, forecast: '05/10', time: '2 d', owner: 'JE' },
  ],
}

/** O negócio que entra e é movido durante a cena. */
export const DEMO_DEAL_LEAD: DemoDeal = {
  id: 'd-marina',
  title: 'Plano trimestral · Marina Exemplo',
  contact: 'Marina Exemplo',
  amountCents: 240000,
  forecast: '02/10',
  time: 'agora',
  owner: 'JE',
}

export const FUNIL_SR_DESCRIPTION =
  'Demonstração animada da tela de Funis com dados fictícios: um negócio novo entra em Novo lead, ' +
  'o Agente IA o move para Qualificado e o atendente o arrasta para Proposta enviada.'
