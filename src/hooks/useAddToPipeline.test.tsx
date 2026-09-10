// F9 (SCRUM-874/877/879) — o fluxo compartilhado "Adicionar ao funil", com a
// API mockada. Cobre os critérios de aceite da SCRUM-818:
//   * o registro nasce ligado à conversa (`originConversationId`) e o sucesso
//     avisa com toast + "Ver no board";
//   * `409 open_exists` → modal de conflito; cada saída produz o efeito
//     esperado (abrir a FICHA/B2-928 · mover p/ 1ª etapa · fechar com motivo e
//     abrir novo);
//   * os dois tipos de funil abrem o "Novo negócio" (mockado) pré-preenchido.
//
// 09/09: o funil de PROCESSO deixou de criar em um clique. O gesto abre o mesmo
// diálogo de criação, que passa a ser a CONFIRMAÇÃO — não há desfazer (a API
// não tem `delete`), então nada pode ser criado antes de o operador ver onde.
// Por isso o POST do caminho normal é do DIÁLOGO, não do hook: aqui o stub o
// simula pelo `onCreated`. O hook só posta sozinho ao reabrir depois de um
// conflito ("fechar e abrir novo" / "abrir outro").
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.mock é içado para o topo do arquivo — os mocks precisam nascer via vi.hoisted.
const { api, navigate, toast, openDeal } = vi.hoisted(() => ({
  api: { create: vi.fn(), get: vi.fn(), moveStage: vi.fn(), setStatus: vi.fn() },
  navigate: vi.fn(),
  toast: vi.fn(),
  openDeal: vi.fn(),
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [] }) }))
// B2 (SCRUM-928): "abrir o existente" passa a abrir a ficha (painel), não mais navegar ao board.
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))
// O stub expõe os dois desfechos do diálogo — criou, ou bateu no 409 —, que é
// por onde o fluxo continua desde que a criação saiu do hook.
vi.mock('@/components/deals/NewDealDialog', () => ({
  NewDealDialog: (p: {
    initialPipelineId?: string | null
    originConversationId?: string | null
    contactName?: string | null
    onCreated: (d: unknown) => void
    onConflict?: (i: { openDealId: string; pipelineId: string; contactId: string; contactName: string }) => void
  }) => (
    <div data-testid="new-deal-dialog">
      {p.initialPipelineId} · {p.originConversationId ?? '-'} · {p.contactName}
      <button onClick={() => p.onCreated({ id: 'd-new', stageId: 's1' })}>stub-criar</button>
      <button onClick={() => p.onConflict?.({ openDealId: 'd-old', pipelineId: 'p', contactId: 'c1', contactName: 'Mariana' })}>
        stub-conflito
      </button>
    </div>
  ),
}))

import { useAddToPipeline, type AddToPipelineTarget } from './useAddToPipeline'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const st = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order: 0, isWon: false, isLost: false, ...extra })
const SUPORTE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process',
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, openDealsCount: 0,
  closeReasons: [{ key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente', outcome: 'lost' }, { key: 'outro', label: 'Outro', outcome: 'any' }],
  stages: [st('s1', 'Novo chamado', { order: 0 }), st('s2', 'Aguardando cliente', { order: 1 }), st('s3', 'Concluído', { order: 2, isWon: true }), st('s4', 'Cancelado', { order: 3, isLost: true })],
}
const VENDAS: Pipeline = { ...SUPORTE, id: 'v', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' } }
const EXISTING: Deal = { id: 'd-old', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0 }

function Harness({ target, onCreated }: { target: AddToPipelineTarget; onCreated?: (d: Deal) => void }) {
  const { requestAdd, dialogs } = useAddToPipeline({ onCreated })
  return (
    <>
      <button onClick={() => void requestAdd(target)}>add</button>
      {dialogs}
    </>
  )
}

/** Chega ao modal de conflito pelo 409 que o diálogo devolve. */
const irAoConflito = async () => {
  fireEvent.click(screen.getByText('add'))
  await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
  fireEvent.click(screen.getByText('stub-conflito'))
  await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument())
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  navigate.mockReset(); toast.mockReset(); openDeal.mockReset()
  api.get.mockResolvedValue({ data: EXISTING })
})

