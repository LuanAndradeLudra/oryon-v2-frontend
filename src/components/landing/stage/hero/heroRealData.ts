import type {
  DealStageHistoryEntry,
  Campaign, Contact, Conversation, Deal, Message, Pipeline, PipelineStage, Product, Tag, TenantStage, User, WhatsAppNumber, WhatsAppTemplate,
} from '@/types'
import type { TimelineEntry } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import type { AppNotification } from '@/hooks/useNotifications'
import { dayAt, daysAgo, hoursAgo, justNow, minutesAgo } from './heroClock'
import type { HeroState } from './heroStory'

/**
 * A FONTE ÚNICA de dados de demonstração do Hero.
 *
 * Tudo que as superfícies mostram — contato, conversa, situação, etiquetas,
 * mensagens, atividades, funil, etapas e o registro do atendimento — sai daqui,
 * derivado do estado corrente da história. O card do quadro é o MESMO objeto
 * `Deal` que o painel mostra; não existe um segundo conjunto de dados.
 *
 * A HISTÓRIA (persona decidida pelo PO em 26/09: clínica — a vertical de hoje;
 * a copy pública fala "cliente" e "atendimento" para valer para qualquer
 * segmento): a Clínica Vitalis manda a campanha de retorno de setembro; a
 * Marina, paciente, responde pedindo horário com a Dra. Helena; o Agente
 * Recepção responde com o valor do catálogo, o convênio da base de
 * conhecimento e horários da agenda; muda a situação do contato, etiqueta a
 * conversa e leva o atendimento de Avaliação para Agendado; a Marina pede
 * uma pessoa (quer um encaixe); a Ana, da recepção, assume e confirma.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * O QUE A IA PODE FAZER (auditado no código dos três repositórios, 25/09)
 *
 *  1. **A IA não define o valor do registro.** Nenhuma ferramenta do agente
 *     aceita `amountCents`. Por isso o registro aqui já nasce com valor —
 *     aberto por uma PESSOA (Ana) dois dias antes.
 *  2. **A IA não se pausa.** Atribuir a conversa a um humano NÃO silencia o
 *     agente. Quem pausa é a pessoa, ao intervir (estado `humano`).
 *  3. **A IA não marca ganho/perdido.** A recusa vale mesmo com todos os
 *     opt-ins ligados. O desfecho (Confirmado) é da Atendente.
 *
 * O que ela PODE, e a história mostra: responder com informação da base de
 * conhecimento e do catálogo, mudar a situação do contato, etiquetar a
 * conversa, avançar o registro para uma etapa não-terminal e chamar uma pessoa.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TENANT = 'demo-tenant'

/** Ordem dos estados — o que já aconteceu acumula. */
const ORDEM: HeroState[] = [
  'inicio', 'demanda', 'resposta', 'confirma', 'situacao',
  'etiqueta', 'avanco', 'pedido', 'assumido', 'humano', 'ganho',
]
export function reached(at: HeroState, key: HeroState): boolean {
  return ORDEM.indexOf(at) >= ORDEM.indexOf(key)
}

// ─── Pessoas e linha ──────────────────────────────────────────────────────────

export const HERO = {
  person: 'Marina Alves',
  company: 'Clínica Vitalis',
  phone: '+55 47 99900-7010',
  agent: 'Agente Recepção',
  atendente: 'Ana Prado',
  doctor: 'Dra. Helena',
  dealTitle: 'Retorno · Dra. Helena',
  amountCents: 18_000,
  tag: 'retorno',
  demand: 'Oi! Quero marcar o retorno com a Dra. Helena. Tem horário à tarde essa semana?',
  answer: 'Oi, Marina! O retorno com a Dra. Helena custa R$ 180 no particular. Pela Unimed, basta levar a guia. Tenho quinta às 14h30 e sexta às 15h. Qual horário você prefere?',
  confirm: 'Perfeito! Quinta às 14h30.',
  ask: 'Consigo falar com alguém? Queria ver se dá um encaixe antes, é meio urgente.',
  human: 'Oi, Marina! Aqui é a Ana, da recepção. Consegui um encaixe amanhã às 9h com a Dra. Helena. Já deixei reservado pra você.',
} as const

