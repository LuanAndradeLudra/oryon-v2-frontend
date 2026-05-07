import { useState, useEffect, useCallback, useRef } from 'react'
import { conversationsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { Conversation, ConversationFilters, SocketAiPauseUpdated, SocketMessageNew, Tag, User } from '@/types'

/**
 * Phase 27 — sentinel timestamp used by the UI to mean "pause indefinitely
 * until the user manually resumes". Year 9999 is far enough that a paused
 * conversation never gets implicitly auto-resumed by the inbound handler.
 */
export const INDEFINITE_PAUSE_ISO = '9999-12-31T23:59:59.000Z'

export function useConversations(filters: ConversationFilters = {}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
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

  // Tracks IDs of conversations currently in the list so we can detect
  // new conversations that arrive via WebSocket and aren't loaded yet.
  const loadedConvIds = useRef<Set<string>>(new Set())

  // Prevents duplicate in-flight fetches for the same conversation ID.
  const pendingFetches = useRef<Set<string>>(new Set())

  const fetchConversations = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true)
      const { data } = await withRetry(() => conversationsApi.list(filtersRef.current))
      setConversations(data.data)
      loadedConvIds.current = new Set(data.data.map((c) => c.id))
      setError(null)
      initialLoadDone.current = true
    } catch {
      setError('Erro ao carregar conversas')
    } finally {
      setLoading(false)
    }
  }, []) // filtersRef is always current — no serialization needed

  // Re-fetch whenever filters change (stable callback, so we track filters explicitly)
  useEffect(() => {
    fetchConversations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.assignedTo, filters.tagId, filters.search, filters.contactId, filters.whatsappNumberId])

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
      }
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })
  }, [fetchAndPrependConversation])

  /** Phase 27 — handler for the dedicated 'conversation:ai-pause-updated' socket
   *  event emitted by the backend's manual pause/resume endpoint. */
  const handleAiPauseUpdated = useCallback((payload: SocketAiPauseUpdated) => {
    patchConv(payload.conversationId, { aiPausedUntil: payload.aiPausedUntil })
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

  return {
    conversations,
    loading,
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
    patchConv,
  }
}
