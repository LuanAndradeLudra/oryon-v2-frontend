import { rota } from './guards'
import {
  HERO, HERO_CONTACT_STAGES, HERO_LINE, HERO_PIPELINE, HERO_PIPELINE_STAGES, HERO_PRODUCTS, HERO_TAGS, HERO_USER,
  heroCampaigns, heroContact, heroConversation, heroConversations, heroDeal, heroDealsByStage, heroMessages,
  heroNotifications, heroTimeline, heroHistoricoGanho, HERO_STAGE_QUALIFICACAO, HERO_TEMPLATE,
} from '../components/landing/stage/hero/heroRealData'
import type { HeroState } from '../components/landing/stage/hero/heroStory'
import { hoursAgo } from '../components/landing/stage/hero/heroClock'
import { PERFIL, setorDaDemo } from '../components/landing/stage/hero/perfisDemo'
import { AGENTES_DEMO, CATALOGO_RECEPCAO, CONHECIMENTO_RECEPCAO, PROFISSIONAIS_DEMO, PROFISSIONAIS_RECEPCAO, agenteComFerramentas } from './agentesDemo'
import { heroActivityFeed, heroHomeSnapshot, heroHomeStats, heroPipelineOverview, heroEquipeDisponivel } from './dashboardDemo'
import { ANALYTICS_RENOVACAO, CONVERSAS_RENOVACAO } from './campanhaDemo'

/**
 * O BACKEND DE DEMONSTRAÇÃO — um banco em memória com um tenant fictício
 * completo, respondendo no formato exato dos tipos do app.
 *
 * O tenant **não se chama Oryon**: a Oryon é o fornecedor, e quem aparece na
 * demonstração é um cliente dela: a **Vértice Software**, que vende o Plano
 * Pro e atende a Marina (da Loja Vida Natural) — a mesma história em todos os
 * módulos.
 *
 * Duas respostas existem por um motivo específico, e não por completude:
 * `/workspace/readiness` e `/settings/billing` alimentam o banner de
 * configuração pendente e o aviso de plano no topo do app. Sem elas a
 * demonstração abriria com "termine de configurar" e um bloqueio de recurso
 * por cima da tela — o oposto do que a landing quer mostrar.
 *
 * A lista de rotas atendidas é a fonte do teste de "nenhuma chamada não
 * mapeada": tudo que uma rota do roteiro pedir e não estiver aqui aparece em
 * `rotasNaoMapeadas()` e derruba o teste.
 */

/** Estado corrente da história, dirigido pelos cues do roteiro. */
let estado: HeroState = 'inicio'
export function definirEstado(s: HeroState) { estado = s }
export function estadoAtual(): HeroState { return estado }

/**
 * O tenant é o VENDEDOR — a empresa que usa o Oryon e atende a Marina. A Loja
 * Vida Natural é a empresa DA MARINA (a cliente que compra as 12 licenças);
 * usá-la aqui fazia a Marina conversar com a própria empresa. Nome provisório,
 * trocar só aqui.
 */
const TENANT = { id: 'demo-tenant', nome: HERO.company }

function daysAgoIso(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString()
}

/** A base de pacientes da campanha de retorno (só para o assistente "Nova
 *  campanha"): com a Marina, 486 contatos com a etiqueta da campanha. */
const NOMES = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vanessa', 'Yuri']
const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Fernandes', 'Gomes', 'Holanda', 'Lima', 'Machado', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Xavier', 'Zanetti', 'Moura', 'Rocha', 'Pinto', 'Costa', 'Melo']
const BASE_DA_CAMPANHA = Array.from({ length: 485 }, (_, i) => ({
  id: `demo-base-${i}`, tenantId: TENANT.id, waId: `55479${String(80000000 + i * 37).slice(0, 8)}`,
  displayName: `${NOMES[i % NOMES.length]} ${SOBRENOMES[Math.floor(i / NOMES.length) % SOBRENOMES.length]}`,
  tags: i % 3 === 0 ? [HERO_TAGS[0], HERO_TAGS[1]] : [HERO_TAGS[1]],
  createdAt: hoursAgo(24 * (30 + (i % 200))),
}))

/** Os outros pacientes na fila do Dashboard: três sem dono e um com a
 *  Carla, ainda sem resposta. Só na clínica (a única área com painel em cena). */