export const HERO_LINE: WhatsAppNumber = {
  id: 'demo-line-1',
  displayPhoneNumber: '+55 47 3030-1100',
  status: 'connected',
} as WhatsAppNumber

export const HERO_TAGS: Tag[] = [
  { id: 'tg-unimed', name: 'Unimed', color: '#2DD4BF' },
  { id: 'tg-derma', name: 'Dermatologia', color: '#60A5FA' },
  { id: 'tg-retorno', name: HERO.tag, color: '#FBBF24' },
]

export const HERO_USER: User = {
  id: 'demo-user-1',
  tenantId: TENANT,
  email: 'ana@clinicavitalis.com.br',
  firstName: 'Ana',
  lastName: 'Prado',
  role: 'agent',
  isActive: true,
} as User

// ─── Situação do contato (≠ etapa do registro, ≠ etiqueta, ≠ status) ─────────

export const HERO_CONTACT_STAGES: TenantStage[] = [
  { id: 'cs-1', tenantId: TENANT, key: 'novo',           label: 'Novo',           color: '#64748B', order: 1, isTerminal: false, createdAt: daysAgo(60) },
  { id: 'cs-2', tenantId: TENANT, key: 'em-agendamento', label: 'Em agendamento', color: '#38BDF8', order: 2, isTerminal: false, createdAt: daysAgo(60) },
  { id: 'cs-3', tenantId: TENANT, key: 'paciente',       label: 'Paciente',       color: '#22C55E', order: 3, isTerminal: true,  createdAt: daysAgo(60) },
]

// ─── Contato e conversa ───────────────────────────────────────────────────────

function contactOf(id: string, name: string, waId: string, extra: Partial<Contact> = {}): Contact {
  return { id, tenantId: TENANT, waId, displayName: name, createdAt: daysAgo(203), tags: [], ...extra } as Contact
}

export function heroContact(at: HeroState): Contact {
  return contactOf('demo-c-0', HERO.person, '5547999007010', {
    stage: reached(at, 'situacao') ? 'em-agendamento' : 'novo',
    tags: reached(at, 'etiqueta') ? HERO_TAGS : HERO_TAGS.slice(0, 2),
    city: 'Joinville',
    state: 'SC',
    email: 'marina.alves@gmail.com',
    source: 'whatsapp',
  } as Partial<Contact>)
}

export function heroConversation(at: HeroState): Conversation {
  const contact = heroContact(at)
  const ultima = ultimaMensagem(at)
  return {
    id: 'demo-conv-0',
    tenantId: TENANT,
    contact,
    whatsappNumber: HERO_LINE,
    // Status da conversa: ABERTA o tempo todo, menos quando a IA a coloca na
    // fila ao chamar uma pessoa (`set_conversation_status`) e quando a
    // Atendente a resolve no fim. Três conceitos distintos — situação do
    // contato, status da conversa, etapa do registro — mudam em momentos
    // diferentes, de propósito.
    status: reached(at, 'ganho') ? 'resolved' : reached(at, 'assumido') ? 'pending' : 'open',
    channel: 'whatsapp',
    lastMessageAt: ultima.sentAt,
    lastMessagePreview: ultima.body,
    lastMessageSenderKind: ultima.senderKind ?? null,
    // `lastAgentReplyAt` é o que decide o aviso "X sem resposta" na lista
    // (`getAwaitingReply`). Marca a última saída: enquanto a IA ainda não
    // respondeu, o aviso aparece (e é verdade); assim que ela responde, some.
    lastAgentReplyAt: ultima.direction === 'outbound' ? ultima.sentAt : undefined,
    unreadCount: 0,
    createdAt: daysAgo(1),
    // A IA só para quando a PESSOA intervém. Atribuir não silencia o agente.
    aiActive: !reached(at, 'humano'),
    aiPausedUntil: reached(at, 'humano') ? hoursAgo(-4) : null,
    assignedUser: reached(at, 'assumido') ? HERO_USER : undefined,
    tags: contact.tags,
  } as Conversation
}

