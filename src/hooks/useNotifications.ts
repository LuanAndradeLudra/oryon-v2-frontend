import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationSound } from './useNotificationSound'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** Phase 16: flexible shape for contextual notification payloads (automation
 *  id, contact info, campaign stats, etc). Consumer components render the
 *  fields they know about. */
export type NotificationMetadata = Record<string, unknown>

/** Phase 18: raw source as emitted by the backend (IDs only). */
export type NotificationSourceKind =
  | 'manual'
  | 'webhook'
  | 'api'
  | 'automation'
  | 'bulk'
  | 'system'
  | 'unknown'

export interface NotificationSource {
  kind: NotificationSourceKind
  userId?: string
  automationId?: string
  externalLabel?: string
}

/** Phase 17+18: typed view of known metadata keys. `NotificationMetadata`
 *  stays a `Record<string, unknown>` to avoid breaking other consumers —
 *  components that want type-safe rendering (TopBar modal) cast to this. */
export interface NotificationMetaKnown {
  context?: string
  automationId?: string
  automationName?: string
  automationType?: string
  contactId?: string
  contactName?: string
  contactPhone?: string
  conversationId?: string
  channelId?: string
  channelName?: string
  campaignId?: string
  campaignName?: string
  templateName?: string
  actionsExecuted?: string[]
  totalContacts?: number
  sent?: number
  failed?: number
  note?: string
  /** Phase 18: user-typed free text from the automation action (resolved
   *  template). Rendered as a supplemental block, NOT as title. */
  userNote?: string
  /** Phase 18: provenance. */
  source?: NotificationSource
  sourceLabel?: string
  sourceActor?: string
  trigger?: { type?: string; label?: string }
  contacts?: Array<{ id: string; name?: string; phone?: string }>
  affectedCount?: number
}

export interface AppNotification {
  id: string
  type: string
  title: string
  description: string | null
  link: string | null
  isRead: boolean
  createdAt: string
  /** Phase 16: present when backend attached contextual metadata. */
  metadata?: NotificationMetadata | null
  /** Phase 19: soft-dismiss timestamp — null means visible in the bell. */
  archivedAt?: string | null
  /** Phase 19: visual priority ordering. Defaults to 'normal'. */
  priority?: 'urgent' | 'normal' | 'low'
}

/** How many notifications the dropdown asks the backend for. Intentionally
 *  higher than the badge cap (9+) so the 'Todas' tab stays useful on busy
 *  tenants. Bump if the inbox pattern reaches the cap regularly. */
const FETCH_LIMIT = 50