const FILA_DO_PAINEL = [
  { nome: 'Sérgio Tavares', previa: 'Qual o valor do peeling? Faz parcelado?', min: 3, dono: null },
  { nome: 'Renata Souza', previa: 'Vocês aceitam SulAmérica para consulta?', min: 7, dono: null },
  { nome: 'Otávio Lima', previa: 'Preciso remarcar minha consulta de amanhã.', min: 12, dono: null },
  { nome: 'Paula Andrade', previa: 'O resultado do exame já saiu?', min: 18, dono: { id: 'demo-user-3', firstName: 'Carla', lastName: 'Mendes' } },
] as const
/**
 * O QUE O CURSOR MUDOU (02/10): nas cenas conduzidas do "Como funciona", o
 * cursor atribui uma conversa da fila e libera um item do catálogo para o
 * agente. Fica em memória até a cena recomeçar (`reiniciarInteracoesDemo`).
 */
const donoNaFila = new Map<string, { id: string; firstName: string; lastName: string } | null>()
let catalogoDoAgente: string[] | null = null
export function reiniciarInteracoesDemo() {
  donoNaFila.clear()
  catalogoDoAgente = null
}

function filaDoPainel() {
  if (setorDaDemo() !== 'clinica') return []
  return FILA_DO_PAINEL.map((f, i) => {
    const id = `demo-fila-${i}`
    const dono = donoNaFila.has(id) ? donoNaFila.get(id) : f.dono
    const em = new Date(Date.now() - f.min * 60_000).toISOString()
    return {
      id: `demo-fila-${i}`, tenantId: TENANT.id,
      contact: { id: `demo-fila-c-${i}`, tenantId: TENANT.id, waId: `5547900000${400 + i}`, displayName: f.nome, tags: [], createdAt: hoursAgo(24 * 40) },
      whatsappNumber: HERO_LINE, status: 'pending', channel: 'whatsapp',
      lastMessageAt: em, lastMessagePreview: f.previa, lastMessageSenderKind: 'client',
      lastAgentReplyAt: new Date(Date.now() - (f.min + 30) * 60_000).toISOString(),
      unreadCount: 1, createdAt: hoursAgo(2), aiActive: true,
      ...(dono ? { assignedUser: dono } : {}),
    } as unknown as ReturnType<typeof heroConversations>[number]
  })
}

/** A bancada responde ao que foi perguntado: a pergunta do "Como funciona"
 *  (o item recém-liberado no catálogo) tem a sua resposta; o resto, a da história. */
function respostaDoTeste(corpo: unknown): string {
  let dados = corpo
  try { if (typeof corpo === 'string') dados = JSON.parse(corpo) } catch { dados = null }
  const mensagens = (dados as { messages?: { role: string; content: string }[] } | null)?.messages ?? []
  const ultima = [...mensagens].reverse().find((m) => m.role === 'user')?.content ?? ''
  const teste = PERFIL.testeDoAgente
  return teste && ultima.trim() === teste.pergunta ? teste.resposta : HERO.answer
}

function paginado<T>(itens: T[]) {
  return { data: itens, total: itens.length, page: 1, limit: 50, hasMore: false }
}

/** Casa `GET /caminho` exatamente, ignorando a query. */
const eq = (metodo: string, caminho: string) =>
  (m: string, u: string) => m.toLowerCase() === metodo && u === caminho

/**
 * A usuária da demonstração: a Ana, gestora comercial (papel `admin`, para o
 * menu mostrar todos os módulos que a landing apresenta).
 */
const USUARIA = { ...HERO_USER, role: 'admin', tenantId: TENANT.id, tenant: { id: TENANT.id, name: TENANT.nome } }
const FLAGS = ['FF_MULTI_PIPELINE']

/**
 * Sessão e preferências já semeadas no armazenamento EM MEMÓRIA (a guarda de
 * armazenamento precisa estar instalada antes). É o que um usuário de verdade
 * teria depois de logar e de usar o produto por algumas semanas:
 *  • `oryon:session` — sem isto o `AuthContext` nasce deslogado, `user` é
 *    `null` e tudo que depende do tenant (linhas de WhatsApp, por exemplo)
 *    não busca nada;
 *  • `oryon:setup_<id>` — o checklist de primeiros passos concluído, senão
 *    cada módulo abre com "Configure sua primeira campanha" por cima.
 */
