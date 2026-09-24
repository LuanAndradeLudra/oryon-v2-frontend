import type {
  Contact, Conversation, Deal, Message, Pipeline, PipelineStage, Tag, TenantStage, User, WhatsAppNumber,
} from '@/types'
import type { TimelineEntry } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { dayAt, daysAgo, hoursAgo, justNow, minutesAgo } from './heroClock'
import type { HeroState } from './heroStory'

/**
 * A FONTE ÚNICA de dados de demonstração do Hero.
 *
 * Tudo que as superfícies mostram — contato, conversa, situação, etiquetas,
 * mensagens, atividades, funil, etapas e negócio — sai daqui, derivado do
 * estado corrente da história. O card do quadro é o MESMO objeto `Deal` que o
 * painel mostra; não existe um segundo conjunto de dados para o funil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * O QUE A IA PODE FAZER (auditado no código dos três repositórios, 25/09)
 *
 * Esta história só representa capacidade que o produto realmente autoriza. A
 * auditoria derrubou três coisas que a versão anterior insinuava:
 *
 *  1. **A IA não define o valor do negócio.** Nenhuma ferramenta do agente
 *     aceita `amountCents`, e a porta única do funil recusa por identidade:
 *     *"A IA não define o valor do negócio."* Por isso o negócio aqui já
 *     nasce com valor — aberto por uma PESSOA (Ana) dois dias antes.
 *  2. **A IA não se pausa.** Não existe ferramenta de pausa; atribuir a
 *     conversa a um humano NÃO silencia o agente. Quem pausa é a pessoa, ao
 *     intervir. Por isso a faixa de handoff só vira verde no estado `humano`.
 *  3. **A IA não fecha venda.** A recusa é dupla e vale mesmo com todos os
 *     opt-ins ligados: *"A IA só fecha registros de funil de processo.
 *     Ganho/perdido de venda é decisão humana."* O desfecho é da Atendente.
 *
 * O que ela PODE, e a história mostra: responder com informação da base de
 * conhecimento, mudar a situação do contato (`update_contact({stage})`),
 * etiquetar a conversa (`add_tag_to_conversation`), avançar o negócio para uma
 * etapa não-terminal (`update_deal_stage`) e chamar uma pessoa
 * (`find_available_user` + `assign_conversation` + `set_conversation_status`).
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
  company: 'Loja Vida Natural',
  phone: '+55 47 99900-7010',
  agent: 'Agente Vendas',
  atendente: 'Ana Prado',
  dealTitle: 'Plano Pro anual · 12 licenças',
  amountCents: 450_000,
  tag: 'proposta enviada',
  demand: 'Oi! Preciso de uma proposta pra 12 licenças do plano anual.',
  answer: 'Oi, Marina! O Plano Pro anual sai por R$ 375 por licença — R$ 4.500 ao ano pelas 12, com suporte prioritário incluso.',
  confirm: 'Show, é isso mesmo que a gente precisa.',
  ask: 'Consigo falar com alguém pra fechar hoje ainda?',
  human: 'Oi Marina, aqui é a Ana! Acabei de reservar as 12 licenças. Te mando o contrato agora.',
} as const

export const HERO_LINE: WhatsAppNumber = {
  id: 'demo-line-1',
  displayPhoneNumber: '+55 47 3030-1100',
  status: 'connected',
} as WhatsAppNumber

export const HERO_TAGS: Tag[] = [
  { id: 'tg-vip', name: 'VIP', color: '#2DD4BF' },
  { id: 'tg-atacado', name: 'Atacado', color: '#60A5FA' },
  { id: 'tg-proposta', name: HERO.tag, color: '#FBBF24' },
]

export const HERO_USER: User = {
  id: 'demo-user-1',
  tenantId: TENANT,
  email: 'ana@exemplo.com',
  firstName: 'Ana',
  lastName: 'Prado',
  role: 'agent',
  isActive: true,
} as User

// ─── Situação do contato (≠ etapa do negócio, ≠ etiqueta, ≠ status) ──────────

export const HERO_CONTACT_STAGES: TenantStage[] = [
  { id: 'cs-1', tenantId: TENANT, key: 'novo',          label: 'Novo',          color: '#64748B', order: 1, isTerminal: false, createdAt: daysAgo(60) },
  { id: 'cs-2', tenantId: TENANT, key: 'em-negociacao', label: 'Em negociação', color: '#38BDF8', order: 2, isTerminal: false, createdAt: daysAgo(60) },
  { id: 'cs-3', tenantId: TENANT, key: 'cliente',       label: 'Cliente',       color: '#22C55E', order: 3, isTerminal: true,  createdAt: daysAgo(60) },
]

// ─── Contato e conversa ───────────────────────────────────────────────────────

function contactOf(id: string, name: string, waId: string, extra: Partial<Contact> = {}): Contact {
  return { id, tenantId: TENANT, waId, displayName: name, createdAt: daysAgo(203), tags: [], ...extra } as Contact
}

export function heroContact(at: HeroState): Contact {
  return contactOf('demo-c-0', HERO.person, '5547999007010', {
    stage: reached(at, 'situacao') ? 'em-negociacao' : 'novo',
    tags: reached(at, 'etiqueta') ? HERO_TAGS : HERO_TAGS.slice(0, 2),
    company: HERO.company,
    email: 'marina@lojavidanatural.com.br',
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
    // contato, status da conversa, etapa do negócio — mudam em momentos
    // diferentes, de propósito.
    status: reached(at, 'ganho') ? 'resolved' : reached(at, 'assumido') ? 'pending' : 'open',
    channel: 'whatsapp',
    lastMessageAt: ultima.sentAt,
    lastMessagePreview: ultima.body,
    // `lastAgentReplyAt` é o que decide o aviso "X sem resposta" na lista
    // (`getAwaitingReply`). Sem ele, TODAS as linhas da demonstração
    // estampavam "5h sem resposta" em vermelho enquanto a cena mostrava a IA
    // respondendo na hora — a contradição que o PO apontou. Aqui ele marca a
    // última saída: enquanto a IA ainda não respondeu à demanda, o aviso
    // aparece (e é verdade); assim que ela responde, some.
    lastAgentReplyAt: ultima.direction === 'outbound' ? ultima.sentAt : undefined,
    unreadCount: 0,
    createdAt: daysAgo(1),
    // A IA só para quando a PESSOA intervém. Atribuir não silencia o agente —
    // é o que o código faz, e é o que a cena mostra.
    aiActive: !reached(at, 'humano'),
    aiPausedUntil: reached(at, 'humano') ? hoursAgo(-4) : null,
    assignedUser: reached(at, 'assumido') ? HERO_USER : undefined,
    tags: contact.tags,
  } as Conversation
}

/** As demais linhas do inbox — densidade real, com tempos plausíveis. */
const OUTRAS = [
  { nome: 'Ana Prado',       previa: 'Perfeito, obrigada!',              min: 12,  naoLidas: 0, ia: false },
  { nome: 'Bruno Antunes',   previa: 'Consigo receber ainda hoje?',      min: 27,  naoLidas: 2, ia: true },
  { nome: 'Clínica Norte',   previa: 'Vocês emitem nota no mesmo dia?',  min: 43,  naoLidas: 0, ia: false },
  { nome: 'Diego Ramos',     previa: 'Fechado, pode enviar o contrato.', min: 96,  naoLidas: 0, ia: false },
  { nome: 'Studio Bemviver', previa: 'Obrigado pelo retorno!',           min: 150, naoLidas: 0, ia: true },
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
  autor: 'cliente' | 'ia' | 'pessoa' = 'cliente',
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
    senderKind: dir === 'inbound' ? 'client' : autor === 'ia' ? 'ai' : 'operator',
    ...(autor === 'pessoa' ? { sentByUserId: HERO_USER.id, sentByUser: HERO_USER } : {}),
  } as Message
}

