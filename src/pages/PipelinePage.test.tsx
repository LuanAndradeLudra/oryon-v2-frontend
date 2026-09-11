// D2 (SCRUM-935) — rota /pipelines/:id com abas Board/Relatórios: navegação
// até a página, troca de aba via querystring e fallback de id inválido/
// arquivado pro funil padrão (mesma regra que o antigo /contacts?pipeline=
// já tinha). Board e Relatórios têm cobertura própria — aqui mockados.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { PipelinePage } from './PipelinePage'
import { pipelinesApi } from '@/services/api'
import type { Pipeline } from '@/types'

vi.mock('@/services/api', () => ({
  pipelinesApi: { list: vi.fn() },
}))

// A página passou a abrir a ficha do negócio quando chega com `?deal=` — o
// painel é um portal global, então aqui basta o espião.
const { openDeal } = vi.hoisted(() => ({ openDeal: vi.fn() }))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))
vi.mock('@/components/deals/PipelineBoardTab', () => ({
  PipelineBoardTab: ({ pipeline, search, novoNegocioEtapaId }: { pipeline: Pipeline; search?: string; novoNegocioEtapaId?: string | null }) => (
    <div data-testid="board-tab">
      board de {pipeline.name}
      <span data-testid="board-search-recebida">{search ?? ''}</span>
      <span data-testid="board-nova-etapa">{novoNegocioEtapaId ?? ''}</span>
    </div>
  ),
}))
// O painel de configuração monta a tela inteira de Funis (contexto de CRM,
// APIs, sub-gerenciadores). Aqui interessa se ele ABRE e com que URL — o
// conteúdo tem cobertura própria em FunnelsSettings.test.
vi.mock('@/components/deals/FunnelsConfigDrawer', () => ({
  FunnelsConfigDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="funnels-config-drawer">config</div> : null,
}))
vi.mock('@/components/deals/reports/PipelineReportsTab', () => ({
  PipelineReportsTab: ({ pipeline }: { pipeline: Pipeline }) => <div data-testid="reports-tab">relatórios de {pipeline.name}</div>,
}))

const pipeline = (over: Partial<Pipeline>): Pipeline => ({
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#14b8a6', order: 0, isDefault: true, isArchived: false, stages: [], openDealsCount: 0,
  ...over,
} as Pipeline)

function Sonda({ testid = 'destino' }: { testid?: string }) {
  const loc = useLocation()
  return <div data-testid={testid}>{`${loc.pathname}${loc.search}`}</div>
}

