// B5 (SCRUM-931) — critérios de aceite cobertos aqui:
//   * "Funil de processo não exibe a seção Vendas."
//   * "Criar/excluir funil só em Configurações, com gate de papel" — as
//     ações de ciclo de vida (Novo/Renomear/Arquivar/Excluir) somem para
//     quem não é admin-tier; a tela continua legível (só uso).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Pipeline, User } from '@/types'

const SALES: Pipeline = {
  id: 'p-sales', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0,
  isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' },
  stages: [{ id: 's1', tenantId: 't', pipelineId: 'p-sales', key: 'novo', label: 'Novo', color: '#fff', order: 0, isWon: false, isLost: false }],
  openDealsCount: 0, allowFreeCloseReason: false,
}

const PROCESS: Pipeline = {
  id: 'p-proc', tenantId: 't', name: 'Confirmação', color: '#14b8a6', order: 1,
  isDefault: false, isArchived: false, kind: 'process',
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
  stages: [],
  openDealsCount: 0, allowFreeCloseReason: false,
}

const ADMIN: User = {
  id: 'u1', tenantId: 't', email: 'admin@oryon.com', firstName: 'Ana', lastName: 'Souza',
  role: 'admin', isActive: true,
}
const AGENT: User = { ...ADMIN, id: 'u2', role: 'agent' }

const { pipelines, departments, users } = vi.hoisted(() => ({
  pipelines: {
    getAccess: vi.fn(async () => ({ data: { pipelineId: '', implicitAll: false, departmentIds: [] } })),
    manageCloseReasons: vi.fn(async () => ({ data: [] })),
    templates: vi.fn(async () => ({ data: [] })),
    update: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    setDefault: vi.fn(),
  },
  departments: { list: vi.fn(async () => ({ data: [] })) },
  users: { list: vi.fn(async () => ({ data: [] })) },
}))
vi.mock('@/services/api', () => ({
  pipelinesApi: pipelines,
  departmentsApi: departments,
  usersApi: users,
}))

let currentUser: User = ADMIN
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }))

let currentPipelines: Pipeline[] = [SALES, PROCESS]
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ pipelines: currentPipelines, loadingPipelines: false, refetchPipelines: vi.fn() }),
}))

import { FunnelsSettings } from './FunnelsSettings'

beforeEach(() => {
  currentUser = ADMIN
  currentPipelines = [SALES, PROCESS]
  vi.clearAllMocks()
  pipelines.getAccess.mockResolvedValue({ data: { pipelineId: '', implicitAll: false, departmentIds: [] } })
  pipelines.manageCloseReasons.mockResolvedValue({ data: [] })
  departments.list.mockResolvedValue({ data: [] })
  users.list.mockResolvedValue({ data: [] })
})

describe('FunnelsSettings — seção Vendas por kind', () => {
  it('mostra a seção "Vendas" no funil de vendas (default selecionado)', async () => {
    render(<FunnelsSettings />)
    // O badge de tipo do funil também mostra o texto "Vendas" — desambigua
    // pelo título da seção (heading), não pelo texto solto.
    expect(await screen.findByRole('heading', { name: 'Vendas', level: 3 })).toBeInTheDocument()
  })

  it('esconde a seção "Vendas" no funil de processo', async () => {
    currentPipelines = [PROCESS]
    render(<FunnelsSettings />)
    await screen.findByRole('heading', { name: 'Etapas', level: 3 })
    expect(screen.queryByRole('heading', { name: 'Vendas', level: 3 })).toBeNull()
  })
})

describe('FunnelsSettings — gate de papel (P13)', () => {
  it('admin vê as ações de ciclo de vida do funil', async () => {
    render(<FunnelsSettings />)
    await screen.findByRole('heading', { name: 'Etapas', level: 3 })
    expect(screen.getByRole('button', { name: /Novo funil/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Renomear \/ cor/ })).toBeInTheDocument()
  })

  it('agent não vê nenhuma ação de criar/renomear/arquivar/excluir', async () => {
    currentUser = AGENT
    render(<FunnelsSettings />)
    await screen.findByRole('heading', { name: 'Etapas', level: 3 })
    expect(screen.queryByRole('button', { name: /Novo funil/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Renomear \/ cor/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Arquivar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Excluir/ })).toBeNull()
  })
})