/** As demais linhas do inbox — densidade real, com tempos plausíveis. */
const OUTRAS = [
  { nome: 'Rafaela Couto',  previa: 'Perfeito, obrigada!',                        min: 12,  naoLidas: 0, ia: false },
  { nome: 'Bruno Antunes',  previa: 'Consigo remarcar pra semana que vem?',       min: 27,  naoLidas: 2, ia: true },
  { nome: 'Joana Freitas',  previa: 'Vocês atendem Bradesco Saúde?',              min: 43,  naoLidas: 0, ia: false },
  { nome: 'Diego Ramos',    previa: 'Confirmado, até quinta!',                    min: 96,  naoLidas: 0, ia: false },
  { nome: 'Lúcia Martins',  previa: 'Obrigada pelo lembrete!',                    min: 150, naoLidas: 0, ia: true },
]

export const HERO_OTHER_CONVERSATIONS: Conversation[] = OUTRAS.map((c, i) => ({
  id: `demo-conv-${i + 1}`,
  tenantId: TENANT,
  contact: contactOf(`demo-c-${i + 1}`, c.nome, `55479990070${20 + i}`),
  whatsappNumber: HERO_LINE,
  status: 'open',
  channel: 'whatsapp',
  lastMessageAt: minutesAgo(c.min),
  // As outras conversas do inbox já foram respondidas: nenhuma acusa espera.
  lastAgentReplyAt: minutesAgo(c.min),
  lastMessagePreview: c.previa,
  unreadCount: c.naoLidas,
  createdAt: daysAgo(4),
  aiActive: c.ia,
} as Conversation))