function renderAt(path: string, pipelines: Pipeline[]) {
  vi.mocked(pipelinesApi.list).mockResolvedValue({ data: pipelines } as never)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pipelines/:id" element={<><Sonda testid="rota-atual" /><PipelinePage /></>} />
        <Route path="/home" element={<div data-testid="home-page">home</div>} />
        {/* Sonda: mostra o endereço para onde a navegação levou, com a
            querystring — é ela que carrega o funil e o caminho de volta. */}
        <Route path="/settings/:section" element={<Sonda />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { vi.mocked(pipelinesApi.list).mockReset(); openDeal.mockReset() })

describe('PipelinePage — navegação (D2/SCRUM-935)', () => {
  it('carrega o funil pelo :id e mostra o Board por padrão', async () => {
    renderAt('/pipelines/p1', [pipeline({ id: 'p1', name: 'Vendas' })])
    await waitFor(() => expect(screen.getByTestId('board-tab')).toHaveTextContent('board de Vendas'))
    expect(screen.queryByTestId('reports-tab')).toBeNull()
  })

  // A troca de funil passou a ser animada (`AnimatePresence mode="wait"`).
  // O risco de animar uma troca é o estado ANTIGO ficar montado junto com o
  // novo — em jsdom o `exit` do Framer já deixou DOM para trás antes. Este
  // teste é a trava: depois de trocar, existe UM quadro, e é o novo.
  it('trocar de funil no seletor leva ao outro quadro, sem deixar o anterior montado', async () => {
    renderAt('/pipelines/p1', [
      pipeline({ id: 'p1', name: 'Vendas' }),
      pipeline({ id: 'p2', name: 'Pós-venda', isDefault: false }),
    ])
    await waitFor(() => expect(screen.getByTestId('board-tab')).toHaveTextContent('board de Vendas'))

    fireEvent.click(screen.getByTestId('pipeline-switcher'))
    fireEvent.click(screen.getByRole('menuitem', { name: /Pós-venda/ }))

    await waitFor(() => expect(screen.getByTestId('board-tab')).toHaveTextContent('board de Pós-venda'))
    expect(screen.getAllByTestId('board-tab')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pós-venda')
  })
  it('a busca do cabeçalho chega ao quadro e some na aba de relatórios', async () => {
    renderAt('/pipelines/p1', [pipeline({ id: 'p1', name: 'Vendas' })])
    await waitFor(() => screen.getByTestId('board-tab'))

    fireEvent.change(screen.getByTestId('board-search'), { target: { value: 'mariana' } })
    expect(screen.getByTestId('board-search-recebida')).toHaveTextContent('mariana')

    // Relatórios agregam por etapa e período — o campo não teria o que filtrar.
    fireEvent.click(screen.getByRole('button', { name: /Relatórios/ }))
    await waitFor(() => expect(screen.queryByTestId('board-search')).toBeNull())
  })

  // Fase 0 da redistribuição de configurações: estado de TELA mora na URL. A
  // busca nasceu em `useState` e vazava — filtrar, abrir um card e voltar
  // devolvia o quadro sem o filtro, no meio de um atendimento.
  it('a busca vive na URL: chega por link e sobrevive à volta', async () => {
    renderAt('/pipelines/p1?q=mariana', [pipeline({ id: 'p1', name: 'Vendas' })])
    await waitFor(() => screen.getByTestId('board-tab'))
    expect((screen.getByTestId('board-search') as HTMLInputElement).value).toBe('mariana')
    expect(screen.getByTestId('board-search-recebida')).toHaveTextContent('mariana')
  })

  // Fase 1: porta contextual para a configuração DESTE funil. O que importa é
  // a ida levar o funil certo E o endereço de volta com o estado da tela —
  // sem isso o atalho abriria a configuração de outro funil e devolveria o
  // quadro zerado.
  // A engrenagem abre um PAINEL ao lado, não outra tela: configurar funil é
  // coisa que se faz no meio do trabalho, e sair custa aba, busca e rolagem.
  // O estado vai para a URL para sobreviver ao F5 e ao voltar.
  it('a engrenagem abre o painel de configuração, no funil atual e sem perder a tela', async () => {
    renderAt('/pipelines/p1?tab=reports&q=ana', [pipeline({ id: 'p1', name: 'Vendas' })])
    fireEvent.click(await screen.findByTestId('pipeline-settings-link'))

    expect(await screen.findByTestId('funnels-config-drawer')).toBeInTheDocument()
    const url = (screen.getByTestId('rota-atual').textContent ?? '')
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('config')).toBe('funis')
    expect(params.get('pipeline')).toBe('p1')
    // O que já estava na tela continua na URL — nada se perde ao configurar.
    expect(params.get('tab')).toBe('reports')
    expect(params.get('q')).toBe('ana')
  })

  // "Novo negócio" só existia no estado VAZIO do quadro: com o primeiro card
  // criado, o botão sumia e criar outro exigia sair do funil (CRM ou chat).
  it('o botão de criar fica no cabeçalho e parte da primeira etapa não-terminal', async () => {
    const stage = (id: string, over = {}) => ({
      id, tenantId: 't', pipelineId: 'p1', key: id, label: id, color: '#6366f1',
      order: 0, isWon: false, isLost: false, ...over,
    })
    renderAt('/pipelines/p1', [pipeline({
      id: 'p1',
      name: 'Vendas',
      stages: [stage('ganho', { isWon: true, order: 2 }), stage('novo', { order: 0 }), stage('proposta', { order: 1 })] as never,
    })])

    fireEvent.click(await screen.findByTestId('pipeline-new-deal'))
    // A primeira NÃO-terminal, em ordem — criar direto num terminal é 400.
    expect(screen.getByTestId('board-nova-etapa')).toHaveTextContent('novo')
  })

  it('a aba "Relatórios" troca o conteúdo (via querystring, linkável)', async () => {
    renderAt('/pipelines/p1', [pipeline({ id: 'p1', name: 'Vendas' })])
    await waitFor(() => screen.getByTestId('board-tab'))
    fireEvent.click(screen.getByRole('button', { name: /Relatórios/ }))
    await waitFor(() => expect(screen.getByTestId('reports-tab')).toHaveTextContent('relatórios de Vendas'))
    expect(screen.queryByTestId('board-tab')).toBeNull()
  })

  it('abrindo direto em ?tab=reports já mostra Relatórios', async () => {
    renderAt('/pipelines/p1?tab=reports', [pipeline({ id: 'p1', name: 'Vendas' })])
    await waitFor(() => expect(screen.getByTestId('reports-tab')).toBeInTheDocument())
  })

  it('id inexistente/arquivado cai pro funil PADRÃO do tenant', async () => {
    renderAt('/pipelines/id-que-nao-existe', [
      pipeline({ id: 'p1', name: 'Suporte', isDefault: false }),
      pipeline({ id: 'p2', name: 'Vendas', isDefault: true }),
    ])
    await waitFor(() => expect(screen.getByTestId('board-tab')).toHaveTextContent('board de Vendas'))
  })

  it('sem nenhum funil disponível, volta pra Home em vez de travar', async () => {
    renderAt('/pipelines/p1', [])
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeInTheDocument())
  })
})

