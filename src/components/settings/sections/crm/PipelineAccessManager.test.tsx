// B5 (SCRUM-931) — UI sobre a API de acesso por setor (B0/SCRUM-940). Cobre:
//   * aviso de `implicitAll` (funil padrão: todo setor enxerga além da lista);
//   * `PUT` manda o conjunto INTEIRO marcado (substitui, nunca faz merge).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Department, Pipeline, User } from '@/types'

const DEPARTMENTS: Department[] = [
  { id: 'd1', tenantId: 't', name: 'Comercial', color: '#6366f1', permissions: [], createdAt: '' },
  { id: 'd2', tenantId: 't', name: 'Suporte', color: '#14b8a6', permissions: [], createdAt: '' },
]

const PIPELINE: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0,
  isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [], openDealsCount: 0,
}

const ADMIN: User = {
  id: 'u1', tenantId: 't', email: 'admin@oryon.com', firstName: 'Ana', lastName: 'Souza',
  role: 'admin', isActive: true,
}

const { pipelines, departments } = vi.hoisted(() => ({
  pipelines: { getAccess: vi.fn(), updateAccess: vi.fn() },
  departments: { list: vi.fn() },
}))
vi.mock('@/services/api', () => ({ pipelinesApi: pipelines, departmentsApi: departments }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: ADMIN }) }))

import { PipelineAccessManager } from './PipelineAccessManager'

beforeEach(() => {
  vi.clearAllMocks()
  departments.list.mockResolvedValue({ data: DEPARTMENTS })
})

describe('PipelineAccessManager', () => {
  it('avisa quando o funil é implicitAll (padrão do tenant) — todo setor já enxerga', async () => {
    pipelines.getAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: true, departmentIds: [] } })
    render(<PipelineAccessManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    expect(await screen.findByText(/todo setor enxerga/i)).toBeInTheDocument()
  })

  it('sem implicitAll, não mostra o aviso', async () => {
    pipelines.getAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: ['d1'] } })
    render(<PipelineAccessManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    await screen.findByText('Comercial')
    expect(screen.queryByText(/todo setor enxerga/i)).toBeNull()
  })

  it('marcar um setor a mais e salvar manda a lista INTEIRA marcada (substitui, não soma)', async () => {
    pipelines.getAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: ['d1'] } })
    pipelines.updateAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: ['d1', 'd2'] } })
    const onChanged = vi.fn()
    render(<PipelineAccessManager pipeline={PIPELINE} onChanged={onChanged} />)
    await screen.findByText('Comercial')

    const comercial = screen.getByRole('checkbox', { name: /Comercial/ })
    const suporte = screen.getByRole('checkbox', { name: /Suporte/ })
    expect(comercial).toBeChecked()
    expect(suporte).not.toBeChecked()

    fireEvent.click(suporte)
    fireEvent.click(screen.getByRole('button', { name: /Salvar acesso/ }))

    await waitFor(() => expect(pipelines.updateAccess).toHaveBeenCalledWith('p1', ['d1', 'd2']))
    expect(onChanged).toHaveBeenCalled()
  })

  it('desmarcar o único setor e salvar manda lista vazia — "ninguém" é uma escolha válida', async () => {
    pipelines.getAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: ['d1'] } })
    pipelines.updateAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: [] } })
    render(<PipelineAccessManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    await screen.findByText('Comercial')

    fireEvent.click(screen.getByRole('checkbox', { name: /Comercial/ }))
    fireEvent.click(screen.getByRole('button', { name: /Salvar acesso/ }))

    await waitFor(() => expect(pipelines.updateAccess).toHaveBeenCalledWith('p1', []))
  })

  it('o botão salvar fica desabilitado até algo mudar', async () => {
    pipelines.getAccess.mockResolvedValue({ data: { pipelineId: 'p1', implicitAll: false, departmentIds: ['d1'] } })
    render(<PipelineAccessManager pipeline={PIPELINE} onChanged={vi.fn()} />)
    await screen.findByText('Comercial')
    expect(screen.getByRole('button', { name: /Salvar acesso/ })).toBeDisabled()
  })
})