export function heroConversations(at: HeroState): Conversation[] {
  return [heroConversation(at), ...HERO_OTHER_CONVERSATIONS]
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

function msg(
  i: number,
  dir: 'inbound' | 'outbound',
  body: string,
  sentAt: string,
  autor: 'cliente' | 'ia' | 'pessoa' | 'campanha' = 'cliente',
): Message {
  return {
    id: `demo-m-${i}`,
    conversationId: 'demo-conv-0',
    direction: dir,
    type: 'text',
    status: dir === 'outbound' ? 'read' : 'delivered',
    body,
    sentAt,
    createdAt: sentAt,
    senderKind: dir === 'inbound' ? 'client' : autor === 'ia' ? 'ai' : autor === 'campanha' ? 'campaign' : 'operator',
    ...(autor === 'pessoa' ? { sentByUserId: HERO_USER.id, sentByUser: HERO_USER } : {}),
  } as Message
}

/**
 * A thread. O histórico de ontem dá continuidade e faz o `MessageList` real
 * desenhar o separador de dia. A partir daí os horários são relativos ao
 * "agora" da demonstração — nunca a um horário fixo.
 */
export function heroMessages(at: HeroState): Message[] {
  const out: Message[] = [
    msg(1, 'inbound', 'Bom dia! A Dra. Helena tem horário essa semana?', dayAt(1, 9, 12)),
    msg(2, 'outbound', 'Bom dia, Marina! A Dra. Helena atende de terça a sexta, à tarde. Quer que eu veja um horário pra você?', dayAt(1, 9, 13), 'ia'),
    msg(3, 'inbound', 'Vou ver com o trabalho e te falo.', dayAt(1, 9, 21)),
    // O histórico de ontem TERMINA com o agente: sem isto, o primeiro quadro
    // abria com a linha da protagonista marcada em vermelho ("sem resposta").
    msg(4, 'outbound', 'Combinado! Qualquer coisa é só chamar. 😊', dayAt(1, 9, 22), 'ia'),
  ]
  // O disparo da campanha: é ele que reabre a conversa de ontem.
  out.push(msg(10, 'outbound', HERO_TEMPLATE_TEXTO, minutesAgo(6), 'campanha'))
  if (reached(at, 'demanda')) out.push(msg(5, 'inbound', HERO.demand, minutesAgo(4)))
  if (reached(at, 'resposta')) out.push(msg(6, 'outbound', HERO.answer, minutesAgo(3), 'ia'))
  if (reached(at, 'confirma')) out.push(msg(7, 'inbound', HERO.confirm, minutesAgo(2)))
  if (reached(at, 'pedido')) out.push(msg(8, 'inbound', HERO.ask, minutesAgo(1)))
  if (reached(at, 'humano')) out.push(msg(9, 'outbound', HERO.human, justNow(), 'pessoa'))
  return out
}

function ultimaMensagem(at: HeroState): Message {
  const m = heroMessages(at)
  return m[m.length - 1]
}

// ─── Funil, etapas e o registro do atendimento ────────────────────────────────

export const HERO_STAGE_QUALIFICACAO = 'ps-avaliacao'
export const HERO_STAGE_PROPOSTA = 'ps-agendado'
export const HERO_STAGE_GANHO = 'ps-confirmado'

/**
 * O funil "Consultas": Contato → Avaliação → Agendado → Aguardando guia →
 * Confirmado. A IA leva de Avaliação para Agendado (etapa não terminal);
 * Confirmado é terminal e só a PESSOA chega lá — a IA é recusada pelo backend.
 */
export const HERO_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'ps-contato',            tenantId: TENANT, pipelineId: 'pl-consultas', key: 'contato',   label: 'Contato',         color: '#64748B', order: 1, isWon: false, isLost: false },
  { id: HERO_STAGE_QUALIFICACAO, tenantId: TENANT, pipelineId: 'pl-consultas', key: 'avaliacao', label: 'Avaliação',       color: '#38BDF8', order: 2, isWon: false, isLost: false, probability: 30 },
  { id: HERO_STAGE_PROPOSTA,     tenantId: TENANT, pipelineId: 'pl-consultas', key: 'agendado',  label: 'Agendado',        color: '#A78BFA', order: 3, isWon: false, isLost: false, probability: 60 },
  { id: 'ps-guia',               tenantId: TENANT, pipelineId: 'pl-consultas', key: 'guia',      label: 'Aguardando guia', color: '#FBBF24', order: 4, isWon: false, isLost: false, probability: 80 },
  { id: HERO_STAGE_GANHO,        tenantId: TENANT, pipelineId: 'pl-consultas', key: 'confirmado', label: 'Confirmado',     color: '#22C55E', order: 5, isWon: true,  isLost: false },
]

export const HERO_PIPELINE: Pipeline = {
  id: 'pl-consultas',
  tenantId: TENANT,
  name: 'Consultas',
  color: '#2DD4BF',
  order: 1,
  isDefault: true,
  isArchived: false,
  kind: 'sales',
  stages: HERO_PIPELINE_STAGES,
  openDealsCount: 14,
} as Pipeline

/**
 * O registro do atendimento da história. **Já existia**, aberto por uma
 * pessoa (a Ana, dois dias antes, quando a Marina perguntou de horário), com o
 * valor já definido. O que a IA faz aqui é uma coisa só, e ela pode: avançar a
 * etapa (Avaliação → Agendado). O desfecho — Confirmado — é da Atendente.
 */
