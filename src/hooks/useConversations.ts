import { useState, useEffect, useCallback, useRef } from 'react'
import { conversationsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { getAwaitingReply, isAiActive } from '@/lib/conversationSignals'
import { useAuth } from '@/contexts/AuthContext'
import type { Conversation, ConversationFilters, ConversationStatusCounts, SocketAiPauseUpdated, SocketMessageNew, Tag, User } from '@/types'

/**
 * Phase 27 — sentinel timestamp used by the UI to mean "pause indefinitely
 * until the user manually resumes". Year 9999 is far enough that a paused
 * conversation never gets implicitly auto-resumed by the inbound handler.
 */
export const INDEFINITE_PAUSE_ISO = '9999-12-31T23:59:59.000Z'

/** Page size used for the conversation list. Tuned for the join-heavy
 *  query in the backend (batch tag/contact/user fetch); 50 keeps p95 well
 *  under 300ms while filling a typical viewport without immediate load-more. */
const PAGE_SIZE = 50

export function useConversations(filters: ConversationFilters = {}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [statusCounts, setStatusCounts] = useState<ConversationStatusCounts>({
    all: 0, open: 0, pending: 0, resolved: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Filter scoping is owned by the page — admins pick via a local
  // LineFilterChip and pass whatsappNumberId through `filters`.
  // Agents/supervisors are already gated by the backend
  // (`resolveAllowedWhatsappIds`) so they never see lines outside their
  // department regardless of what the client sends.
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const userRef = useRef(user)
  userRef.current = user

  const initialLoadDone = useRef(false)

  // Pagination cursor — kept in a ref so the socket handlers and loadMore
  // see the up-to-date value without having to be recreated on every page bump.
  const pageRef = useRef(1)

  // Lock that prevents duplicate `loadMore` calls during the React render gap
  // between scroll events firing rapidly. setState is async, so checking
  // `loadingMore` (state) inside loadMore can read a stale `false` and let
  // multiple scroll events all start a fetch before the first re-render.
  const loadingMoreLockRef = useRef(false)

  // Tracks IDs of conversations currently in the list so we can detect
  // new conversations that arrive via WebSocket and aren't loaded yet.
  const loadedConvIds = useRef<Set<string>>(new Set())

  // Prevents duplicate in-flight fetches for the same conversation ID.
  const pendingFetches = useRef<Set<string>>(new Set())

  const fetchConversations = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true)
      pageRef.current = 1
      const { data } = await withRetry(() => conversationsApi.list(filtersRef.current, 1, PAGE_SIZE))
      setConversations(data.data)
      loadedConvIds.current = new Set(data.data.map((c) => c.id))
      setHasMore(data.hasMore)
      setStatusCounts(data.statusCounts)
      setError(null)
      initialLoadDone.current = true
    } catch {
      setError('Erro ao carregar conversas')
    } finally {
      setLoading(false)
    }
  }, []) // filtersRef is always current — no serialization needed

  /** Append the next page to the list. Dedups by id so race conditions with
   *  socket-prepended conversations don't produce duplicate rows. The lock
   *  ref is required because rapid scroll events can fire faster than React
   *  flushes the `loadingMore` state, which would otherwise allow several
   *  /conversations?page=N+1 calls to race. */
  const loadMore = useCallback(async () => {
    if (loadingMoreLockRef.current || !hasMore) return
    loadingMoreLockRef.current = true
    const next = pageRef.current + 1
    setLoadingMore(true)
    try {
      const { data } = await withRetry(() => conversationsApi.list(filtersRef.current, next, PAGE_SIZE))
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        const incoming = data.data.filter((c) => !seen.has(c.id))
        incoming.forEach((c) => loadedConvIds.current.add(c.id))
        return [...prev, ...incoming]
      })
      setHasMore(data.hasMore)
      setStatusCounts(data.statusCounts)
      pageRef.current = next
    } catch {
      // Keep the existing list; user can retry by scrolling again. No toast
      // here — the list is still usable, just stuck at the current page.
    } finally {
      setLoadingMore(false)
      loadingMoreLockRef.current = false
    }
  }, [hasMore])

  // Re-fetch whenever filters change (stable callback, so we track filters explicitly)
  useEffect(() => {
    fetchConversations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status, filters.assignedTo, filters.aiHandling,
    filters.tagId, filters.search, filters.contactId, filters.whatsappNumberId,
    filters.unreadOnly, filters.awaitingReply, filters.untagged,
    filters.startDate, filters.endDate,
  ])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const patchConv = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    )
  }, [])

  // ── Socket handlers ────────────────────────────────────────────────────────

  /**
   * Fetches a single conversation by ID and prepends it to the list if it
   * passes the currently active filters. Called when a WebSocket event
   * references a conversation that isn't loaded yet (e.g. a first message
   * from a brand-new contact).
   */
  const fetchAndPrependConversation = useCallback(async (conversationId: string) => {
    if (pendingFetches.current.has(conversationId)) return
    pendingFetches.current.add(conversationId)
    try {
      const { data: conv } = await conversationsApi.get(conversationId)
      const f = filtersRef.current
      const currentUser = userRef.current

      // Skip if the conversation wouldn't appear under the active filters.
      if (f.status && f.status !== 'all' && conv.status !== f.status) return
      if (f.whatsappNumberId && conv.whatsappNumber?.id !== f.whatsappNumberId) return
      if (f.contactId && conv.contact?.id !== f.contactId) return
      if (f.assignedTo === 'unassigned' && conv.assignedUser) return
      if (f.assignedTo === 'me' && currentUser && conv.assignedUser?.id !== currentUser.id) return
      // UUID branch — the "Equipe" picker lets the operator filter to a
      // specific colleague's queue (e.g. taking over Maria's conversations
      // after she logs off). Same realtime gate as the static buckets above.
      if (f.assignedTo
          && f.assignedTo !== 'me'
          && f.assignedTo !== 'unassigned'
          && f.assignedTo !== 'all'
          && conv.assignedUser?.id !== f.assignedTo) return
      if (f.aiHandling === 'active' && !isAiActive(conv)) return
      if (f.aiHandling === 'paused' && isAiActive(conv)) return
      if (f.unreadOnly && conv.unreadCount === 0) return
      if (f.awaitingReply && !getAwaitingReply(conv)) return
      if (f.untagged && conv.tags && conv.tags.length > 0) return
      // Period filter — drop conversations whose lastMessageAt falls outside
      // the active range. Same comparison the backend uses (>= start, < end)
      // so the realtime prepend stays consistent with the paginated list.
      if (f.startDate && conv.lastMessageAt && conv.lastMessageAt < f.startDate) return
      if (f.endDate && conv.lastMessageAt && conv.lastMessageAt >= f.endDate) return

      setConversations((prev) => {
        if (prev.some((c) => c.id === conversationId)) return prev
        return [conv, ...prev]
      })
      loadedConvIds.current.add(conversationId)
    } catch {
      // Silent fail — the conversation will appear on next manual refetch.
    } finally {
      pendingFetches.current.delete(conversationId)
    }
  }, [])

  const handleNewMessage = useCallback((payload: SocketMessageNew) => {
    // Defensive — `conversation:updated` fan-out can carry a message-less
    // shape (e.g. when only metadata fields like aiPausedUntil change).
    // Without this guard, accessing payload.message.sentAt below crashes
    // the whole conversations page.
    if (!payload?.message) return

    // If the conversation isn't in the loaded list yet (new contact / first
    // message / outside current page), fetch it and prepend it.
    if (!loadedConvIds.current.has(payload.conversationId)) {
      fetchAndPrependConversation(payload.conversationId)
      return
    }

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.conversationId)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = {
        ...updated[idx],
        lastMessageAt: payload.message.sentAt,
        lastMessagePreview: payload.message.body || payload.message.mediaCaption || `[${payload.message.type ?? 'text'}]`,
        unreadCount: payload.unreadCount,
        // Phase 27 — outbound human messages carry aiPausedUntil so the
        // banner countdown updates without a separate fetch. We accept
        // explicit null (resume) and undefined (untouched).
        ...(payload.aiPausedUntil !== undefined ? { aiPausedUntil: payload.aiPausedUntil } : {}),
        // Phase 32 — the same outbound also auto-assigns the conversation
        // to the sender. Mirror that locally so the assignedUser pill
        // re-renders without waiting for a refetch.
        ...(payload.assignedUser !== undefined ? { assignedUser: payload.assignedUser ?? undefined } : {}),
      }
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })
  }, [fetchAndPrependConversation])

  /** Phase 27 — handler for the dedicated 'conversation:ai-pause-updated' socket
   *  event emitted by the backend's manual pause/resume endpoint.
   *  Phase 32 — also syncs assignedUser because pause/resume now manages it. */
  const handleAiPauseUpdated = useCallback((payload: SocketAiPauseUpdated) => {
    const patch: Partial<Conversation> = { aiPausedUntil: payload.aiPausedUntil }
    if (payload.assignedUser !== undefined) {
      patch.assignedUser = payload.assignedUser ?? undefined
    }
    patchConv(payload.conversationId, patch)
  }, [patchConv])

  const markAsRead = useCallback((conversationId: string) => {
    patchConv(conversationId, { unreadCount: 0 })
    conversationsApi.markAsRead(conversationId).catch(() => { /* best-effort */ })
  }, [patchConv])

  // ── API actions ────────────────────────────────────────────────────────────

  const updateStatus = useCallback(async (id: string, status: 'resolved' | 'open' | 'pending') => {
    const { data } = await conversationsApi.updateStatus(id, status)
    patchConv(id, { status: data.status })
    return data
  }, [patchConv])

  const assignUser = useCallback(async (id: string, user: User | null) => {
    await conversationsApi.assign(id, user?.id ?? null)
    patchConv(id, { assignedUser: user ?? undefined })
  }, [patchConv])

  const transferUser = useCallback(async (id: string, user: User) => {
    await conversationsApi.transfer(id, user.id)
    patchConv(id, { assignedUser: user })
  }, [patchConv])

  const addTag = useCallback(async (id: string, tag: Tag) => {
    await conversationsApi.addTag(id, tag.id)
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const existing = c.tags ?? []
        if (existing.find((t) => t.id === tag.id)) return c
        return { ...c, tags: [...existing, tag] }
      })
    )
  }, [])

  const removeTag = useCallback(async (id: string, tagId: string) => {
    await conversationsApi.removeTag(id, tagId)
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, tags: (c.tags ?? []).filter((t) => t.id !== tagId) } : c
      )
    )
  }, [])

  const archiveConversation = useCallback(async (id: string) => {
    await conversationsApi.archive(id)
    patchConv(id, { status: 'abandoned' })
  }, [patchConv])

  /**
   * Phase 27 — manually pause/resume the WhatsApp AI for one conversation.
   * Pass `null` to resume immediately, `INDEFINITE_PAUSE_ISO` for pause
   * indefinitely, or any future ISO timestamp.
   *
   * Optimistically patches the local state, then syncs with the backend.
   * Failures roll back to the previous value so the UI never shows a
   * state that doesn't exist server-side.
   */
  const setAiPause = useCallback(async (id: string, pauseUntil: string | null) => {
    let previous: string | null | undefined
    setConversations((prev) => {
      const target = prev.find((c) => c.id === id)
      previous = target?.aiPausedUntil ?? null
      return prev.map((c) => (c.id === id ? { ...c, aiPausedUntil: pauseUntil } : c))
    })
    try {
      await conversationsApi.setAiPause(id, pauseUntil)
    } catch (err) {
      // Rollback on failure
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, aiPausedUntil: previous ?? null } : c))
      )
      throw err
    }
  }, [])

  /**
   * Phase 34 — "Intervir agora": server-authoritative pause. The backend
   * computes the window from the agent's configured ai_handoff_pause_minutes
   * (with org/default fallback) instead of the frontend hardcoding it. We
   * apply the resolved aiPausedUntil from the response; the dedicated
   * 'conversation:ai-pause-updated' socket event also lands and keeps the
   * active conversation in lockstep.
   */
  const interveneAi = useCallback(async (id: string) => {
    const r = await conversationsApi.interveneAiDefault(id)
    const until = (r.data as { aiPausedUntil?: string | null }).aiPausedUntil ?? null
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, aiPausedUntil: until } : c)))
    return until
  }, [])

  return {
    conversations,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    statusCounts,
    error,
    refetch: fetchConversations,
    handleNewMessage,
    handleAiPauseUpdated,
    markAsRead,
    updateStatus,
    assignUser,
    transferUser,
    addTag,
    removeTag,
    archiveConversation,
    setAiPause,
    interveneAi,
    patchConv,
  }
}
