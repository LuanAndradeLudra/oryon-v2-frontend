import { useState, useEffect, useCallback, useRef } from 'react'
import { conversationsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import type { Conversation, ConversationFilters, SocketMessageNew, Tag, User } from '@/types'

export function useConversations(filters: ConversationFilters = {}) {
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

  const initialLoadDone = useRef(false)

  const fetchConversations = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true)
      const { data } = await withRetry(() => conversationsApi.list(filtersRef.current))
      setConversations(data.data)
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

  const handleNewMessage = useCallback((payload: SocketMessageNew) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.conversationId)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = {
        ...updated[idx],
        lastMessageAt: payload.message.sentAt,
        lastMessagePreview: payload.message.body || payload.message.mediaCaption || `[${payload.message.type ?? 'text'}]`,
        unreadCount: payload.unreadCount,
      }
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })
  }, [])

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

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    handleNewMessage,
    markAsRead,
    updateStatus,
    assignUser,
    transferUser,
    addTag,
    removeTag,
    archiveConversation,
    patchConv,
  }
}
