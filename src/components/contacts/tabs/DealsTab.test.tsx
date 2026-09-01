// SCRUM-921 — quick-view do contato (drawer da tabela) no Modelo B: a terceira
// e última das três leituras de "onde este contato está nos funis". Etapa
// visível, vocabulário do TIPO do funil (Concluído/Cancelado em processo),
// dinheiro só em funil de venda, "Mover" com motivo no terminal, fechados com
// histórico — e, sem o flag, a aba NÃO some: continua sendo a lista de negócios
// do tenant de funil único.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { api, navigate, multi, socket } = vi.hoisted(() => ({
  api: { list: vi.fn(), moveStage: vi.fn(), setStatus: vi.fn(), history: vi.fn(), remove: vi.fn(), get: vi.fn(), create: vi.fn() },
  navigate: vi.fn(),
  multi: vi.fn(() => true),
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('@/services/api', () => ({ dealsApi: api, contactsApi: { get: vi.fn(), list: vi.fn() }, usersApi: { list: vi.fn(() => Promise.resolve({ data: [] })) } }))
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }) }))
vi.mock('@/contexts/TenantVocabContext', () => ({ useTenantVocab: () => ({ vocab: { deal: 'Negócio', deals: 'Negócios' } }) }))
// A3 (SCRUM-925): o "Novo negócio" abre o NewDealDialog, que lê o usuário atual
// para pré-preencher o dono (D0-9). Sem este mock o diálogo derruba a árvore.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', tenantId: 't', email: 'eu@oryon.com', firstName: 'Ana', lastName: 'Souza', role: 'agent', isActive: true } }),
}))

import type { Deal, Pipeline, PipelineStage } from '@/types'
const st = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order, isWon: false, isLost: false, ...extra })
const SUPORTE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process', openDealsCount: 0,
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
  closeReasons: [{ key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente', outcome: 'lost' }, { key: 'outro', label: 'Outro', outcome: 'any' }],
  stages: [st('s1', 'Novo', 1), st('s2', 'Em atendimento', 2), st('s3', 'Concluído', 3, { isWon: true }), st('s4', 'Cancelado', 4, { isLost: true })],
}
const VENDAS: Pipeline = { ...SUPORTE, id: 'v', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [st('v1', 'Novo', 1), st('v2', 'Proposta', 2), st('v3', 'Ganho', 3, { isWon: true }), st('v4', 'Perdido', 4, { isLost: true })] }
// `pipelines` é o cache do CRMConfig, que o próprio contexto zera sem o flag.
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ pipelines: multi() ? [SUPORTE, VENDAS] : [], products: [], stages: [] }),
}))

import { DealsTab } from './DealsTab'

const base: Deal = { id: 'd', contactId: 'c1', title: 'Mariana', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0 }
/** Registro de PROCESSO: título = contato (F8), sem valor. */
const PROCESSO: Deal = { ...base, id: 'd1', createdAt: '2026-08-20', stageEnteredAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), lastMovedByKind: 'ai', originKind: 'manual' }
/** Negócio de VENDA: título próprio, valor e itens. */
const VENDA: Deal = { ...base, id: 'd2', pipelineId: 'v', stageId: 'v2', title: 'Plano Anual', amountCents: 250_000, lineItems: [{ id: 'li1' }] as Deal['lineItems'], createdAt: '2026-08-25', lastMovedByKind: 'user', lastMovedByActorName: 'Renata C.', originKind: 'campaign', originLabel: 'Promo Agosto' }
/** Fechado num funil de PROCESSO: o terminal é "Cancelado", nunca "Perdido". */
const FECHADO: Deal = { ...base, id: 'd3', stageId: 's4', status: 'lost', closedAt: '2026-08-01T00:00:00Z', closeReason: 'outro' }

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  navigate.mockReset(); multi.mockReturnValue(true)
  api.list.mockResolvedValue({ data: [PROCESSO, VENDA, FECHADO] })
  api.moveStage.mockResolvedValue({ data: {} })
  api.remove.mockResolvedValue({ data: {} })
  api.history.mockResolvedValue({ data: [
    { id: 'h1', fromStageId: null, fromStageLabel: null, toStageId: 's1', toStageLabel: 'Novo', movedByKind: 'campaign', movedByActorName: null, createdAt: '2026-07-20T00:00:00Z' },
    { id: 'h2', fromStageId: 's1', fromStageLabel: 'Novo', toStageId: 's4', toStageLabel: 'Cancelado', movedByKind: 'user', movedByActorName: 'Ana', createdAt: '2026-08-01T00:00:00Z' },
  ] })
})

const renderTab = () => render(<DealsTab contactId="c1" contactName="Mariana" />)