export function semearSessaoDemo() {
  localStorage.setItem('oryon:session', JSON.stringify({
    user: USUARIA,
    requiresPasswordChange: false,
    organizationConfigured: true,
    featureFlags: FLAGS,
  }))
  localStorage.setItem(`oryon:setup_${USUARIA.id}`, JSON.stringify({
    company: true, profile: true, copilot: true, dashboard: true, campaigns: true,
  }))
}

export function instalarBackendDemo() {
  // ── Sessão e tenant ────────────────────────────────────────────────────────
  rota('auth/me', eq('get', '/auth/me'), () => ({
    data: {
      ...USUARIA,
      // Os flags que a demonstração precisa: múltiplos funis liga o módulo de
      // Funis e a seção de negócios do painel do contato.
      featureFlags: FLAGS,
    },
  }))

  // ── Prontidão do workspace ────────────────────────────────────────────────
  // Tudo concluído: sem banner de "termine de configurar" em cima da cena.
  rota('workspace/readiness', eq('get', '/workspace/readiness'), () => ({
    data: {
      // `checks` é o campo que `unmetChecks` filtra — sem ele a TopBar
      // quebrava com "Cannot read properties of undefined (reading 'filter')".
      // Vazio = nada pendente, que é o estado que a demonstração precisa.
      checks: [],
      ready: true,
      completed: true,
      pendingSteps: [],
      steps: [],
      whatsappConnected: true,
      agentConfigured: true,
    },
  }))

  // ── Plano e créditos ──────────────────────────────────────────────────────
  // Plano ativo e crédito folgado: sem aviso de limite nem bloqueio de recurso.
  rota('settings/billing', eq('get', '/settings/billing'), () => ({
    data: {
      plan: { id: 'pro', name: 'Pro', status: 'active' },
      status: 'active',
      aiCredits: { balance: 84_000, included: 100_000, used: 16_000 },
      creditBalance: 84_000,
      trialEndsAt: null,
      pastDue: false,
    },
  }))

  // ── Conversas ─────────────────────────────────────────────────────────────
  rota('conversations', eq('get', '/conversations'), ({ params }) => {
    // `?status=` filtra como o backend real (a "Fila agora" do Dashboard pede
    // só as pendentes).
    // A aba "Todas" manda `status=all` — sem filtro (antes filtrava tudo fora e
    // o cabeçalho dizia "0 abertas · 0 pendentes").
    const status = params?.get('status')
    // `?awaitingReply=true` (filtro "aguardando" da inbox): a mesma regra do backend —
    // nenhuma resposta humana depois da última mensagem, conversa não encerrada.
    const aguardando = params?.get('awaitingReply') === 'true'
    // `?needsReview=true`: a história não tem anomalia da IA — lista vazia.
    if (params?.get('needsReview') === 'true') {
      return { data: { ...paginado([]), statusCounts: { open: 0, pending: 0, resolved: 0, abandoned: 0 }, needsReviewCount: 0 } }
    }
    const todas = heroConversations(estado)
    // A fila da aba "Agora" do Dashboard (02/10, PO: a cena estava vazia): outros
    // pacientes esperando, só quando a tela pede as pendentes — a inbox da
    // história (aba Todas) continua com as mesmas conversas.
    const lista = [...todas, ...(status === 'pending' ? filaDoPainel() : [])]
      .filter((c) => !status || status === 'all' || c.status === status)
      // Sem dono (aba Fila e fila do Dashboard) e linha, como o backend real.
      .filter((c) => params?.get('assignedTo') !== 'unassigned' || !c.assignedUser)
      .filter((c) => !params?.get('whatsappNumberId') || c.whatsappNumber?.id === params?.get('whatsappNumberId'))
      .filter((c) => !aguardando || (
        c.status !== 'resolved' && c.status !== 'abandoned'
        && (!c.lastAgentReplyAt || new Date(c.lastAgentReplyAt).getTime() < new Date(c.lastMessageAt).getTime())
      ))
    const conta = (s: string) => todas.filter((c) => c.status === s).length
    return {
      data: {
        ...paginado(lista),
        statusCounts: { open: conta('open'), pending: conta('pending'), resolved: conta('resolved'), abandoned: conta('abandoned') },
        needsReviewCount: 0,
      },
    }
  })

  // Atribuir uma conversa da fila do Dashboard a alguém da equipe (o cursor
  // da cena do painel). As da história não mudam de dono por aqui.
  rota('conversations/:id/assign', (m, u) => m.toLowerCase() === 'patch' && /^\/conversations\/[^/]+\/assign$/.test(u), ({ url, body }) => {
    const id = url.split('/')[2]
    const userId = (body as { userId?: string | null } | undefined)?.userId ?? null
    const pessoa = userId ? heroEquipeDisponivel(estado).find((x) => x.id === userId) : null
    if (id.startsWith('demo-fila-')) donoNaFila.set(id, pessoa ? { id: pessoa.id, firstName: pessoa.firstName, lastName: pessoa.lastName ?? '' } : null)
    const conversa = [...heroConversations(estado), ...filaDoPainel()].find((c) => c.id === id)
    return { data: conversa ?? null }
  })

  // ── Dashboard (dados fictícios em dashboardDemo.ts) ─────────────────────────
  rota('home/stats', eq('get', '/home/stats'), () => ({ data: heroHomeStats(estado) }))
  rota('home/snapshot', eq('get', '/home/snapshot'), () => ({ data: heroHomeSnapshot(estado) }))
  // Revisão das métricas (M5): resumo da fila; vazio = a aba Agora conta pela lista da demonstração.
  rota('home/queue', eq('get', '/home/queue'), () => ({ data: { maiorEsperaMin: 18, janelaFechando: 1, janelaFechada: 0 } }))
  rota('activity-feed', eq('get', '/activity-feed'), () => ({ data: { data: heroActivityFeed(estado) } }))
  rota('analytics/pipelines/:id/overview', (m, u) => m.toLowerCase() === 'get' && /^\/analytics\/pipelines\/[^/]+\/overview$/.test(u), () => ({
    data: heroPipelineOverview(estado),
  }))

  rota('conversations/unread-total', eq('get', '/conversations/unread-total'), () => ({
    data: { totalUnread: 0 },
  }))

  // ── Equipe e contatos ─────────────────────────────────────────────────────
  rota('users', eq('get', '/users'), () => ({ data: [HERO_USER] }))
  // Presença e carga da equipe — a aba Agora do Dashboard.
  // Quem recebeu uma conversa da fila pelo cursor ganha mais uma em aberto.
  rota('users/available', eq('get', '/users/available'), () => ({
    data: heroEquipeDisponivel(estado).map((p) => ({ ...p, activeConversations: p.activeConversations + [...donoNaFila.values()].filter((d) => d?.id === p.id).length })),
  }))

  rota('contacts', eq('get', '/contacts'), ({ params }) => {
    const daHistoria = heroConversations(estado).map((c) => c.contact)
    // O assistente "Nova campanha" lê a base inteira (limit 500) e estima o
    // alcance por ela: a base de pacientes com a etiqueta da campanha de
    // retorno, para o número bater com o relatório (`BASE_RETORNO`).
    if (Number(params?.get('limit') ?? 0) >= 200) return { data: paginado([...daHistoria, ...BASE_DA_CAMPANHA]) }
    return { data: paginado(daHistoria) }
  })

  // Conveniências que várias telas pedem pelo id do contato da história.
  rota('contacts/:id', (m, u) => m.toLowerCase() === 'get' && /^\/contacts\/[^/]+$/.test(u), () => ({
    data: heroContact(estado),
  }))

  rota('conversations/:id', (m, u) => m.toLowerCase() === 'get' && /^\/conversations\/[^/]+$/.test(u), () => ({
    data: heroConversation(estado),
  }))

  // ── A conversa aberta ─────────────────────────────────────────────────────
  rota('conversations/:id/messages', (m, u) => m.toLowerCase() === 'get' && /^\/conversations\/[^/]+\/messages$/.test(u), ({ url }) => ({
    // A API real devolve da mais NOVA para a mais antiga (`useMessages` inverte).
    data: paginado(url.includes('demo-conv-0') ? [...heroMessages(estado)].reverse() : []),
  }))

  rota('canned-responses', eq('get', '/canned-responses'), () => ({ data: { data: [], hasMore: false } }))

  // Atividade da conversa: as ações da PESSOA vêm do backend; as do AGENTE
  // vêm do agent-server. As duas saem da mesma linha do tempo da história.
  rota('activity-feed/conversation/:id', (m, u) => m.toLowerCase() === 'get' && /^\/activity-feed\/conversation\/[^/]+$/.test(u), ({ url }) => {
    const itens = url.endsWith('demo-conv-0') ? heroTimeline(estado).filter((e) => e.kind === 'user') : []
    return {
      data: {
        total: itens.length,
        data: itens.map((e) => e.kind === 'user' && ({
          id: e.id, type: e.action, timestamp: e.createdAt, actor: e.actor, summary: e.summary, metadata: e.metadata,
        })),
      },
    }
  })

  rota('agents/builder/conversations/:id/actions', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/conversations\/[^/]+\/actions$/.test(u), ({ url }) => {
    const itens = url.includes('demo-conv-0') ? heroTimeline(estado).filter((e) => e.kind === 'agent') : []
    return {
      data: {
        data: {
          conversation_id: 'demo-conv-0',
          actions: itens.map((e) => e.kind === 'agent' && ({
            id: e.id, toolName: e.toolName, humanSummary: e.summary, success: e.success,
            targetEntityType: null, targetEntityId: null, contactId: 'demo-c-0', durationMs: 420,
            errorMessage: e.errorMessage, agentId: 'ag-recepcao', agentName: e.agentName, createdAt: e.createdAt,
          })),
        },
      },
    }
  })

  // ── Funis e negócios ──────────────────────────────────────────────────────
  rota('settings/pipelines', eq('get', '/settings/pipelines'), () => ({ data: [HERO_PIPELINE] }))

  rota('settings/pipelines/:id', (m, u) => m.toLowerCase() === 'get' && /^\/settings\/pipelines\/pl-[^/]+$/.test(u), () => ({
    data: HERO_PIPELINE,
  }))

  rota('settings/pipelines/:id/stages', (m, u) => m.toLowerCase() === 'get' && /^\/settings\/pipelines\/[^/]+\/stages$/.test(u), () => ({
    data: HERO_PIPELINE_STAGES,
  }))

  rota('deals', eq('get', '/deals'), ({ params }) => {
    const todos = Object.values(heroDealsByStage(estado)).flat()
    const contato = params?.get('contactId')
    return { data: contato ? todos.filter((d) => d.contactId === contato) : todos }
  })

  // ── Configurações do CRM que os provedores carregam na subida ─────────────
  rota('tags', eq('get', '/tags'), () => ({ data: HERO_TAGS }))
  rota('settings/stages', eq('get', '/settings/stages'), () => ({ data: HERO_CONTACT_STAGES }))
  rota('settings/custom-fields', eq('get', '/settings/custom-fields'), () => ({ data: [] }))
  rota('products', eq('get', '/products'), () => ({ data: paginado(HERO_PRODUCTS) }))
  rota('practitioners', eq('get', '/practitioners'), () => ({ data: paginado([]) }))

  // ── Chat interno da equipe (fora do palco, mas o provedor carrega) ───────
  rota('internal/channels', eq('get', '/internal/channels'), () => ({ data: [] }))
  rota('internal/presence', eq('get', '/internal/presence'), () => ({ data: [] }))

  // ── Notificações (sino da TopBar) ─────────────────────────────────────────
  rota('notifications', eq('get', '/notifications'), () => {
    const lista = heroNotifications(estado)
    return { data: { data: lista, unreadCount: lista.filter((n) => !n.isRead).length, nextCursor: null } }
  })

  // ── Contexto da empresa (hub que a tela de Agentes lê) ────────────────────
  rota('context/brain', eq('get', '/context/brain'), () => ({
    data: { companyName: TENANT.nome, segment: 'Software de gestão', lastUpdatedAt: daysAgoIso(30) },
  }))

  // ── Token curto ───────────────────────────────────────────────────────────
  // O cliente do agent-server (e o de mídia) pede um token antes de cada
  // chamada. Na demonstração ele não autentica nada — só precisa existir.
  rota('auth/ws-token', eq('get', '/auth/ws-token'), () => ({ data: { token: 'demo' } }))

  // ── Agent-server (Agentes IA) ─────────────────────────────────────────────
  // O cliente do agent-server usa `fetch` e desembrulha `{ data }`.
  rota('agents/builder/configs', eq('get', '/agents/builder/configs'), () => ({ data: { data: AGENTES_DEMO } }))
  // Seção Catálogo pergunta se os preços chegam à IA (onda 2 / A6). Na
  // demonstração o agente fictício usa o catálogo, então sem aviso.
  rota('agents/builder/runtime-flags', eq('get', '/agents/builder/runtime-flags'), () => ({ data: { data: { catalogInjection: true } } }))
  // Desempenho — onde o agente falha (onda 5). Demonstração sem registros.
  rota('agents/builder/configs/:id/insights', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/insights$/.test(u), () => ({
    data: { data: { days: 30, logging: { executions: true, ragQueries: true }, problems: [], unanswered: [] } },
  }))
  rota('agents/builder/configs/:id/turns', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/turns$/.test(u), () => ({
    data: { data: [] },
  }))
  rota('agents/builder/configs/:id/test-runs', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/test-runs$/.test(u), () => ({
    data: { data: [] },
  }))
  rota('agents/builder/configs/:id/spec', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/spec$/.test(u), () => ({
    data: { data: { spec: { tests: [] }, version: null, repeatedFacts: [] } },
  }))
  rota('agents/builder/configs/:id', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+$/.test(u), ({ url }) => ({
    data: { data: agenteComFerramentas(url.split('/').pop()!) },
  }))
  // Página do agente (27/09): Alterações lê a auditoria e as sessões de
  // teste; Desempenho lê o uso das ferramentas.
  rota('audit/tenant-feed', eq('get', '/audit/tenant-feed'), () => ({
    data: {
      nextCursor: null,
      data: [
        { id: 'au-1', tenantId: 'demo-tenant', actorId: 'demo-user-1', actorName: HERO.atendente, actorType: 'user', action: 'agent_prompt_updated',
          entityType: 'ai_agent', entityId: 'ag-recepcao', entityName: HERO.agent, description: '', details: {}, source: 'ui', severity: 'info', createdAt: hoursAgo(48) },
        { id: 'au-2', tenantId: 'demo-tenant', actorId: 'demo-user-1', actorName: HERO.atendente, actorType: 'user', action: 'agent_handoff_rules_updated',
          entityType: 'ai_agent', entityId: 'ag-recepcao', entityName: HERO.agent, description: '', details: {}, source: 'ui', severity: 'info', createdAt: hoursAgo(50) },
        { id: 'au-3', tenantId: 'demo-tenant', actorId: 'demo-user-2', actorName: HERO.doctor, actorType: 'user', action: 'agent_updated',
          entityType: 'ai_agent', entityId: 'ag-recepcao', entityName: HERO.agent, description: `Agente "${HERO.agent}" atualizado (crm_capabilities, ai_handoff_pause_minutes)`, details: {}, source: 'ui', severity: 'info', createdAt: hoursAgo(144) },
      ],
    },
  }))
  rota('agents/builder/configs/:id/test-sessions', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/test-sessions$/.test(u), () => ({
    data: {
      data: [
        { id: 'ts-1', created_at: hoursAgo(20), ended_at: hoursAgo(20), message_count: 8, input_tokens: 9_200, output_tokens: 1_100 },
        { id: 'ts-2', created_at: hoursAgo(49), ended_at: hoursAgo(49), message_count: 12, input_tokens: 14_000, output_tokens: 1_800 },
      ],
    },
  }))
  rota('agents/builder/metrics/tools', (m, u) => m.toLowerCase() === 'get' && u.startsWith('/agents/builder/metrics/tools'), () => ({
    data: {
      data: {
        window_days: 7,
        tools: [
          { tool_name: 'buscar_base_conhecimento', total: 812, successes: 809, failures: 3, avg_duration_ms: 420, p95_duration_ms: 910 },
          { tool_name: 'atualizar_situacao_contato', total: 264, successes: 264, failures: 0, avg_duration_ms: 180, p95_duration_ms: 330 },
          { tool_name: 'mover_negocio_funil', total: 131, successes: 129, failures: 2, avg_duration_ms: 240, p95_duration_ms: 520 },
        ],
      },
    },
  }))
  // Bancada de teste: sessão e uma resposta que mostra fontes e ação no CRM.
  rota('agents/builder/configs/:id/test-sessions (post)', (m, u) => m.toLowerCase() === 'post' && /^\/agents\/builder\/configs\/[^/]+\/test-sessions$/.test(u), () => ({
    data: { data: { id: `ts-${Date.now()}`, created_at: new Date().toISOString(), ended_at: null, message_count: 0, input_tokens: 0, output_tokens: 0 } },
  }))
  rota('agents/builder/configs/:id/test-sessions/:s (patch)', (m, u) => m.toLowerCase() !== 'get' && /^\/agents\/builder\/configs\/[^/]+\/test-sessions\/[^/]+$/.test(u), () => ({
    data: { data: { id: 'ts', created_at: new Date().toISOString(), ended_at: new Date().toISOString(), message_count: 0, input_tokens: 0, output_tokens: 0 } },
  }))
  rota('agents/builder/chat', (m, u) => m.toLowerCase() === 'post' && u === '/agents/builder/chat', ({ body }) => ({
    atrasoMs: 1700,
    data: {
      data: {
        message: respostaDoTeste(body),
        toolCalls: [
          { name: 'buscar_base_conhecimento', kind: 'kb', success: true },
          { name: 'manage_conversation_tags', kind: 'crm', success: true },
        ],
        turnSummary: { status: 'answered', model: 'claude-haiku', turns: 2, toolsCalledCount: 2, tokens: { input: 4_812, output: 164, cacheRead: 3_900, cacheCreation: 0 } },
        guard: null,
      },
    },
  }))
  // Respostas rápidas (seção Transferência): uma de exemplo.
  rota('agents/builder/configs/:id/faqs', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/faqs$/.test(u), () => ({
    data: {
      data: [{
        id: 'faq-endereco', agent_id: 'ag-recepcao', name: 'Endereço e estacionamento', keywords: ['endereço', 'onde fica', 'estacionamento'],
        match_mode: 'any_keyword', response_template: 'Estamos na Rua XV de Novembro, 1200, sala 804, em Joinville. O prédio tem estacionamento com 2 h grátis validando na recepção.',
        priority: 0, enabled: true, cooldown_minutes: 60, created_at: hoursAgo(300), updated_at: hoursAgo(300),
      }],
    },
  }))
  // Skills (seção Capacidades, 27/09): a clínica da demo não usa skills n8n.
  rota('agents/builder/configs/:id/skills', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/skills$/.test(u), () => ({
    data: { data: [] },
  }))
  // A base de conhecimento (aba Conhecimento) — só o agente da história tem.
  rota('agents/builder/configs/:id/knowledge', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/knowledge$/.test(u), ({ url }) => ({
    data: { data: url.includes('/ag-recepcao/') ? CONHECIMENTO_RECEPCAO.map(({ content: _c, ...d }) => d) : [] },
  }))
  rota('agents/builder/configs/:id/knowledge/:doc', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+\/knowledge\/[^/]+$/.test(u), ({ url }) => ({
    data: { data: CONHECIMENTO_RECEPCAO.find((d) => d.id === url.split('/').pop()) ?? null },
  }))
  // O que do catálogo o agente pode citar (aba Catálogo).
  rota('agent-catalog/:id', (m, u) => m.toLowerCase() === 'get' && /^\/agent-catalog\/[^/]+$/.test(u), ({ url }) => ({
    data: url.endsWith('/ag-recepcao') ? HERO_PRODUCTS.filter((p) => (catalogoDoAgente ?? CATALOGO_RECEPCAO).includes(p.id)) : [],
  }))
  // Liberar um item para o agente (o cursor da cena "Ensinar a IA").
  rota('agent-catalog/:id (put)', (m, u) => m.toLowerCase() === 'put' && /^\/agent-catalog\/[^/]+$/.test(u), ({ url, body }) => {
    const ids = (body as { productIds?: string[] } | undefined)?.productIds ?? []
    if (url.endsWith('/ag-recepcao')) catalogoDoAgente = ids
    return { data: HERO_PRODUCTS.filter((p) => ids.includes(p.id)) }
  })
  rota('practitioners', (m, u) => m.toLowerCase() === 'get' && u.startsWith('/practitioners?'), () => ({ data: paginado(PROFISSIONAIS_DEMO) }))
  rota('agent-practitioner-catalog/:id', (m, u) => m.toLowerCase() === 'get' && /^\/agent-practitioner-catalog\/[^/]+$/.test(u), ({ url }) => ({
    data: url.endsWith('/ag-recepcao') ? PROFISSIONAIS_DEMO.filter((p) => PROFISSIONAIS_RECEPCAO.includes(p.id)) : [],
  }))

  // ── Linhas de WhatsApp ────────────────────────────────────────────────────
  // Sem linha conectada, Disparos e Modelos abrem com o bloqueio "Nenhuma
  // linha WhatsApp conectada" por cima de tudo.
  rota('meta/numbers', eq('get', '/meta/numbers'), () => ({ data: [HERO_LINE] }))
  rota('whatsapp/numbers', eq('get', '/whatsapp/numbers'), () => ({
    // O Agente Recepção atende a linha (é por isto que a fila do Dashboard
    // sabe o que a IA está cuidando).
    data: [{ ...HERO_LINE, qualityRating: 'GREEN', messagingLimit: 'TIER_10K', agentId: 'ag-recepcao', agentName: HERO.agent }],
  }))

  // ── Disparos ──────────────────────────────────────────────────────────────
  // O assistente "Nova campanha" (cena de Disparos da landing, 02/10): os
  // modelos aprovados e a sincronização com a Meta, que aqui não traz nada novo.
  rota('templates', eq('get', '/templates'), () => ({ data: [HERO_TEMPLATE] }))
  rota('templates/pull-from-meta', eq('post', '/templates/pull-from-meta'), () => ({
    data: { metaFetched: 1, imported: 0, updated: 0, errors: [] },
  }))
  rota('campaigns', eq('get', '/campaigns'), () => ({ data: { data: heroCampaigns(estado) } }))
  // "Criar e enviar agora" no assistente (cena de Disparos, 02/10): a campanha
  // criada é a da história, que entra no topo da lista saindo.
  // Os números são os da história (477 de 486): a lista guarda esta resposta, e
  // o relatório que o cursor abre em seguida lê dela — com números de "acabou
  // de sair", o funil contradizia as abas do próprio relatório.
  const campanhaSaindo = () => {
    const c = heroCampaigns(estado)[0]
    return { ...c, status: 'sending', sentAt: new Date().toISOString() }
  }
  rota('campaigns (post)', eq('post', '/campaigns'), () => ({ data: campanhaSaindo() }))
  rota('campaigns/:id/send', (m, u) => m.toLowerCase() === 'post' && /^\/campaigns\/[^/]+\/send$/.test(u), () => ({ data: campanhaSaindo() }))
  // O relatório real da campanha (`?report=`), aberto pela cena de Disparos.
  rota('campaigns/:id/analytics', (m, u) => m.toLowerCase() === 'get' && /^\/campaigns\/[^/]+\/analytics$/.test(u), () => ({
    data: ANALYTICS_RENOVACAO,
  }))
  rota('campaigns/:id/conversations', (m, u) => m.toLowerCase() === 'get' && /^\/campaigns\/[^/]+\/conversations$/.test(u), () => ({
    data: CONVERSAS_RENOVACAO,
  }))

  // Histórico de etapas do negócio da história (painel do negócio).
  rota('deals/:id/history', (m, u) => m.toLowerCase() === 'get' && /^\/deals\/[^/]+\/history$/.test(u), ({ url }) => {
    if (!url.includes('demo-deal-0')) return { data: [] }
    const deal = heroDeal(estado)
    // As mesmas linhas de `heroHistoricoGanho` (fonte única), cortadas no ponto
    // em que a história está: só o que já aconteceu.
    const linhas = heroHistoricoGanho().filter((h) =>
      h.id === 'h-1' || (h.id === 'h-2' && deal.stageId !== HERO_STAGE_QUALIFICACAO) || (h.id === 'h-3' && deal.status === 'won'))
    return { data: linhas }
  })

  rota('deals/:id', (m, u) => m.toLowerCase() === 'get' && /^\/deals\/(?!summary$|ai\/)[^/]+$/.test(u), ({ url }) => {
    const id = url.split('/').pop()
    return { data: Object.values(heroDealsByStage(estado)).flat().find((d) => d.id === id) ?? heroDeal(estado) }
  })
}