export function heroDeal(at: HeroState): Deal {
  const ganho = reached(at, 'ganho')
  const avancou = reached(at, 'avanco')
  return {
    id: 'demo-deal-0',
    contactId: 'demo-c-0',
    title: HERO.dealTitle,
    status: ganho ? 'won' : 'open',
    pipelineId: HERO_PIPELINE.id,
    stageId: ganho ? HERO_STAGE_GANHO : avancou ? HERO_STAGE_PROPOSTA : HERO_STAGE_QUALIFICACAO,
    amountCents: HERO.amountCents,
    currency: 'BRL',
    description: 'Dermatologia · retorno em até 30 dias',
    // O item do catálogo que compõe o valor — sem ele o painel mostrava
    // "Total R$ 0,00".
    lineItems: [{
      id: 'li-retorno', kind: 'catalog', productId: 'pr-retorno', productName: 'Consulta de retorno',
      variationLabel: 'Particular', unitPriceCents: 18_000, quantity: 1, order: 1,
    }],
    originConversationId: 'demo-conv-0',
    originKind: 'manual',
    createdByKind: 'user',
    ownerUserId: HERO_USER.id,
    stageEnteredAt: avancou ? justNow() : daysAgo(2),
    lastMovedByKind: ganho ? 'user' : avancou ? 'ai' : 'user',
    lastMovedByActorName: ganho ? HERO.atendente : avancou ? HERO.agent : HERO.atendente,
    closeReason: ganho ? 'proposta_aceita' : null,
    closedAt: ganho ? justNow() : null,
    createdAt: daysAgo(2),
    updatedAt: justNow(),
    contact: { id: 'demo-c-0', displayName: HERO.person, profilePicUrl: null, phone: HERO.phone },
  } as Deal
}

/**
 * Os outros registros do quadro — o dia comum de uma clínica. Títulos
 * distintos de propósito, para o protagonista não sumir entre homônimos.
 * Nenhum passa de 3 dias na etapa (acima disso o `DealsBoard` real estampa
 * "parado N d" em vermelho e rouba a atenção do card da história).
 * Sempre ACRESCENTAR no fim: o `contactId` sai do índice (demo-dc-3/5 são
 * citados no relatório da campanha).
 */
const OUTROS = [
  { id: 'd-1',  title: 'Consulta · Dr. Paulo',      person: 'Joana Freitas',  stageId: 'ps-contato',            cents: 25_000, dias: 1 },
  { id: 'd-2',  title: 'Avaliação estética',        person: 'Bruno Antunes',  stageId: 'ps-contato',            cents: 15_000, dias: 3 },
  { id: 'd-3',  title: 'Check-up · 3 exames',       person: 'Diego Ramos',    stageId: HERO_STAGE_QUALIFICACAO, cents: 42_000, dias: 2 },
  { id: 'd-4',  title: 'Consulta · Dra. Helena',    person: 'Carla Mendes',   stageId: HERO_STAGE_QUALIFICACAO, cents: 25_000, dias: 1 },
  { id: 'd-5',  title: 'Laser · 3 sessões',         person: 'Rafaela Couto',  stageId: HERO_STAGE_PROPOSTA,     cents: 135_000, dias: 3 },
  { id: 'd-6',  title: 'Consulta pediátrica',       person: 'Lúcia Martins',  stageId: 'ps-guia',               cents: 22_000, dias: 2 },
  { id: 'd-7',  title: 'Retorno · Dr. Paulo',       person: 'Otávio Lima',    stageId: HERO_STAGE_QUALIFICACAO, cents: 18_000, dias: 4 },
  { id: 'd-8',  title: 'Peeling · 2 sessões',       person: 'Beatriz Nunes',  stageId: HERO_STAGE_PROPOSTA,     cents: 70_000, dias: 1 },
  { id: 'd-9',  title: 'Consulta · Dra. Helena',    person: 'Sérgio Tavares', stageId: 'ps-guia',               cents: 25_000, dias: 5 },
  { id: 'd-10', title: 'Mapeamento de pintas',      person: 'Helena Duarte',  stageId: 'ps-contato',            cents: 32_000, dias: 1 },
  // Um quarto card em Avaliação e um terceiro nas etapas seguintes dão
  // contexto sem empurrar a ficha da Marina para fora da tomada no Hero.
  { id: 'd-11', title: 'Consulta · Dr. Paulo',      person: 'Renata Souza',   stageId: HERO_STAGE_QUALIFICACAO, cents: 25_000, dias: 2 },
  { id: 'd-13', title: 'Consulta pediátrica',       person: 'Paula Andrade',  stageId: HERO_STAGE_PROPOSTA,     cents: 22_000, dias: 2 },
  { id: 'd-16', title: 'Consulta · Dra. Helena',    person: 'Eduardo Pires',  stageId: 'ps-guia',               cents: 25_000, dias: 1 },
]

