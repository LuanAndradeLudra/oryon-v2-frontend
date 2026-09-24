import { rota } from './guards'
import {
  HERO_CONTACT_STAGES, HERO_LINE, HERO_PIPELINE, HERO_PIPELINE_STAGES, HERO_PRODUCTS, HERO_TAGS, HERO_USER,
  heroCampaigns, heroContact, heroConversation, heroConversations, heroDeal, heroDealsByStage, heroMessages,
  heroNotifications, heroTimeline,
} from '../components/landing/stage/hero/heroRealData'
import type { HeroState } from '../components/landing/stage/hero/heroStory'
import { AGENTES_DEMO, agenteComFerramentas } from './agentesDemo'

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
const TENANT = { id: 'demo-tenant', nome: 'Vértice Software' }

function daysAgoIso(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString()
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
  rota('conversations', eq('get', '/conversations'), () => {
    const lista = heroConversations(estado)
    return {
      data: {
        ...paginado(lista),
        statusCounts: { open: lista.length, pending: 0, resolved: 0, abandoned: 0 },
        needsReviewCount: 0,
      },
    }
  })

  rota('conversations/unread-total', eq('get', '/conversations/unread-total'), () => ({
    data: { totalUnread: 0 },
  }))

  // ── Equipe e contatos ─────────────────────────────────────────────────────
  rota('users', eq('get', '/users'), () => ({ data: [HERO_USER] }))

  rota('contacts', eq('get', '/contacts'), () => ({
    data: paginado(heroConversations(estado).map((c) => c.contact)),
  }))

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
            errorMessage: e.errorMessage, agentId: 'ag-vendas', agentName: e.agentName, createdAt: e.createdAt,
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
  rota('agents/builder/configs/:id', (m, u) => m.toLowerCase() === 'get' && /^\/agents\/builder\/configs\/[^/]+$/.test(u), ({ url }) => ({
    data: { data: agenteComFerramentas(url.split('/').pop()!) },
  }))

  // ── Linhas de WhatsApp ────────────────────────────────────────────────────
  // Sem linha conectada, Disparos e Modelos abrem com o bloqueio "Nenhuma
  // linha WhatsApp conectada" por cima de tudo.
  rota('meta/numbers', eq('get', '/meta/numbers'), () => ({ data: [HERO_LINE] }))
  rota('whatsapp/numbers', eq('get', '/whatsapp/numbers'), () => ({
    data: [{ ...HERO_LINE, qualityRating: 'GREEN', messagingLimit: 'TIER_10K' }],
  }))

  // ── Disparos ──────────────────────────────────────────────────────────────
  rota('campaigns', eq('get', '/campaigns'), () => ({ data: { data: heroCampaigns(estado) } }))

  // Histórico de etapas do negócio da história (painel do negócio).
  rota('deals/:id/history', (m, u) => m.toLowerCase() === 'get' && /^\/deals\/[^/]+\/history$/.test(u), ({ url }) => {
    if (!url.includes('demo-deal-0')) return { data: [] }
    const deal = heroDeal(estado)
    const linhas = [{
      id: 'h-1', fromStageId: 'ps-entrada', fromStageLabel: 'Entrada', toStageId: 'ps-qualificacao',
      toStageLabel: 'Qualificação', movedByKind: 'user', movedByActorName: 'Ana Prado', createdAt: daysAgoIso(2),
    }]
    if (deal.stageId !== 'ps-qualificacao') linhas.unshift({
      id: 'h-2', fromStageId: 'ps-qualificacao', fromStageLabel: 'Qualificação', toStageId: 'ps-proposta',
      toStageLabel: 'Proposta', movedByKind: 'ai', movedByActorName: 'Agente Vendas', createdAt: new Date().toISOString(),
    })
    if (deal.status === 'won') linhas.unshift({
      id: 'h-3', fromStageId: 'ps-proposta', fromStageLabel: 'Proposta', toStageId: 'ps-ganho',
      toStageLabel: 'Ganho', movedByKind: 'user', movedByActorName: 'Ana Prado', createdAt: new Date().toISOString(),
    })
    return { data: linhas }
  })

  rota('deals/:id', (m, u) => m.toLowerCase() === 'get' && /^\/deals\/(?!summary$|ai\/)[^/]+$/.test(u), ({ url }) => {
    const id = url.split('/').pop()
    return { data: Object.values(heroDealsByStage(estado)).flat().find((d) => d.id === id) ?? heroDeal(estado) }
  })
}