describe('DealsTab no Modelo B (SCRUM-921)', () => {
  it('mostra a ETAPA de cada registro e a contagem de abertos', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deals-open-count')).toHaveTextContent('2 abertos'))
    expect(api.list).toHaveBeenCalledWith('c1')
    expect(screen.getByTestId('deal-stage-d1')).toHaveTextContent('Em atendimento')
    expect(screen.getByTestId('deal-stage-d2')).toHaveTextContent('Proposta')
    expect(screen.getByTestId('deal-open-d1')).toHaveTextContent('Suporte')
    expect(screen.getByTestId('deal-meta-d2')).toHaveTextContent('movido por Renata C. · origem Campanha · Promo Agosto')
  })

  it('dinheiro só em funil de VENDA — registro de processo não mostra R$ 0,00', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deal-open-d1')).toBeInTheDocument())
    expect(screen.queryByTestId('deal-money-d1')).not.toBeInTheDocument()
    expect(screen.getByTestId('deal-money-d2')).toHaveTextContent('2.500,00')
    expect(screen.getByTestId('deal-money-d2')).toHaveTextContent('1 item')
    // e o título próprio do negócio aparece; o do registro de processo (= nome
    // do contato) não se repete dentro da ficha do próprio contato.
    expect(screen.getByTestId('deal-open-d2')).toHaveTextContent('Plano Anual')
  })

  it('"Mover" para etapa normal faz PATCH /deals/:id/stage e recarrega; "Ver no board" abre o funil', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deal-move-d1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('deal-move-d1'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Novo' }))
    await waitFor(() => expect(api.moveStage).toHaveBeenCalledWith('d1', 's1'))
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByTestId('deal-board-d2'))
    expect(navigate).toHaveBeenCalledWith('/contacts?pipeline=v')
  })

  it('o terminal usa o vocabulário do TIPO do funil e pede motivo antes de fechar', async () => {
    api.setStatus.mockResolvedValue({ data: {} })
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deal-move-d1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('deal-move-d1'))
    // funil de processo: "Cancelado", nunca "Perdido"
    expect(screen.queryByRole('menuitem', { name: /Perdido/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: /Cancelado \(com motivo\)/ }))
    await waitFor(() => expect(screen.getByText('Cancelado — motivo')).toBeInTheDocument())
    expect(api.setStatus).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'cancelado_pelo_cliente' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith('d1', { status: 'lost', closeReason: 'cancelado_pelo_cliente', closeNote: undefined }))
  })

  it('fechados mostram terminal e motivo, e "ver histórico" busca as passagens', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deals-closed')).toBeInTheDocument())
    expect(screen.getByTestId('deals-closed')).toHaveTextContent('Suporte · Cancelado')
    expect(screen.getByTestId('deals-closed')).toHaveTextContent('Outro')
    fireEvent.click(screen.getByTestId('deal-history-d3'))
    await waitFor(() => expect(api.history).toHaveBeenCalledWith('d3'))
    const list = await screen.findByTestId('deal-history-list-d3')
    expect(list).toHaveTextContent('entrou em Novo · campanha')
    expect(list).toHaveTextContent('Novo → Cancelado · Ana')
  })

  it('excluir chama DELETE /deals/:id e recarrega', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('deal-delete-d2')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('deal-delete-d2'))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('d2'))
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2))
  })

  it('sem o flag a aba NÃO some: lista os negócios, sem etapa nem mover, com "Novo"', async () => {
    multi.mockReturnValue(false)
    renderTab()
    await waitFor(() => expect(api.list).toHaveBeenCalledWith('c1'))
    expect(await screen.findByTestId('deal-open-d2')).toBeInTheDocument()
    expect(screen.queryByTestId('deal-stage-d2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('deal-move-d2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('deal-board-d2')).not.toBeInTheDocument()
    // sem funil no cache todo negócio é comercial — o valor continua aparecendo
    expect(screen.getByTestId('deal-money-d1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Novo negócio/i })).toBeInTheDocument()
  })
})

// ─── A3 (SCRUM-925) — o estado vazio ganha ação ────────────────────────────
// Antes: "Nenhum registro ainda — use 'Adicionar ao funil'". Texto mandando o
// operador procurar outro botão é o padrão que o roteiro da A3 derrubou.
describe('DealsTab — vazio com ação (A3/925)', () => {
  it('sem nenhum negócio, oferece o botão "Novo negócio" e abre o diálogo de 2 passos', async () => {
    api.list.mockResolvedValue({ data: [] })
    renderTab()
    const btns = await screen.findAllByRole('button', { name: /Novo negócio/ })
    // Um no cabeçalho (menu "Adicionar ao funil" convive) e um no vazio.
    expect(btns.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(btns[btns.length - 1])
    // O diálogo do fluxo compartilhado abre — nada de POST direto.
    await waitFor(() => expect(screen.getByText('Quem e onde')).toBeInTheDocument())
    expect(api.create).not.toHaveBeenCalled()
  })
})