const HERO_OTHER_DEALS: Deal[] = OUTROS.map((d, i) => ({
  id: d.id,
  contactId: `demo-dc-${i}`,
  title: d.title,
  status: 'open',
  pipelineId: HERO_PIPELINE.id,
  stageId: d.stageId,
  amountCents: d.cents,
  currency: 'BRL',
  ownerUserId: HERO_USER.id,
  stageEnteredAt: daysAgo(d.dias),
  createdAt: daysAgo(d.dias + 2),
  contact: { id: `demo-dc-${i}`, displayName: d.person, profilePicUrl: null },
} as Deal))

export function heroDealsByStage(at: HeroState): Record<string, Deal[]> {
  // A ficha protagonista abre as duas etapas da história e permanece visível.
  const todos = [heroDeal(at), ...HERO_OTHER_DEALS]
  const out: Record<string, Deal[]> = {}
  for (const stage of HERO_PIPELINE_STAGES) out[stage.id] = []
  for (const d of todos) (out[d.stageId] ??= []).push(d)
  return out
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * A Timeline é CONFIRMAÇÃO, nunca a única evidência: cada linha tem um par
 * visível em outro lugar da tela no mesmo instante. A busca na base de
 * conhecimento NÃO entra (o endpoint filtra `kind = 'crm'`; buscas são `kb` e
 * não aparecem para o operador). Teto de quatro linhas (`COLLAPSED_LIMIT`).
 */
function agente(id: string, summary: string, toolName: string, min: number): TimelineEntry {
  return {
    kind: 'agent', id, summary, success: true, errorMessage: null,
    toolName, agentName: HERO.agent, createdAt: minutesAgo(min),
  }
}
function pessoa(id: string, summary: string, action: string, min: number, metadata: Record<string, unknown> = {}): TimelineEntry {
  return { kind: 'user', id, summary, actor: HERO.atendente, action, createdAt: minutesAgo(min), metadata }
}

export function heroTimeline(at: HeroState): TimelineEntry[] {
  // A história começa com o template da campanha chegando à Marina (hoje, há
  // 6 min) — o filtro padrão da linha do tempo é "Hoje".
  const out: TimelineEntry[] = [
    pessoa('t0', 'Modelo de mensagem enviado', 'template_sent', 6, { templateName: HERO_TEMPLATE.name }),
  ]
  if (reached(at, 'situacao')) out.push(agente('t1', 'Situação do contato: Novo → Em agendamento', 'update_contact', 3))
  if (reached(at, 'etiqueta')) out.push(agente('t2', `Adicionou a etiqueta "${HERO.tag}" à conversa`, 'add_tag_to_conversation', 3))
  if (reached(at, 'avanco')) out.push(agente('t3', 'Moveu o negócio de Avaliação para Agendado', 'manage_deal_pipeline', 2))
  if (reached(at, 'assumido')) out.push(agente('t4', `Chamou ${HERO.atendente} para a conversa`, 'assign_conversation', 1))
  if (reached(at, 'ganho')) {
    out.push(pessoa('t5', `"${HERO.dealTitle}" confirmado`, 'deal_won', 0, {
      dealTitle: HERO.dealTitle, amountCents: HERO.amountCents, pipelineKind: 'sales',
    }))
  }
  return out.slice(-4) // quatro linhas: as mais antigas cedem lugar
}

// ─── Disparos ──────────────────────────────────────────────────────────────────

/**
 * O modelo aprovado da campanha "Retorno de setembro". É o que chega no
 * WhatsApp da Marina (a satélite do celular desenha com a `TemplatePreview`
 * real) e o que aparece como mensagem de campanha na conversa dela.
 */
export const HERO_TEMPLATE: WhatsAppTemplate = {
  id: 'tp-retorno',
  tenantId: TENANT,
  name: 'retorno_setembro',
  language: 'pt_BR',
  category: 'MARKETING',
  status: 'APPROVED',
  body: 'Olá, {{1}}! Já está na hora do seu retorno com a Dra. Helena. Abrimos novos horários para setembro. Quer que eu procure um para você?',
  footer: 'Clínica Vitalis',
  buttons: [
    { type: 'QUICK_REPLY', text: 'Quero marcar' },
    { type: 'QUICK_REPLY', text: 'Agora não' },
  ],
  bodyVariables: ['nome'],
  whatsappNumberId: 'demo-line-1',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
}
export const HERO_TEMPLATE_VARIAVEIS = { '1': 'Marina' }
const HERO_TEMPLATE_TEXTO = HERO_TEMPLATE.body.replace('{{1}}', HERO_TEMPLATE_VARIAVEIS['1']).replace(/\*/g, '')

/** O nome da campanha da história, usado onde ela é citada por fora. */
export const HERO_CAMPANHA_NOME = 'Retorno · setembro'

/**
 * As campanhas do tenant. A de retorno é a da história: é ela que chega no
 * WhatsApp da Marina e abre a conversa. Os números sobem enquanto o roteiro
 * está em `inicio` (a campanha está saindo) e assentam depois.
 */
const BASE_RETORNO = 1_240
export function heroCampaigns(at: HeroState): Campaign[] {
  const saindo = at === 'inicio'
  const stats = saindo
    ? { total: BASE_RETORNO, sent: 1_180, delivered: 1_096, read: 612, failed: 9, replied: 74, conversions: 17 }
    : { total: BASE_RETORNO, sent: 1_231, delivered: 1_204, read: 871, failed: 9, replied: 138, conversions: 26 }
  const base = { tenantId: TENANT, variableMappings: [], createdByUserId: HERO_USER.id, whatsappNumberId: HERO_LINE.id }
  return [
    {
      ...base, id: 'cp-retorno', name: HERO_CAMPANHA_NOME, templateId: 'tp-retorno',
      templateName: 'retorno_setembro', segment: { type: 'tag', tagIds: ['tg-derma'] },
      status: saindo ? 'sending' : 'sent', sentAt: hoursAgo(1), createdAt: daysAgo(1), stats,
    },
    {
      ...base, id: 'cp-checkup', name: 'Check-up de primavera', templateId: 'tp-checkup',
      templateName: 'checkup_primavera', segment: { type: 'all' }, status: 'scheduled',
      scheduledAt: hoursAgo(-20), createdAt: daysAgo(2),
      stats: { total: 3_420, sent: 0, delivered: 0, read: 0, failed: 0 },
    },
    {
      ...base, id: 'cp-boasvindas', name: 'Boas-vindas · novos pacientes', templateId: 'tp-boasvindas',
      templateName: 'boas_vindas_paciente', segment: { type: 'stage', stages: ['paciente'] }, status: 'sent',
      sentAt: daysAgo(3), createdAt: daysAgo(4),
      stats: { total: 186, sent: 186, delivered: 183, read: 151, failed: 3, replied: 42 },
    },
    {
      ...base, id: 'cp-lembrete', name: 'Lembrete · consultas da semana', templateId: 'tp-lembrete',
      templateName: 'lembrete_consulta', segment: { type: 'tag', tagIds: ['tg-unimed'] }, status: 'sent',
      sentAt: daysAgo(8), createdAt: daysAgo(9),
      stats: { total: 912, sent: 905, delivered: 871, read: 498, failed: 7, replied: 61 },
    },
  ] as Campaign[]
}

// ─── Catálogo ─────────────────────────────────────────────────────────────────

/** O catálogo da clínica. A consulta de retorno a R$ 180 é o item que o Agente
 *  Recepção consulta para responder a Marina. */
export const HERO_PRODUCTS: Product[] = [
  {
    id: 'pr-consulta', name: 'Consulta dermatológica', sku: 'CONS', category: 'Consultas', active: true, order: 1,
    description: 'Primeira consulta, com avaliação completa.',
    priceVariations: [
      { id: 'pv-cons-part', label: 'Particular', amountCents: 25_000, currency: 'BRL', order: 1 },
      { id: 'pv-cons-conv', label: 'Convênio · com guia', amountCents: 0, currency: 'BRL', order: 2 },
    ],
  },
  {
    id: 'pr-retorno', name: 'Consulta de retorno', sku: 'RET', category: 'Consultas', active: true, order: 2,
    description: 'Retorno em até 30 dias após a consulta.',
    priceVariations: [
      { id: 'pv-ret-part', label: 'Particular', amountCents: 18_000, currency: 'BRL', order: 1 },
      { id: 'pv-ret-conv', label: 'Convênio · com guia', amountCents: 0, currency: 'BRL', order: 2 },
    ],
  },
  {
    id: 'pr-laser', name: 'Laser fracionado', sku: 'LAS', category: 'Procedimentos', active: true, order: 3,
    description: 'Sessão avulsa ou pacote de três.',
    priceVariations: [{ id: 'pv-laser', label: 'Por sessão', amountCents: 45_000, currency: 'BRL', order: 1 }],
  },
]

// ─── Notificações ─────────────────────────────────────────────────────────────

/** O sino da TopBar acompanha a história: o que já aconteceu vira aviso. */
export function heroNotifications(at: HeroState): AppNotification[] {
  const out: AppNotification[] = []
  if (reached(at, 'assumido')) out.push({
    id: 'nt-handoff', type: 'agent_handoff', title: `${HERO.person} quer falar com a equipe`,
    description: `${HERO.agent} chamou você para a conversa`, link: '/conversations', isRead: false,
    createdAt: minutesAgo(1), priority: 'urgent',
    metadata: { contactName: HERO.person, conversationId: 'demo-conv-0' },
  })
  // A campanha termina de sair logo depois da cena de Disparos.
  if (reached(at, 'demanda')) out.push({
    id: 'nt-campanha', type: 'campaign_complete', title: `${HERO_CAMPANHA_NOME} concluída`,
    description: '1.231 enviadas · 1.204 entregues', link: '/campaigns', isRead: true, createdAt: minutesAgo(40),
    metadata: { campaignName: HERO_CAMPANHA_NOME, sent: 1_231, failed: 9 },
  })
  out.push({
    id: 'nt-atribuida', type: 'conversation_assigned', title: 'Conversa atribuída a você',
    description: 'Joana Freitas · Consulta · Dr. Paulo', link: '/conversations', isRead: true, createdAt: hoursAgo(3),
    metadata: { contactName: 'Joana Freitas' },
  })
  return out
}

/**
 * As passagens de etapa do registro da história, já Confirmado — as mesmas
 * linhas do backend de demonstração (`deals/:id/history`): a Ana pôs em
 * Avaliação, a IA levou para Agendado, a Ana confirmou.
 */
export function heroHistoricoGanho(): DealStageHistoryEntry[] {
  return [
    { id: 'h-3', fromStageId: HERO_STAGE_PROPOSTA, fromStageLabel: 'Agendado', toStageId: HERO_STAGE_GANHO, toStageLabel: 'Confirmado', movedByKind: 'user', movedByActorName: HERO.atendente, createdAt: minutesAgo(1) },
    { id: 'h-2', fromStageId: HERO_STAGE_QUALIFICACAO, fromStageLabel: 'Avaliação', toStageId: HERO_STAGE_PROPOSTA, toStageLabel: 'Agendado', movedByKind: 'ai', movedByActorName: HERO.agent, createdAt: minutesAgo(6) },
    { id: 'h-1', fromStageId: 'ps-contato', fromStageLabel: 'Contato', toStageId: HERO_STAGE_QUALIFICACAO, toStageLabel: 'Avaliação', movedByKind: 'user', movedByActorName: HERO.atendente, createdAt: daysAgo(2) },
  ] as DealStageHistoryEntry[]
}
