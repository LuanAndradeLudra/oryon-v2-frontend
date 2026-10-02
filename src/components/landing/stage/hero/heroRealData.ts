import type {
  DealStageHistoryEntry,
  Campaign, Contact, Conversation, Deal, Message, Pipeline, PipelineStage, Product, Tag, TenantStage, User, WhatsAppNumber, WhatsAppTemplate,
} from '@/types'
import type { TimelineEntry } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import type { AppNotification } from '@/hooks/useNotifications'
import { dayAt, daysAgo, hoursAgo, justNow, minutesAgo } from './heroClock'
import type { HeroState } from './heroStory'
import { PERFIL } from './perfisDemo'

/**
 * A FONTE ÚNICA de dados de demonstração do Hero.
 *
 * Tudo que as superfícies mostram — contato, conversa, situação, etiquetas,
 * mensagens, atividades, funil, etapas e o registro do atendimento — sai daqui,
 * derivado do estado corrente da história. O card do quadro é o MESMO objeto
 * `Deal` que o painel mostra; não existe um segundo conjunto de dados.
 *
 * O PERFIL (02/10): os textos — empresa, pessoas, mensagens, funil, catálogo —
 * vêm de `perfisDemo.ts`, um por área da página /solucoes. A clínica é o
 * perfil padrão (Hero, páginas de produto); os ids internos não mudam.
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
  person: PERFIL.pessoa.nome,
  company: PERFIL.empresa,
  phone: PERFIL.pessoa.telefone,
  agent: PERFIL.agente.nome,
  atendente: `${PERFIL.atendente.primeiro} ${PERFIL.atendente.sobrenome}`,
  doctor: PERFIL.profissional,
  dealTitle: PERFIL.negocio.titulo,
  amountCents: PERFIL.negocio.cents,
  tag: PERFIL.etiquetas[2].nome,
  demand: PERFIL.mensagens.demanda,
  answer: PERFIL.mensagens.resposta,
  confirm: PERFIL.mensagens.confirma,
  ask: PERFIL.mensagens.pedido.texto,
  human: PERFIL.mensagens.humano,
} as const

export const HERO_LINE: WhatsAppNumber = {
  id: 'demo-line-1',
  displayPhoneNumber: '+55 47 3000-0100',
  status: 'connected',
} as WhatsAppNumber

export const HERO_TAGS: Tag[] = (['tg-unimed', 'tg-derma', 'tg-retorno'] as const).map((id, i) => ({
  id, name: PERFIL.etiquetas[i].nome, color: PERFIL.etiquetas[i].cor,
}))

export const HERO_USER: User = {
  id: 'demo-user-1',
  tenantId: TENANT,
  email: PERFIL.atendente.email,
  firstName: PERFIL.atendente.primeiro,
  lastName: PERFIL.atendente.sobrenome,
  role: 'agent',
  isActive: true,
} as User

// ─── Situação do contato (≠ etapa do registro, ≠ etiqueta, ≠ status) ─────────

export const HERO_CONTACT_STAGES: TenantStage[] = PERFIL.situacoes.map((s, i) => ({
  id: `cs-${i + 1}`, tenantId: TENANT, key: s.key, label: s.label, color: s.color, order: i + 1, isTerminal: i === 2, createdAt: daysAgo(60),
}))

// ─── Contato e conversa ───────────────────────────────────────────────────────

function contactOf(id: string, name: string, waId: string, extra: Partial<Contact> = {}): Contact {
  return { id, tenantId: TENANT, waId, displayName: name, createdAt: daysAgo(203), tags: [], ...extra } as Contact
}

export function heroContact(at: HeroState): Contact {
  return contactOf('demo-c-0', HERO.person, PERFIL.pessoa.waId, {
    stage: reached(at, 'situacao') ? PERFIL.situacoes[1].key : PERFIL.situacoes[0].key,
    tags: reached(at, 'etiqueta') ? HERO_TAGS : HERO_TAGS.slice(0, 2),
    city: PERFIL.cidade,
    state: PERFIL.uf,
    email: PERFIL.pessoa.email,
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
const OUTRAS = PERFIL.conversas

export const HERO_OTHER_CONVERSATIONS: Conversation[] = OUTRAS.map((c, i) => ({
  id: `demo-conv-${i + 1}`,
  tenantId: TENANT,
  contact: contactOf(`demo-c-${i + 1}`, c.nome, `5547900000${300 + i}`),
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
  // O histórico de ontem TERMINA com o agente: sem isto, o primeiro quadro
  // abria com a linha da protagonista marcada em vermelho ("sem resposta").
  const out: Message[] = PERFIL.mensagens.ontem.map(([dir, texto, h, m], i) =>
    msg(i + 1, dir, texto, dayAt(1, h, m), dir === 'outbound' ? 'ia' : 'cliente'))
  // O disparo da campanha: é ele que reabre a conversa de ontem.
  out.push(msg(10, 'outbound', HERO_TEMPLATE_TEXTO, minutesAgo(6), 'campanha'))
  if (reached(at, 'demanda')) out.push(msg(5, 'inbound', HERO.demand, minutesAgo(4)))
  if (reached(at, 'resposta')) out.push(msg(6, 'outbound', HERO.answer, minutesAgo(3), 'ia'))
  if (reached(at, 'confirma')) out.push(msg(7, 'inbound', HERO.confirm, minutesAgo(2)))
  // O pedido de uma pessoa: na clínica, a cliente pede; nas outras áreas, a
  // própria IA avisa que vai chamar quem cuida (como nos iPhones da home).
  if (reached(at, 'pedido')) {
    out.push(PERFIL.mensagens.pedido.autor === 'ia'
      ? msg(8, 'outbound', HERO.ask, minutesAgo(1), 'ia')
      : msg(8, 'inbound', HERO.ask, minutesAgo(1)))
  }
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
const ETAPA_IDS = ['ps-contato', HERO_STAGE_QUALIFICACAO, HERO_STAGE_PROPOSTA, 'ps-guia', HERO_STAGE_GANHO] as const
const PROBABILIDADE = [undefined, 30, 60, 80, undefined]

export const HERO_PIPELINE_STAGES: PipelineStage[] = PERFIL.funil.etapas.map((e, i) => ({
  id: ETAPA_IDS[i], tenantId: TENANT, pipelineId: 'pl-consultas', key: e.key, label: e.label, color: e.color,
  order: i + 1, isWon: i === 4, isLost: false, ...(PROBABILIDADE[i] ? { probability: PROBABILIDADE[i] } : {}),
}))
const ETAPA = (i: number) => PERFIL.funil.etapas[i].label

export const HERO_PIPELINE: Pipeline = {
  id: 'pl-consultas',
  tenantId: TENANT,
  name: PERFIL.funil.nome,
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
    description: PERFIL.negocio.descricao,
    // O item do catálogo que compõe o valor — sem ele o painel mostrava
    // "Total R$ 0,00".
    lineItems: [{
      id: 'li-retorno', kind: 'catalog', productId: PERFIL.negocio.item.produtoId, productName: PERFIL.negocio.item.nome,
      variationLabel: PERFIL.negocio.item.variacao, unitPriceCents: PERFIL.negocio.cents, quantity: 1, order: 1,
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
/** Os ids dos outros registros — fixos, o perfil só troca os textos. */
const IDS_OUTROS = ['d-1', 'd-2', 'd-3', 'd-4', 'd-5', 'd-6', 'd-7', 'd-8', 'd-9', 'd-10', 'd-11', 'd-13', 'd-16']
const OUTROS = PERFIL.negocios.map((d, i) => ({ id: IDS_OUTROS[i], title: d.title, person: d.person, stageId: ETAPA_IDS[d.etapa], cents: d.cents, dias: d.dias }))

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
  if (reached(at, 'situacao')) out.push(agente('t1', `Situação do contato: ${PERFIL.situacoes[0].label} → ${PERFIL.situacoes[1].label}`, 'update_contact', 3))
  if (reached(at, 'etiqueta')) out.push(agente('t2', `Adicionou a etiqueta "${HERO.tag}" à conversa`, 'add_tag_to_conversation', 3))
  if (reached(at, 'avanco')) out.push(agente('t3', `Moveu o negócio de ${ETAPA(1)} para ${ETAPA(2)}`, 'manage_deal_pipeline', 2))
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
  name: PERFIL.modelo.nome,
  language: 'pt_BR',
  category: 'MARKETING',
  status: 'APPROVED',
  body: PERFIL.modelo.corpo,
  footer: PERFIL.modelo.rodape,
  buttons: [
    { type: 'QUICK_REPLY', text: PERFIL.modelo.botoes[0] },
    { type: 'QUICK_REPLY', text: PERFIL.modelo.botoes[1] },
  ],
  bodyVariables: ['nome'],
  whatsappNumberId: 'demo-line-1',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
}
export const HERO_TEMPLATE_VARIAVEIS = { '1': PERFIL.pessoa.primeiro }
const HERO_TEMPLATE_TEXTO = HERO_TEMPLATE.body.replace('{{1}}', HERO_TEMPLATE_VARIAVEIS['1']).replace(/\*/g, '')

