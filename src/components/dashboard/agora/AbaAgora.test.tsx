import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import type { Conversation } from '@/types'

const minAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString()

function conversa(id: string, nome: string, over: Partial<Conversation> = {}): Conversation {
  return {
    // Padrão = pendente: a fila do Dashboard lê as pendentes (alinhada à aba Fila).
    id, tenantId: 't', status: 'pending', channel: 'whatsapp', unreadCount: 1,
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
  // Aberta, com a IA atendendo: fora da fila.
  conversa('c-ia', 'Bruno', { status: 'open', lastMessageAt: minAtras(60), whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55 11 1111-1111', status: 'connected' } as Conversation['whatsappNumber'] }),
  // A IA passou para a equipe (pendente): entra, com o selo.
  conversa('c-passou', 'Joana', {
    status: 'pending', lastMessageSenderKind: 'ai', lastMessageAt: minAtras(12),
    whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55 11 1111-1111', status: 'connected' } as Conversation['whatsappNumber'],
    assignedUser: { id: 'u2', firstName: 'Diego', lastName: 'Souza' },
  }),
]

const assign = vi.fn(() => Promise.resolve({ data: {} }))
let aguardando: Conversation[] = CONVERSAS
let aVerificar: Conversation[] = []

type Filtros = { needsReview?: boolean; status?: string; assignedTo?: string; awaitingReply?: boolean; whatsappNumberId?: string }
/** Um servidor de mentira que aplica os filtros como o backend (total e paginação inclusos). */
function servidor(filtros: Filtros = {}, page = 1, limit = 100) {
  let l = filtros.needsReview ? aVerificar : aguardando
  if (filtros.status && filtros.status !== 'all') l = l.filter((c) => c.status === filtros.status)
  if (filtros.assignedTo === 'unassigned') l = l.filter((c) => !c.assignedUser)
  if (filtros.awaitingReply) {
    l = l.filter((c) => c.status !== 'resolved' && c.status !== 'abandoned'
      && (!c.lastAgentReplyAt || new Date(c.lastAgentReplyAt).getTime() < new Date(c.lastMessageAt).getTime()))
  }
  if (filtros.whatsappNumberId) l = l.filter((c) => c.whatsappNumber?.id === filtros.whatsappNumberId)
  const data = l.slice((page - 1) * limit, page * limit)
  return Promise.resolve({ data: { data, total: l.length, hasMore: page * limit < l.length, page, limit, statusCounts: {} } })
}
const list = vi.fn((filtros: Filtros, page?: number, limit?: number) => servidor(filtros, page, limit))
/** `GET /home/queue` (M5). Padrão: indisponível — a faixa conta pela lista. */
let resumoDaFila: Record<string, unknown> | null = null
const apiGet = vi.fn((url: string) => (url === '/home/queue' && resumoDaFila ? Promise.resolve({ data: resumoDaFila }) : Promise.reject(new Error('sem resumo'))))

vi.mock('@/services/api', () => ({
  api: { get: (...a: unknown[]) => apiGet(...(a as [string])) },
  conversationsApi: { list: (...a: unknown[]) => list(...(a as [Filtros, number, number])), assign: (...a: unknown[]) => assign(...(a as [])) },
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

beforeEach(() => {
  assign.mockClear(); list.mockClear(); toast.mockClear(); apiGet.mockClear(); resumoDaFila = null
  aguardando = CONVERSAS
  aVerificar = []
})
afterEach(() => cleanup())

describe('Dashboard · aba Agora', () => {
  it('pede quem aguarda resposta e mostra a fila da maior espera para a menor, sem o que a IA atende', async () => {
    montar()
    await screen.findByText('Carla')
    // As pendentes sem dono (a aba Fila da inbox) e as pendentes aguardando resposta.
    expect(list).toHaveBeenCalledWith({ status: 'pending', assignedTo: 'unassigned' }, 1, 100)
    expect(list).toHaveBeenCalledWith({ status: 'pending', awaitingReply: true }, 1, 100)
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

  it('M5: maior espera e janelas vêm do servidor (fila inteira), não da lista carregada', async () => {
    // A lista só tem esperas de minutos; o servidor sabe de uma de 5 h fora da lista.
    resumoDaFila = { esperando: 3, semDono: 2, maiorEsperaMin: 300, janelaFechando: 2, janelaFechada: 1 }
    montar()
    const faixa = await screen.findByTestId('faixa-do-agora')
    await waitFor(() => expect(within(faixa).getByText('5 h')).toBeInTheDocument())
    expect(within(faixa).queryByText('42 min')).not.toBeInTheDocument()
    expect(within(faixa).getByText('1 já fechou · só modelo')).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/home/queue')
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

  it('a fila pagina dentro do cartão (20 por página) e a página fica na URL', async () => {
    aguardando = Array.from({ length: 25 }, (_, i) => conversa('m' + i, 'Pessoa ' + i, { lastMessageAt: minAtras(100 - i) }))
    montar()
    await screen.findByText('Pessoa 0')
    const fila = screen.getByTestId('fila-ao-vivo')
    expect(within(fila).getAllByTestId('fila-item')).toHaveLength(20)
    expect(within(fila).getByText('1–20 de 25')).toBeInTheDocument()
    fireEvent.click(within(fila).getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(within(fila).getAllByTestId('fila-item')).toHaveLength(5))
    expect(screen.getByTestId('local').textContent).toBe('/dashboard?filaPag=2')
  })

  it('janela de 24h: marca quem está para fechar e quem já fechou, e filtra', async () => {
    aguardando = [
      conversa('j-fecha', 'Lúcia', { lastMessageAt: minAtras(22 * 60 + 30) }),
      conversa('j-fechou', 'Otávio', { lastMessageAt: minAtras(26 * 60) }),
      conversa('j-ok', 'Rita', { lastMessageAt: minAtras(5) }),
    ]
    montar()
    await screen.findByText('Lúcia')
    expect(screen.getByText('janela fecha em 1h')).toBeInTheDocument()
    expect(screen.getByText('janela fechada · só modelo')).toBeInTheDocument()
    const faixa = screen.getByTestId('faixa-do-agora')
    expect(within(faixa).getByText('1 já fechou · só modelo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Janela fechando/ }))
    await waitFor(() => expect(screen.getAllByTestId('fila-item')).toHaveLength(1))
    expect(screen.getByTestId('local').textContent).toBe('/dashboard?fila=janela')
  })

  it('precisam de verificação: o cartão aparece só quando há alguma e abre a conversa', async () => {
    aVerificar = [conversa('v-1', 'Marcos', { hasRecentAnomaly: true, lastMessageSenderKind: 'ai' })]
    aguardando = [conversa('v-1', 'Marcos', { hasRecentAnomaly: true })]
    montar()
    const cartao = await screen.findByTestId('verificacao-agora')
    expect(list).toHaveBeenCalledWith({ needsReview: true }, 1, 50)
    expect(within(screen.getByTestId('faixa-do-agora')).getByText('a IA disse algo não confirmado')).toBeInTheDocument()
    // O selo também aparece na linha da fila.
    expect(within(screen.getByTestId('fila-ao-vivo')).getByText('Verificar')).toBeInTheDocument()
    fireEvent.click(within(cartao).getByRole('button', { name: 'Verificar a conversa com Marcos' }))
    await waitFor(() => expect(screen.getByTestId('local').textContent).toBe('/conversations?id=v-1'))
  })

  it('sem nada a verificar, o cartão não ocupa espaço', async () => {
    montar()
    await screen.findByText('Carla')
    expect(screen.queryByTestId('verificacao-agora')).toBeNull()
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
