import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/** Auditoria do Dashboard (12/11): a Home segue as mesmas regras de número do Dashboard. */
const stats = {
  conversationsOpen: 6900, conversationsOpenActive: 214, conversationsOpenStale: 6686,
  conversationsResolvedToday: 190, resolvedInPeriod: 208,
  newContactsThisWeek: 557, messagesSentToday: 684, messagesSentBy: { ai: 589, operator: 95, rule: 0, campaign: 0 },
  queueCount: 56, agentsOnline: 1,
  myConversationsOpen: 40, myConversationsOpenActive: 5, myConversationsResolvedToday: 23, myMessagesSentToday: 26,
  myAvgResponseMinutes: 0.4, myFirstResponseMedianSeconds: 4380, myFirstResponsesCount: 9,
}
const get = vi.fn((url: string) => Promise.resolve({ data: url === '/home/queue' ? { semDono: 39, paradas: 17 } : stats }))
const list = vi.fn((..._a: unknown[]) => Promise.resolve({ data: { data: [], total: 0 } }))
let papel = 'admin'
vi.mock('@/services/api', () => ({ api: { get: (u: string) => get(u) }, conversationsApi: { list: (...a: unknown[]) => list(...a) } }))
vi.mock('@/services/tenantAuditApi', () => ({ listTenantAuditFeed: vi.fn(async () => ({ data: [] })) }))
vi.mock('@/services/copilotService', () => ({ generateInsights: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', tenantId: 't', firstName: 'Ana', lastName: 'Prado', role: papel, email: 'a@x' } }) }))
vi.mock('@/contexts/CopilotContext', () => ({ useCopilotContext: () => ({}) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/common/WorkspaceReadinessBanner', () => ({ WorkspaceReadinessBanner: () => null }))

import { HomePage } from '../HomePage'

afterEach(() => { cleanup(); get.mockClear(); list.mockClear() })

const montar = () => render(<MemoryRouter><HomePage /></MemoryRouter>)

describe('Home · números da equipe', () => {
  it('abertas ativas com as paradas à parte, todas as resoluções do dia e as enviadas por IA e equipe', async () => {
    papel = 'admin'
    montar()
    const equipe = await screen.findByRole('region', { name: 'Toda a equipe agora' })
    expect(within(equipe).getByText('214')).toBeTruthy()
    expect(within(equipe).getByText('+ 6.686 paradas há mais de 7 dias')).toBeTruthy()
    expect(within(equipe).getByText('208')).toBeTruthy()
    expect(within(equipe).getByText('nos últimos 7 dias')).toBeTruthy()
    expect(within(equipe).getByText('Mensagens enviadas hoje')).toBeTruthy()
    expect(within(equipe).getByText('IA 589 · equipe 95')).toBeTruthy()
  })

  it('a fila é a do Dashboard (ninguém assumiu, só as ativas), não todas as pendentes sem dono', async () => {
    papel = 'supervisor'
    montar()
    const equipe = await screen.findByRole('region', { name: 'Toda a equipe agora' })
    await waitFor(() => expect(within(equipe).getByText('39')).toBeTruthy())
    expect(within(equipe).getByText('Ninguém assumiu')).toBeTruthy()
    expect(within(equipe).getByText('+ 17 paradas há mais de 7 dias')).toBeTruthy()
    expect(get).toHaveBeenCalledWith('/home/queue')
  })

  it('seu desempenho: minhas abertas ativas e a MINHA 1ª resposta (mediana), não a média com a IA', async () => {
    papel = 'agent'
    montar()
    expect(await screen.findByText('Minha 1ª resposta')).toBeTruthy()
    expect(screen.getByText('1h 13m')).toBeTruthy()
    expect(screen.queryByText('Tempo médio de resposta')).toBeNull()
    // as contagens pessoais pedem só as ativas (7 dias)
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', assignedTo: 'me', startDate: expect.any(String) }), 1, expect.any(Number))
  })
})
