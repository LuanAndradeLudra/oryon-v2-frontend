// F9 (SCRUM-876) — dropdown "Adicionar ao funil": funis ativos com ícone do
// tipo; onde o contato já tem registro aberto → desabilitado "já está · etapa";
// registros abertos por GET /deals?contactId= ao abrir; nada sem o flag.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockList = vi.fn()
vi.mock('@/services/api', () => ({ dealsApi: { list: (...a: unknown[]) => mockList(...a) } }))
const mockMulti = vi.fn(() => true)
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => mockMulti() }))
const mockPipelines = vi.fn()
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: mockPipelines() }) }))

import { AddToPipelineMenu } from './AddToPipelineMenu'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const st = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order: 0, isWon: false, isLost: false, ...extra })
const pipe = (id: string, name: string, kind: 'sales' | 'process', extra: Partial<Pipeline> = {}): Pipeline => ({
  id, tenantId: 't', name, color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind, openDealsCount: 0,
  stages: [st(`${id}-s1`, 'Novo chamado', { order: 0 }), st(`${id}-s2`, 'Concluído', { order: 1, isWon: true }), st(`${id}-s3`, 'Cancelado', { order: 2, isLost: true })],
  ...extra,
})
const PIPES = [pipe('vendas', 'Vendas', 'sales'), pipe('suporte', 'Suporte', 'process'), pipe('arq', 'Arquivado', 'process', { isArchived: true })]

beforeEach(() => {
  mockList.mockReset().mockResolvedValue({ data: [] })
  mockMulti.mockReturnValue(true)
  mockPipelines.mockReturnValue(PIPES)
})

describe('AddToPipelineMenu (F9)', () => {
  it('lista só funis ativos com o tipo, busca os registros abertos ao abrir e chama onPick', async () => {
    const onPick = vi.fn()
    render(<AddToPipelineMenu contactId="c1" contactName="Mariana Souza" onPick={onPick} />)
    fireEvent.click(screen.getByTestId('add-to-pipeline-trigger'))
    expect(screen.getByText('Adicionar Mariana ao funil')).toBeInTheDocument()
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('c1'))
    expect(screen.getByTestId('add-to-pipeline-vendas')).toBeInTheDocument()
    expect(screen.getByTestId('add-to-pipeline-suporte')).toBeInTheDocument()
    expect(screen.queryByTestId('add-to-pipeline-arq')).toBeNull()
    expect(screen.getByLabelText('Processo')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('add-to-pipeline-suporte')).toBeEnabled())
    fireEvent.click(screen.getByTestId('add-to-pipeline-suporte'))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'suporte' }))
  })

  it('funil em que o contato já tem registro aberto fica desabilitado com "já está · etapa"', async () => {
    const open: Deal = { id: 'd1', contactId: 'c1', title: 'x', status: 'open', pipelineId: 'suporte', stageId: 'suporte-s1', amountCents: 0 }
    mockList.mockResolvedValue({ data: [open, { ...open, id: 'd2', pipelineId: 'vendas', status: 'won' }] })
    render(<AddToPipelineMenu contactId="c1" contactName="Mariana" onPick={vi.fn()} />)
    fireEvent.click(screen.getByTestId('add-to-pipeline-trigger'))
    await waitFor(() => expect(screen.getByTestId('add-to-pipeline-suporte')).toBeDisabled())
    expect(screen.getByTestId('add-to-pipeline-suporte')).toHaveTextContent('já está · Novo chamado')
    // registro fechado (won) em Vendas não conta como "já está"
    expect(screen.getByTestId('add-to-pipeline-vendas')).toBeEnabled()
    expect(screen.getByText(/Em funil de venda abre o formulário/)).toBeInTheDocument()
  })

  it('aceita os registros abertos por prop (sem fetch) e explica onde o registro nasce em processo', () => {
    render(<AddToPipelineMenu contactId="c1" contactName="Mariana" onPick={vi.fn()} openDeals={[]} />)
    fireEvent.click(screen.getByTestId('add-to-pipeline-trigger'))
    expect(mockList).not.toHaveBeenCalled()
    expect(screen.getByText(/nasce em/)).toHaveTextContent('Em Suporte o registro nasce em Novo chamado ligado a esta origem.')
  })

  it('não renderiza nada sem o flag de múltiplos funis', () => {
    mockMulti.mockReturnValue(false)
    const { container } = render(<AddToPipelineMenu contactId="c1" contactName="Mariana" onPick={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