export function useNotifications() {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  // Phase 17: play a sound on new notifications (not on updates). A ref
  // shields us from stale closures in the socket listener effect, which
  // only re-subscribes when the window listener is set up.
  const { play: playSound, enabled: soundEnabled, toggle: toggleSound } = useNotificationSound()
  const playSoundRef = useRef(playSound)
  playSoundRef.current = playSound

  // Phase 19: filter state. Changing either triggers a reload from scratch
  // (cursor=null) so the list stays coherent with the current filter set.
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams()
      params.set('limit', String(FETCH_LIMIT))
      if (cursor) params.set('cursor', cursor)
      if (filterTypes.length > 0) params.set('type', filterTypes.join(','))
      if (showArchived) params.set('archived', 'true')
      return params.toString()
    },
    [filterTypes, showArchived],
  )

  const loadTokenRef = useRef(0)

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    const token = ++loadTokenRef.current
    try {
      const { data } = await axios.get<{ data: AppNotification[]; unreadCount: number; nextCursor: string | null }>(
        `${API}/notifications?${buildQuery(null)}`,
      )
      if (loadTokenRef.current !== token) return
      setNotifications(data.data)
      setUnreadCount(data.unreadCount)
      setNextCursor(data.nextCursor)
    } catch {
      // silent
    } finally {
      if (loadTokenRef.current === token) setLoading(false)
    }
  }, [isAuthenticated, buildQuery])

  /** Phase 19: cursor-based "Load more". Appends older items. */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const { data } = await axios.get<{ data: AppNotification[]; unreadCount: number; nextCursor: string | null }>(
        `${API}/notifications?${buildQuery(nextCursor)}`,
      )
      setNotifications((prev) => {
        // Dedup by id in case socket pushed an item during the fetch.
        const seen = new Set(prev.map((n) => n.id))
        const fresh = data.data.filter((n) => !seen.has(n.id))
        return [...prev, ...fresh]
      })
      setNextCursor(data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [buildQuery, nextCursor, loadingMore])

  useEffect(() => { load() }, [load])

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update with rollback on failure. Without rollback, the UI
    // would show the notification as read but the DB would keep it unread,
    // and a reload would visually resurrect it — surprising the user.
    let prevIsRead: boolean | null = null
    setNotifications((prev) => prev.map((n) => {
      if (n.id !== id) return n
      prevIsRead = n.isRead
      return { ...n, isRead: true }
    }))
    const wasUnread = prevIsRead === false
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await axios.post(`${API}/notifications/${id}/read`)
    } catch {
      // Roll back the optimistic UI change
      if (wasUnread) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)))
        setUnreadCount((c) => c + 1)
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Snapshot for rollback on failure.
    let snapshot: AppNotification[] = []
    let prevCount = 0
    setNotifications((prev) => { snapshot = prev; return prev.map((n) => ({ ...n, isRead: true })) })
    setUnreadCount((c) => { prevCount = c; return 0 })
    try {
      await axios.post(`${API}/notifications/read-all`)
    } catch {
      setNotifications(snapshot)
      setUnreadCount(prevCount)
    }
  }, [])

  /** Phase 19: mark a previously-read notification as unread again. */
  const markAsUnread = useCallback(async (id: string) => {
    let wasRead = false
    setNotifications((prev) => prev.map((n) => {
      if (n.id !== id) return n
      wasRead = n.isRead
      return { ...n, isRead: false }
    }))
    if (wasRead) setUnreadCount((c) => c + 1)
    try {
      await axios.post(`${API}/notifications/${id}/unread`)
    } catch {
      if (wasRead) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
        setUnreadCount((c) => Math.max(0, c - 1))
      }
    }
  }, [])

  /** Phase 19: soft-dismiss — removes from active list, kept for audit. */
  const archive = useCallback(async (id: string) => {
    // Optimistic: hide the notification from the list (unless we're in
    // archived view).
    let snapshot: AppNotification[] = []
    let decreaseUnread = false
    setNotifications((prev) => {
      snapshot = prev
      const target = prev.find((n) => n.id === id)
      decreaseUnread = !!target && !target.isRead
      return showArchived
        ? prev.map((n) => (n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n))
        : prev.filter((n) => n.id !== id)
    })
    if (decreaseUnread) setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await axios.post(`${API}/notifications/${id}/archive`)
    } catch {
      setNotifications(snapshot)
      if (decreaseUnread) setUnreadCount((c) => c + 1)
    }
  }, [showArchived])

  /** Phase 19: restore an archived notification. */
  const unarchive = useCallback(async (id: string) => {
    let snapshot: AppNotification[] = []
    setNotifications((prev) => {
      snapshot = prev
      return showArchived
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, archivedAt: null } : n))
    })
    try {
      await axios.post(`${API}/notifications/${id}/unarchive`)
    } catch {
      setNotifications(snapshot)
    }
  }, [showArchived])

  // Realtime pushes come as window CustomEvents fanned out by useSocket.
  // De-dupe by id: a notification may arrive both via the initial HTTP
  // fetch and via the socket push under reconnects — only count it once.
  // Phase 17: also handle `notification:updated` for grouped rows whose
  // contacts/affectedCount just changed — replace in place, don't bump the
  // unread counter (it's the same notification, not a new one).
  useEffect(() => {
    const handlerNew = (e: Event) => {
      const detail = (e as CustomEvent<AppNotification>).detail
      if (!detail || typeof detail.id !== 'string') return
      let alreadyPresent = false
      setNotifications((prev) => {
        if (prev.some((n) => n.id === detail.id)) { alreadyPresent = true; return prev }
        return [detail, ...prev].slice(0, FETCH_LIMIT)
      })
      if (!alreadyPresent && !detail.isRead) {
        setUnreadCount((c) => c + 1)
        playSoundRef.current()
      }
    }
    const handlerUpdated = (e: Event) => {
      const detail = (e as CustomEvent<AppNotification>).detail
      if (!detail || typeof detail.id !== 'string') return
      setNotifications((prev) => {
        const idx = prev.findIndex((n) => n.id === detail.id)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = detail
          return copy
        }
        // Not in list yet (e.g. evicted by FETCH_LIMIT) — insert on top.
        return [detail, ...prev].slice(0, FETCH_LIMIT)
      })
      // Intentionally NOT incrementing unreadCount / playing sound: the
      // user already has this notification; we're just refreshing it.
    }
    window.addEventListener('notification:new', handlerNew as EventListener)
    window.addEventListener('notification:updated', handlerUpdated as EventListener)
    return () => {
      window.removeEventListener('notification:new', handlerNew as EventListener)
      window.removeEventListener('notification:updated', handlerUpdated as EventListener)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore: !!nextCursor,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archive,
    unarchive,
    loadMore,
    reload: load,
    // Phase 19: filter controls
    filterTypes,
    setFilterTypes,
    showArchived,
    setShowArchived,
    // Phase 17: sound
    soundEnabled,
    toggleSound,
  }
}