/**
 * A thread. O histórico de ontem dá continuidade e faz o `MessageList` real
 * desenhar o separador de dia. A partir daí os horários são relativos ao
 * "agora" da demonstração — nunca a um horário fixo, que faria a lista acusar
 * "5h sem resposta" para quem abrisse a página à tarde.
 */
export function heroMessages(at: HeroState): Message[] {
  const out: Message[] = [
    msg(1, 'inbound', 'Bom dia! Vocês têm plano anual pra equipe?', dayAt(1, 9, 12)),
    msg(2, 'outbound', 'Bom dia, Marina! Temos sim — o Plano Pro tem contratação anual por licença.', dayAt(1, 9, 13), 'ia'),
    msg(3, 'inbound', 'Perfeito, vou ver com a diretoria e te falo.', dayAt(1, 9, 21)),
    // O histórico de ontem TERMINA com o agente. Sem isto, o primeiro quadro
    // abria com a linha da protagonista marcada em vermelho — "23/09 sem
    // resposta" —, dizendo o contrário do que a cena vai mostrar.
    msg(4, 'outbound', 'Combinado! Qualquer coisa é só chamar. 😊', dayAt(1, 9, 22), 'ia'),
  ]
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

// ─── Funil, etapas e o negócio ────────────────────────────────────────────────

export const HERO_STAGE_QUALIFICACAO = 'ps-qualificacao'
export const HERO_STAGE_PROPOSTA = 'ps-proposta'
export const HERO_STAGE_GANHO = 'ps-ganho'

export const HERO_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'ps-entrada',            tenantId: TENANT, pipelineId: 'pl-vendas', key: 'entrada',      label: 'Entrada',      color: '#64748B', order: 1, isWon: false, isLost: false },
  { id: HERO_STAGE_QUALIFICACAO, tenantId: TENANT, pipelineId: 'pl-vendas', key: 'qualificacao', label: 'Qualificação', color: '#38BDF8', order: 2, isWon: false, isLost: false, probability: 30 },
  { id: HERO_STAGE_PROPOSTA,     tenantId: TENANT, pipelineId: 'pl-vendas', key: 'proposta',     label: 'Proposta',     color: '#A78BFA', order: 3, isWon: false, isLost: false, probability: 60 },
  { id: 'ps-negociacao',         tenantId: TENANT, pipelineId: 'pl-vendas', key: 'negociacao',   label: 'Negociação',   color: '#FBBF24', order: 4, isWon: false, isLost: false, probability: 80 },
  // Terminal: só a PESSOA chega aqui. A IA é recusada pelo backend.
  { id: HERO_STAGE_GANHO,        tenantId: TENANT, pipelineId: 'pl-vendas', key: 'ganho',        label: 'Ganho',        color: '#22C55E', order: 5, isWon: true,  isLost: false },
]

