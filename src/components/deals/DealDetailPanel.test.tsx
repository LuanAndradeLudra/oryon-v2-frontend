// B2 (SCRUM-928) — a ficha do negócio: renderização por modo (carregando ·
// 404 · sem acesso · ok), stepper clicável, abas, e o realtime `deal:changed`.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Deal, Pipeline, PipelineStage, User, DealStageHistoryEntry } from '@/types'

const { dealsApi, usersApi, conversationsApi, socket } = vi.hoisted(() => ({
  dealsApi: {
    get: vi.fn(), history: vi.fn(), update: vi.fn(), setStatus: vi.fn(),
    movePipeline: vi.fn(), remove: vi.fn(),
  },
  usersApi: { list: vi.fn() },
  conversationsApi: { list: vi.fn() },
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi, usersApi, conversationsApi }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))

const STAGES: PipelineStage[] = [
  { id: 's1', tenantId: 't', pipelineId: 'p1', key: 'novo', label: 'Novo', color: '#111', order: 0, isWon: false, isLost: false, probability: 20 },
  { id: 's2', tenantId: 't', pipelineId: 'p1', key: 'negociacao', label: 'Negociação', color: '#222', order: 1, isWon: false, isLost: false, probability: 60 },
  { id: 's-won', tenantId: 't', pipelineId: 'p1', key: 'ganho', label: 'Ganho', color: '#0f0', order: 2, isWon: true, isLost: false },
  { id: 's-lost', tenantId: 't', pipelineId: 'p1', key: 'perdido', label: 'Perdido', color: '#f00', order: 3, isWon: false, isLost: true },
]
const PIPELINE: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0, isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: STAGES, openDealsCount: 0,
  closeReasons: [{ key: 'fechou', label: 'Fechou', outcome: 'won' }, { key: 'preco', label: 'Preço', outcome: 'lost' }],
}
const USER: User = { id: 'u1', tenantId: 't', email: 'ana@x.com', firstName: 'Ana', lastName: 'Souza', role: 'agent', isActive: true }
const DEAL: Deal = {
  id: 'd1', contactId: 'c1', title: 'Negócio da Ana', status: 'open', pipelineId: 'p1', stageId: 's1',
  amountCents: 50_000, ownerUserId: 'u1', lineItems: [],
}
const HISTORY: DealStageHistoryEntry[] = [
  { id: 'h1', fromStageId: null, toStageId: 's1', fromStageLabel: null, toStageLabel: 'Novo', movedByKind: 'user', movedByActorName: 'Ana Souza', createdAt: '2026-01-01T00:00:00Z' },
]

vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ pipelines: [PIPELINE], products: [] }),
}))
// A aba Conversas usa `openConversationBeside` — infraestrutura própria,
// já coberta em DealPanelContext.test.tsx. Aqui só um stub.
vi.mock('@/contexts/DealPanelContext', () => ({
  useDealPanel: () => ({ openConversationBeside: vi.fn() }),
}))

import { DealDetailPanel } from './DealDetailPanel'

beforeEach(() => {
  Object.values(dealsApi).forEach((m) => m.mockReset())
  usersApi.list.mockReset()
  conversationsApi.list.mockReset()
  socket.on.mockReset(); socket.off.mockReset()
  dealsApi.get.mockResolvedValue({ data: DEAL })
  dealsApi.history.mockResolvedValue({ data: HISTORY })
  usersApi.list.mockResolvedValue({ data: [USER] })
  conversationsApi.list.mockResolvedValue({ data: { data: [] } })
})

