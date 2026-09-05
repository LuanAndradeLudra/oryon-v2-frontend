// O que este teste protege: o custo nunca aparece errado. Duas formas de
// aparecer errado seriam mostrar "R$ 0,00" quando o endpoint do BE.5 não
// existe (número inventado no lugar de número ausente) e manter o preço do
// público anterior enquanto o novo ainda não voltou (número velho ao lado de
// público novo). Ambas têm caso próprio aqui.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { CampaignSegmentDefinition } from '@/types/campaignsV2'
import type { AudienceDraft } from './useComposerDraft'

const costEstimate = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  campaignSchedulingApi: { costEstimate: (...args: unknown[]) => costEstimate(...args) },
}))

const { useCostEstimate } = await import('./useCostEstimate')

const DEF_A: CampaignSegmentDefinition = { groups: [{ op: 'and', conditions: [] }] }
const DEF_B: CampaignSegmentDefinition = { groups: [{ op: 'or', conditions: [] }] }

const INLINE: AudienceDraft = { definition: DEF_A }
const SAVED: AudienceDraft  = { segmentId: 'seg_3', definition: DEF_A }

const ESTIMATE = {
  perMessage: { category: 'MARKETING', priceCents: 8, currency: 'BRL' },
  estimatedCount: 184,
  totalCents: 1472,
}

beforeEach(() => {
  costEstimate.mockReset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => { vi.useRealTimers() })

/** Passa o debounce de 400ms do hook. */
async function passDebounce() {
  await act(async () => { await vi.advanceTimersByTimeAsync(450) })
}

describe('useCostEstimate — corpo do pedido', () => {
  it('segmento salvo viaja por segmentId', async () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    renderHook(() => useCostEstimate(SAVED, 'tpl_9'))
    await passDebounce()
    expect(costEstimate).toHaveBeenCalledWith({ segmentId: 'seg_3', templateId: 'tpl_9' })
  })

  it('público inline viaja como grupos', async () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    renderHook(() => useCostEstimate(INLINE, 'tpl_9'))
    await passDebounce()
    expect(costEstimate).toHaveBeenCalledWith({
      groups: DEF_A.groups, exclude: undefined, templateId: 'tpl_9',
    })
  })

  it('sem template não pergunta nada — não há preço por mensagem', async () => {
    renderHook(() => useCostEstimate(INLINE, undefined))
    await passDebounce()
    expect(costEstimate).not.toHaveBeenCalled()
  })

  it('sem público não pergunta nada', async () => {
    renderHook(() => useCostEstimate(null, 'tpl_9'))
    await passDebounce()
    expect(costEstimate).not.toHaveBeenCalled()
  })
})

describe('useCostEstimate — debounce', () => {
  it('não chama antes do debounce vencer', () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    renderHook(() => useCostEstimate(INLINE, 'tpl_9'))
    expect(costEstimate).not.toHaveBeenCalled()
  })

  it('mesma definição em objeto novo não dispara chamada nova', async () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    const { rerender } = renderHook(({ a }: { a: AudienceDraft }) => useCostEstimate(a, 'tpl_9'), {
      initialProps: { a: INLINE },
    })
    await passDebounce()
    expect(costEstimate).toHaveBeenCalledTimes(1)

    // O AudienceBlock recria o objeto a cada render; só o conteúdo conta.
    rerender({ a: { definition: { groups: [{ op: 'and', conditions: [] }] } } })
    await passDebounce()
    expect(costEstimate).toHaveBeenCalledTimes(1)
  })
})

describe('useCostEstimate — o número nunca fica errado', () => {
  it('endpoint ausente esconde a métrica em vez de mostrar zero', async () => {
    costEstimate.mockRejectedValue({ response: { status: 404, data: {} } })
    const { result } = renderHook(() => useCostEstimate(INLINE, 'tpl_9'))
    await passDebounce()

    await waitFor(() => expect(result.current.available).toBe(false))
    expect(result.current.estimate).toBeNull()
  })

  it('trocar de público invalida o preço anterior na hora', async () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    const { result, rerender } = renderHook(({ a }: { a: AudienceDraft }) => useCostEstimate(a, 'tpl_9'), {
      initialProps: { a: INLINE },
    })
    await passDebounce()
    await waitFor(() => expect(result.current.estimate).toEqual(ESTIMATE))

    // Público novo: o preço velho some no mesmo render, sem esperar resposta.
    rerender({ a: { definition: DEF_B } })
    expect(result.current.estimate).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('erro de servidor não deixa preço velho na tela', async () => {
    costEstimate.mockResolvedValue({ data: ESTIMATE })
    const { result, rerender } = renderHook(({ a }: { a: AudienceDraft }) => useCostEstimate(a, 'tpl_9'), {
      initialProps: { a: INLINE },
    })
    await passDebounce()
    await waitFor(() => expect(result.current.estimate).toEqual(ESTIMATE))

    costEstimate.mockRejectedValue({ response: { status: 500, data: {} } })
    rerender({ a: { definition: DEF_B } })
    await passDebounce()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.estimate).toBeNull()
    // 500 é servidor quebrado, não recurso inexistente — o botão continua.
    expect(result.current.available).toBe(true)
  })
})
