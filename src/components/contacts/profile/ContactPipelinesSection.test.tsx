// F11 (SCRUM-885/886) — seção "Funis · N abertos" da ficha: um stepper por
// registro aberto com quem moveu/quando/origem, "Mover" (normal → PATCH stage;
// terminal → motivo), "Ver no board"; fechados numa linha compacta com "ver
// histórico" (GET /deals/:id/history). Nada sem o flag.
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
// `useAddToPipeline` (por baixo do "Novo negócio" do estado vazio) ainda
// chama useNavigate — sem Router no render de teste, precisa ficar mockado.
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
// B2 (SCRUM-928): "Ver no board" virou "Abrir negócio" — abre a ficha, não navega.
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

import { ContactPipelinesSection } from './ContactPipelinesSection'

const base: Deal = { id: 'd', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0 }
const OPEN_SUPORTE: Deal = { ...base, id: 'd1', createdAt: '2026-08-20', stageEnteredAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), lastMovedByKind: 'ai', originKind: 'manual' }
const OPEN_VENDAS: Deal = { ...base, id: 'd2', pipelineId: 'v', stageId: 'v1', createdAt: '2026-08-25', lastMovedByKind: 'user', lastMovedByActorName: 'Renata C.', originKind: 'campaign', originLabel: 'Promo Agosto' }
const CLOSED: Deal = { ...base, id: 'd3', pipelineId: 'v', stageId: 'v4', status: 'lost', closedAt: '2026-08-01T00:00:00Z', closeReason: 'outro' }

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  openDeal.mockReset(); multi.mockReturnValue(true)
  api.list.mockResolvedValue({ data: [OPEN_SUPORTE, OPEN_VENDAS, CLOSED] })
  api.moveStage.mockResolvedValue({ data: {} })
  api.history.mockResolvedValue({ data: [
    { id: 'h1', fromStageId: null, fromStageLabel: null, toStageId: 'v1', toStageLabel: 'Novo', movedByKind: 'campaign', movedByActorName: null, createdAt: '2026-07-20T00:00:00Z' },
    { id: 'h2', fromStageId: 'v1', fromStageLabel: 'Novo', toStageId: 'v4', toStageLabel: 'Perdido', movedByKind: 'user', movedByActorName: 'Ana', createdAt: '2026-08-01T00:00:00Z' },
  ] })
})

describe('ContactPipelinesSection (F11)', () => {
  it('critério: contato em 2 funis → 2 steppers, contagem "2 abertos", etapa atual, quem moveu e origem', async () => {
    render(<ContactPipelinesSection contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('pipelines-open-count')).toHaveTextContent('2 abertos'))
    expect(api.list).toHaveBeenCalledWith('c1')
    expect(screen.getAllByTestId('pipeline-stepper')).toHaveLength(2)
    const suporte = screen.getByTestId('pipeline-open-p')
    expect(suporte).toHaveTextContent('Suporte')
    expect(suporte.querySelector('[aria-current="step"]')).toHaveTextContent('Em atendimento')
    expect(suporte.querySelector('[data-testid="pipeline-meta"]')).toHaveTextContent('movido por IA · origem Manual')
    const vendas = screen.getByTestId('pipeline-open-v')
    expect(vendas.querySelector('[data-testid="pipeline-meta"]')).toHaveTextContent('movido por Renata C. · origem Campanha · Promo Agosto')
    // fechados: linha compacta com o terminal e o motivo
    expect(screen.getByTestId('pipelines-closed')).toHaveTextContent('Vendas · Perdido')
    expect(screen.getByTestId('pipelines-closed')).toHaveTextContent('Outro')
  })

  it('"Mover" para etapa normal chama PATCH /deals/:id/stage e recarrega; "Abrir negócio" abre a FICHA (B2/928)', async () => {
    render(<ContactPipelinesSection contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('pipeline-move-p')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pipeline-move-p'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Novo' }))
    await waitFor(() => expect(api.moveStage).toHaveBeenCalledWith('d1', 's1'))
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByTestId('pipeline-board-v'))
    expect(openDeal).toHaveBeenCalledWith('d2')
  })

  it('"Mover" para terminal pede o motivo (modal) e fecha com setStatus', async () => {
    api.setStatus.mockResolvedValue({ data: {} })
    render(<ContactPipelinesSection contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('pipeline-move-p')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pipeline-move-p'))
    fireEvent.click(screen.getByRole('menuitem', { name: /Cancelado \(com motivo\)/ }))
    await waitFor(() => expect(screen.getByText('Cancelado — motivo')).toBeInTheDocument())
    expect(api.setStatus).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'cancelado_pelo_cliente' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith('d1', { status: 'lost', closeReason: 'cancelado_pelo_cliente', closeNote: undefined }))
  })

  it('"ver histórico" busca GET /deals/:id/history e lista as passagens', async () => {
    render(<ContactPipelinesSection contactId="c1" contactName="Mariana" />)
    await waitFor(() => expect(screen.getByTestId('pipeline-history-d3')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('pipeline-history-d3'))
    await waitFor(() => expect(api.history).toHaveBeenCalledWith('d3'))
    const list = await screen.findByTestId('pipeline-history-list-d3')
    expect(list).toHaveTextContent('entrou em Novo · campanha')
    expect(list).toHaveTextContent('Novo → Perdido · Ana')
  })

  it('sem o flag não renderiza nem consulta', () => {
    multi.mockReturnValue(false)
    const { container } = render(<ContactPipelinesSection contactId="c1" contactName="Mariana" />)
    expect(container).toBeEmptyDOMElement()
    expect(api.list).not.toHaveBeenCalled()
  })
})