describe('useAddToPipeline — nada nasce sem confirmação', () => {
  // O clique num funil de processo criava o registro na hora, e o operador só
  // via o resultado no toast — depois do fato, e sem desfazer.
  it('processo abre o diálogo pré-preenchido e NÃO cria nada antes', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toHaveTextContent('p · conv-1 · Mariana'))
    expect(api.create).not.toHaveBeenCalled()
  })

  it('venda também abre o diálogo, com o funil e a conversa de origem', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: VENDAS, conversationId: 'conv-1' }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toHaveTextContent('v · conv-1 · Mariana'))
    expect(api.create).not.toHaveBeenCalled()
  })

  it('ficha/tabela (sem conversa): o diálogo abre sem origem', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toHaveTextContent('p · - · Mariana'))
  })

  it('criado: fecha o diálogo, avisa com "Ver no board" e devolve o registro', async () => {
    const onCreated = vi.fn()
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} onCreated={onCreated} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByText('stub-criar'))
    await waitFor(() => expect(toast).toHaveBeenCalled())
    const [msg, type, action] = toast.mock.calls[0]
    expect(msg).toBe('Mariana entrou em Suporte · Novo chamado.')
    expect(type).toBe('success')
    expect(action.label).toBe('Ver no board')
    action.onClick()
    expect(navigate).toHaveBeenCalledWith('/pipelines/p')
    expect(onCreated).toHaveBeenCalled()
    expect(screen.queryByTestId('new-deal-dialog')).toBeNull()
  })
})

describe('useAddToPipeline — conflito I1', () => {
  it('409 open_exists → modal de conflito com o registro existente; "abrir o existente" abre a FICHA (B2/928)', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    await irAoConflito()
    await waitFor(() => expect(screen.getByText('Já existe um registro aberto')).toBeInTheDocument())
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('d-old'))
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent('na etapa Aguardando cliente')
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(openDeal).toHaveBeenCalledWith('d-old'))
    expect(navigate).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalledWith(expect.anything(), 'error')
  })

  it('"mover o existente para a 1ª etapa" chama PATCH /deals/:id/stage com a 1ª etapa normal', async () => {
    api.moveStage.mockResolvedValue({ data: { ...EXISTING, stageId: 's1' } })
    const onCreated = vi.fn()
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} onCreated={onCreated} />)
    await irAoConflito()
    fireEvent.click(screen.getByTestId('conflict-move_to_first'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(api.moveStage).toHaveBeenCalledWith('d-old', 's1'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Mariana voltou para Novo chamado em Suporte.', 'success', expect.anything()))
    expect(onCreated).toHaveBeenCalled()
    // Mover não cria nada: o registro é o que já existia.
    expect(api.create).not.toHaveBeenCalled()
  })

  // Aqui o hook posta sozinho — é a única criação que não passa pelo diálogo,
  // porque o operador já decidiu (fechar o anterior e abrir outro).
  it('"fechar e abrir novo" pede o motivo, fecha o existente (setStatus lost + motivo) e cria o novo', async () => {
    api.create.mockResolvedValue({ data: { ...EXISTING, id: 'd-new', stageId: 's1' } })
    api.setStatus.mockResolvedValue({ data: { ...EXISTING, status: 'lost' } })
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} />)
    await irAoConflito()
    fireEvent.click(screen.getByTestId('conflict-close_and_new'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    // modal de motivo (catálogo do funil, só motivos de perda)
    await waitFor(() => expect(screen.getByText('Cancelado — motivo')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'cancelado_pelo_cliente' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith('d-old', { status: 'lost', closeReason: 'cancelado_pelo_cliente', closeNote: undefined }))
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ contactId: 'c1', title: 'Mariana', pipelineId: 'p', originConversationId: 'conv-1' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Mariana entrou em Suporte · Novo chamado.', 'success', expect.anything()))
  })

  it('erro que não é conflito, ao fechar e abrir novo, vira toast de erro', async () => {
    api.setStatus.mockResolvedValue({ data: { ...EXISTING, status: 'lost' } })
    api.create.mockRejectedValue({ response: { status: 400, data: { message: 'Funil arquivado.' } } })
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    await irAoConflito()
    fireEvent.click(screen.getByTestId('conflict-close_and_new'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(screen.getByText('Cancelado — motivo')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'cancelado_pelo_cliente' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    // A mensagem do servidor ganha do texto genérico do hook — `getApiErrorMessage`
    // só cai no fallback quando o backend não diz nada.
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Funil arquivado.', 'error'))
  })
})
