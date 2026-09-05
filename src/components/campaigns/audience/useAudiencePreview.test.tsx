import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAudiencePreview } from './useAudiencePreview'
import { createCondition, createGroup, type AudienceDefinition } from './segmentBuilder'

const preview = vi.fn()
const previewSegment = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  segmentsApi: { preview: (...args: unknown[]) => preview(...args) },
}))

vi.mock('@/services/api', () => ({
  campaignsApi: { previewSegment: (...args: unknown[]) => previewSegment(...args) },
}))

function notFound() {
  return Object.assign(new Error('Not Found'), { response: { status: 404 } })
}

function definition(): AudienceDefinition {
  return {
    groups: [createGroup([createCondition('tags', 'includes_any', ['t1'])])],
    exclude: { optOut: true, campaignedWithinDays: 7 },
  }
}

const pageOne = {
  data: [{ id: 'c1', displayName: 'Marina Torres', waId: '5511999998888', stage: 'negociacao' }],
  total: 289,
  page: 1,
  limit: 50,
}

describe('useAudiencePreview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pagina pelo endpoint novo quando ele existe', async () => {
    preview.mockResolvedValue({ data: { ...pageOne, page: 2 } })

    const { result } = renderHook(() => useAudiencePreview(definition(), { page: 2, limit: 50 }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(true)
    expect(result.current.total).toBe(289)
    expect(result.current.page).toBe(2)
    // Grupos e exclusões vão inteiros, mais a paginação.
    expect(preview.mock.calls[0][0]).toMatchObject({
      exclude: { optOut: true, campaignedWithinDays: 7 },
      page: 2,
      limit: 50,
    })
    expect(previewSegment).not.toHaveBeenCalled()
  })

  it('cai para o preview legado, com o segmento traduzido, quando o endpoint não existe', async () => {
    preview.mockRejectedValue(notFound())
    previewSegment.mockResolvedValue({ data: pageOne })

    const { result } = renderHook(() => useAudiencePreview(definition(), { page: 1, limit: 50 }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.available).toBe(false)
    expect(result.current.data).toHaveLength(1)
    // O motor antigo não tem exclusão por disparo recente; sobra o opt-in
    // imposto, que é como o opt-out se expressa ali.
    expect(previewSegment).toHaveBeenCalledWith(
      { type: 'filter', filterTagIds: ['t1'], filterOptIn: true },
      1,
      50,
    )
  })

  it('não consulta nada enquanto não houver condição montada', async () => {
    const { result } = renderHook(() =>
      useAudiencePreview({ groups: [createGroup([])], exclude: {} }, { page: 1, limit: 50 }),
    )

    await waitFor(() => expect(result.current.total).toBe(0))
    expect(preview).not.toHaveBeenCalled()
    expect(previewSegment).not.toHaveBeenCalled()
  })

  it('devolve lista vazia com erro, e não silenciosamente vazia, quando a chamada falha', async () => {
    preview.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))

    const { result } = renderHook(() => useAudiencePreview(definition(), { page: 1, limit: 50 }))

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data).toEqual([])
    expect(result.current.total).toBe(0)
  })
})