describe('DealDetailPanel — estados de carregamento', () => {
  it('mostra um spinner enquanto carrega', () => {
    dealsApi.get.mockReturnValue(new Promise(() => {})) // nunca resolve
    render(<DealDetailPanel dealId="d1" />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('404: "negócio não encontrado"', async () => {
    dealsApi.get.mockRejectedValue({ response: { status: 404 } })
    render(<DealDetailPanel dealId="d1" />)
    expect(await screen.findByText('Negócio não encontrado')).toBeInTheDocument()
  })

  it('403: "Sem acesso"', async () => {
    dealsApi.get.mockRejectedValue({ response: { status: 403 } })
    render(<DealDetailPanel dealId="d1" />)
    expect(await screen.findByText('Sem acesso')).toBeInTheDocument()
  })

  it('outro erro: mensagem genérica', async () => {
    dealsApi.get.mockRejectedValue({ response: { status: 500 } })
    render(<DealDetailPanel dealId="d1" />)
    expect(await screen.findByText('Erro ao carregar')).toBeInTheDocument()
  })
})

describe('DealDetailPanel — carregado', () => {
  it('renderiza o cabeçalho (título, funil, dono) e as 4 abas, Proposta desabilitada', async () => {
    render(<DealDetailPanel dealId="d1" />)
    expect(await screen.findByTestId('deal-title')).toHaveTextContent('Negócio da Ana')
    expect(screen.getByText('Vendas')).toBeInTheDocument()
    expect(screen.getByTestId('deal-owner')).toHaveTextContent('Ana Souza')
    expect(screen.getByTestId('deal-tab-summary')).toBeInTheDocument()
    expect(screen.getByTestId('deal-tab-activity')).toBeInTheDocument()
    expect(screen.getByTestId('deal-tab-conversations')).toBeInTheDocument()
    expect(screen.getByTestId('deal-tab-proposal')).toBeDisabled()
  })

  it('aba Resumo é a padrão (escopo + itens)', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    expect(screen.getByTestId('deal-description')).toBeInTheDocument()
  })

  it('aba Atividade mostra o histórico com ator e horário', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    fireEvent.click(screen.getByTestId('deal-tab-activity'))
    const list = await screen.findByTestId('deal-history-list')
    expect(list).toHaveTextContent('Novo')
    expect(list).toHaveTextContent('Ana Souza')
  })

  it('aba Conversas busca as conversas do contato', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    fireEvent.click(screen.getByTestId('deal-tab-conversations'))
    await waitFor(() => expect(conversationsApi.list).toHaveBeenCalledWith({ contactId: 'c1' }, 1, 50))
  })

  it('stepper: clicar numa etapa normal move via setStatus(status=open, stageId)', async () => {
    dealsApi.setStatus.mockResolvedValue({ data: { ...DEAL, stageId: 's2' } })
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    fireEvent.click(screen.getByTestId('deal-stepper-stage-s2'))
    await waitFor(() => expect(dealsApi.setStatus).toHaveBeenCalledWith('d1', { status: 'open', stageId: 's2' }))
  })

  it('"Marcar ganho" abre o modal de motivo (A4) em vez de mover direto', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    fireEvent.click(screen.getByTestId('deal-mark-won'))
    expect(await screen.findByRole('combobox', { name: 'Motivo do desfecho' })).toBeInTheDocument()
    expect(dealsApi.setStatus).not.toHaveBeenCalled()
  })

  it('confirmar o motivo de fechamento chama setStatus com outcome+reason+stageId', async () => {
    dealsApi.setStatus.mockResolvedValue({ data: { ...DEAL, status: 'won', stageId: 's-won' } })
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    fireEvent.click(screen.getByTestId('deal-mark-won'))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'fechou' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(dealsApi.setStatus).toHaveBeenCalledWith('d1', { status: 'won', closeReason: 'fechou', closeNote: undefined, stageId: 's-won' }))
  })

  it('realtime: deal:changed com o contactId certo recarrega o negócio', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    dealsApi.get.mockClear()
    const onChanged = socket.on.mock.calls.find(([evt]) => evt === 'deal:changed')?.[1]
    expect(onChanged).toBeTypeOf('function')
    onChanged?.({ contactId: 'c1' })
    await waitFor(() => expect(dealsApi.get).toHaveBeenCalledWith('d1'))
  })

  it('realtime: deal:changed de OUTRO contato não recarrega', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    dealsApi.get.mockClear()
    const onChanged = socket.on.mock.calls.find(([evt]) => evt === 'deal:changed')?.[1]
    onChanged?.({ contactId: 'someone-else' })
    await new Promise((r) => setTimeout(r, 0))
    expect(dealsApi.get).not.toHaveBeenCalled()
  })
})

describe('DealDetailPanel — modo painel vs. página', () => {
  it('modo painel (onClose presente): mostra fechar e expandir', async () => {
    render(<DealDetailPanel dealId="d1" onClose={vi.fn()} onExpand={vi.fn()} />)
    await screen.findByTestId('deal-title')
    expect(screen.getByTitle('Fechar')).toBeInTheDocument()
    expect(screen.getByTitle('Abrir como página')).toBeInTheDocument()
  })

  it('modo página (sem onClose/onExpand): sem os dois botões', async () => {
    render(<DealDetailPanel dealId="d1" />)
    await screen.findByTestId('deal-title')
    expect(screen.queryByTitle('Fechar')).toBeNull()
    expect(screen.queryByTitle('Abrir como página')).toBeNull()
  })
})
