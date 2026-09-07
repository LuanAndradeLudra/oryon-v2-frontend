// A FIAÇÃO da galeria de arquétipos (A5/SCRUM-1016) na página de Agentes.
//
// Por que este arquivo existe: a A5 mesclou 4 suítes e ~974 linhas de galeria
// que NINGUÉM montava — só os testes dela importavam `archetypes/**`. Código
// coberto e desligado passa nos gates e não existe na tela. O que estes casos
// travam é exatamente o fio: quem monta a galeria, e o que a escolha carrega
// até o Studio.
//
// A escolha só vale se o rascunho CHEGAR. Por isso o wizard aqui é uma sonda
// que publica o `inicial` recebido: um "Usar este arquétipo" que abre o Studio
// em branco seria indistinguível do "Começar do zero" — um botão que mente.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { TopBarActionsProvider, useTopBarActions } from '@/contexts/TopBarActionsContext'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import type { WizardData } from '@/components/agents/studio/types'
import { ARCHETYPES } from '@/components/agents/archetypes/archetypes'
import { applyArchetype } from '@/components/agents/archetypes/applyArchetype'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', tenantId: 't1' } }) }))
vi.mock('@/services/companyContextService', () => ({ loadHub: () => null }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useDesktopRecommendedBanner', () => ({
  useDesktopRecommendedBanner: () => ({ visible: false, dismiss: vi.fn() }),
}))

const EXISTENTE = {
  id: 'a-existente', tenant_id: 't1', created_by: null, name: 'Sofia', icon: 'bot',
  sector: 'Vendas', objective: null, status: 'active', system_prompt: '',
  handoff_rules: {} as AgentConfig['handoff_rules'], channels: {}, wizard_config: {},
  test_count: 0, last_tested_at: null, conversation_count: 0,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
} as AgentConfig

// A lista muda por teste: a galeria é a tela do tenant SEM agente nenhum.
let listaDeAgentes: AgentConfig[] = []
vi.mock('@/services/agentsApi', () => ({
  listAgents: () => Promise.resolve(listaDeAgentes),
  updateAgent: () => Promise.resolve(EXISTENTE),
  getAgent: (id: string) => Promise.resolve({ ...EXISTENTE, id }),
}))

// Sonda: o wizard real tem 8 etapas e rede. O que a fiação precisa dele é uma
// coisa só — QUAL rascunho de partida ele recebeu.
let inicialRecebido: Partial<WizardData> | undefined
let montagens = 0
vi.mock('@/components/agents/studio/AgentBuilderWizard', () => ({
  AgentBuilderWizard: ({ inicial, onClose }: {
    inicial?: Partial<WizardData>
    onClose: () => void
    onCreated: (a: AgentConfigWithTools) => void
  }) => {
    inicialRecebido = inicial
    montagens += 1
    return <button onClick={onClose}>fechar-wizard</button>
  },
}))

vi.mock('@/components/agents/deck/CommandDeck', () => ({ CommandDeck: () => <div>deck-grade</div> }))
vi.mock('@/components/agents/AgentDetail', () => ({ AgentDetail: () => <div>detalhe</div> }))

import { AgentsPage } from './AgentsPage'

function TopBarSlot() {
  const { pageActions } = useTopBarActions()
  return <div data-testid="topbar">{pageActions}</div>
}

function renderPage() {
  return render(
    <ContextMenuProvider>
      <TopBarActionsProvider>
        <TopBarSlot />
        <AgentsPage />
      </TopBarActionsProvider>
    </ContextMenuProvider>,
  )
}

const VENDAS = ARCHETYPES[0]

describe('AgentsPage · galeria de arquétipos no estado vazio', () => {
  beforeEach(() => {
    navigate.mockClear()
    inicialRecebido = undefined
    montagens = 0
    listaDeAgentes = []
  })

  it('sem nenhum agente, a rota mostra a galeria — não o vazio com botão', async () => {
    renderPage()
    expect(await screen.findByText(/Que tipo de atendimento você quer automatizar/i)).toBeInTheDocument()
    // Os três cards do mockup, pelo nome de cada arquétipo.
    for (const a of ARCHETYPES) expect(screen.getByText(a.nome)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Usar este arquétipo/i })).toHaveLength(ARCHETYPES.length)
  })

  it('escolher um arquétipo abre o Studio com o rascunho DELE, não em branco', async () => {
    renderPage()
    await screen.findByText(VENDAS.nome)

    // O primeiro card é o Vendas (ordem do mockup, travada em archetypes.test).
    fireEvent.click(screen.getAllByRole('button', { name: /Usar este arquétipo/i })[0])

    expect(await screen.findByText('fechar-wizard')).toBeInTheDocument()
    expect(inicialRecebido).toBeDefined()
    // Comparado contra `applyArchetype`, não contra valores repetidos à mão:
    // o que este teste guarda é o TRANSPORTE. Se o conteúdo do arquétipo mudar,
    // quem tem de acusar é `applyArchetype.test`, não este arquivo.
    const esperado = applyArchetype(VENDAS)
    expect(inicialRecebido?.sector).toBe(esperado.sector)
    expect(inicialRecebido?.tone).toBe(esperado.tone)
    expect(inicialRecebido?.can_do).toEqual(esperado.can_do)
    expect(inicialRecebido?.handoff_rules).toHaveLength(esperado.handoff_rules.length)
    expect(inicialRecebido?.crm_capabilities?.capabilities).toHaveLength(
      esperado.crm_capabilities.capabilities.length,
    )
  })

  it('"Começar do zero no Studio" abre o mesmo Studio, sem rascunho', async () => {
    renderPage()
    await screen.findByText(VENDAS.nome)

    fireEvent.click(screen.getByRole('button', { name: /Começar do zero no Studio/i }))

    expect(await screen.findByText('fechar-wizard')).toBeInTheDocument()
    expect(inicialRecebido).toBeUndefined()
  })

  it('depois de criar pela galeria, o "Novo agente" da barra volta em branco', async () => {
    renderPage()
    await screen.findByText(VENDAS.nome)

    fireEvent.click(screen.getAllByRole('button', { name: /Usar este arquétipo/i })[0])
    await screen.findByText('fechar-wizard')
    expect(inicialRecebido, 'pré-condição: o rascunho do arquétipo tem de chegar').toBeDefined()

    // Fecha o Studio. A galeria continua na tela (o agente não foi criado), mas
    // agora a criação parte da barra, que abre sem arquétipo.
    fireEvent.click(screen.getByText('fechar-wizard'))
    fireEvent.click(screen.getByRole('button', { name: /Novo agente/i }))

    expect(await screen.findByText('fechar-wizard')).toBeInTheDocument()
    // Remontou de verdade — `useStudioDraft` só lê `inicial` no primeiro
    // render, então reaproveitar a instância deixaria o rascunho velho de pé.
    expect(montagens).toBeGreaterThan(1)
    expect(inicialRecebido).toBeUndefined()
  })

  it('com agente na casa, não há galeria: "Novo agente" abre em branco', async () => {
    listaDeAgentes = [EXISTENTE]
    renderPage()

    expect(await screen.findByText('deck-grade')).toBeInTheDocument()
    expect(screen.queryByText(/Que tipo de atendimento/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Novo agente/i }))
    expect(await screen.findByText('fechar-wizard')).toBeInTheDocument()
    expect(inicialRecebido).toBeUndefined()
  })
})
