// A ponte de estado local (`localEdits`) existe para a tela não "voltar" nos
// segundos entre o clique e o poll seguinte. O risco dela é o oposto: preferir
// eternamente a cópia local congela o cartão pelo resto da sessão. Este arquivo
// cobre os dois lados da ponte.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Campaign, CampaignStatus } from '@/types'

const useAgendaCampaignsMock = vi.fn()
const lifecycleRun = vi.fn()

vi.mock('./useAgendaCampaigns', () => ({
  useAgendaCampaigns: () => useAgendaCampaignsMock(),
}))
vi.mock('./useCampaignLifecycle', () => ({
  useCampaignLifecycle: (onUpdated: (c: Campaign) => void) => ({
    available: true,
    busy: null,
    run: (action: string, id: string) => lifecycleRun(action, id, onUpdated),
  }),
}))
vi.mock('./useAgendaLookups', () => ({
  useTemplateCategories: () => new Map(),
  useAudienceCounts: () => new Map(),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/contexts/WorkspaceNumberContext', () => ({ useWorkspaceNumber: () => ({ numbers: [] }) }))
vi.mock('@/services/api', () => ({ campaignsApi: { send: vi.fn(), delete: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({ showToast: vi.fn() }))

import { AgendaShell } from './AgendaShell'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'

// `updatedAt` vem no fio (BaseEntity do backend) mas NÃO está no tipo
// congelado do frontend — por isso ele entra por fora do `Partial<Campaign>`.
function campaign(over: Partial<Campaign> & { id: string; updatedAt?: string }): Campaign {
  return {
    tenantId: 't1',
    name: 'Lançamento coleção inverno',
    templateId: 'tpl-1',
    templateName: 'novo_lancamento_v2',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'sending' as CampaignStatus,
    stats: { total: 100, sent: 40, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1',
    scheduledAt: new Date().toISOString(),
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const data = (campaigns: Campaign[]) => ({
  campaigns, loading: false, error: null, truncated: false,
  total: campaigns.length, rates: new Map(), refresh: vi.fn(),
})

const tree = () => (
  <MemoryRouter>
    <ContextMenuProvider>
      <AgendaShell />
    </ContextMenuProvider>
  </MemoryRouter>
)

const T0 = new Date(2026, 8, 3, 18, 31).getTime()

describe('AgendaShell — a ponte de estado local', () => {
  const enviando = campaign({ id: 'c1', status: 'sending', updatedAt: new Date(T0).toISOString() })
  const pausada = campaign({ id: 'c1', status: 'paused', updatedAt: new Date(T0 + 1_000).toISOString() })

  beforeEach(() => {
    useAgendaCampaignsMock.mockReset()
    lifecycleRun.mockReset()
    lifecycleRun.mockImplementation(async (_action: string, _id: string, onUpdated: (c: Campaign) => void) => {
      onUpdated(pausada)
      return pausada
    })
  })

  async function pausar() {
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Pausar' })) })
    await screen.findByRole('button', { name: 'Retomar' })
  }

  it('segura o estado novo enquanto o poll ainda traz o antigo', async () => {
    useAgendaCampaignsMock.mockReturnValue(data([enviando]))
    const { rerender } = render(tree())
    await pausar()

    // Poll seguinte ainda com o registro `sending`, mais VELHO que a resposta
    // do pause. A ponte segura — é para isso que ela existe.
    useAgendaCampaignsMock.mockReturnValue(data([campaign({
      id: 'c1', status: 'sending', updatedAt: new Date(T0).toISOString(),
    })]))
    rerender(tree())

    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument()
  })

  it('SOLTA quando o servidor passa à frente — o disparo terminou', async () => {
    useAgendaCampaignsMock.mockReturnValue(data([enviando]))
    const { rerender } = render(tree())
    await pausar()

    // Sonda P9 do revisor: o servidor reporta 'sent', 100/100. Sem a expiração,
    // o cartão continuava oferecendo "Retomar" sobre campanha CONCLUÍDA, com a
    // barra travada em 40/100, e só recarregar a página resolvia.
    useAgendaCampaignsMock.mockReturnValue(data([campaign({
      id: 'c1', status: 'sent',
      stats: { total: 100, sent: 100, delivered: 90, read: 60, failed: 0 },
      updatedAt: new Date(T0 + 60_000).toISOString(),
    })]))
    rerender(tree())

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Retomar' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('Enviada')).toBeInTheDocument()
    expect(screen.getByText(/100 enviadas/)).toBeInTheDocument()
  })

  it('solta pela idade quando o backend não devolve `updatedAt`', async () => {
    const semCarimbo = (over: Partial<Campaign>) => campaign({ id: 'c1', ...over })
    lifecycleRun.mockImplementation(async (_a: string, _i: string, onUpdated: (c: Campaign) => void) => {
      onUpdated(semCarimbo({ status: 'paused' }))
      return null
    })
    const agora = vi.spyOn(Date, 'now')
    agora.mockReturnValue(T0)

    useAgendaCampaignsMock.mockReturnValue(data([semCarimbo({ status: 'sending' })]))
    const { rerender } = render(tree())
    await pausar()

    // Um poll depois, ainda dentro da janela: segura.
    useAgendaCampaignsMock.mockReturnValue(data([semCarimbo({ status: 'sending' })]))
    agora.mockReturnValue(T0 + 20_000)
    rerender(tree())
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument()

    // Passada a janela, o servidor volta a ser a verdade.
    useAgendaCampaignsMock.mockReturnValue(data([semCarimbo({ status: 'sending' })]))
    agora.mockReturnValue(T0 + 31_000)
    rerender(tree())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()
    })
    agora.mockRestore()
  })
})
