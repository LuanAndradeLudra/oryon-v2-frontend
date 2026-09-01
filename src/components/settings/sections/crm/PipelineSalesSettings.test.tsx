// B5 (SCRUM-931, D0-9/12, D0-1) — dono padrão e multiplicidade, só em vendas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Pipeline, User } from '@/types'

const SALES: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#6366f1', order: 0,
  isDefault: true, isArchived: false, kind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, stages: [], openDealsCount: 0,
  defaultOwnerRule: 'creator', allowMultipleOpen: false,
}

const ADMIN: User = {
  id: 'u1', tenantId: 't', email: 'admin@oryon.com', firstName: 'Ana', lastName: 'Souza',
  role: 'admin', isActive: true,
}
const OUTRO: User = { id: 'u2', tenantId: 't', email: 'joao@oryon.com', firstName: 'João', lastName: 'Lima', role: 'agent', isActive: true }

const { pipelines, users } = vi.hoisted(() => ({
  pipelines: { update: vi.fn() },
  users: { list: vi.fn() },
}))
vi.mock('@/services/api', () => ({ pipelinesApi: pipelines, usersApi: users }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: ADMIN }) }))

import { PipelineSalesSettings } from './PipelineSalesSettings'

beforeEach(() => {
  vi.clearAllMocks()
  users.list.mockResolvedValue({ data: [ADMIN, OUTRO] })
})

describe('PipelineSalesSettings', () => {
  it('lista "Quem cria o negócio", "Ninguém" e os usuários ativos como opções de dono padrão', async () => {
    render(<PipelineSalesSettings pipeline={SALES} onChanged={vi.fn()} />)
    await waitFor(() => expect(users.list).toHaveBeenCalled())
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['creator', 'none', 'user:u1', 'user:u2'])
    expect(select.value).toBe('creator')
  })

  it('trocar para "Ninguém" salva defaultOwnerRule=none', async () => {
    pipelines.update.mockResolvedValue({ data: { ...SALES, defaultOwnerRule: 'none' } })
    const onChanged = vi.fn()
    render(<PipelineSalesSettings pipeline={SALES} onChanged={onChanged} />)
    await waitFor(() => expect(users.list).toHaveBeenCalled())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'none' } })

    await waitFor(() => expect(pipelines.update).toHaveBeenCalledWith('p1', { defaultOwnerRule: 'none' }))
    expect(onChanged).toHaveBeenCalled()
  })

  it('trocar para um usuário fixo salva "user:<id>"', async () => {
    pipelines.update.mockResolvedValue({ data: SALES })
    render(<PipelineSalesSettings pipeline={SALES} onChanged={vi.fn()} />)
    await waitFor(() => expect(users.list).toHaveBeenCalled())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user:u2' } })

    await waitFor(() => expect(pipelines.update).toHaveBeenCalledWith('p1', { defaultOwnerRule: 'user:u2' }))
  })

  it('liga a multiplicidade — só existe porque este funil é sales', async () => {
    pipelines.update.mockResolvedValue({ data: { ...SALES, allowMultipleOpen: true } })
    render(<PipelineSalesSettings pipeline={SALES} onChanged={vi.fn()} />)
    await waitFor(() => expect(users.list).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => expect(pipelines.update).toHaveBeenCalledWith('p1', { allowMultipleOpen: true }))
  })

  // Follow-up SCRUM-931 (achado 3, revisão do Lince): o toggle ainda não é
  // consumido em lugar nenhum (C1/SCRUM-932) — o aviso evita passar a
  // impressão de que ligá-lo já muda o comportamento de criação de negócio.
  it('avisa que a multiplicidade ainda não afeta a criação de negócios (consumo é da C1)', async () => {
    render(<PipelineSalesSettings pipeline={SALES} onChanged={vi.fn()} />)
    await waitFor(() => expect(users.list).toHaveBeenCalled())
    expect(screen.getByText(/ainda não afeta a criação de negócios/i)).toBeInTheDocument()
  })
})
