// D2 (SCRUM-935) — relatórios do funil: cards de resumo a partir da resposta
// real de `GET /analytics/pipelines/:id/overview` (D1/934), filtro de
// período trocando os parâmetros da chamada, e estados vazios honestos
// (P14 — sem número fictício quando não há dado).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PipelineReportsTab } from './PipelineReportsTab'
import { pipelineAnalyticsApi, usersApi } from '@/services/api'
import type { PipelineOverview } from '@/types/pipelineAnalytics'
import type { Pipeline } from '@/types'

vi.mock('@/services/api', () => ({
  pipelineAnalyticsApi: { overview: vi.fn(), summary: vi.fn() },
  usersApi: { list: vi.fn() },
}))

const PIPELINE: Pipeline = {
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#14b8a6', order: 0, isDefault: true, isArchived: false,
  kind: 'sales', stages: [], openDealsCount: 3,
} as unknown as Pipeline

const WITH_DATA: PipelineOverview = {
  pipelineId: 'p1', pipelineName: 'Vendas', pipelineKind: 'sales',
  period: { from: null, to: null }, ownerUserId: null,
  stages: [{ stageId: 's1', stageKey: 'novo', stageLabel: 'Novo', order: 0, open: { count: 3, amountCents: 30_000, weightedAmountCents: 15_000 } }],
  totalOpen: { count: 3, amountCents: 30_000, weightedAmountCents: 15_000 },
  closed: {
    won: { total: { count: 2, amountCents: 20_000 }, byReason: [{ reason: 'preco', count: 2, amountCents: 20_000 }] },
    lost: { total: { count: 1, amountCents: 5_000 }, byReason: [{ reason: 'concorrencia', count: 1, amountCents: 5_000 }] },
  },
  conversion: [],
  cycle: { closedCohort: { avgDaysToClose: 4.5, closedCount: 3 }, perStageCohort: [] },
  byOwner: [{ ownerUserId: 'u1', ownerName: 'Ana', open: { count: 3, amountCents: 30_000, weightedAmountCents: 15_000 }, won: { count: 2, amountCents: 20_000 }, lost: { count: 1, amountCents: 5_000 } }],
}

const EMPTY: PipelineOverview = {
  pipelineId: 'p1', pipelineName: 'Vendas', pipelineKind: 'sales',
  period: { from: null, to: null }, ownerUserId: null,
  stages: [{ stageId: 's1', stageKey: 'novo', stageLabel: 'Novo', order: 0, open: { count: 0, amountCents: 0, weightedAmountCents: 0 } }],
  totalOpen: { count: 0, amountCents: 0, weightedAmountCents: 0 },
  closed: {
    won: { total: { count: 0, amountCents: 0 }, byReason: [] },
    lost: { total: { count: 0, amountCents: 0 }, byReason: [] },
  },
  conversion: [],
  cycle: { closedCohort: { avgDaysToClose: null, closedCount: 0 }, perStageCohort: [] },
  byOwner: [],
}

beforeEach(() => {
  vi.mocked(pipelineAnalyticsApi.overview).mockReset()
  vi.mocked(usersApi.list).mockReset()
  vi.mocked(usersApi.list).mockResolvedValue({ data: [] } as never)
})

describe('PipelineReportsTab — cards de resumo (D2/SCRUM-935)', () => {
  it('mostra em aberto, ponderado, ganho, conversão geral e ciclo médio a partir da resposta real', async () => {
    vi.mocked(pipelineAnalyticsApi.overview).mockResolvedValue({ data: WITH_DATA } as never)
    render(<PipelineReportsTab pipeline={PIPELINE} />)

    await waitFor(() => expect(screen.getByText('Em aberto')).toBeInTheDocument())
    // "R$ 300,00" aparece 2x (card "Em aberto" + rótulo da etapa "Novo" no
    // funil, que tem o mesmo valor nesta massa de teste) — ambos honestos,
    // a mesma etapa é o único negócio em aberto.
    expect(screen.getAllByText('R$ 300,00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument() // ponderado
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument() // ganho no período
    expect(screen.getByText('67%')).toBeInTheDocument() // conversão: 2 de 3 fechados
    expect(screen.getByText('4.5 dias')).toBeInTheDocument() // ciclo médio
  })
})

describe('PipelineReportsTab — estados vazios honestos (P14)', () => {
  it('sem negócio fechado no período: conversão "—" e "Nenhum negócio fechado no período" nos gráficos', async () => {
    vi.mocked(pipelineAnalyticsApi.overview).mockResolvedValue({ data: EMPTY } as never)
    render(<PipelineReportsTab pipeline={PIPELINE} />)

    // Conversão geral e ciclo médio não têm como sair de uma população vazia
    // (0 fechados) — travessão honesto em vez de "0%"/"0 dias" inventados.
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Nenhum negócio fechado no período').length).toBeGreaterThan(0)
    expect(screen.getByText('Nenhum negócio em aberto')).toBeInTheDocument()
    expect(screen.getByText('Nenhum negócio atribuído ainda')).toBeInTheDocument()
  })
})

describe('PipelineReportsTab — filtro de período (D2/SCRUM-935)', () => {
  it('"Todo o período" chama a API sem `from`/`to`', async () => {
    vi.mocked(pipelineAnalyticsApi.overview).mockResolvedValue({ data: WITH_DATA } as never)
    render(<PipelineReportsTab pipeline={PIPELINE} />)
    await waitFor(() => expect(pipelineAnalyticsApi.overview).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Todo o período' }))

    await waitFor(() => {
      const calls = vi.mocked(pipelineAnalyticsApi.overview).mock.calls
      expect(calls.some(([id, params]) => id === 'p1' && params?.from === undefined && params?.to === undefined)).toBe(true)
    })
  })

  it('filtro de dono envia `ownerUserId` na chamada', async () => {
    vi.mocked(usersApi.list).mockResolvedValue({ data: [{ id: 'u1', firstName: 'Ana', lastName: 'Souza' }] } as never)
    vi.mocked(pipelineAnalyticsApi.overview).mockResolvedValue({ data: WITH_DATA } as never)
    render(<PipelineReportsTab pipeline={PIPELINE} />)
    await waitFor(() => expect(screen.getByText('Ana Souza')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Filtrar por dono'), { target: { value: 'u1' } })

    await waitFor(() => {
      const calls = vi.mocked(pipelineAnalyticsApi.overview).mock.calls
      expect(calls.some(([id, params]) => id === 'p1' && params?.ownerUserId === 'u1')).toBe(true)
    })
  })
})
