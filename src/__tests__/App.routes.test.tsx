// SCRUM-994/W0.1 — cobre a reachability dos esqueletos novos (rotas +
// páginas) e o redirect /agents/:id → /agents/:id/overview. Não testa o
// conteúdo real de AgentDetail/CampaignsTab (fora do escopo desta história —
// são mockados aqui como stubs).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// ── Mocks compartilhados com smoke.test.tsx (mesmo padrão) ──────────────────

vi.mock('@/services/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(), off: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), connected: false,
  })),
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  joinConversation: vi.fn(),
  leaveConversation: vi.fn(),
  joinChannel: vi.fn(),
  leaveChannel: vi.fn(),
}))

const mockAuthValue = {
  user: { id: 'u1', tenantId: 't1', email: 'admin@test.local', role: 'business_admin', firstName: 'Admin', lastName: 'Teste' },
  token: 'fake-token',
  requiresPasswordChange: false,
  organizationConfigured: true,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  completePasswordChange: vi.fn(),
  completeOnboarding: vi.fn(),
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contexts/CRMConfigContext', () => ({
  CRMConfigProvider: ({ children }: { children: ReactNode }) => children,
  useCRMConfig: () => ({ config: {}, loading: false }),
}))

vi.mock('@/contexts/TenantVocabContext', () => ({
  TenantVocabProvider: ({ children }: { children: ReactNode }) => children,
  useTenantVocab: () => ({ vocab: {} }),
}))

vi.mock('@/contexts/CopilotContext', () => ({
  CopilotProvider: ({ children }: { children: ReactNode }) => children,
  useCopilot: () => ({ isOpen: false, toggle: vi.fn() }),
}))

// Normalmente montado dentro do AppShell real (mockado como passthrough
// abaixo) — sem isso, useWorkspaceNumber() (usado por ListView de verdade
// desde a W0.4/SCRUM-997) quebra com "must be used within
// <WorkspaceNumberProvider>".
vi.mock('@/contexts/WorkspaceNumberContext', () => ({
  WorkspaceNumberProvider: ({ children }: { children: ReactNode }) => children,
  useWorkspaceNumber: () => ({ numbers: [], findById: () => null, refresh: vi.fn(), loading: false }),
}))

vi.mock('@/contexts/InternalChatContext', () => ({
  InternalChatProvider: ({ children }: { children: ReactNode }) => children,
  useInternalChat: () => ({ messages: [] }),
}))

vi.mock('@/components/copilot/CopilotPanel', () => ({
  CopilotPanel: () => null,
}))

// AppShell (TopBar + NavSidebar) fica fora de escopo aqui — a checagem de
// destaque do sidebar nas rotas aninhadas foi feita por inspeção de código
// (NavSidebar/TopBar usam `'/' + pathname.split('/')[1]`, já cobre rotas
// aninhadas sem mudança nenhuma) + checagem visual ao vivo.
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/onboarding/SetupWizard', () => ({
  SetupWizard: () => <div>Setup Wizard</div>,
}))

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      create: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
      })),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    },
  }
})

vi.mock('@/services/appLogger', () => ({
  appLogger: {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    logActivity: vi.fn(),
  },
}))

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), fill: vi.fn(), save: vi.fn(), restore: vi.fn(), rotate: vi.fn(), translate: vi.fn(),
  scale: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  arc: vi.fn(), closePath: vi.fn(), setTransform: vi.fn(), resetTransform: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
  filter: 'none', shadowBlur: 0, shadowColor: '', shadowOffsetX: 0, shadowOffsetY: 0,
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

// ── Mocks específicos das rotas de Agentes/Disparos ─────────────────────────

const mockAgent = {
  id: 'agent-1',
  tenant_id: 't1',
  created_by: null,
  name: 'Agente de teste',
  icon: 'bot',
  sector: null,
  objective: null,
  status: 'active' as const,
  system_prompt: 'x',
  handoff_rules: { rules: [] },
  channels: {},
  wizard_config: {},
  test_count: 0,
  last_tested_at: null,
  conversation_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  tools: [],
}

vi.mock('@/services/agentsApi', () => ({
  listAgents: vi.fn().mockResolvedValue([]),
  getAgent: vi.fn().mockResolvedValue(mockAgent),
  updateAgent: vi.fn().mockResolvedValue(mockAgent),
}))

vi.mock('@/services/companyContextService', () => ({
  loadHub: vi.fn().mockReturnValue(null),
  isAgentStale: vi.fn().mockReturnValue(false),
}))

vi.mock('@/components/agents/studio/AgentBuilderWizard', () => ({
  AgentBuilderWizard: () => null,
}))

vi.mock('@/components/agents/AgentDetail', () => ({
  AgentDetail: ({ agent }: { agent: { id: string } }) => (
    <div data-testid="agent-detail">AgentDetail:{agent.id}</div>
  ),
}))

// CampaignWizard e CampaignReport sao montados pelo ListView real. Os dois
// puxam recharts, que sozinho responde pela maior parte do tempo desta
// suite e faz a duracao oscilar de ~33s a ~85s conforme a carga da maquina
// — foi essa oscilacao que produziu as falhas intermitentes de hoje. Nenhum
// dos dois faz parte do que esta sob teste aqui (roteamento), entao ambos
// entram como stub.
vi.mock('@/components/campaigns/CampaignWizard', () => ({
  CampaignWizard: () => <div>CampaignWizard-stub</div>,
}))

vi.mock('@/components/campaigns/CampaignReport', () => ({
  CampaignReport: () => <div>CampaignReport-stub</div>,
}))

vi.mock('@/components/campaigns/TemplatesTab', () => ({
  TemplatesTab: () => <div>TemplatesTab-stub</div>,
}))

