// F7 (SCRUM-865/866) — "Novo funil": tipo + modelo + lista editável, com o
// backend de modelos mockado. Cobre os critérios de aceite da SCRUM-816:
//   * criar "Suporte" (Processo, modelo Suporte) → envia kind + 5 etapas com
//     terminais "Concluído"/"Cancelado"
//   * sem etapa normal → botão desabilitado com hint
//   * erro do backend aparece no formulário
//   * edição: só nome/cor, tipo travado
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const mockTemplates = vi.fn()
vi.mock('@/services/api', () => ({
  pipelinesApi: { templates: (...args: unknown[]) => mockTemplates(...args) },
}))
// F13-904: "Sugerir etapas com IA" — o Hub e a chamada ao agent-server entram
// mockados; o que interessa aqui é o resultado virar rascunho editável.
const mockGenerate = vi.fn()
vi.mock('@/services/companyContextService', () => ({
  loadHubAsync: async () => ({
    companyName: 'Clínica Serra', industry: 'Saúde', businessType: [],
    teamSize: '', description: '', productsServices: '',
  }),
}))
vi.mock('@/services/anthropicService', () => ({
  businessContextFromHub: (hub: unknown) => hub,
  generateCRMConfig: (...args: unknown[]) => mockGenerate(...args),
  parseStreamResult: async () => mockGenerate.result,
}))

import { CreatePipelineModal, type CreatePipelineData } from './CreatePipelineModal'
import type { Pipeline, PipelineTemplate } from '@/types'

const TEMPLATES: PipelineTemplate[] = [
  { key: 'vendas-padrao', kind: 'sales', name: 'Vendas padrão', description: '', isDefault: true, stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'em-negociacao', label: 'Em negociação', color: '#f59e0b' },
    { key: 'ganho', label: 'Ganho', color: '#10b981', isWon: true },
    { key: 'perdido', label: 'Perdido', color: '#ef4444', isLost: true },
  ] },
  { key: 'vendas-em-branco', kind: 'sales', name: 'Vendas em branco', description: '', stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'ganho', label: 'Ganho', color: '#10b981', isWon: true },
    { key: 'perdido', label: 'Perdido', color: '#ef4444', isLost: true },
  ] },
  { key: 'suporte', kind: 'process', name: 'Suporte', description: '', isDefault: true, stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'em-atendimento', label: 'Em atendimento', color: '#f59e0b' },
    { key: 'aguardando-cliente', label: 'Aguardando cliente', color: '#a855f7' },
    { key: 'concluido', label: 'Concluído', color: '#10b981', isWon: true },
    { key: 'cancelado', label: 'Cancelado', color: '#ef4444', isLost: true },
  ] },
  { key: 'onboarding', kind: 'process', name: 'Onboarding', description: '', stages: [
    { key: 'boas-vindas', label: 'Boas-vindas', color: '#6366f1' },
    { key: 'concluido', label: 'Concluído', color: '#10b981', isWon: true },
    { key: 'cancelado', label: 'Cancelado', color: '#ef4444', isLost: true },
  ] },
]

function stageInputs(): HTMLInputElement[] {
  const list = screen.getByRole('list', { name: 'Etapas do funil' })
  return within(list).getAllByRole('textbox') as HTMLInputElement[]
}

async function renderOpen(onSave = vi.fn<(d: CreatePipelineData) => Promise<void>>(async () => {}), editPipeline: Pipeline | null = null) {
  const onClose = vi.fn()
  render(<CreatePipelineModal open onClose={onClose} onSave={onSave} editPipeline={editPipeline} />)
  if (!editPipeline) await waitFor(() => expect(screen.getByRole('list', { name: 'Etapas do funil' })).toBeInTheDocument())
  return { onSave, onClose }
}

beforeEach(() => {
  mockTemplates.mockReset().mockResolvedValue({ data: TEMPLATES })
})

