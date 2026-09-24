import { rota } from './guards'
import {
  HERO_USER, heroContact, heroConversation, heroConversations,
} from '../components/landing/stage/hero/heroRealData'
import type { HeroState } from '../components/landing/stage/hero/heroStory'

/**
 * O BACKEND DE DEMONSTRAÇÃO — um banco em memória com um tenant fictício
 * completo, respondendo no formato exato dos tipos do app.
 *
 * O tenant **não se chama Oryon**: a Oryon é o fornecedor, e quem aparece na
 * demonstração é um cliente dela. Aqui é a **Loja Vida Natural**, a mesma
 * empresa da história da Marina, para a narrativa ser uma só em todos os
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

const TENANT = { id: 'demo-tenant', nome: 'Loja Vida Natural' }

function paginado<T>(itens: T[]) {
  return { data: itens, total: itens.length, page: 1, limit: 50, hasMore: false }
}

/** Casa `GET /caminho` exatamente, ignorando a query. */
const eq = (metodo: string, caminho: string) =>
  (m: string, u: string) => m.toLowerCase() === metodo && u === caminho

export function instalarBackendDemo() {
  // ── Sessão e tenant ────────────────────────────────────────────────────────
  rota('auth/me', eq('get', '/auth/me'), () => ({
    data: {
      ...HERO_USER,
      tenantId: TENANT.id,
      tenant: { id: TENANT.id, name: TENANT.nome },
      // Os flags que a demonstração precisa: múltiplos funis liga o módulo de
      // Funis e a seção de negócios do painel do contato.
      featureFlags: ['FF_MULTI_PIPELINE'],
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
}