/** O nome da campanha da história, usado onde ela é citada por fora. */
export const HERO_CAMPANHA_NOME = PERFIL.modelo.campanha
/** Um trecho do modelo que só aparece na mensagem da campanha (o foco do diretor). */
export const HERO_TEMPLATE_TRECHO = PERFIL.modelo.trecho

/**
 * As campanhas do tenant. A de retorno é a da história: é ela que chega no
 * WhatsApp da Marina e abre a conversa. Os números sobem enquanto o roteiro
 * está em `inicio` (a campanha está saindo) e assentam depois.
 */
// 02/10: a base cabe no que o assistente "Nova campanha" lê (até 500
// contatos), para o alcance estimado bater com o relatório (cena de Disparos).
const BASE_RETORNO = 486
export function heroCampaigns(at: HeroState): Campaign[] {
  const saindo = at === 'inicio'
  const stats = saindo
    ? { total: BASE_RETORNO, sent: 452, delivered: 431, read: 238, failed: 9, replied: 29, conversions: 6 }
    : { total: BASE_RETORNO, sent: 477, delivered: 468, read: 341, failed: 9, replied: 54, conversions: 11 }
  const base = { tenantId: TENANT, variableMappings: [], createdByUserId: HERO_USER.id, whatsappNumberId: HERO_LINE.id }
  return [
    {
      ...base, id: 'cp-retorno', name: HERO_CAMPANHA_NOME, templateId: 'tp-retorno',
      templateName: PERFIL.modelo.nome, segment: { type: 'tag', tagIds: ['tg-derma'] },
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
export const HERO_PRODUCTS: Product[] = PERFIL.produtos.map((p, i) => ({
  id: p.id, name: p.name, sku: p.sku, category: p.category, active: true, order: i + 1, description: p.description,
  priceVariations: p.precos.map((v, j) => ({ id: v.id, label: v.label, amountCents: v.cents, currency: 'BRL', order: j + 1 })),
}))

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
    description: '477 enviadas · 468 entregues', link: '/campaigns', isRead: true, createdAt: minutesAgo(40),
    metadata: { campaignName: HERO_CAMPANHA_NOME, sent: 477, failed: 9 },
  })
  out.push({
    id: 'nt-atribuida', type: 'conversation_assigned', title: 'Conversa atribuída a você',
    description: PERFIL.atribuida.descricao, link: '/conversations', isRead: true, createdAt: hoursAgo(3),
    metadata: { contactName: PERFIL.atribuida.contato },
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
    { id: 'h-3', fromStageId: HERO_STAGE_PROPOSTA, fromStageLabel: ETAPA(2), toStageId: HERO_STAGE_GANHO, toStageLabel: ETAPA(4), movedByKind: 'user', movedByActorName: HERO.atendente, createdAt: minutesAgo(1) },
    { id: 'h-2', fromStageId: HERO_STAGE_QUALIFICACAO, fromStageLabel: ETAPA(1), toStageId: HERO_STAGE_PROPOSTA, toStageLabel: ETAPA(2), movedByKind: 'ai', movedByActorName: HERO.agent, createdAt: minutesAgo(6) },
    { id: 'h-1', fromStageId: 'ps-contato', fromStageLabel: ETAPA(0), toStageId: HERO_STAGE_QUALIFICACAO, toStageLabel: ETAPA(1), movedByKind: 'user', movedByActorName: HERO.atendente, createdAt: daysAgo(2) },
  ] as DealStageHistoryEntry[]
}