vi.mock('@/components/campaigns/AttributionTab', () => ({
  AttributionTab: () => <div>AttributionTab-stub</div>,
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

async function renderAt(path: string) {
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  return render(<App />)
}

// ── Testes ───────────────────────────────────────────────────────────────────

// Timeout maior que o default (5s) — o primeiro import dinâmico de cada
// página nesta suíte transforma árvores grandes (AgentsPage → AgentDetail
// etc.), mesmo com os componentes pesados mockados; a máquina compartilhada
// também tem contenção real de CPU com o squad todo rodando em paralelo.
const SLOW = 30_000

describe('App routes — SCRUM-994/W0.1', () => {
  it('mantém /agents alcançável (URL antiga intacta)', async () => {
    await renderAt('/agents')
    expect(await screen.findByText(/Nenhum agente ainda/i)).toBeInTheDocument()
  }, SLOW)

  it('mantém /campaigns alcançável, view padrão = list (CampaignsPage → ListView real, SCRUM-997/W0.4)', async () => {
    await renderAt('/campaigns')
    // ListView é o componente real (não mais um wrapper mockável de
    // CampaignsTab, removido — a extração da W0.4 tornou o antigo stub
    // dela código morto); com campanhas=[] (axios mockado), renderiza o
    // EmptyState. O timeout SLOW fica no próprio findByText (não só no
    // `it`) porque esta é a primeira rota da suíte a montar a árvore de
    // campaigns/ e a janela padrão de 1s do testing-library estoura antes
    // do import dinâmico + efeito assentarem — mesmo com CampaignWizard e
    // CampaignReport mockados acima.
    expect(await screen.findByText(/Nenhuma campanha de disparo encontrada/i, {}, { timeout: SLOW })).toBeInTheDocument()
  }, SLOW)

  it('/campaigns?view=agenda mostra o esqueleto da Agenda', async () => {
    await renderAt('/campaigns?view=agenda')
    expect(await screen.findByText(/Agenda em construção/i)).toBeInTheDocument()
  })

  it('/campaigns?view=board mostra o esqueleto do Board', async () => {
    await renderAt('/campaigns?view=board')
    expect(await screen.findByText(/Board em construção/i)).toBeInTheDocument()
  })

  it('/campaigns/new mostra o esqueleto do Composer', async () => {
    await renderAt('/campaigns/new')
    expect(await screen.findByText(/Composer em construção/i)).toBeInTheDocument()
  })

  it('/campaigns/:id/edit reusa o esqueleto do Composer', async () => {
    await renderAt('/campaigns/abc/edit')
    expect(await screen.findByText(/Composer em construção/i)).toBeInTheDocument()
  })

  // Atualizado pelo D3 (SCRUM-1022): esta asserção cobria o esqueleto do W0.1
  // ("Relatório em construção"), que era o placeholder à espera desta
  // história. Com a página real no lugar, o que a rota tem de provar continua
  // sendo reachability — só que agora contra o conteúdo de verdade.
  // Usa o mesmo `SLOW` das outras rotas desta suíte: a página real tem um
  // grafo de módulos bem maior que o esqueleto e a rota é `lazy`, então com a
  // suíte inteira em paralelo o `import()` do chunk estoura os 5s padrão e o
  // teste morre no fallback de Suspense. Isolado, passa em menos de 1s.
  it('/campaigns/:id/report monta a página de Relatório', async () => {
    await renderAt('/campaigns/abc/report')
    expect(await screen.findByText(/Funil de entrega/i)).toBeInTheDocument()
  }, SLOW)

  it('/agents/new mostra o esqueleto do Studio', async () => {
    await renderAt('/agents/new')
    expect(await screen.findByText(/Studio em construção/i)).toBeInTheDocument()
  })

  it('/agents/handoffs mostra o esqueleto da Caixa de transferências', async () => {
    await renderAt('/agents/handoffs')
    expect(await screen.findByText(/Caixa de transferências em construção/i)).toBeInTheDocument()
  })

  it('/agents/:id redireciona para /agents/:id/overview e monta o Workspace', async () => {
    await renderAt('/agents/agent-1')
    await waitFor(() => expect(window.location.pathname).toBe('/agents/agent-1/overview'))
    // A2/SCRUM-1013: a página deixou de delegar ao AgentDetail e passou a
    // montar o layout do Workspace, então o `data-testid="agent-detail"` do
    // mock não existe mais aqui. A asserção nova olha a nav de seções e QUAL
    // seção está corrente — é mais forte que a antiga, porque verifica que a
    // URL realmente comanda a UI em vez de só confirmar que algo renderizou.
    // `findBy*` tem timeout PROPRIO de 1s, independente do SLOW do teste: esta
    // rota faz redirect + import dinamico + getAgent async, e sob contencao a
    // nav nao aparece dentro de 1s. Sem o timeout explicito o teste fica
    // intermitente (reproduzido: passa e falha alternando, mesmo codigo).
    expect(await screen.findByRole('navigation', { name: 'Seções do agente' }, { timeout: SLOW })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Visão geral', current: 'page' }, { timeout: SLOW })).toBeInTheDocument()
  })

  it('/agents/:id/:section com seção desconhecida redireciona para overview', async () => {
    await renderAt('/agents/agent-1/nao-existe')
    await waitFor(() => expect(window.location.pathname).toBe('/agents/agent-1/overview'))
  })

  it('/agents/:id/:section com seção válida monta o Workspace direto', async () => {
    await renderAt('/agents/agent-1/rules')
    expect(window.location.pathname).toBe('/agents/agent-1/rules')
    // Mesma troca do teste acima: a seção da URL tem que ser a corrente na
    // nav — aqui "Regras", não a default.
    expect(await screen.findByRole('link', { name: 'Regras', current: 'page' }, { timeout: SLOW })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current')
  })
})
