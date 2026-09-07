// O buraco que o achado B1 do Lince expôs: nada na suíte cobria SOBREPOSIÇÃO.
// Cada resolução isolada passava; duas ao mesmo tempo é que se atropelavam, e
// é exatamente o que o polling produz — cada tique troca `campaigns` e o POST
// de contagem é lento por construção.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAudienceCounts } from './useAgendaLookups'
import { campaignsApi } from '@/services/api'
import type { Campaign } from '@/types'

vi.mock('@/services/api', () => ({
  campaignsApi: { countSegment: vi.fn() },
}))

const countSegment = vi.mocked(campaignsApi.countSegment)

function agendada(id: string, tag: string): Campaign {
  return {
    id, tenantId: 't1', name: id,
    templateId: 'tpl', templateName: 'tpl',
    // Segmentos DIFERENTES: assinaturas iguais compartilhariam o cache e o
    // teste mediria memorização em vez de sobreposição.
    segment: { type: 'tag', tagIds: [tag] },
    variableMappings: [], status: 'scheduled',
    stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1', createdAt: '2026-09-01T00:00:00.000Z',
  } as Campaign
}

/** Uma promessa que eu resolvo quando quiser — é assim que se cruzam duas. */
function adiada<T>() {
  let solta!: (v: T) => void
  const p = new Promise<T>((r) => { solta = r })
  return { p, solta }
}

beforeEach(() => { countSegment.mockReset() })

describe('useAudienceCounts · duas resoluções sobrepostas', () => {
  it('a segunda resposta não apaga a primeira', async () => {
    const a = adiada<{ data: { count: number } }>()
    const b = adiada<{ data: { count: number } }>()
    countSegment.mockImplementation((seg) => {
      const tag = (seg as { tagIds?: string[] }).tagIds?.[0]
      return (tag === 'a' ? a.p : b.p) as ReturnType<typeof campaignsApi.countSegment>
    })

    const { result, rerender } = renderHook(
      ({ cs }: { cs: Campaign[] }) => useAudienceCounts(cs),
      { initialProps: { cs: [agendada('A', 'a')] } },
    )

    // Segundo tique do polling entra com a lista nova enquanto A ainda voa.
    rerender({ cs: [agendada('A', 'a'), agendada('B', 'b')] })

    // B volta primeiro; A depois. A ordem é o pior caso, e é a comum: quem
    // partiu de um retrato antigo escreve por cima de quem chegou antes.
    b.solta({ data: { count: 20 } })
    await waitFor(() => expect(result.current.get('B')).toBe(20))
    a.solta({ data: { count: 10 } })

    await waitFor(() => {
      expect(result.current.get('A')).toBe(10)
      expect(result.current.get('B')).toBe(20)
    })
  })

  it('a contagem que já chegou sobrevive ao tique seguinte', async () => {
    countSegment.mockResolvedValue({ data: { count: 7 } } as Awaited<ReturnType<typeof campaignsApi.countSegment>>)

    const { result, rerender } = renderHook(
      ({ cs }: { cs: Campaign[] }) => useAudienceCounts(cs),
      { initialProps: { cs: [agendada('A', 'a')] } },
    )
    await waitFor(() => expect(result.current.get('A')).toBe(7))

    rerender({ cs: [agendada('A', 'a'), agendada('B', 'b')] })
    await waitFor(() => expect(result.current.get('B')).toBe(7))
    expect(result.current.get('A')).toBe(7)
  })
})

describe('useAudienceCounts · o que ele NÃO conta', () => {
  it('não pergunta o público de quem não está agendada', async () => {
    countSegment.mockResolvedValue({ data: { count: 1 } } as Awaited<ReturnType<typeof campaignsApi.countSegment>>)
    const enviada = { ...agendada('E', 'e'), status: 'sent' } as Campaign
    renderHook(() => useAudienceCounts([enviada]))
    await new Promise((r) => setTimeout(r, 0))
    expect(countSegment).not.toHaveBeenCalled()
  })

  // Sem contagem o cartão simplesmente não escreve "N contatos" — não vira 0.
  it('erro na consulta não vira número', async () => {
    countSegment.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useAudienceCounts([agendada('A', 'a')]))
    await waitFor(() => expect(countSegment).toHaveBeenCalled())
    expect(result.current.get('A')).toBeUndefined()
  })
})
