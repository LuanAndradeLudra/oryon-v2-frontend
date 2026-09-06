import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { Campaign, CampaignStatus } from '@/types'

const get = vi.fn()
vi.mock('@/services/api', () => ({ api: { get: (...a: unknown[]) => get(...a) } }))

import { measureRates, useAgendaCampaigns } from './useAgendaCampaigns'
import { campaignsPagedApi } from '@/services/campaignsV2Api'

function stats(over: Partial<Campaign['stats']> = {}): Campaign['stats'] {
  return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, ...over }
}

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: `Disparo ${over.id}`,
    templateId: 'tpl-1',
    templateName: 'template_teste',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled' as CampaignStatus,
    stats: stats(),
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

describe('measureRates — taxa medida, nunca extrapolada', () => {
  it('não produz taxa no primeiro tique (não há intervalo para medir)', () => {
    const samples = new Map()
    const c = campaign({ id: 'a', status: 'sending', stats: stats({ total: 1000, sent: 100 }) })
    expect(measureRates([c], samples, 1_000).size).toBe(0)
  })

  it('mede a taxa entre dois tiques', () => {
    const samples = new Map()
    measureRates([campaign({ id: 'a', status: 'sending', stats: stats({ total: 1000, sent: 100 }) })], samples, 0)
    const rates = measureRates(
      [campaign({ id: 'a', status: 'sending', stats: stats({ total: 1000, sent: 164 }) })],
      samples, 20_000,
    )
    expect(rates.get('a')?.perSecond).toBeCloseTo(3.2, 5)
  })

  it('some quando a fila para (delta zero) em vez de mostrar 0 msg/s', () => {
    const samples = new Map()
    const parada = campaign({ id: 'a', status: 'sending', stats: stats({ total: 1000, sent: 100 }) })
    measureRates([parada], samples, 0)
    expect(measureRates([parada], samples, 20_000).has('a')).toBe(false)
  })

  it('esquece a amostra quando a campanha sai de "sending"', () => {
    const samples = new Map()
    measureRates([campaign({ id: 'a', status: 'sending', stats: stats({ sent: 100 }) })], samples, 0)
    measureRates([campaign({ id: 'a', status: 'sent', stats: stats({ sent: 100 }) })], samples, 20_000)
    expect(samples.has('a')).toBe(false)
  })

  it('descarta a amostra velha em vez de medir com ela', () => {
    // Aba oculta 40 min: 1000 → 2200 enviadas. Dividir pelo intervalo inteiro
    // daria 0,5 msg/s apresentado como a taxa de AGORA.
    const samples = new Map()
    measureRates([campaign({ id: 'a', status: 'sending', stats: stats({ sent: 1000 }) })], samples, 0)
    const depois = campaign({ id: 'a', status: 'sending', stats: stats({ sent: 2200 }) })
    expect(measureRates([depois], samples, 40 * 60_000).has('a')).toBe(false)
    // E a amostra nova, gravada no mesmo tique, devolve a taxa no seguinte.
    const seguinte = campaign({ id: 'a', status: 'sending', stats: stats({ sent: 2260 }) })
    const rates = measureRates([seguinte], samples, 40 * 60_000 + 20_000)
    expect(rates.get('a')?.perSecond).toBeCloseTo(3, 5)
  })
})

describe('campaignsPagedApi.list — as três formas de resposta', () => {
  beforeEach(() => { get.mockReset() })

  it('lê o envelope `{data,total}` do backend', async () => {
    get.mockResolvedValue({ data: { data: [campaign({ id: 'a' })], total: 42, page: 2, limit: 100 } })
    const { data } = await campaignsPagedApi.list({ page: 2, limit: 100 })
    expect(data.total).toBe(42)
    expect(data.data).toHaveLength(1)
  })

  it('aceita o array cru das versões antigas e deriva o total dele', async () => {
    get.mockResolvedValue({ data: [campaign({ id: 'a' }), campaign({ id: 'b' })] })
    const { data } = await campaignsPagedApi.list()
    expect(data.total).toBe(2)
    expect(data.data.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('corpo inesperado vira página vazia, não derruba quem pagina em laço', async () => {
    get.mockResolvedValue({ data: {} })
    const { data } = await campaignsPagedApi.list()
    expect(data.data).toEqual([])
    expect(data.total).toBe(0)
  })
})

describe('useAgendaCampaigns — o laço de paginação', () => {
  beforeEach(() => { get.mockReset() })

  const page = (ids: string[], total: number) => ({
    data: { data: ids.map((id) => campaign({ id })), total, page: 1, limit: 100 },
  })

  it('para quando juntou tudo, e não declara truncado', async () => {
    get.mockResolvedValueOnce(page(['a', 'b'], 2))
    const { result } = renderHook(() => useAgendaCampaigns())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.campaigns).toHaveLength(2)
    expect(result.current.truncated).toBe(false)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('para no teto de páginas e DECLARA o corte', async () => {
    // O backend diz que existem 900; o teto é 3 x 100.
    const cem = Array.from({ length: 100 }, (_, i) => `c${i}`)
    get.mockResolvedValue(page(cem, 900))
    const { result } = renderHook(() => useAgendaCampaigns())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledTimes(3)
    expect(result.current.truncated).toBe(true)
    expect(result.current.total).toBe(900)
  })

  it('página vazia encerra o laço mesmo com o total desalinhado', async () => {
    get.mockResolvedValueOnce(page(['a'], 900)).mockResolvedValueOnce(page([], 900))
    const { result } = renderHook(() => useAgendaCampaigns())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledTimes(2)
    expect(result.current.truncated).toBe(false)
  })
})
