// Fase 1 (plano de UI do drawer, achado do usuário) — o card deixou de
// esconder funil de PROCESSO: "Total"/"Ganho"/"Em aberto" continuam somando
// só VENDA (valor em dinheiro não faz sentido pra processo), mas cada
// registro ABERTO de processo ganha sua própria linha (nome do funil +
// etapa), e a ação de mover/adicionar (`AddToPipelineMenu`) fica SEMPRE
// visível — não só no vazio como antes (SCRUM-929).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { api, multi, socket } = vi.hoisted(() => ({
  api: { list: vi.fn() },
  multi: vi.fn(() => true),
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))
// `useAddToPipeline` (por baixo da ação de mover/adicionar) chama
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

describe('DealsSummaryCard — soma de venda × visibilidade de processo (SCRUM-929 + Fase 1)', () => {
  it('"Total"/"Ganho"/"Em aberto" somam só VENDA — processo (com amountCents) fica de fora da soma', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO, VENDA_ABERTA, VENDA_GANHA] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText('R$ 4.500,00')).toBeInTheDocument()) // Total: 1.500 + 3.000
    expect(screen.getByText('R$ 3.000,00')).toBeInTheDocument() // Ganho: só VENDA_GANHA
    expect(screen.getByText('1 de 2')).toBeInTheDocument() // Em aberto: só VENDA_ABERTA, de 2 vendas
  })

  it('funil de PROCESSO aparece com nome + etapa, sem valor — não fica mais invisível', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO, VENDA_ABERTA] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('deals-summary-process-rows')).toBeInTheDocument())
    expect(screen.getByText('Suporte')).toBeInTheDocument()
    expect(screen.getByText('Em atendimento')).toBeInTheDocument() // etapa do PROCESSO (stageId: s2)
    // Sem valor monetário associado à linha de processo — só a de venda soma.
    expect(screen.queryByText('R$ 9.000,00')).not.toBeInTheDocument() // amountCents de PROCESSO nunca aparece
  })

  it('sem NENHUM registro (nem venda nem processo), mostra o vazio genérico — sem "de venda" no texto', async () => {
    api.list.mockResolvedValue({ data: [] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText(/Nenhum negócio nos funis ainda/i)).toBeInTheDocument())
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
    expect(screen.queryByTestId('deals-summary-process-rows')).not.toBeInTheDocument()
  })

  it('só com processo (sem nenhuma venda), NÃO mostra o vazio — mostra a linha de processo', async () => {
    api.list.mockResolvedValue({ data: [PROCESSO] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText('Suporte')).toBeInTheDocument())
    expect(screen.queryByText(/Nenhum negócio/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument() // sem venda, sem grade de venda
  })

  it('a ação de mover/adicionar fica visível mesmo com negócios já abertos (era só no vazio antes)', async () => {
    api.list.mockResolvedValue({ data: [VENDA_ABERTA, VENDA_GANHA] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByText('R$ 4.500,00')).toBeInTheDocument())
    // `AddToPipelineMenu` (flag de múltiplos funis ligado) — não é mais um
    // botão só do estado vazio.
    expect(screen.getByTestId('add-to-pipeline-trigger')).toBeInTheDocument()
  })

  it('a ação de mover/adicionar desabilita o funil onde o contato já está, com "já está · etapa"', async () => {
    api.list.mockResolvedValue({ data: [VENDA_ABERTA] })
    render(<DealsSummaryCard contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('add-to-pipeline-trigger')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('add-to-pipeline-trigger'))
    const vendasItem = await screen.findByTestId('add-to-pipeline-v')
    expect(vendasItem).toBeDisabled()
    expect(vendasItem).toHaveTextContent('já está')
    expect(vendasItem).toHaveTextContent('Proposta')
    const suporteItem = screen.getByTestId('add-to-pipeline-p')
    expect(suporteItem).not.toBeDisabled()
  })
})
