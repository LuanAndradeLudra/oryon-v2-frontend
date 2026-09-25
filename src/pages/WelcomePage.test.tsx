// Landing pública (SCRUM-1097, fase "porta de entrada"): renderiza sem crash, H1
// presente, nenhum link para rota inexistente, âncoras que resolvem, e a regra
// P14 na copy (zero número, sem vocabulário banido).
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WelcomePage } from './WelcomePage'
import * as copy from '@/components/landing/landingCopy'

/**
 * O palco do Hero monta os componentes REAIS de Conversas e Funis, e alguns
 * deles leem contexto do app: `ConversationItem` chama `useAuth` e
 * `useContextMenu`, `ContactPanel` chama `useCRMConfig`, `useTenantVocab` e
 * `useDealPanel` — os três primeiros lançam sem provedor.
 *
 * Em produção isso funciona porque os provedores do app envolvem TODAS as
 * rotas, inclusive as públicas (`App.tsx`). Aqui eles entram como stubs
 * DESLOGADOS, que é o estado do visitante. Vale como registro da dependência:
 * se a landing um dia sair de dentro dos provedores (pré-render, build
 * estático), é este bloco que precisa virar provedor de verdade.
 */
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: null, isAuthenticated: false, featureFlags: [], loading: false }),
}))
vi.mock('@/contexts/TenantVocabContext', () => ({
  TenantVocabProvider: ({ children }: { children: ReactNode }) => children,
  useTenantVocab: () => ({ vocab: {}, t: (x: string) => x }),
}))
vi.mock('@/contexts/CRMConfigContext', () => ({
  CRMConfigProvider: ({ children }: { children: ReactNode }) => children,
  useCRMConfig: () => ({ stages: [], pipelines: [], customFields: [], products: [], practitioners: [], loadingStages: false, loadingPipelines: false }),
}))
vi.mock('@/contexts/DealPanelContext', () => ({
  DealPanelProvider: ({ children }: { children: ReactNode }) => children,
  useDealPanel: () => ({ openDeal: () => {}, closeDeal: () => {} }),
}))
vi.mock('@/hooks/useContextMenu', () => ({
  useContextMenu: () => ({ onContextMenu: () => {} }),
}))

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: /min-width/.test(query), media: query,
  addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {},
  onchange: null, dispatchEvent: () => false,
}))

// As seções abaixo do Hero revelam ao rolar (`whileInView`) e os recortes da
// demo montam por visibilidade — o jsdom não tem IntersectionObserver.
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <WelcomePage />
    </MemoryRouter>,
  )
}

/** Rotas reais que a landing pode apontar. Só a entrada do app. */
const ROTAS_VALIDAS = new Set(['/login'])

