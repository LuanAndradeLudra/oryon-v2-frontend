import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import type { Conversation } from '@/types'

const minAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString()

function conversa(id: string, nome: string, over: Partial<Conversation> = {}): Conversation {
  return {
    id, tenantId: 't', status: 'open', channel: 'whatsapp', unreadCount: 1,
    lastMessageAt: minAtras(5), lastMessagePreview: `oi, aqui é ${nome}`, lastMessageSenderKind: 'client',
    lastAgentReplyAt: null, aiPausedUntil: null,
    contact: { id: `k-${id}`, tenantId: 't', waId: '55', displayName: nome, createdAt: minAtras(999) },
    whatsappNumber: { id: 'linha-sem-ia', displayPhoneNumber: '+55 11 0000-0000', status: 'connected' },
    ...over,
  } as Conversation
}

const CONVERSAS: Conversation[] = [
  conversa('c-recente', 'Rafaela', { lastMessageAt: minAtras(3) }),
  conversa('c-antiga', 'Carla', { lastMessageAt: minAtras(42) }),
  // A IA está atendendo esta linha: fora da fila.
  conversa('c-ia', 'Bruno', { lastMessageAt: minAtras(60), whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55 11 1111-1111', status: 'connected' } as Conversation['whatsappNumber'] }),
  // A IA passou para a equipe (pendente): entra, com o selo.
  conversa('c-passou', 'Joana', {
    status: 'pending', lastMessageSenderKind: 'ai', lastMessageAt: minAtras(12),
    whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55 11 1111-1111', status: 'connected' } as Conversation['whatsappNumber'],
    assignedUser: { id: 'u2', firstName: 'Diego', lastName: 'Souza' },
  }),
]

const assign = vi.fn(() => Promise.resolve({ data: {} }))
const list = vi.fn(() => Promise.resolve({ data: { data: CONVERSAS, total: CONVERSAS.length, page: 1, limit: 100, statusCounts: {} } }))

vi.mock('@/services/api', () => ({
  conversationsApi: { list: (...a: unknown[]) => list(...(a as [])), assign: (...a: unknown[]) => assign(...(a as [])) },
  usersApi: {
    available: () => Promise.resolve({ data: [
      { id: 'u1', firstName: 'Ana', lastName: 'Prado', email: 'a@x', role: 'agent', departmentId: null, isOnline: true, activeConversations: 4 },
      { id: 'u2', firstName: 'Diego', lastName: 'Souza', email: 'd@x', role: 'agent', departmentId: null, isOnline: false, activeConversations: 1 },
    ] }),
  },
  whatsappNumbersApi: {
    listDetailed: () => Promise.resolve({ data: [
      { id: 'linha-sem-ia', displayPhoneNumber: '+55 11 0000-0000', status: 'CONNECTED', agentId: null },
      { id: 'linha-ia', displayPhoneNumber: '+55 11 1111-1111', label: 'Recepção', status: 'CONNECTED', agentId: 'ag-1' },
    ] }),
  },
}))
vi.mock('@/services/agentsApi', () => ({
  listAgents: () => Promise.resolve([{ id: 'ag-1', name: 'Agente Recepção', status: 'active' }]),
}))
const socket = { on: vi.fn(), off: vi.fn() }
vi.mock('@/services/socket', () => ({ connectSocket: () => socket }))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', tenantId: 't', email: 'a@x', firstName: 'Ana', lastName: 'Prado', role: 'admin', isActive: true } }),
}))
vi.mock('@/contexts/TopBarActionsContext', () => ({ useRegisterTopBarSubtitle: () => {} }))
const toast = vi.fn()
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast, toasts: [], dismiss: vi.fn() }) }))

import { AbaAgora } from './AbaAgora'

function Local() {
  const l = useLocation()
  return <p data-testid="local">{l.pathname}{l.search}</p>
}

function montar(url = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/dashboard" element={<><AbaAgora aba="agora" onAba={() => {}} /><Local /></>} />
        <Route path="/conversations" element={<Local />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { assign.mockClear(); list.mockClear(); toast.mockClear() })
afterEach(() => cleanup())

describe('Dashboard · aba Agora', () => {
  it('pede quem aguarda resposta e mostra a fila da maior espera para a menor, sem o que a IA atende', async () => {
    montar()
    await screen.findByText('Carla')
    expect(list).toHaveBeenCalledWith({ awaitingReply: true }, 1, 100)
    const nomes = screen.getAllByTestId('fila-item').map((li) => within(li).getByRole('button', { name: /Abrir a conversa/ }).getAttribute('aria-label'))
    expect(nomes).toEqual([
      'Abrir a conversa com Carla',
      'Abrir a conversa com Joana',
      'Abrir a conversa com Rafaela',
    ])
    expect(screen.queryByText('Bruno')).toBeNull()
    expect(screen.getByText('IA passou')).toBeInTheDocument()
    expect(within(screen.getAllByTestId('fila-item')[0]).getByText('42 min')).toBeInTheDocument()
  })

  it('a faixa conta do mesmo dado: 3 esperando (2 sem dono), maior espera, IA passou, linhas', async () => {
    montar()
    const faixa = await screen.findByTestId('faixa-do-agora')
    await waitFor(() => expect(within(faixa).getByText('2 sem dono')).toBeInTheDocument())
    expect(within(faixa).getByText('3')).toBeInTheDocument()
    expect(within(faixa).getByText('42 min')).toBeInTheDocument()
    expect(within(faixa).getByText('2 de 2')).toBeInTheDocument()
    expect(within(faixa).getByText('conectadas · 1 com IA')).toBeInTheDocument()
  })

  it('Assumir atribui a mim e abre a conversa', async () => {
    montar()
    await screen.findByText('Carla')
    const linha = screen.getAllByTestId('fila-item')[0]
    fireEvent.click(within(linha).getByRole('button', { name: 'Assumir' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('c-antiga', 'u1'))
    await waitFor(() => expect(screen.getByTestId('local').textContent).toBe('/conversations?id=c-antiga'))
  })

  it('Atribuir escolhe alguém da equipe sem sair do painel', async () => {
    montar()
    await screen.findByText('Carla')
    const linha = screen.getAllByTestId('fila-item')[0]
    fireEvent.click(within(linha).getByRole('button', { name: /Atribuir a conversa com Carla/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /Diego Souza/ }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('c-antiga', 'u2'))
    expect(toast).toHaveBeenCalledWith('Conversa atribuída a Diego Souza.', 'success')
    expect(screen.getByTestId('local').textContent).toBe('/dashboard')
  })

  it('o filtro da fila fica na URL', async () => {
    montar('/dashboard?fila=ia-passou')
    await screen.findByText('Joana')
    expect(screen.getAllByTestId('fila-item')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Todas/ }))
    await waitFor(() => expect(screen.getAllByTestId('fila-item')).toHaveLength(3))
    expect(screen.getByTestId('local').textContent).toBe('/dashboard')
  })

  it('a equipe mostra o agente ligado à linha e as pessoas com a carga', async () => {
    montar()
    const equipe = await screen.findByTestId('equipe-agora')
    await waitFor(() => expect(within(equipe).getByText('Agente Recepção')).toBeInTheDocument())
    expect(within(equipe).getByText('atende Recepção')).toBeInTheDocument()
    expect(within(equipe).getByText('1 de 2 online')).toBeInTheDocument()
    expect(within(equipe).getByText('4 em aberto')).toBeInTheDocument()
  })
})
