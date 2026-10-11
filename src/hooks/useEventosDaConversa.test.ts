import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const fetchUserActivity = vi.fn()
const fetchAgentActions = vi.fn()
vi.mock('@/services/userActivityApi', () => ({ fetchUserActivity: (...a: unknown[]) => fetchUserActivity(...a) }))
vi.mock('@/services/agentActivityApi', () => ({ fetchAgentActions: (...a: unknown[]) => fetchAgentActions(...a) }))
vi.mock('@/services/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@/components/conversations/ContactPanel/ConversationActivitySection', () => ({ ACTIVITY_INVALIDATE_EVENT: 'oryon:activity-invalidate' }))

import { useEventosDaConversa, type GatilhoDeMensagens } from './useEventosDaConversa'

type Props = { id: string | null; m: GatilhoDeMensagens }
const msg = (id: string, conversationId: string) => ({ id, conversationId })

async function passar(ms = 500) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

describe('useEventosDaConversa — gatilho de releitura (revisão 11/10)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchUserActivity.mockReset().mockResolvedValue([])
    fetchAgentActions.mockReset().mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())

  it('troca J/K (N → 0 → M) lê os eventos UMA vez por conversa', async () => {
    const { rerender } = renderHook(({ id, m }: Props) => useEventosDaConversa(id, m), {
      initialProps: { id: 'A', m: { ultima: null, carregando: true } } as Props,
    })
    rerender({ id: 'A', m: { ultima: msg('a3', 'A'), carregando: false } })
    await passar()
    expect(fetchUserActivity).toHaveBeenCalledTimes(1)

    // Render da troca: conversa B, mensagens ainda as de A; depois limpa, carrega e chega.
    rerender({ id: 'B', m: { ultima: msg('a3', 'A'), carregando: false } })
    rerender({ id: 'B', m: { ultima: null, carregando: true } })
    rerender({ id: 'B', m: { ultima: msg('b9', 'B'), carregando: false } })
    await passar()
    expect(fetchUserActivity).toHaveBeenCalledTimes(2)
    expect(fetchUserActivity).toHaveBeenLastCalledWith('B')
  })

  it('conversa vazia: a 1ª mensagem (0 → 1) relê os eventos', async () => {
    const { rerender } = renderHook(({ id, m }: Props) => useEventosDaConversa(id, m), {
      initialProps: { id: 'A', m: { ultima: null, carregando: true } } as Props,
    })
    rerender({ id: 'A', m: { ultima: null, carregando: false } })
    await passar()
    expect(fetchUserActivity).toHaveBeenCalledTimes(1)
    rerender({ id: 'A', m: { ultima: msg('a1', 'A'), carregando: false } })
    await passar()
    expect(fetchUserActivity).toHaveBeenCalledTimes(2)
  })

  it('página antiga (fetchMore) não muda a última e não relê', async () => {
    const { rerender } = renderHook(({ id, m }: Props) => useEventosDaConversa(id, m), {
      initialProps: { id: 'A', m: { ultima: null, carregando: true } } as Props,
    })
    rerender({ id: 'A', m: { ultima: msg('a3', 'A'), carregando: false } })
    await passar()
    rerender({ id: 'A', m: { ultima: msg('a3', 'A'), carregando: true } })
    rerender({ id: 'A', m: { ultima: msg('a3', 'A'), carregando: false } })
    await passar()
    expect(fetchUserActivity).toHaveBeenCalledTimes(1)
  })
})
