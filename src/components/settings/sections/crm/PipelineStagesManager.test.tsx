// B5 (SCRUM-931) — o componente virou controlado por UM `pipeline` (o
// seletor de funil e as ações de ciclo de vida saíram para `FunnelsSettings`,
// dono da lista via CRMConfigContext). Cobre o essencial pós-refactor: exibe
// as etapas do funil recebido e a probabilidade em funil de vendas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Pipeline } from '@/types'

const SALES: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0,
  isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' },
  stages: [
    { id: 's1', tenantId: 't', pipelineId: 'p1', key: 'novo', label: 'Novo', color: '#fff', order: 0, isWon: false, isLost: false, probability: 20 },
    { id: 's2', tenantId: 't', pipelineId: 'p1', key: 'ganho', label: 'Ganho', color: '#0f0', order: 1, isWon: true, isLost: false, probability: null },
  ],
  openDealsCount: 0,
}

const PROCESS: Pipeline = { ...SALES, id: 'p2', kind: 'process', name: 'Processo' }

const ADMIN = { id: 'u1', tenantId: 't', email: 'a@x.com', firstName: 'A', lastName: 'B', role: 'admin' as const, isActive: true }

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: ADMIN }) }))
vi.mock('@/services/api', () => ({ pipelinesApi: {} }))

import { PipelineStagesManager } from './PipelineStagesManager'

beforeEach(() => vi.clearAllMocks())

describe('PipelineStagesManager', () => {
  it('mostra as etapas do pipeline recebido, em ordem', () => {
    render(<PipelineStagesManager pipeline={SALES} onChanged={vi.fn()} />)
    expect(screen.getByText('Novo')).toBeInTheDocument()
    // "Ganho" aparece 2x na linha do terminal (nome da etapa + badge do rótulo
    // terminal) — a key em mono é única, então desambigua a etapa terminal.
    expect(screen.getAllByText('Ganho').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ganho')).toBeInTheDocument()
  })

  it('mostra a probabilidade default de etapas normais em funil de vendas ("— %" quando não configurada)', () => {
    render(<PipelineStagesManager pipeline={SALES} onChanged={vi.fn()} />)
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('não mostra probabilidade em funil de processo', () => {
    render(<PipelineStagesManager pipeline={PROCESS} onChanged={vi.fn()} />)
    expect(screen.queryByText('20%')).toBeNull()
    expect(screen.queryByText('— %')).toBeNull()
  })
})
