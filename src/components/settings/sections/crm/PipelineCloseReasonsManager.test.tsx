// B5 (SCRUM-931, D0-8) — motivos de fechamento editáveis por tenant e o
// interruptor do campo livre. Cobre os critérios de aceite: desativar tira o
// motivo da lista sem excluir a linha (histórico intacto); o interruptor liga/
// desliga `allowFreeCloseReason` do FUNIL selecionado (não do kind).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Pipeline, PipelineCloseReason, User } from '@/types'

const REASONS: PipelineCloseReason[] = [
  { id: 'r1', key: 'fechou', label: 'Fechou', outcome: 'won', order: 0, active: true },
  { id: 'r2', key: 'sem_interesse', label: 'Sem interesse', outcome: 'lost', order: 1, active: true },
]

const PIPELINE: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0,
  isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [],
  openDealsCount: 0, allowFreeCloseReason: false,
}

const ADMIN: User = {
  id: 'u1', tenantId: 't', email: 'admin@oryon.com', firstName: 'Ana', lastName: 'Souza',
  role: 'admin', isActive: true,
}

const { pipelines } = vi.hoisted(() => ({
  pipelines: {
    manageCloseReasons: vi.fn(),
    createCloseReason: vi.fn(),
    updateCloseReason: vi.fn(),
    reorderCloseReasons: vi.fn(),
    update: vi.fn(),
  },
}))
vi.mock('@/services/api', () => ({ pipelinesApi: pipelines }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: ADMIN }) }))

import { PipelineCloseReasonsManager } from './PipelineCloseReasonsManager'

beforeEach(() => {
  vi.clearAllMocks()
  pipelines.manageCloseReasons.mockResolvedValue({ data: REASONS })
})

describe('PipelineCloseReasonsManager', () => {
  it('lista os motivos do kind do funil selecionado', async () => {
    render(<PipelineCloseReasonsManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    expect(await screen.findByText('Fechou')).toBeInTheDocument()
    expect(screen.getByText('Sem interesse')).toBeInTheDocument()
    expect(pipelines.manageCloseReasons).toHaveBeenCalledWith('sales')
  })

  it('desativar um motivo chama update({active:false}) sem excluir a linha', async () => {
    pipelines.updateCloseReason.mockResolvedValue({ data: { ...REASONS[1], active: false } })
    render(<PipelineCloseReasonsManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    await screen.findByText('Sem interesse')

    const switches = screen.getAllByRole('switch')
    // 2 motivos + 1 interruptor de campo livre no fim — o do 2º motivo é o índice 1.
    fireEvent.click(switches[1])

    await waitFor(() => expect(pipelines.updateCloseReason).toHaveBeenCalledWith('r2', { active: false }))
  })

  it('cria um motivo novo com o kind do funil selecionado', async () => {
    pipelines.createCloseReason.mockResolvedValue({ data: { id: 'r3', key: 'preco', label: 'Preço', outcome: 'lost', order: 2, active: true } })
    render(<PipelineCloseReasonsManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    await screen.findByText('Fechou')

    fireEvent.click(screen.getByRole('button', { name: /Novo motivo/ }))
    fireEvent.change(screen.getByPlaceholderText('Nome do motivo'), { target: { value: 'Preço' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(pipelines.createCloseReason).toHaveBeenCalledWith({ kind: 'sales', label: 'Preço', outcome: 'lost' }))
  })

  it('o interruptor de campo livre reflete e atualiza allowFreeCloseReason do FUNIL selecionado', async () => {
    pipelines.update.mockResolvedValue({ data: { ...PIPELINE, allowFreeCloseReason: true } })
    const onChanged = vi.fn()
    render(<PipelineCloseReasonsManager pipeline={PIPELINE} onChanged={onChanged} />)
    await screen.findByText('Fechou')

    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[switches.length - 1])

    await waitFor(() => expect(pipelines.update).toHaveBeenCalledWith('p1', { allowFreeCloseReason: true }))
    expect(onChanged).toHaveBeenCalled()
  })
})
