import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ listDetailed: vi.fn(), listAgents: vi.fn() }))
vi.mock('@/services/api', () => ({ whatsappNumbersApi: { listDetailed: () => h.listDetailed() } }))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => h.listAgents() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1' } }) }))
vi.mock('@/services/companyContextService', () => ({ loadHub: () => null, isAgentStale: () => false }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

import { carregarLinhas, formatarLinha, invalidarLinhas, linhasPorAgente, numeroDoAgente } from './linhasDosAgentes'
import { ListaDeAgentes } from './pagina/ListaDeAgentes'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'

const LINHAS = [
  { id: 'n1', displayPhoneNumber: '+55 11 90000-0001', label: 'Recepção', agentId: 'a1' },
  { id: 'n2', displayPhoneNumber: '+55 11 90000-0002', label: null, agentId: 'a1' },
  { id: 'n3', displayPhoneNumber: '+55 11 90000-0003', label: 'Vendas', agentId: null },
]

const agente = (id: string, name: string) => ({
  id, name, objective: '', status: 'active', icon: 'bot', conversation_count: 0, test_count: 1,
  last_tested_at: '2026-09-28T10:00:00Z', updated_at: '2026-09-28T10:00:00Z',
})

describe('linhas dos agentes', () => {
  beforeEach(() => { invalidarLinhas(); h.listDetailed.mockReset(); h.listAgents.mockReset() })

  it('agrupa por agente e mostra quantas linhas a mais', () => {
    const mapa = linhasPorAgente(LINHAS)
    expect(mapa.get('a1')?.map((l) => l.id)).toEqual(['n1', 'n2'])
    expect(mapa.has('n3')).toBe(false)
    expect(numeroDoAgente(mapa.get('a1'))).toBe('+55 11 90000-0001 (+1)')
    expect(numeroDoAgente(undefined)).toBeUndefined()
    expect(formatarLinha(LINHAS[0])).toBe('Recepção · +55 11 90000-0001')
  })

  it('uma consulta por carga; invalidar busca de novo', async () => {
    h.listDetailed.mockResolvedValue({ data: LINHAS })
    await carregarLinhas()
    await carregarLinhas()
    expect(h.listDetailed).toHaveBeenCalledTimes(1)
    invalidarLinhas()
    await carregarLinhas()
    expect(h.listDetailed).toHaveBeenCalledTimes(2)
  })

  it('a lista mostra o número vindo da linha e a busca encontra por ele', async () => {
    h.listDetailed.mockResolvedValue({ data: [{ id: 'n1', displayPhoneNumber: '+55 11 90000-0001', label: 'Recepção', agentId: 'a1' }] })
    h.listAgents.mockResolvedValue([agente('a1', 'Bia'), agente('a2', 'Clara')])
    render(<MemoryRouter><ContextMenuProvider><ListaDeAgentes onNovo={() => {}} /></ContextMenuProvider></MemoryRouter>)
    expect(await screen.findByText('+55 11 90000-0001')).toBeInTheDocument()
    expect(screen.getByText('sem número')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /buscar agente/i }), { target: { value: '90000-0001' } })
    expect(screen.getByText('Bia')).toBeInTheDocument()
    expect(screen.queryByText('Clara')).not.toBeInTheDocument()
  })
})
