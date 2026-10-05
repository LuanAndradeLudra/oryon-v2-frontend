// Revisão 02/10: triagem de solicitações — o rollback de uma falha não desfaz
// outra edição já salva, e a resposta de um filtro antigo não toma a lista.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const { listar, triar, conectores } = vi.hoisted(() => ({ listar: vi.fn(), triar: vi.fn(), conectores: vi.fn() }))
vi.mock('@/services/connectorsApi', () => ({
  listConnectorRequestsForStaff: listar, triageConnectorRequest: triar, listAllConnectorsForStaff: conectores,
}))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import { ConnectorRequestsPage } from './ConnectorRequestsPage'
import type { ConnectorRequestRow } from '@/types/connectors'

const linha = (id: string, nome: string, status = 'open'): ConnectorRequestRow => ({
  id, tenant_id: 't', requested_by_user_id: 'u', connector_name_freeform: nome, connector_id: null,
  use_case: 'x', status, staff_notes: null, created_at: '2026-10-01T00:00:00Z', resolved_at: null,
})

beforeEach(() => {
  listar.mockReset(); triar.mockReset(); conectores.mockReset()
  conectores.mockResolvedValue([])
})

describe('ConnectorRequestsPage', () => {
  it('falha em A não desfaz na tela a edição de B que salvou', async () => {
    listar.mockResolvedValue([linha('A', 'Conector A'), linha('B', 'Conector B')])
    let falharA: (e: Error) => void = () => {}
    triar.mockImplementation((id: string, patch: { status: string }) => (id === 'A'
      ? new Promise((_, rej) => { falharA = rej })
      : Promise.resolve(linha('B', 'Conector B', patch.status))))
    render(<ConnectorRequestsPage />)
    await screen.findByText('Conector A')
    const selects = () => screen.getAllByRole('combobox')
    fireEvent.change(selects()[1], { target: { value: 'triaged' } }) // A
    fireEvent.change(selects()[3], { target: { value: 'declined' } }) // B
    await waitFor(() => expect(triar).toHaveBeenCalledTimes(2))
    await act(async () => { falharA(new Error('500')) })
    expect((selects()[1] as HTMLSelectElement).value).toBe('open')
    expect((selects()[3] as HTMLSelectElement).value).toBe('declined')
  })

  it('resposta do filtro anterior, chegando por último, não substitui a do filtro atual', async () => {
    const pendentes: Record<string, (v: ConnectorRequestRow[]) => void> = {}
    listar.mockImplementation((status?: string) => new Promise((r) => { pendentes[status ?? 'todos'] = r }))
    render(<ConnectorRequestsPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'declined' } })
    await waitFor(() => expect(pendentes.declined).toBeDefined())
    await act(async () => { pendentes.declined([linha('R', 'Recusado X', 'declined')]) })
    await act(async () => { pendentes.todos([linha('O', 'Aberto Y')]) })
    expect(screen.getByText('Recusado X')).toBeInTheDocument()
    expect(screen.queryByText('Aberto Y')).toBeNull()
  })
})
