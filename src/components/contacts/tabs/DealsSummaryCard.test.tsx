// B3 (SCRUM-929) — resumo dos negócios na Visão Geral: "Total"/"Ganho"/"Em
// aberto" somam só registro de VENDA, a mesma regra do painel de conversas
// (`ContactPanelDeals`) — processo nunca entra na conta, nem como zero.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const { api, multi, socket } = vi.hoisted(() => ({
  api: { list: vi.fn() },
  multi: vi.fn(() => true),
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))
// `useAddToPipeline` (por baixo do botão "Novo negócio" do vazio) chama
// `useDealPanel` — sem `<DealPanelProvider>` no teste, precisa ficar mockado.
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal: vi.fn() }) }))

import type { Deal, Pipeline, PipelineStage } from '@/types'
const st = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order, isWon: false, isLost: false, ...extra })
const SUPORTE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process', openDealsCount: 0,
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
  closeReasons: [], stages: [st('s1', 'Novo', 1), st('s2', 'Em atendimento', 2), st('s3', 'Concluído', 3, { isWon: true }), st('s4', 'Cancelado', 4, { isLost: true })],
}
const VENDAS: Pipeline = { ...SUPORTE, id: 'v', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [st('v1', 'Novo', 1), st('v2', 'Proposta', 2), st('v3', 'Ganho', 3, { isWon: true }), st('v4', 'Perdido', 4, { isLost: true })] }
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [SUPORTE, VENDAS] }) }))

import { DealsSummaryCard } from './DealsSummaryCard'

const base: Deal = { id: 'd', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 900_000 }
/** Registro de PROCESSO: tem `amountCents` só por acidente de schema — nunca deve contar. */
const PROCESSO: Deal = { ...base, id: 'd1' }
const VENDA_ABERTA: Deal = { ...base, id: 'd2', pipelineId: 'v', stageId: 'v2', amountCents: 150_000 }
const VENDA_GANHA: Deal = { ...base, id: 'd3', pipelineId: 'v', stageId: 'v3', status: 'won', amountCents: 300_000 }

beforeEach(() => {
  api.list.mockReset(); multi.mockReturnValue(true)
})

describe('DealsSummaryCard — regra de soma (B3 · SCRUM-929)', () => {
  it('"Total"/"Ganho"/"Em aberto" somam só VENDA — processo (com amountCents) fica de fora', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO, VENDA_ABERTA, VENDA_GANHA] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText('R$ 4.500,00')).toBeInTheDocument()) // Total: 1.500 + 3.000
    expect(screen.getByText('R$ 3.000,00')).toBeInTheDocument() // Ganho: só VENDA_GANHA
    expect(screen.getByText('1 de 2')).toBeInTheDocument() // Em aberto: só VENDA_ABERTA, de 2 vendas
  })

  it('sem nenhum registro de venda, mostra o vazio com ação — não soma processo como zero', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText(/Nenhum negócio de venda ainda/i)).toBeInTheDocument())
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })
})