describe('WelcomePage', () => {
  it('renderiza sem crash com o H1 de 4 palavras (medição Attio 24/09: svh sozinho só funciona com H1 curto)', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Seu WhatsApp atende sozinho.')
    // ≤ 10 palavras (checklist anti-genérico) — bem abaixo, de propósito
    expect(h1.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(10)
  })

  it('o lead carrega a 2ª metade da mensagem que saiu do H1', () => {
    renderPage()
    expect(screen.getByText(/O humano entra na hora certa/)).toBeInTheDocument()
  })

  it('tem as seções na escada de consciência: nav · hero · plataforma · implantação · limites da IA · perguntas · cta · footer', async () => {
    const { container } = renderPage()
    // As seções abaixo do Hero chegam por lazy import.
    await screen.findByText(copy.fecho.title, undefined, { timeout: 8000 })
    const seções = Array.from(container.querySelectorAll('[data-section]')).map((el) => el.getAttribute('data-section'))
    expect(seções).toEqual(['nav', 'hero', 'plataforma', 'implantacao', 'confianca', 'perguntas', 'cta', 'footer'])
  })

  it('o contêiner rola (h-screen overflow-y-auto) — o root do App é overflow hidden', () => {
    const { container } = renderPage()
    const root = container.querySelector('[data-landing-root]')!
    expect(root.className).toContain('h-screen')
    expect(root.className).toContain('overflow-y-auto')
  })

  it('CTAs: a conversa comercial é o CTA principal; "Entrar"/"Já sou cliente" (→ /login) para quem já usa — o hero não tem botões', async () => {
    renderPage()
    await screen.findByText(copy.fecho.title, undefined, { timeout: 8000 })
    const entrar = [
      ...screen.getAllByRole('link', { name: 'Entrar' }),
      screen.getByRole('link', { name: copy.fecho.entrar }),
    ]
    expect(entrar).toHaveLength(3) // nav, fecho, rodapé
    const contato = screen.getAllByRole('link', { name: new RegExp(copy.contato.cta + '|' + copy.contato.ctaLongo) })
    expect(contato.length).toBeGreaterThanOrEqual(4) // nav, plataforma, implantação, perguntas, fecho
    contato.forEach((a) => expect(a).toHaveAttribute('href', copy.linkContato()))
    entrar.forEach((a) => expect(a).toHaveAttribute('href', '/login'))
    expect(screen.queryByRole('link', { name: 'Ver o produto' })).toBeNull()
  })

  it('nenhum link para rota inexistente: só /login, âncoras que existem na página e o WhatsApp comercial', async () => {
    const { container } = renderPage()
    await screen.findByText(copy.fecho.title, undefined, { timeout: 8000 })
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      const href = a.getAttribute('href')
      expect(href, `<a> sem href: "${a.textContent}"`).toBeTruthy()
      expect(href).not.toBe('#')
      expect(href).not.toMatch(/pricing/i)
      if (href!.startsWith('https://wa.me/')) continue // o único externo: a conversa comercial
      expect(href).not.toMatch(/^https?:/) // sem redes sociais
      if (href!.startsWith('#')) {
        expect(container.querySelector(href!), `âncora sem alvo: ${href}`).not.toBeNull()
      } else {
        expect(ROTAS_VALIDAS.has(href!), `rota fora da lista: ${href}`).toBe(true)
      }
    }
  })

  it('sem botão morto: todo <button> tem nome acessível e (o de tema) age', () => {
    renderPage()
    const nav = screen.getByRole('banner')
    const tema = within(nav).getByRole('button', { name: 'Alternar tema claro e escuro' })
    expect(tema).toBeEnabled()
    for (const b of screen.getAllByRole('button')) {
      expect(b.getAttribute('aria-label') || b.textContent?.trim(), 'botão sem nome').toBeTruthy()
    }
  })

  it('não vende o que não existe: sem planos, preços, depoimentos nem módulos desligados', async () => {
    const { container } = renderPage()
    await screen.findByText(copy.fecho.title, undefined, { timeout: 8000 })
    // O palco do hero e os visuais da Plataforma (aria-hidden) mostram os dados
    // da empresa FICTÍCIA da demo, que vende "planos" — aqui vale só a copy.
    const clone = container.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[role="region"], [role="img"], [aria-hidden="true"]').forEach((el) => el.remove())
    const texto = clone.textContent ?? ''
    for (const proibido of [
      /planos?\b/i, /pre[çc]os?\b/i, /depoiment/i, /AI-powered/i,
      /agendament/i, /conectores?\b/i, /copilot/i, /automa[çc][õo]es\b/i, /marketing/i, /nexus/i,
      /\bbots?(?![\wÀ-ÿ])/i, // P15: Agente IA, nunca "bot" (o \b do JS não conhece acento: "botões" casaria)
    ]) {
      expect(texto, `texto banido: ${proibido}`).not.toMatch(proibido)
    }
  })
})

describe('landingCopy (P14: zero número)', () => {
  /** Percorre todas as strings da copy. */
  function strings(v: unknown, path = 'copy'): Array<[string, string]> {
    if (typeof v === 'string') return [[path, v]]
    if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`))
    if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => strings(x, `${path}.${k}`))
    return []
  }

  it('nenhuma frase tem dígito — exceto o ano do © do rodapé e o prazo de implantação ("até 7 dias", autorizado pelo PO)', () => {
    const todas = strings({
      nav: copy.nav, hero: copy.hero, plataforma: copy.plataforma, implantacao: copy.implantacao,
      trust: copy.trust, perguntas: copy.perguntas, fecho: copy.fecho, footer: copy.footer,
      contato: { mensagem: copy.contato.mensagem, cta: copy.contato.cta, ctaLongo: copy.contato.ctaLongo },
    })
    for (const [path, texto] of todas) {
      if (path === 'copy.footer.legal') {
        expect(texto).toBe('© 2026 Oryon')
        continue
      }
      expect(texto.replace(/até 7 dias/gi, ''), `dígito em ${path}`).not.toMatch(/\d/)
    }
  })
})