export const HERO_PIPELINE: Pipeline = {
  id: 'pl-vendas',
  tenantId: TENANT,
  name: 'Vendas',
  color: '#2DD4BF',
  order: 1,
  isDefault: true,
  isArchived: false,
  kind: 'sales',
  stages: HERO_PIPELINE_STAGES,
  openDealsCount: 7,
} as Pipeline

/**
 * O negócio da história.
 *
 * **Já existia**, e quem o abriu foi uma pessoa: a Ana, dois dias antes, com o
 * valor já definido. Isso não é detalhe de enredo — é o que o produto permite.
 * A IA não define valor e não abre negócio sem opt-in; o que ela faz aqui é
 * uma coisa só, e ela pode: **avançar a etapa** (`update_deal_stage`, etapa
 * não terminal, sem retroceder).
 *
 * O desfecho — Ganho — é da Atendente, pelo fluxo real de fechamento, que
 * exige motivo. A IA é recusada nessa etapa por identidade, em duas camadas.
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
    description: '12 licenças · suporte prioritário',
    originConversationId: 'demo-conv-0',
    originKind: 'manual',
    createdByKind: 'user',
    ownerUserId: HERO_USER.id,
    // Quem moveu, e quando. "5h na etapa" num card que acabou de andar era um
    // dos defeitos apontados: agora o tempo vem do relógio da demonstração.
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
 * Os outros negócios do quadro — o funil de um dia comum. Títulos distintos de
 * propósito: com quatro "Plano Pro anual" iguais, o protagonista sumia no meio
 * dos homônimos (defeito apontado pelo PO).
 */
