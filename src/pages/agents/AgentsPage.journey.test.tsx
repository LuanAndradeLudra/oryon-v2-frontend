// Jornada "criar agente" nos DOIS caminhos da página de Agentes (A1/SCRUM-1012).
//
// Existe por causa de uma regressão real: ao virar roteador entre Deck e Lista,
// a AgentsPage perdeu o `setSelectedAgent(agent)` que rodava ao concluir o
// wizard. O agente entrava na lista e o detalhe ficava em "Selecione um
// agente". Nenhum teste pegou porque o que se perdeu numa extração mecânica não
// é JSX — é o que não tem representação visual, e a suíte da época só olhava
// componentes isolados.
//
// O que estes testes fixam é o FIM DO FLUXO, não a implementação: concluir uma
// criação tem que levar a algum lugar em cada view. Lista → o agente novo
// aparece selecionado no detalhe. Deck → navega para o workspace dele.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { TopBarActionsProvider, useTopBarActions } from '@/contexts/TopBarActionsContext'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

const navigate = vi.fn()
let onCreatedRef: ((a: AgentConfigWithTools) => void) | null = null

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', tenantId: 't1' } }),
}))

vi.mock('@/services/companyContextService', () => ({
  loadHub: () => null,
}))

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

vi.mock('@/hooks/useDesktopRecommendedBanner', () => ({
  useDesktopRecommendedBanner: () => ({ visible: false, dismiss: vi.fn() }),
}))

const EXISTENTE: AgentConfig = {
  id: 'a-existente',
  tenant_id: 't1',
  created_by: null,
  name: 'Sofia',
  icon: 'bot',
  sector: 'Vendas',
  objective: null,
  status: 'active',
  system_prompt: '',
  handoff_rules: {} as AgentConfig['handoff_rules'],
  channels: {},
  wizard_config: {},
  test_count: 0,
  last_tested_at: null,
  conversation_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as AgentConfig

const NOVO = { ...EXISTENTE, id: 'a-novo', name: 'Agente Novo' } as AgentConfigWithTools

vi.mock('@/services/agentsApi', () => ({
  listAgents: () => Promise.resolve([EXISTENTE]),
  updateAgent: () => Promise.resolve(EXISTENTE),
  getAgent: (id: string) => Promise.resolve({ ...EXISTENTE, id }),
}))

// O wizard real tem 8 etapas, geração de prompt e chamada de rede. O que a
// jornada precisa dele é só o instante em que ele devolve o agente criado.
vi.mock('@/components/agents/studio/AgentBuilderWizard', () => ({
  AgentBuilderWizard: ({ onCreated }: { onCreated: (a: AgentConfigWithTools) => void }) => {
    onCreatedRef = onCreated
    return <button onClick={() => onCreated(NOVO)}>concluir-wizard</button>
  },
}))

// O Deck busca dados do BE.7 no mount; a jornada do Deck é sobre para onde a
// página leva, não sobre o que a grade desenha.
vi.mock('@/components/agents/deck/CommandDeck', () => ({
  CommandDeck: () => <div>deck-grade</div>,
}))

// O detalhe real monta abas, ferramentas e prompt. Aqui ele serve de sonda:
// diz QUAL agente está selecionado.
vi.mock('@/components/agents/AgentDetail', () => ({
  AgentDetail: ({ agent }: { agent: { name: string } }) => <div>detalhe: {agent.name}</div>,
}))

import { AgentsPage } from './AgentsPage'

// A toolbar (Deck/Lista + "Novo agente") não é filha da página: a página a
// registra no TopBar por contexto. Sem renderizar o slot, não há como clicar
// nela — foi assim que o Lince alcançou o botão na sonda dele.
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

describe('AgentsPage · jornada de criação', () => {
  beforeEach(() => {
    navigate.mockClear()
    onCreatedRef = null
  })

  // Na A1 este caso afirmava o oposto: a Lista tinha painel de detalhe ao lado
  // e concluir o wizard SELECIONAVA o agente ali, sem navegar. A A4 eliminou o
  // painel — a Lista virou triagem e a configuração foi para o Workspace — e
  // com ele a seleção que a regressão do #129 tinha derrubado. O que o teste
  // protege continua sendo o mesmo: concluir uma criação leva a algum lugar.
  it('Lista: concluir navega para o workspace do agente novo', async () => {
    renderPage()
    await screen.findByText('deck-grade')

    fireEvent.click(screen.getByText('Lista'))
    fireEvent.click(screen.getByText('Novo agente'))
    fireEvent.click(await screen.findByText('concluir-wizard'))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/agents/a-novo/overview')
    })
  })

  it('Lista: o agente novo entra na lista, não só na navegação', async () => {
    renderPage()
    await screen.findByText('deck-grade')

    fireEvent.click(screen.getByText('Lista'))
    fireEvent.click(screen.getByText('Novo agente'))
    fireEvent.click(await screen.findByText('concluir-wizard'))

    expect(await screen.findByText('Agente Novo')).toBeInTheDocument()
  })

  it('Deck: concluir navega para o workspace do agente novo', async () => {
    renderPage()
    await screen.findByText('deck-grade')

    fireEvent.click(screen.getByText('Novo agente'))
    fireEvent.click(await screen.findByText('concluir-wizard'))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/agents/a-novo/overview')
    })
  })

  it('Deck: navega para o agente CRIADO, não para um id qualquer da lista', async () => {
    renderPage()
    await screen.findByText('deck-grade')

    fireEvent.click(screen.getByText('Novo agente'))
    await waitFor(() => expect(onCreatedRef).toBeTruthy())
    onCreatedRef?.({ ...NOVO, id: 'a-outro', name: 'Outro' } as AgentConfigWithTools)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/agents/a-outro/overview')
    })
    expect(navigate).not.toHaveBeenCalledWith('/agents/a-existente/overview')
  })
})
