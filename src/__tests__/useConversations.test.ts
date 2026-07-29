// ─── useConversations — SCRUM-527 ────────────────────────────────────────────
// First tests for this hook. It drives the whole inbox list and had zero
// coverage, despite the vitest+jsdom+testing-library infra being in place.
//
// Focus is the F6a fix: the "Verificar" indicator. Two defects shipped to
// production motivated it, and both are SILENT — the UI renders a plausible,
// wrong state, so nothing short of a test catches a regression:
//
//   1. `hasRecentAnomaly` never came back from the REST payload, so the row
//      badge only existed as a socket patch and died on the next refetch.
//      (Backend half: SCRUM-524/525.)
//   2. `handleAiPauseUpdated` patched the row but never moved
//      `needsReviewCount`. The header badge is gated on `> 0`, so a session
//      that opened at 0 never showed the indicator or its filter toggle.
//
// What these tests PROTECT against:
//   - Someone drops the counts refresh from the pause handler → test fails.
//   - Someone "optimises" the debounce away → double-emit test fails.
//   - Someone makes refetchCounts overwrite the list → test fails.
//   - Someone spends a request on manual pause/resume → test fails.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Conversation } from '@/types'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('@/services/api', () => ({
  conversationsApi: {
    list: vi.fn(),
    get: vi.fn(),
    markAsRead: vi.fn(() => Promise.resolve({ data: {} })),
    updateStatus: vi.fn(),
    assign: vi.fn(() => Promise.resolve({ data: {} })),
    transfer: vi.fn(() => Promise.resolve({ data: {} })),
    archive: vi.fn(() => Promise.resolve({ data: {} })),
    setAiPause: vi.fn(() => Promise.resolve({ data: {} })),
    interveneAiDefault: vi.fn(() => Promise.resolve({ data: { aiPausedUntil: null } })),
  },
}))

import { useConversations } from '@/hooks/useConversations'
import { conversationsApi } from '@/services/api'

const listMock = vi.mocked(conversationsApi.list)

/** Minimal conversation row — only the fields these assertions touch. */
function conv(id: string, over: Partial<Conversation> = {}): Conversation {
  return {
    id,
    status: 'open',
    unreadCount: 0,
    lastMessageAt: '2026-07-28T12:00:00.000Z',
    ...over,
  } as Conversation
}

function listResponse(over: Record<string, unknown> = {}) {
  return {
    data: {
      data: [] as Conversation[],
      hasMore: false,
      statusCounts: { all: 0, open: 0, pending: 0, resolved: 0 },
      needsReviewCount: 0,
      ...over,
    },
  }
}

/** Mount the hook and let the initial fetch settle. */
async function mountHook(initial = listResponse()) {
  listMock.mockResolvedValue(initial as never)
  const view = renderHook(() => useConversations({}))
  await act(async () => { await Promise.resolve() })
  return view
}

