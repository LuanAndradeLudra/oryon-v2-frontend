import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket'
import { attemptRefresh, clearSessionAndRedirect } from '@/services/api'
import type {
  SocketAiPauseUpdated,
  SocketMessageNew,
  SocketMessageStatus,
  SocketConversationAssigned,
  SocketUnreadUpdate,
} from '@/types'

interface SocketHandlers {
  onMessageNew?: (payload: SocketMessageNew) => void
  onMessageStatus?: (payload: SocketMessageStatus) => void
  onConversationNew?: (payload: unknown) => void
  onConversationAssigned?: (payload: SocketConversationAssigned) => void
  onConversationResolved?: (payload: { conversationId: string }) => void
  onConversationUpdated?: (payload: SocketMessageNew) => void
  /** Phase 27 — AI handoff pause/resume on a conversation. Fired by the
   *  manual pause endpoint; also fan-out to the tenant room so the list
   *  view stays in sync even when the conversation isn't currently open. */
  onConversationAiPauseUpdated?: (payload: SocketAiPauseUpdated) => void
  onUnreadUpdate?: (payload: SocketUnreadUpdate) => void
  onNotificationNew?: (payload: unknown) => void
  onNotificationUpdated?: (payload: unknown) => void
  onContactAiGenerating?: (payload: { contactId: string }) => void
  onContactAiGenerated?: (payload: { contactId: string }) => void
  onContactAiFailed?: (payload: { contactId: string; error?: string }) => void
}

export function useSocket(handlers: SocketHandlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const socket = connectSocket()

    socket.on('message:new', (p) => handlersRef.current.onMessageNew?.(p))
    socket.on('message:status', (p) => handlersRef.current.onMessageStatus?.(p))
    socket.on('conversation:new', (p) => handlersRef.current.onConversationNew?.(p))
    socket.on('conversation:assigned', (p) => handlersRef.current.onConversationAssigned?.(p))
    socket.on('conversation:resolved', (p) => handlersRef.current.onConversationResolved?.(p))
    socket.on('conversation:updated', (p) => handlersRef.current.onConversationUpdated?.(p))
    socket.on('conversation:ai-pause-updated', (p) => handlersRef.current.onConversationAiPauseUpdated?.(p))
    socket.on('unread:update', (p) => handlersRef.current.onUnreadUpdate?.(p))
    socket.on('notification:new', (p) => {
      // Fan-out the notification two ways:
      //  1) to the optional local handler passed by the consumer
      //  2) to a window CustomEvent so useNotifications (which mounts far
      //     from useSocket) can keep its cache in sync without needing a
      //     direct coupling. Both layers are idempotent — duplicate delivery
      //     is handled by de-dupe on id in the store.
      handlersRef.current.onNotificationNew?.(p)
      try {
        window.dispatchEvent(new CustomEvent('notification:new', { detail: p }))
      } catch { /* window unavailable (SSR, etc.) */ }
    })
    // Phase 17: grouped notifications emit `notification:updated` when a new
    // contact is appended to an existing row. Same fan-out pattern so the
    // badge doesn't re-increment but the modal/description refresh in place.
    socket.on('notification:updated', (p) => {
      handlersRef.current.onNotificationUpdated?.(p)
      try {
        window.dispatchEvent(new CustomEvent('notification:updated', { detail: p }))
      } catch { /* window unavailable (SSR, etc.) */ }
    })

    // AI profile generation lifecycle (triggered on conversation resolve).
    // Fan-out via window CustomEvent so any component (not just the one
    // holding this hook) can react — e.g. a contact drawer mounted far away.
    socket.on('contact:ai-generating', (p) => {
      handlersRef.current.onContactAiGenerating?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-generating', { detail: p })) } catch { /* SSR */ }
    })
    socket.on('contact:ai-generated', (p) => {
      handlersRef.current.onContactAiGenerated?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-generated', { detail: p })) } catch { /* SSR */ }
    })
    socket.on('contact:ai-failed', (p) => {
      handlersRef.current.onContactAiFailed?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-failed', { detail: p })) } catch { /* SSR */ }
    })

    // Handle auth:expired from backend (token expired on active connection).
    // Renew the HTTP session first — the socket's own `auth` callback
    // (services/socket.ts) fetches a fresh ws-token on every `.connect()`,
    // but that call itself depends on the (now-expired) session cookie, so
    // reconnecting without refreshing first would just fail again.
    socket.on('auth:expired', () => {
      console.warn('[socket] Token expired — refreshing session and reconnecting')
      socket.disconnect()
      attemptRefresh().then((ok) => {
        if (ok) socket.connect()
        else clearSessionAndRedirect()
      })
    })

    return () => {
      socket.off('message:new')
      socket.off('message:status')
      socket.off('conversation:new')
      socket.off('conversation:assigned')
      socket.off('conversation:resolved')
      socket.off('conversation:updated')
      socket.off('conversation:ai-pause-updated')
      socket.off('unread:update')
      socket.off('notification:new')
      socket.off('notification:updated')
      socket.off('contact:ai-generating')
      socket.off('contact:ai-generated')
      socket.off('contact:ai-failed')
      socket.off('auth:expired')
      disconnectSocket()
    }
  }, [])
}
