// F9 (SCRUM-874/877/879) — o fluxo compartilhado "Adicionar ao funil", com a
// API mockada. Cobre os critérios de aceite da SCRUM-818:
//   * processo pela conversa → POST /deals com originConversationId, toast
//     com "Ver no board"
//   * 2ª tentativa no mesmo funil → 409 open_exists → modal de conflito;
//     cada saída produz o efeito esperado (abrir a FICHA/B2-928 · mover p/ 1ª
//     etapa · fechar com motivo + abrir novo)
//   * venda → abre o "Novo negócio" de 2 passos (mockado) com o funil
//     pré-selecionado. Era o DealModal até a A3 (SCRUM-925) — que é o
//     formulário de EDIÇÃO e não tem campo de valor.
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
// O stub expoe os callbacks: desde 09/09 o dialogo serve TAMBEM o funil de
// processo (e a confirmacao do "Adicionar ao funil"), entao os testes precisam
// simular criacao, conflito e a caixa "nao perguntar de novo".
vi.mock('@/components/deals/NewDealDialog', () => ({
  NewDealDialog: (p: {
    initialPipelineId?: string | null
    originConversationId?: string | null
    contactName?: string | null
    dontAskAgain?: { label: string; checked: boolean; onChange: (v: boolean) => void }
    onCreated: (d: unknown) => void
  }) => (
    <div data-testid="new-deal-dialog">
      {p.initialPipelineId} · {p.originConversationId ?? '-'} · {p.contactName}
      {p.dontAskAgain && (
        <label>
          <input
            type="checkbox"
            checked={p.dontAskAgain.checked}
            onChange={(e) => p.dontAskAgain?.onChange(e.target.checked)}
          />
          {p.dontAskAgain.label}
        </label>
      )}
      <button onClick={() => p.onCreated({ id: 'd-new', stageId: 's1' })}>stub-criar</button>
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
const conflict409 = { response: { status: 409, data: { message: 'Já existe um negócio aberto para este contato neste funil.', code: 'open_exists', openDealId: 'd-old', pipelineId: 'p' } } }

function Harness({ target, onCreated }: { target: AddToPipelineTarget; onCreated?: (d: Deal) => void }) {
  const { requestAdd, dialogs } = useAddToPipeline({ onCreated })
  return (
    <>
      <button onClick={() => void requestAdd(target)}>add</button>
      {dialogs}
    </>
  )
}

/** Dispensa a confirmacao naquele funil — devolve o 1 clique de antes. */
const dispensarFunil = (id: string) =>
  localStorage.setItem('oryon.pipeline.skip-confirm', JSON.stringify([id]))

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  navigate.mockReset(); toast.mockReset(); openDeal.mockReset()
  api.get.mockResolvedValue({ data: EXISTING })
  // A dispensa ("nao perguntar de novo") mora no localStorage: sem limpar, um
  // teste que marca a caixa dispensaria a confirmacao nos seguintes.
  localStorage.clear()
})

describe('useAddToPipeline (F9)', () => {
  it('processo pela conversa: cria o registro ligado à conversa e avisa com "Ver no board"', async () => {
    api.create.mockResolvedValue({ data: { id: 'd-new', contactId: 'c1', title: 'Mariana', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 0 } })
    const onCreated = vi.fn()
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} onCreated={onCreated} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ contactId: 'c1', title: 'Mariana', pipelineId: 'p', originConversationId: 'conv-1' }))
    await waitFor(() => expect(toast).toHaveBeenCalled())
    const [msg, type, action] = toast.mock.calls[0]
    expect(msg).toBe('Mariana entrou em Suporte · Novo chamado.')
    expect(type).toBe('success')
    expect(action.label).toBe('Ver no board')
    action.onClick()
    expect(navigate).toHaveBeenCalledWith('/pipelines/p')
    expect(onCreated).toHaveBeenCalled()
    expect(screen.queryByTestId('deal-modal')).toBeNull()
  })

  it('ficha/tabela (sem conversa): POST sem originConversationId', async () => {
    api.create.mockResolvedValue({ data: { ...EXISTING, id: 'd-new', stageId: 's1' } })
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ contactId: 'c1', title: 'Mariana', pipelineId: 'p' }))
  })

  it('409 open_exists → modal de conflito com o registro existente; "abrir o existente" abre a FICHA (B2/928)', async () => {
    api.create.mockRejectedValue(conflict409)
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByText('Já existe um registro aberto')).toBeInTheDocument())
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('d-old'))
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toHaveTextContent('na etapa Aguardando cliente'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(openDeal).toHaveBeenCalledWith('d-old'))
    expect(navigate).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalledWith(expect.anything(), 'error')
  })

  it('"mover o existente para a 1ª etapa" chama PATCH /deals/:id/stage com a 1ª etapa normal', async () => {
    api.create.mockRejectedValue(conflict409)
    api.moveStage.mockResolvedValue({ data: { ...EXISTING, stageId: 's1' } })
    const onCreated = vi.fn()
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} onCreated={onCreated} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('conflict-move_to_first'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(api.moveStage).toHaveBeenCalledWith('d-old', 's1'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Mariana voltou para Novo chamado em Suporte.', 'success', expect.anything()))
    expect(onCreated).toHaveBeenCalled()
    expect(api.create).toHaveBeenCalledTimes(1)
  })

  it('"fechar e abrir novo" pede o motivo, fecha o existente (setStatus lost + motivo) e cria o novo', async () => {
    api.create.mockRejectedValueOnce(conflict409).mockResolvedValueOnce({ data: { ...EXISTING, id: 'd-new', stageId: 's1' } })
    api.setStatus.mockResolvedValue({ data: { ...EXISTING, status: 'lost' } })
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('conflict-close_and_new'))
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    // modal de motivo (catálogo do funil, só motivos de perda)
    await waitFor(() => expect(screen.getByText('Cancelado — motivo')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'cancelado_pelo_cliente' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith('d-old', { status: 'lost', closeReason: 'cancelado_pelo_cliente', closeNote: undefined }))
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2))
    expect(api.create).toHaveBeenLastCalledWith({ contactId: 'c1', title: 'Mariana', pipelineId: 'p', originConversationId: 'conv-1' })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Mariana entrou em Suporte · Novo chamado.', 'success', expect.anything()))
  })

  it('funil de venda abre o "Novo negócio" com o funil pré-selecionado e a conversa de origem (sem POST direto)', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: VENDAS, conversationId: 'conv-1' }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toHaveTextContent('v · conv-1 · Mariana'))
    expect(api.create).not.toHaveBeenCalled()
  })

  // ─── Confirmação antes de criar em PROCESSO (09/09) ──────────────────────
  // O clique num item do menu criava o registro na hora, e o operador só via o
  // resultado no toast — depois do fato. Como a API não tem `delete`, o clique
  // errado é irreversível pela interface. A confirmação é o PRÓPRIO diálogo de
  // criação, pré-preenchido: uma superfície só para o mesmo gesto.
  it('processo abre o diálogo pré-preenchido e NÃO cria nada antes', async () => {
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE, conversationId: 'conv-1' }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toHaveTextContent('p · conv-1 · Mariana'))
    expect(api.create).not.toHaveBeenCalled()
  })

  it('a confirmação de processo oferece a dispensa; a de venda não', async () => {
    const { unmount } = render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByLabelText('Não perguntar de novo em Suporte')).toBeInTheDocument())
    unmount()

    // Em venda o formulário nunca foi atalho de nada — não há 1 clique a devolver.
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: VENDAS }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    expect(screen.queryByLabelText(/Não perguntar de novo/)).toBeNull()
  })

  // O acidente acontece no funil que se usa pouco; a repetição, no que se usa
  // todo dia. A dispensa por funil separa os dois casos.
  it('"não perguntar de novo" devolve o 1 clique NAQUELE funil', async () => {
    api.create.mockResolvedValue({ data: { ...EXISTING, id: 'd-new', stageId: 's1' } })
    const { unmount } = render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Não perguntar de novo em Suporte'))
    fireEvent.click(screen.getByText('stub-criar'))
    unmount()

    // Segunda vez, no MESMO funil: cria direto, sem passar pelo diálogo.
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ contactId: 'c1', title: 'Mariana', pipelineId: 'p' }))
    expect(screen.queryByTestId('new-deal-dialog')).toBeNull()
  })

  // Marcar a caixa e fechar no X não pode devolver o 1 clique em silêncio: a
  // dispensa vale para o gesto que foi ATÉ O FIM.
  it('marcar a caixa e fechar sem criar NÃO dispensa nada', async () => {
    const { unmount } = render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Não perguntar de novo em Suporte'))
    unmount()

    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    expect(api.create).not.toHaveBeenCalled()
  })

  it('a dispensa vale só para o funil dispensado', async () => {
    dispensarFunil('outro-funil')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('new-deal-dialog')).toBeInTheDocument())
    expect(api.create).not.toHaveBeenCalled()
  })

  it('erro que não é conflito vira toast de erro', async () => {
    api.create.mockRejectedValue({ response: { status: 400, data: { message: 'Funil arquivado.' } } })
    dispensarFunil('p')
    render(<Harness target={{ contactId: 'c1', contactName: 'Mariana', pipeline: SUPORTE }} />)
    fireEvent.click(screen.getByText('add'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Funil arquivado.', 'error'))
    expect(screen.queryByText('Já existe um registro aberto')).toBeNull()
  })
})
