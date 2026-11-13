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
    // Auditoria 12/11: as pendentes com mensagem nos últimos 7 dias (o servidor diz quais esperam).
    expect(list).toHaveBeenCalledWith({ status: 'pending', startDate: expect.any(String) }, 1, 100)
    const desde = new Date((list.mock.calls[0][0] as { startDate: string }).startDate).getTime()
    expect(Math.round((Date.now() - desde) / 86_400_000)).toBe(7)
    const nomes = screen.getAllByTestId('fila-item').map((li) => within(li).getByRole('button', { name: /Abrir a conversa/ }).getAttribute('aria-label'))
    expect(nomes).toEqual([
      'Abrir a conversa com Carla',
      'Abrir a conversa com Joana',
      'Abrir a conversa com Rafaela',
    ])
    expect(screen.queryByText('Bruno')).toBeNull()
    // SCRUM-1253 (D11): o selo é "Na fila" em toda pendente SEM dono, com ou sem IA
    // na linha (Carla e Rafaela); a Joana é do Diego — o "com Diego" já diz.
    expect(screen.queryByText('IA passou')).toBeNull()
    const itens = screen.getAllByTestId('fila-item')
    expect(within(itens[0]).getByText('Na fila')).toBeInTheDocument()
    expect(within(itens[1]).queryByText('Na fila')).toBeNull()
    expect(within(itens[2]).getByText('Na fila')).toBeInTheDocument()
    expect(within(screen.getAllByTestId('fila-item')[0]).getByText('42 min')).toBeInTheDocument()
  })

  it('a faixa conta do mesmo dado: 3 esperando = 2 ninguém assumiu + 1 assumida sem resposta, maior espera, linhas', async () => {
    montar()
    const faixa = await screen.findByTestId('faixa-do-agora')
    // Auditoria 12/11: o total no título; as células são as duas partes, que somam o total.
    await waitFor(() => expect(within(faixa).getByTestId('fila-total').textContent).toContain('3'))
    expect(faixa.querySelector('[data-celula="sem-dono"] [data-valor="2"]')).not.toBeNull()
    expect(faixa.querySelector('[data-celula="assumidas"] [data-valor="1"]')).not.toBeNull()
    expect(faixa.querySelector('[data-celula="esperando"]')).toBeNull()
    // SCRUM-1253: "Pendentes" repetia "Esperando alguém" e saiu da faixa.
    expect(faixa.querySelector('[data-celula="ia-passou"]')).toBeNull()
    expect(faixa.querySelector('[data-valor="42 min"]')).not.toBeNull()
    expect(faixa.querySelector('[data-valor="2 de 2"]')).not.toBeNull()
    expect(within(faixa).getByText('conectadas · 1 com IA')).toBeInTheDocument()
  })

  it('M5: maior espera e janelas vêm do servidor (fila inteira), não da lista carregada', async () => {
    // A lista só tem esperas de minutos; o servidor sabe de uma de 5 h fora da lista.
    resumoDaFila = { esperando: 3, semDono: 2, maiorEsperaMin: 300, janelaFechando: 2, janelaFechada: 1 }
    montar()
    const faixa = await screen.findByTestId('faixa-do-agora')
    await waitFor(() => expect(faixa.querySelector('[data-valor="5 h"]')).not.toBeNull())
    expect(faixa.querySelector('[data-valor="42 min"]')).toBeNull()
    expect(within(faixa).getByText('1 já fechou · só modelo')).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/home/queue')
  })

  it('PO 01/10: a faixa vem em cartões por assunto, com filete só onde há urgência, e a célula filtra a fila', async () => {
    montar()
    const faixa = await screen.findByTestId('faixa-do-agora')
    await waitFor(() => expect(within(faixa).getByText('assumir ou atribuir')).toBeInTheDocument())
    expect(within(faixa).getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Fila', 'Verificação', 'Linhas'])
    const assumidas = faixa.querySelector('[data-celula="assumidas"]') as HTMLElement
    const semDono = faixa.querySelector('[data-celula="sem-dono"]') as HTMLElement
    expect(semDono.style.boxShadow).toContain('status-pending') // 2 sem dono = atenção
    expect(assumidas.getAttribute('style') ?? '').not.toContain('box-shadow')
    expect(faixa.querySelector('[data-celula="linhas"]')!.getAttribute('style') ?? '').not.toContain('box-shadow')
    fireEvent.click(semDono)
    await waitFor(() => expect(screen.getByTestId('local').textContent).toContain('fila=sem-dono'))
    expect(semDono).toHaveAttribute('aria-pressed', 'true')
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

  it('PO 11/10: sem o filtro "Vindas da IA"; link antigo ?fila=ia-passou mostra todas', async () => {
    montar('/dashboard?fila=ia-passou')
    await screen.findByText('Joana')
    expect(screen.getAllByTestId('fila-item')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Vindas da IA/ })).toBeNull()
  })

  it('o filtro da fila fica na URL', async () => {
    montar('/dashboard?fila=sem-dono')
    await screen.findByText('Carla')
    expect(screen.getAllByTestId('fila-item')).toHaveLength(2)
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

  it('12/11: sem nada a verificar, o cartão fica com a mesma altura e diz que não há nada', async () => {
    montar()
    await screen.findByText('Carla')
    const cartao = screen.getByTestId('verificacao-agora')
    expect(within(cartao).getByTestId('verificacao-vazia')).toBeInTheDocument()
    expect(within(cartao).getByTestId('verificacao-rolagem').className).toContain('h-[261px]')
  })

  it('12/11: com mais de 5, a lista rola dentro da altura fixa (sem páginas)', async () => {
    aVerificar = Array.from({ length: 8 }, (_, i) => conversa('v' + i, 'Pessoa ' + i, { hasRecentAnomaly: true }))
    montar()
    const cartao = await screen.findByTestId('verificacao-agora')
    await waitFor(() => expect(within(cartao).getAllByTestId('verificacao-item')).toHaveLength(8))
    expect(within(cartao).getByTestId('verificacao-rolagem').className).toContain('overflow-y-auto')
    expect(within(cartao).queryByRole('button', { name: 'Próxima página' })).toBeNull()
    expect(within(cartao).getByTestId('verificacao-rodape').textContent).toContain('8 conversas · role a lista para ver todas')
  })

  it('a equipe mostra o agente ligado à linha e as pessoas com a carga', async () => {
    montar()
    const equipe = await screen.findByTestId('equipe-agora')
    await waitFor(() => expect(within(equipe).getByText('Agente Recepção')).toBeInTheDocument())
    expect(within(equipe).getByText('atende Recepção')).toBeInTheDocument()
    expect(within(equipe).getByText('1 de 2 online')).toBeInTheDocument()
    expect(within(equipe).getByText('4 em atendimento')).toBeInTheDocument()
  })

  describe('auditoria 12/11 — a fila do servidor (só as ativas)', () => {
    it('quem está na fila e desde quando vêm do /home/queue; paradas à parte; data vazia nunca vira espera', async () => {
      aguardando = [
        conversa('s-1', 'Sérgio', { lastMessageAt: minAtras(2), lastMessageSenderKind: 'ai' }),
        conversa('s-2', 'Tânia', { assignedUser: { id: 'u2', firstName: 'Diego', lastName: 'Souza' } as Conversation['assignedUser'] }),
        // Sem data e fora do que o servidor devolveu: não entra (antes virava "20768 d").
        conversa('s-3', 'Úrsula', { lastMessageAt: null as unknown as string }),
      ]
      resumoDaFila = {
        horizonteDias: 7, esperando: 2, semDono: 1, comDonoSemResposta: 1, paradas: 12,
        maiorEsperaMin: 313, janelaFechando: 0, janelaFechada: 0,
        itens: [{ id: 's-1', desde: minAtras(313), semDono: true }, { id: 's-2', desde: minAtras(30), semDono: false }],
      }
      montar()
      await screen.findByText('Sérgio')
      // A espera do Sérgio conta da mensagem DELE (313 min), não da resposta da IA (2 min).
      const itens = screen.getAllByTestId('fila-item')
      expect(itens).toHaveLength(2)
      expect(within(itens[0]).getByText('5 h 13 min')).toBeInTheDocument()
      expect(screen.queryByText('Úrsula')).toBeNull()
      const faixa = screen.getByTestId('faixa-do-agora')
      expect(within(faixa).getByTestId('fila-paradas').textContent).toContain('+ 12 paradas há mais de 7 dias')
      expect(faixa.querySelector('[data-celula="assumidas"] [data-valor="1"]')).not.toBeNull()
      expect(screen.queryByText(/20768/)).toBeNull()
    })

    it('o filtro "Assumidas" mostra só as que alguém assumiu e não respondeu', async () => {
      montar('/dashboard?fila=assumidas')
      await screen.findByText('Joana')
      expect(screen.getAllByTestId('fila-item')).toHaveLength(1)
    })

    it('cada célula tem o "?" que explica o que conta', async () => {
      montar()
      const faixa = await screen.findByTestId('faixa-do-agora')
      await waitFor(() => expect(within(faixa).getAllByTestId('ajuda').length).toBeGreaterThanOrEqual(7))
      expect(within(faixa).getByLabelText('O que é Ninguém assumiu')).toBeInTheDocument()
    })
  })
})