describe('CreatePipelineModal — criação (F7)', () => {
  it('abre em Vendas com o modelo padrão do tipo carregado (uma chamada a /templates)', async () => {
    await renderOpen()
    expect(mockTemplates).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('pipeline-kind-sales')).toHaveAttribute('aria-checked', 'true')
    expect(stageInputs().map((i) => i.value)).toEqual(['Novo', 'Em negociação', 'Ganho', 'Perdido'])
    const select = screen.getByRole('combobox', { name: 'Modelo de etapas' }) as HTMLSelectElement
    expect(select.value).toBe('vendas-padrao')
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['vendas-padrao', 'vendas-em-branco'])
  })

  it('o rótulo "Nome do funil" está associado ao campo (onda 1 da auditoria de interface)', async () => {
    // Prova num call site REAL que a correção do FormField chega às ~75
    // chamadas sem nenhuma delas mudar: antes, este `getByLabelText` falhava.
    await renderOpen()

    const input = screen.getByLabelText(/Nome do funil/)
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  it('trocar para Processo troca o vocabulário: modelo Suporte, terminais Concluído/Cancelado, só modelos de processo', async () => {
    await renderOpen()
    fireEvent.click(screen.getByTestId('pipeline-kind-process'))
    expect(screen.getByTestId('pipeline-kind-process')).toHaveAttribute('aria-checked', 'true')
    expect(stageInputs().map((i) => i.value)).toEqual(['Novo', 'Em atendimento', 'Aguardando cliente', 'Concluído', 'Cancelado'])
    const select = screen.getByRole('combobox', { name: 'Modelo de etapas' }) as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['suporte', 'onboarding'])
    // Terminais: fixos (sem botão de remover) e renomeáveis
    expect(screen.getAllByText('fixo · renomeável')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Remover etapa Concluído/ })).toBeNull()
  })

  it('critério: criar "Suporte" (Processo, modelo Suporte) envia kind=process + 5 etapas com os terminais certos', async () => {
    const { onSave, onClose } = await renderOpen()
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'Suporte' } })
    fireEvent.click(screen.getByTestId('pipeline-kind-process'))
    const submit = screen.getByTestId('create-pipeline-submit')
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const dto = onSave.mock.calls[0][0]
    expect(dto).toMatchObject({ name: 'Suporte', kind: 'process' })
    expect(dto.stages).toHaveLength(5)
    expect(dto.stages?.map((s) => s.label)).toEqual(['Novo', 'Em atendimento', 'Aguardando cliente', 'Concluído', 'Cancelado'])
    expect(dto.stages?.filter((s) => s.isWon).map((s) => s.label)).toEqual(['Concluído'])
    expect(dto.stages?.filter((s) => s.isLost).map((s) => s.label)).toEqual(['Cancelado'])
    expect(dto.stages?.every((s) => !('key' in s))).toBe(true)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('critério: sem etapa normal o botão fica desabilitado com hint; "adicionar etapa" reabilita', async () => {
    await renderOpen()
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'X' } })
    // remove as duas normais do modelo Vendas padrão
    fireEvent.click(screen.getByRole('button', { name: 'Remover etapa Novo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover etapa Em negociação' }))
    expect(stageInputs().map((i) => i.value)).toEqual(['Ganho', 'Perdido'])
    expect(screen.getByTestId('create-pipeline-submit')).toBeDisabled()
    expect(screen.getByTestId('create-pipeline-hint')).toHaveTextContent('pelo menos uma etapa normal')

    fireEvent.click(screen.getByRole('button', { name: /adicionar etapa/ }))
    // nova etapa nasce sem nome → ainda bloqueado, hint muda
    expect(screen.getByTestId('create-pipeline-submit')).toBeDisabled()
    expect(screen.getByTestId('create-pipeline-hint')).toHaveTextContent('Toda etapa precisa de um nome')
    fireEvent.change(stageInputs()[0], { target: { value: 'Triagem' } })
    expect(screen.getByTestId('create-pipeline-submit')).toBeEnabled()
    // a nova etapa entrou ANTES dos terminais
    expect(stageInputs().map((i) => i.value)).toEqual(['Triagem', 'Ganho', 'Perdido'])
  })

  it('terminal é renomeável e o rótulo novo vai no payload com isWon', async () => {
    const { onSave } = await renderOpen()
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'Matrículas' } })
    const won = screen.getByRole('textbox', { name: 'Etapa terminal (Ganho)' })
    fireEvent.change(won, { target: { value: 'Matriculado' } })
    fireEvent.click(screen.getByTestId('create-pipeline-submit'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const dto = onSave.mock.calls[0][0]
    expect(dto.stages?.find((s) => s.isWon)?.label).toBe('Matriculado')
  })

  it('erro do backend aparece no formulário e o modal continua aberto', async () => {
    const onSave = vi.fn(async () => { throw { response: { data: { message: 'O funil precisa de exatamente 1 etapa Ganho.' } } } })
    const { onClose } = await renderOpen(onSave)
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'X' } })
    fireEvent.click(screen.getByTestId('create-pipeline-submit'))
    await waitFor(() => expect(screen.getByText('O funil precisa de exatamente 1 etapa Ganho.')).toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('backend sem /templates (404): cai no rascunho mínimo do tipo e ainda dá para criar', async () => {
    mockTemplates.mockRejectedValue({ response: { status: 404 } })
    const { onSave } = await renderOpen()
    expect(stageInputs().map((i) => i.value)).toEqual(['Novo', 'Ganho', 'Perdido'])
    expect(screen.queryByRole('combobox', { name: 'Modelo de etapas' })).toBeNull()
    expect(screen.getByText(/Modelos indisponíveis neste ambiente/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'X' } })
    fireEvent.click(screen.getByTestId('create-pipeline-submit'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

describe('CreatePipelineModal — edição', () => {
  const PIPE: Pipeline = {
    id: 'p1', tenantId: 't', name: 'Onboarding', color: '#14b8a6', order: 0, isDefault: false, isArchived: false,
    kind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, stages: [], openDealsCount: 0,
  }

  it('mostra nome/cor, trava o tipo no valor atual, não busca modelos e envia só nome/cor', async () => {
    const { onSave } = await renderOpen(undefined, PIPE)
    expect(mockTemplates).not.toHaveBeenCalled()
    expect(screen.getByText('Editar funil')).toBeInTheDocument()
    expect(screen.getByTestId('pipeline-kind-process')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('pipeline-kind-sales')).toBeDisabled()
    expect(screen.queryByRole('list', { name: 'Etapas do funil' })).toBeNull()
    fireEvent.change(screen.getByDisplayValue('Onboarding'), { target: { value: 'Onboarding 2' } })
    fireEvent.click(screen.getByTestId('create-pipeline-submit'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'Onboarding 2', color: '#14b8a6' }))
  })
})

// ── F13-904 — sugestão de etapas por IA no "Novo funil" ─────────────────────
describe('CreatePipelineModal — sugerir etapas com IA (F13-904)', () => {
  it('substitui as etapas normais pelo que a IA sugeriu, mantendo os terminais do tipo', async () => {
    mockGenerate.result = {
      stages: [
        { label: 'Triagem', color: '#111111' },
        { label: 'Orçamento' },
        { label: 'Fechado', isTerminal: true },
      ],
      customFields: [],
    }
    await renderOpen()

    fireEvent.click(screen.getByTestId('suggest-stages-ai'))

    await waitFor(() => expect(stageInputs()[0].value).toBe('Triagem'))
    const labels = stageInputs().map((i) => i.value)
    // Normais vieram da IA; terminais continuam sendo os de Vendas.
    expect(labels).toEqual(['Triagem', 'Orçamento', 'Ganho', 'Perdido'])
  })

  it('falha na sugestão vira aviso — o rascunho do modelo continua utilizável', async () => {
    mockGenerate.mockImplementation(() => { throw new Error('agent-server fora') })
    await renderOpen()
    fireEvent.change(screen.getByPlaceholderText(/Ex: Suporte/), { target: { value: 'Suporte' } })
    const antes = stageInputs().map((i) => i.value)

    fireEvent.click(screen.getByTestId('suggest-stages-ai'))

    await waitFor(() => expect(screen.getByText(/Não foi possível sugerir etapas/)).toBeInTheDocument())
    expect(stageInputs().map((i) => i.value)).toEqual(antes)
    expect(screen.getByTestId('create-pipeline-submit')).not.toBeDisabled()
  })

  it('não aparece na edição — lá só se muda nome e cor', async () => {
    await renderOpen(vi.fn(async () => {}), { id: 'p1', name: 'Vendas', color: '#6366f1', kind: 'sales' } as never)

    expect(screen.queryByTestId('suggest-stages-ai')).toBeNull()
  })
})
