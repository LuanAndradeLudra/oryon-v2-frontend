import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import axios from 'axios'
import type { InternalChannel, InternalMessage, UserPresence, UserPresenceStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

interface CreateChannelPayload {
  type: 'group' | 'department_room'
  name: string
  emoji?: string
  topic?: string
  departmentName?: string
  departmentColor?: string
  memberIds: string[]
  memberNames: string[]
}

interface InternalChatCtx {
  activeChannelId: string | null
  channels: InternalChannel[]
  messages: Record<string, InternalMessage[]>
  presence: Record<string, UserPresenceStatus>
  totalUnread: number
  loadingChannels: boolean
  loadingMessages: boolean
  setActiveChannel: (channelId: string) => void
  openDM: (userId: string, userName: string) => Promise<void>
  createChannel: (payload: CreateChannelPayload) => Promise<InternalChannel>
  sendMessage: (channelId: string, body: string, replyToId?: string) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  markAsRead: (channelId: string) => void
  addMembers: (channelId: string, memberIds: string[]) => Promise<void>
  removeMember: (channelId: string, userId: string) => Promise<void>
  deleteChannel: (channelId: string) => Promise<void>
}

const InternalChatContext = createContext<InternalChatCtx>({
  activeChannelId: null,
  channels: [],
  messages: {},
  presence: {},
  totalUnread: 0,
  loadingChannels: true,
  loadingMessages: false,
  setActiveChannel: () => {},
  openDM: async () => {},
  createChannel: async () => { throw new Error('not implemented') },
  sendMessage: async () => {},
  toggleReaction: async () => {},
  deleteMessage: async () => {},
  markAsRead: () => {},
  addMembers: async () => {},
  removeMember: async () => {},
  deleteChannel: async () => {},
})

export function InternalChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [channels, setChannels] = useState<InternalChannel[]>([])
  const [messages, setMessages] = useState<Record<string, InternalMessage[]>>({})
  const [presence, setPresence] = useState<Record<string, UserPresenceStatus>>({})
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const totalUnread = channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0)

  // ── Fetch channels ───────────────────────────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get<InternalChannel[]>(`${API}/internal/channels`)
      setChannels(res.data)
    } catch {
      // silently fail on initial load
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  // ── Fetch messages for a channel ─────────────────────────────────────────────
  const fetchMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true)
    try {
      const res = await axios.get<InternalMessage[]>(`${API}/internal/channels/${channelId}/messages`)
      setMessages((prev) => ({ ...prev, [channelId]: res.data }))
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // ── Fetch presence ────────────────────────────────────────────────────────────
  const fetchPresence = useCallback(async () => {
    try {
      const res = await axios.get<UserPresence[]>(`${API}/internal/presence`)
      const map: Record<string, UserPresenceStatus> = {}
      res.data.forEach((p) => { map[p.userId] = p.status })
      setPresence(map)
    } catch { /* */ }
  }, [])

  // ── Visibility-aware polling ─────────────────────────────────────────────────
  // Pauses all polling when the tab is hidden to save bandwidth and avoid
  // unnecessary requests. Uses longer intervals to reduce server load.

  const CHANNEL_POLL_MS   = 15_000  // channels + presence every 15s (was 8s)
  const MSG_POLL_MS       = 5_000   // active channel messages every 5s (was 3s)

  useEffect(() => {
    if (!user) {
      setLoadingChannels(false)
      return
    }
    let channelTimer: ReturnType<typeof setInterval> | null = null
    let visible = !document.hidden

    function startPolling() {
      if (channelTimer) return
      fetchChannels()
      fetchPresence()
      channelTimer = setInterval(() => {
        fetchPresence()
        fetchChannels()
      }, CHANNEL_POLL_MS)
    }

    function stopPolling() {
      if (channelTimer) { clearInterval(channelTimer); channelTimer = null }
    }

    function onVisibilityChange() {
      visible = !document.hidden
      if (visible) {
        startPolling() // resume + immediate fetch
      } else {
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (visible) startPolling()

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user, fetchChannels, fetchPresence])

  // ── Poll active channel messages (visibility-aware) ────────────────────────
  useEffect(() => {
    if (!activeChannelId) return
    const channelId = activeChannelId
    let timer: ReturnType<typeof setTimeout> | null = null
    let backoff = MSG_POLL_MS

    function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, backoff)
        return
      }
      axios.get<InternalMessage[]>(`${API}/internal/channels/${channelId}/messages`)
        .then((res) => {
          setMessages((prev) => ({ ...prev, [channelId]: res.data }))
          backoff = MSG_POLL_MS // reset on success
        })
        .catch(() => {
          backoff = Math.min(backoff * 2, 60_000) // exponential backoff, max 60s
        })
        .finally(() => {
          timer = setTimeout(poll, backoff)
        })
    }

    timer = setTimeout(poll, MSG_POLL_MS)
    return () => { if (timer) clearTimeout(timer) }
  }, [activeChannelId])

  const setActiveChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    if (!messages[channelId]) fetchMessages(channelId)
    markAsRead(channelId)
  }, [messages, fetchMessages])

  // ── Open or create DM ────────────────────────────────────────────────────────
  const openDM = useCallback(async (userId: string, userName: string) => {
    if (!user) return
    // check if DM already exists
    const existing = channels.find(
      (c) => c.type === 'dm' && c.memberIds.includes(userId) && c.memberIds.includes(user.id)
    )
    if (existing) {
      setActiveChannelId(existing.id)
      fetchMessages(existing.id)
      return
    }
    try {
      const res = await axios.post<InternalChannel>(`${API}/internal/channels`, {
        type: 'dm',
        memberIds: [user.id, userId],
        memberNames: [`${user.firstName} ${user.lastName}`, userName],
      })
      setChannels((prev) => {
        if (prev.find((c) => c.id === res.data.id)) return prev
        return [res.data, ...prev]
      })
      setActiveChannelId(res.data.id)
      fetchMessages(res.data.id)
    } catch { /* */ }
  }, [channels, user, fetchMessages])

  // ── Create group / department channel ────────────────────────────────────────
  const createChannel = useCallback(async (payload: CreateChannelPayload): Promise<InternalChannel> => {
    const res = await axios.post<InternalChannel>(`${API}/internal/channels`, payload)
    setChannels((prev) => {
      if (prev.find((c) => c.id === res.data.id)) return prev
      return [res.data, ...prev]
    })
    setActiveChannelId(res.data.id)
    return res.data
  }, [])

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (channelId: string, body: string, replyToId?: string) => {
    if (!user || !body.trim()) return
    const optimistic: InternalMessage = {
      id: `optimistic-${Date.now()}`,
      channelId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      body,
      type: 'text',
      replyToId,
      reactions: [],
      readBy: [user.id],
      createdAt: new Date().toISOString(),
    }
    // optimistic update
    setMessages((prev) => ({ ...prev, [channelId]: [...(prev[channelId] ?? []), optimistic] }))
    try {
      const res = await axios.post<InternalMessage>(`${API}/internal/channels/${channelId}/messages`, {
        body,
        replyToId,
      })
      // replace optimistic with real
      setMessages((prev) => ({
        ...prev,
        [channelId]: prev[channelId].map((m) => m.id === optimistic.id ? res.data : m),
      }))
      // Patch the channel summary so the sidebar reflects the new message
      // (and its sender) immediately, without waiting for the next 15s poll.
      // senderType reflects what the SERVER decided (it may have flipped to
      // 'copilot' if the message came through the Agent Server). We can't
      // read that from the user-typed path, so we pull whatever the backend
      // returns and only fall back to 'user' for safety.
      const senderType = (res.data as { senderType?: 'user' | 'copilot' | 'system' }).senderType ?? 'user'
      const senderName = `${user.firstName} ${user.lastName ?? ''}`.trim()
      setChannels((prev) => prev.map((ch) =>
        ch.id === channelId
          ? {
              ...ch,
              lastMessageAt: res.data.createdAt,
              lastMessagePreview: body.slice(0, 100),
              lastMessageSenderName: senderName,
              lastMessageSenderType: senderType,
            }
          : ch,
      ))
    } catch {
      // revert optimistic on failure
      setMessages((prev) => ({
        ...prev,
        [channelId]: prev[channelId].filter((m) => m.id !== optimistic.id),
      }))
    }
  }, [user])

  // ── Toggle reaction ──────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    try {
      const res = await axios.post<InternalMessage>(`${API}/internal/messages/${messageId}/reactions`, {
        emoji,
      })
      setMessages((prev) => {
        const updated = { ...prev }
        for (const [chId, msgs] of Object.entries(updated)) {
          if (msgs.some((m) => m.id === messageId)) {
            updated[chId] = msgs.map((m) => m.id === messageId ? res.data : m)
            break
          }
        }
        return updated
      })
    } catch { /* */ }
  }, [user])

  // ── Delete message (soft delete) ─────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId: string) => {
    const now = new Date().toISOString()
    // optimistic: mark deletedAt
    setMessages((prev) => {
      const updated = { ...prev }
      for (const [chId, msgs] of Object.entries(updated)) {
        if (msgs.some((m) => m.id === messageId)) {
          updated[chId] = msgs.map((m) => m.id === messageId ? { ...m, deletedAt: now } : m)
          break
        }
      }
      return updated
    })
    try {
      await axios.delete(`${API}/internal/messages/${messageId}`)
    } catch {
      // revert on failure
      setMessages((prev) => {
        const updated = { ...prev }
        for (const [chId, msgs] of Object.entries(updated)) {
          if (msgs.some((m) => m.id === messageId)) {
            updated[chId] = msgs.map((m) => m.id === messageId ? { ...m, deletedAt: undefined } : m)
            break
          }
        }
        return updated
      })
    }
  }, [])

  // ── Mark as read ─────────────────────────────────────────────────────────────
  const markAsRead = useCallback((channelId: string) => {
    setChannels((prev) => prev.map((ch) => ch.id === channelId ? { ...ch, unreadCount: 0 } : ch))
    axios.patch(`${API}/internal/channels/${channelId}/read`).catch(() => {})
  }, [])

  // ── Add members to channel ───────────────────────────────────────────────────
  const addMembers = useCallback(async (channelId: string, memberIds: string[]) => {
    if (memberIds.length === 0) return
    const res = await axios.post<InternalChannel>(
      `${API}/internal/channels/${channelId}/members`,
      { memberIds },
    )
    setChannels((prev) => prev.map((ch) => ch.id === channelId ? { ...ch, ...res.data } : ch))
  }, [])

  // ── Remove member from channel (or leave, when userId === current user) ──────
  const removeMember = useCallback(async (channelId: string, userId: string) => {
    const res = await axios.delete<InternalChannel>(
      `${API}/internal/channels/${channelId}/members/${userId}`,
    )
    // If current user left, drop the channel locally and unselect it
    if (user && userId === user.id) {
      setChannels((prev) => prev.filter((ch) => ch.id !== channelId))
      setActiveChannelId((cur) => cur === channelId ? null : cur)
      setMessages((prev) => {
        const next = { ...prev }
        delete next[channelId]
        return next
      })
      return
    }
    setChannels((prev) => prev.map((ch) => ch.id === channelId ? { ...ch, ...res.data } : ch))
  }, [user])

  // ── Delete channel (DM clears the conversation; groups/depts must be by creator) ─
  const deleteChannel = useCallback(async (channelId: string) => {
    await axios.delete(`${API}/internal/channels/${channelId}`)
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId))
    setActiveChannelId((cur) => cur === channelId ? null : cur)
    setMessages((prev) => {
      const next = { ...prev }
      delete next[channelId]
      return next
    })
  }, [])

  return (
    <InternalChatContext.Provider value={{
      activeChannelId, channels, messages, presence,
      totalUnread, loadingChannels, loadingMessages,
      setActiveChannel, openDM, createChannel, sendMessage, toggleReaction, deleteMessage, markAsRead,
      addMembers, removeMember, deleteChannel,
    }}>
      {children}
    </InternalChatContext.Provider>
  )
}

export function useInternalChat() {
  return useContext(InternalChatContext)
}