describe('useConversations — "Verificar" badge and counters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps hasRecentAnomaly from the REST payload (badge survives a refetch)', async () => {
    // The backend now ships the field per row (SCRUM-524). Guards against a
    // regression where the list shape drops it again and the badge silently
    // depends on a socket patch that any refetch wipes out.
    const { result } = await mountHook(
      listResponse({ data: [conv('c-1', { hasRecentAnomaly: true }), conv('c-2')] }),
    )

    expect(result.current.conversations).toHaveLength(2)
    expect(result.current.conversations[0].hasRecentAnomaly).toBe(true)
    expect(result.current.conversations[1].hasRecentAnomaly).toBeUndefined()

    await act(async () => { await result.current.refetch() })

    expect(result.current.conversations[0].hasRecentAnomaly).toBe(true)
  })

  it('patches the row immediately and refreshes counters after the debounce', async () => {
    const { result } = await mountHook(listResponse({ data: [conv('c-1')] }))
    expect(listMock).toHaveBeenCalledTimes(1) // mount fetch

    listMock.mockResolvedValue(
      listResponse({
        statusCounts: { all: 9, open: 5, pending: 3, resolved: 1 },
        needsReviewCount: 4,
      }) as never,
    )

    act(() => {
      result.current.handleAiPauseUpdated({
        conversationId: 'c-1',
        aiPausedUntil: '2026-07-28T14:00:00.000Z',
        changedBy: 'ai-guard',
        hasRecentAnomaly: true,
      } as never)
    })

    // Row patch is synchronous — the badge must not wait on the debounce.
    expect(result.current.conversations[0].hasRecentAnomaly).toBe(true)
    expect(listMock).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    expect(listMock).toHaveBeenCalledTimes(2)
    // limit=1: the counters are computed server-side and don't depend on page size.
    expect(listMock).toHaveBeenLastCalledWith({}, 1, 1)
    // The header badge is gated on `> 0` — this is the number that was stuck.
    expect(result.current.needsReviewCount).toBe(4)
    expect(result.current.statusCounts).toEqual({ all: 9, open: 5, pending: 3, resolved: 1 })
  })

  it('collapses the backend double emit into a single counts request', async () => {
    // triggerHandoff emits `conversation:ai-pause-updated` twice with the same
    // event name (emitToConversation + emitToTenant), and a client in both
    // rooms receives both. The debounce is what makes that harmless.
    const { result } = await mountHook(listResponse({ data: [conv('c-1')] }))
    listMock.mockResolvedValue(listResponse({ needsReviewCount: 1 }) as never)

    const payload = {
      conversationId: 'c-1',
      aiPausedUntil: '2026-07-28T14:00:00.000Z',
      changedBy: 'ai-guard',
      hasRecentAnomaly: true,
    }

    act(() => {
      result.current.handleAiPauseUpdated(payload as never)
      result.current.handleAiPauseUpdated(payload as never)
    })

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    // 1 mount + 1 refresh. Two would mean the debounce was lost.
    expect(listMock).toHaveBeenCalledTimes(2)
  })

  it('refreshing counters never replaces the conversation list', async () => {
    // refetchCounts reuses the list endpoint, so the guard is that it reads
    // only the counters out of the response. Otherwise a 1-row page would
    // truncate the operator's list to a single conversation.
    const { result } = await mountHook(
      listResponse({ data: [conv('c-1'), conv('c-2'), conv('c-3')] }),
    )
    expect(result.current.conversations).toHaveLength(3)

    listMock.mockResolvedValue(
      listResponse({ data: [conv('c-99')], needsReviewCount: 7 }) as never,
    )

    act(() => {
      result.current.handleAiPauseUpdated({
        conversationId: 'c-1',
        aiPausedUntil: null,
        changedBy: 'ai-guard',
        hasRecentAnomaly: true,
      } as never)
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    expect(result.current.needsReviewCount).toBe(7)
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c-1', 'c-2', 'c-3'])
  })

  it('does not spend a request on a manual pause/resume', async () => {
    // A manual pause carries no `hasRecentAnomaly` and moves neither counter.
    const { result } = await mountHook(listResponse({ data: [conv('c-1')] }))

    act(() => {
      result.current.handleAiPauseUpdated({
        conversationId: 'c-1',
        aiPausedUntil: '2026-07-28T14:00:00.000Z',
        changedBy: 'user-7',
      } as never)
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    expect(listMock).toHaveBeenCalledTimes(1) // mount only
    expect(result.current.conversations[0].aiPausedUntil).toBe('2026-07-28T14:00:00.000Z')
  })

  // ── SCRUM-561/562 — status realtime ──────────────────────────────────────

  it('inserts a conversation that only NOW matches the active filter', async () => {
    // THE case the feature exists for, and the one the naive fix misses:
    // filter = "Pendentes", the conversation is still `open` so it is NOT in the
    // list, and `patchConv` is `prev.map(...)` — a pure no-op. Nothing would
    // ever render. The handler has to FETCH.
    listMock.mockResolvedValue(listResponse({ data: [] }) as never)
    const view = renderHook(() => useConversations({ status: 'pending' }))
    await act(async () => { await Promise.resolve() })

    vi.mocked(conversationsApi.get).mockResolvedValue(
      { data: conv('c-new', { status: 'pending' }) } as never,
    )

    await act(async () => {
      view.result.current.handleStatusUpdated({
        conversationId: 'c-new', status: 'pending', previousStatus: 'open', changedBy: 'ai-guard',
      } as never)
      await Promise.resolve()
    })

    expect(conversationsApi.get).toHaveBeenCalledWith('c-new')
    expect(view.result.current.conversations.map((c) => c.id)).toContain('c-new')
  })

  it('EVICTS a row that no longer matches the active filter', async () => {
    // Filter = "Abertas". The conversation flips to `pending`. Without eviction
    // it stays on screen rendering a "Pendente" badge inside the "Abertas" tab —
    // a plausible, wrong state. Nothing in the hook removed rows before this.
    const { result } = await mountHook(
      listResponse({ data: [conv('c-1'), conv('c-2')] }),
    )
    // Re-mount under an explicit status filter.
    listMock.mockResolvedValue(listResponse({ data: [conv('c-1'), conv('c-2')] }) as never)
    const view = renderHook(() => useConversations({ status: 'open' }))
    await act(async () => { await Promise.resolve() })
    expect(view.result.current.conversations).toHaveLength(2)

    await act(async () => {
      view.result.current.handleStatusUpdated({
        conversationId: 'c-1', status: 'pending', previousStatus: 'open', changedBy: 'ai-guard',
      } as never)
      await Promise.resolve()
    })

    expect(view.result.current.conversations.map((c) => c.id)).toEqual(['c-2'])
    expect(result.current.conversations).toBeDefined()   // first hook untouched
  })

  it('a flip back re-fetches instead of silently no-op-ing', async () => {
    // Eviction also clears `loadedConvIds`. If it didn't, a conversation that
    // came back to the filter would hit the membership branch, be considered
    // "already loaded", and never reappear.
    listMock.mockResolvedValue(listResponse({ data: [conv('c-1')] }) as never)
    const view = renderHook(() => useConversations({ status: 'open' }))
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      view.result.current.handleStatusUpdated({
        conversationId: 'c-1', status: 'pending', previousStatus: 'open', changedBy: 'ai-guard',
      } as never)
      await Promise.resolve()
    })
    expect(view.result.current.conversations).toHaveLength(0)

    vi.mocked(conversationsApi.get).mockResolvedValue({ data: conv('c-1', { status: 'open' }) } as never)
    await act(async () => {
      view.result.current.handleStatusUpdated({
        conversationId: 'c-1', status: 'open', previousStatus: 'pending', changedBy: 'user-7',
      } as never)
      await Promise.resolve()
    })

    expect(conversationsApi.get).toHaveBeenCalledWith('c-1')
  })

  // ── Ações locais reconciliam, não só patcham ─────────────────────────────
  // Bug do UAT: operador em "Abertas" muda o status para Pendente e a linha
  // FICA na lista, exibindo o badge "Pendente" dentro da aba "Abertas". Só
  // sumia depois de um refetch.
  //
  // A evicção existia — mas só no caminho do SOCKET. A aba que EXECUTOU a ação
  // usava `patchConv` (um `prev.map`), que atualiza o campo e não reavalia o
  // filtro. Depender do socket dar a volta para corrigir a própria aba que
  // agiu é frágil: perdido ou atrasado o evento, o operador fica olhando um
  // estado plausível e errado.

  it('EVICTA ao mudar o status pela própria aba — o bug do UAT', async () => {
    listMock.mockResolvedValue(listResponse({ data: [conv('c-1'), conv('c-2')] }) as never)
    const view = renderHook(() => useConversations({ status: 'open' }))
    await act(async () => { await Promise.resolve() })
    expect(view.result.current.conversations).toHaveLength(2)

    vi.mocked(conversationsApi.updateStatus).mockResolvedValue(
      { data: { id: 'c-1', status: 'pending' } } as never,
    )

    await act(async () => { await view.result.current.updateStatus('c-1', 'pending') })

    expect(view.result.current.conversations.map((c) => c.id)).toEqual(['c-2'])
  })

  it('mantém a linha quando ela ainda casa com o filtro', async () => {
    // Sob "Todas", mudar o status não deve remover nada.
    listMock.mockResolvedValue(listResponse({ data: [conv('c-1')] }) as never)
    const view = renderHook(() => useConversations({}))
    await act(async () => { await Promise.resolve() })

    vi.mocked(conversationsApi.updateStatus).mockResolvedValue(
      { data: { id: 'c-1', status: 'pending' } } as never,
    )
    await act(async () => { await view.result.current.updateStatus('c-1', 'pending') })

    expect(view.result.current.conversations).toHaveLength(1)
    expect(view.result.current.conversations[0].status).toBe('pending')
  })

  it('a mesma falha existia em atribuição e em pausa da IA', async () => {
    // Mesma classe de bug, outros campos: `assignedUser` sob "Minhas" e
    // `aiPausedUntil` sob "IA ativa". Todas as ações locais que tocam um campo
    // filtrado precisam reconciliar.
    listMock.mockResolvedValue(
      listResponse({ data: [conv('c-1', { assignedUser: { id: 'user-1' } as Conversation['assignedUser'] })] }) as never,
    )
    const atribuidas = renderHook(() => useConversations({ assignedTo: 'me' }))
    await act(async () => { await Promise.resolve() })
    await act(async () => { await atribuidas.result.current.assignUser('c-1', null) })
    expect(atribuidas.result.current.conversations).toHaveLength(0)

    listMock.mockResolvedValue(listResponse({ data: [conv('c-2', { aiPausedUntil: null })] }) as never)
    const iaAtiva = renderHook(() => useConversations({ aiHandling: 'active' }))
    await act(async () => { await Promise.resolve() })
    await act(async () => { await iaAtiva.result.current.setAiPause('c-2', '2099-01-01T00:00:00.000Z') })
    expect(iaAtiva.result.current.conversations).toHaveLength(0)
  })

  it('uma pausa que FALHA não some com a conversa', async () => {
    // O patch otimista não evicta; a reconciliação só roda após confirmação.
    // Se evictasse antes, o rollback (`prev.map`) seria no-op numa linha já
    // removida — a conversa sumiria para sempre por causa de um 500.
    listMock.mockResolvedValue(listResponse({ data: [conv('c-1', { aiPausedUntil: null })] }) as never)
    const view = renderHook(() => useConversations({ aiHandling: 'active' }))
    await act(async () => { await Promise.resolve() })

    vi.mocked(conversationsApi.setAiPause).mockRejectedValueOnce(new Error('500'))

    await act(async () => {
      await view.result.current.setAiPause('c-1', '2099-01-01T00:00:00.000Z').catch(() => {})
    })

    expect(view.result.current.conversations).toHaveLength(1)
    expect(view.result.current.conversations[0].aiPausedUntil).toBeNull()
  })

  it('keeps the previous counters when the refresh request fails', async () => {
    const { result } = await mountHook(
      listResponse({
        data: [conv('c-1')],
        statusCounts: { all: 2, open: 2, pending: 0, resolved: 0 },
        needsReviewCount: 1,
      }),
    )

    listMock.mockRejectedValue(new Error('network'))

    act(() => {
      result.current.handleAiPauseUpdated({
        conversationId: 'c-1',
        aiPausedUntil: null,
        changedBy: 'ai-guard',
        hasRecentAnomaly: true,
      } as never)
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    // Advisory data: a failed refresh must not zero the badges or raise an error.
    expect(result.current.needsReviewCount).toBe(1)
    expect(result.current.statusCounts).toEqual({ all: 2, open: 2, pending: 0, resolved: 0 })
    expect(result.current.error).toBeNull()
  })
})