// Nenhum passa de 3 dias na etapa: acima disso o `DealsBoard` real estampa
// "parado N d" em vermelho, e um negócio de terceiro gritando em vermelho
// rouba a atenção do card que a história está contando.
const OUTROS = [
  { id: 'd-1', title: 'Implantação · 4 lojas',  person: 'Clínica Norte',   stageId: 'ps-entrada',            cents: 225_000, dias: 1 },
  { id: 'd-2', title: 'Plano Essencial mensal', person: 'Bruno Antunes',   stageId: 'ps-entrada',            cents: 90_000,  dias: 3 },
  { id: 'd-3', title: 'Migração de base',       person: 'Diego Ramos',     stageId: HERO_STAGE_QUALIFICACAO, cents: 337_500, dias: 2 },
  { id: 'd-4', title: 'Renovação · 8 licenças', person: 'Móveis Aurora',   stageId: HERO_STAGE_QUALIFICACAO, cents: 300_000, dias: 1 },
  { id: 'd-5', title: 'Treinamento da equipe',  person: 'Studio Bemviver', stageId: HERO_STAGE_PROPOSTA,     cents: 187_500, dias: 3 },
  { id: 'd-6', title: 'Upgrade de plano',       person: 'Casa Verde',      stageId: 'ps-negociacao',         cents: 562_500, dias: 2 },
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
  const todos = [...HERO_OTHER_DEALS, heroDeal(at)]
  const out: Record<string, Deal[]> = {}
  for (const stage of HERO_PIPELINE_STAGES) out[stage.id] = []
  for (const d of todos) (out[d.stageId] ??= []).push(d)
  return out
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * A Timeline é CONFIRMAÇÃO, nunca a única evidência: cada linha tem um par
 * visível em outro lugar da tela no mesmo instante.
 *
 * O que NÃO entra aqui, por honestidade: a busca na base de conhecimento. O
 * endpoint que alimenta esta seção filtra `kind = 'crm'`, e as buscas na base
 * são gravadas como `kind = 'kb'` — no produto real elas **não aparecem** para
 * o operador. A evidência dessa capacidade é o conteúdo da resposta do agente,
 * que traz preço e condição; inventar uma linha aqui seria inventar tela.
 *
 * Teto de quatro linhas (`COLLAPSED_LIMIT` da seção real): a quinta desabaria
 * a cadeia atrás de um "ver mais".
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
  const out: TimelineEntry[] = []
  if (reached(at, 'situacao')) out.push(agente('t1', 'Situação do contato: Novo → Em negociação', 'update_contact', 3))
  if (reached(at, 'etiqueta')) out.push(agente('t2', `Adicionou a etiqueta "${HERO.tag}" à conversa`, 'add_tag_to_conversation', 3))
  if (reached(at, 'avanco')) out.push(agente('t3', 'Moveu o negócio de Qualificação para Proposta', 'manage_deal_pipeline', 2))
  if (reached(at, 'assumido')) out.push(agente('t4', `Chamou ${HERO.atendente} para a conversa`, 'assign_conversation', 1))
  if (reached(at, 'ganho')) {
    out.shift() // mantém quatro linhas: a mais antiga cede lugar ao desfecho
    out.push(pessoa('t5', `Negócio "${HERO.dealTitle}" ganho`, 'deal_won', 0, {
      dealTitle: HERO.dealTitle, amountCents: HERO.amountCents, pipelineKind: 'sales',
    }))
  }
  if (out.length === 0) out.push(pessoa('t0', 'Conversa iniciada', 'conversation_created', 1440))
  return out
}

// ─── Callbacks ────────────────────────────────────────────────────────────────

/**
 * O palco é decorativo: a moldura é `inert` + `aria-hidden` +
 * `pointer-events-none`, e todo callback é no-op. Isso é higiene, não a
 * garantia de isolamento — a garantia é não montar nada que busque, e as
 * costuras de dados (`timelineEntries`, `stagesOverride`, `dealsSlot`, `demo`)
 * são o que fecha essa porta.
 */
export const NOOP = () => {}
export const NOOP_ASYNC = async () => {}
