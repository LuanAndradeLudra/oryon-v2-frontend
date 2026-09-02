// B3 (SCRUM-929) — painel do contato (Conversas) na densidade `row` do
// `DealSummary` compartilhado: uma linha por registro aberto com funil, tipo,
// etapa e "Mover etapa ▾"; "Em aberto"/"Ganho" somam só registro de VENDA
// (a regra certa, que as outras 3 telas passaram a seguir também).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { api, openDeal, multi, socket } = vi.hoisted(() => ({
  api: { list: vi.fn(), moveStage: vi.fn(), setStatus: vi.fn(), history: vi.fn() },
  openDeal: vi.fn(),
  multi: vi.fn(() => true),
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import type { Deal, Pipeline, PipelineStage } from '@/types'
const st = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order, isWon: false, isLost: false, ...extra })
const SUPORTE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process', openDealsCount: 0,
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
  closeReasons: [{ key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente', outcome: 'lost' }, { key: 'outro', label: 'Outro', outcome: 'any' }],
  stages: [st('s1', 'Novo', 1), st('s2', 'Em atendimento', 2), st('s3', 'Concluído', 3, { isWon: true }), st('s4', 'Cancelado', 4, { isLost: true })],
}
const VENDAS: Pipeline = { ...SUPORTE, id: 'v', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [st('v1', 'Novo', 1), st('v2', 'Proposta', 2), st('v3', 'Ganho', 3, { isWon: true }), st('v4', 'Perdido', 4, { isLost: true })] }
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [SUPORTE, VENDAS] }) }))

import { ContactPanelDeals } from './ContactPanelDeals'

const base: Deal = { id: 'd', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0 }
/** Registro de PROCESSO aberto: sem valor, nunca entra na soma. */
const PROCESSO_ABERTO: Deal = { ...base, id: 'd1', createdAt: '2026-08-20' }
/** Negócio de VENDA aberto: valor entra em "Em aberto". */
const VENDA_ABERTA: Deal = { ...base, id: 'd2', pipelineId: 'v', stageId: 'v2', amountCents: 150_000, createdAt: '2026-08-25' }
/** Negócio de VENDA ganho: valor entra em "Ganho", não em "Em aberto". */
const VENDA_GANHA: Deal = { ...base, id: 'd3', pipelineId: 'v', stageId: 'v3', status: 'won', amountCents: 300_000, closedAt: '2026-08-28T00:00:00Z' }

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  openDeal.mockReset(); multi.mockReturnValue(true)
  api.moveStage.mockResolvedValue({ data: {} })
})

const renderPanel = () => render(<ContactPanelDeals contactId="c1" contactName="Mariana" conversationId="conv1" />)

describe('ContactPanelDeals — densidade row (B3 · SCRUM-929)', () => {
  it('renderiza uma linha por registro aberto, com funil e etapa', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO_ABERTO, VENDA_ABERTA] })
    renderPanel()
    await waitFor(() => expect(screen.getByTestId('panel-pipelines-count')).toHaveTextContent('2 abertos'))
    const suporte = screen.getByTestId('panel-pipeline-p')
    expect(suporte).toHaveTextContent('Suporte')
    expect(screen.getByTestId('panel-pipeline-stage-p')).toHaveTextContent('Em atendimento')
    const vendas = screen.getByTestId('panel-pipeline-v')
    expect(vendas).toHaveTextContent('Vendas')
    expect(screen.getByTestId('panel-pipeline-stage-v')).toHaveTextContent('Proposta')
  })

  it('"Em aberto"/"Ganho" somam só VENDA — processo nunca entra na conta', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO_ABERTO, VENDA_ABERTA, VENDA_GANHA] })
    renderPanel()
    const money = await screen.findByTestId('panel-pipelines-money')
    expect(money).toHaveTextContent('R$ 1.500,00') // Em aberto: só VENDA_ABERTA
    expect(money).toHaveTextContent('R$ 3.000,00') // Ganho: só VENDA_GANHA
  })

  it('sem nenhum registro de venda, a faixa de dinheiro some (processo não vira zero)', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO_ABERTO] })
    renderPanel()
    await waitFor(() => expect(screen.getByTestId('panel-pipelines-count')).toHaveTextContent('1 aberto'))
    expect(screen.queryByTestId('panel-pipelines-money')).not.toBeInTheDocument()
  })

  it('"Mover etapa" chama PATCH /deals/:id/stage; "Abrir" abre a ficha (B2/928)', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO_ABERTO] })
    renderPanel()
    await waitFor(() => expect(screen.getByTestId('panel-pipeline-move-p')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('panel-pipeline-move-p'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Novo' }))
    await waitFor(() => expect(api.moveStage).toHaveBeenCalledWith('d1', 's1'))
    fireEvent.click(screen.getByTestId('panel-pipeline-board-p'))
    expect(openDeal).toHaveBeenCalledWith('d1')
  })
})
