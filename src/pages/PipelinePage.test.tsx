// D2 (SCRUM-935) — rota /pipelines/:id com abas Board/Relatórios: navegação
// até a página, troca de aba via querystring e fallback de id inválido/
// arquivado pro funil padrão (mesma regra que o antigo /contacts?pipeline=
// já tinha). Board e Relatórios têm cobertura própria — aqui mockados.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
  PipelineBoardTab: ({ pipeline }: { pipeline: Pipeline }) => <div data-testid="board-tab">board de {pipeline.name}</div>,
}))
vi.mock('@/components/deals/reports/PipelineReportsTab', () => ({
  PipelineReportsTab: ({ pipeline }: { pipeline: Pipeline }) => <div data-testid="reports-tab">relatórios de {pipeline.name}</div>,
}))

const pipeline = (over: Partial<Pipeline>): Pipeline => ({
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#14b8a6', order: 0, isDefault: true, isArchived: false, stages: [], openDealsCount: 0,
  ...over,
} as Pipeline)

function renderAt(path: string, pipelines: Pipeline[]) {
  vi.mocked(pipelinesApi.list).mockResolvedValue({ data: pipelines } as never)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pipelines/:id" element={<PipelinePage />} />
        <Route path="/home" element={<div data-testid="home-page">home</div>} />
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