// O tipo do funil so aparecia como icone mudo no cabecalho: alvo e ciclo nao
// ensinam nada a quem nunca viu. A legenda diferencia venda de processo; a COR
// fica por conta do funil (ponto + gradiente), para os eixos nao competirem.
describe('PipelinePage — tipo do funil no cabecalho', () => {
  it('funil de VENDA: selo diz "Vendas"', async () => {
    renderAt('/pipelines/p1', [pipeline({ id: 'p1', name: 'Propostas', kind: 'sales' })])
    expect(await screen.findByTestId('pipeline-kind-badge')).toHaveTextContent(/vendas/i)
  })

  it('funil de PROCESSO: selo diz "Processo"', async () => {
    renderAt('/pipelines/p1', [pipeline({ id: 'p1', name: 'Confirmação', kind: 'process' })])
    expect(await screen.findByTestId('pipeline-kind-badge')).toHaveTextContent(/processo/i)
  })
})

// ─── `?deal=` (09/09) ───────────────────────────────────────────────────────
// O painel do contato, na conversa, manda para cá quando o operador pergunta
// "onde este negócio está no meu funil". A ficha abre POR CIMA do quadro: as
// duas respostas de uma vez.
describe('PipelinePage — chegada com ?deal=', () => {
  it('abre a ficha do negócio pedida na URL', async () => {
    renderAt('/pipelines/p1?deal=d9', [pipeline({})])
    await waitFor(() => expect(openDeal).toHaveBeenCalledWith('d9'))
    // O quadro continua sendo o que a página mostra — a ficha vem por cima.
    await waitFor(() => expect(screen.getByTestId('board-tab')).toBeInTheDocument())
  })

  it('sem o parâmetro, nada é aberto', async () => {
    renderAt('/pipelines/p1', [pipeline({})])
    await waitFor(() => expect(screen.getByTestId('board-tab')).toBeInTheDocument())
    expect(openDeal).not.toHaveBeenCalled()
  })
})
