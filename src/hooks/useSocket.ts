import { useEffect, useLayoutEffect, useRef } from 'react'
import { connectSocket } from '@/services/socket'
import { renovarSessao, clearSessionAndRedirect } from '@/services/api'
import type {
  SocketAiPauseUpdated,
  SocketConversationStatusUpdated,
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
  /** SCRUM-562 — conversation status changed server-side (manual endpoint or
   *  the AI guard's move to `pending`). Message-less by design, like the
   *  ai-pause event. */
  onConversationStatusUpdated?: (payload: SocketConversationStatusUpdated) => void
  onUnreadUpdate?: (payload: SocketUnreadUpdate) => void
  onNotificationNew?: (payload: unknown) => void
  onNotificationUpdated?: (payload: unknown) => void
  onContactAiGenerating?: (payload: { contactId: string }) => void
  onContactAiGenerated?: (payload: { contactId: string }) => void
  onContactAiFailed?: (payload: { contactId: string; error?: string }) => void
}

/** O ouvinte com a tipagem do próprio socket.io. */
type Ouvinte = Parameters<ReturnType<typeof connectSocket>['on']>[1]

export function useSocket(handlers: SocketHandlers = {}) {
  const handlersRef = useRef(handlers)
  // Os handlers mais novos a cada render, sem mexer no ref durante o render.
  useLayoutEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    const socket = connectSocket()
    // Retomadas (06/11): cada handler daqui fica guardado e sai SÓ ele na limpeza. Antes, o
    // `off(evento)` sem a função tirava os ouvintes de todo o app (o sino global, o menu) e o
    // `disconnectSocket()` derrubava a conexão única — ao sair de Conversas, o tempo real morria
    // em todas as telas até recarregar. A conexão é da sessão: o AuthContext a fecha no logout.
    const meus: Array<[string, Ouvinte]> = []
    const on = (evento: string, fn: Ouvinte) => {
      socket.on(evento, fn)
      meus.push([evento, fn])
    }

    on('message:new', (p) => handlersRef.current.onMessageNew?.(p))
    on('message:status', (p) => handlersRef.current.onMessageStatus?.(p))
    on('conversation:new', (p) => handlersRef.current.onConversationNew?.(p))
    on('conversation:assigned', (p) => handlersRef.current.onConversationAssigned?.(p))
    on('conversation:resolved', (p) => handlersRef.current.onConversationResolved?.(p))
    on('conversation:updated', (p) => handlersRef.current.onConversationUpdated?.(p))
    on('conversation:ai-pause-updated', (p) => handlersRef.current.onConversationAiPauseUpdated?.(p))
    on('conversation:status-updated', (p) => handlersRef.current.onConversationStatusUpdated?.(p))
    on('unread:update', (p) => handlersRef.current.onUnreadUpdate?.(p))
    on('notification:new', (p) => {
      // Fan-out the notification two ways:
      //  1) to the optional local handler passed by the consumer
      //  2) to a window CustomEvent so useNotifications (which mounts far
      //     from useSocket) can keep its cache in sync without needing a
      //     direct coupling. Both layers are idempotent — duplicate delivery
      //     is handled by de-dupe on id in the store.
      // Retomadas (06/11): o evento de janela agora sai do ouvinte global (OuvinteDoTempoReal, no
      // AppShell) — daqui ele sairia em dobro quando Conversas está aberta.
      handlersRef.current.onNotificationNew?.(p)
    })
    // Phase 17: grouped notifications emit `notification:updated` when a new
    // contact is appended to an existing row. Same fan-out pattern so the
    // badge doesn't re-increment but the modal/description refresh in place.
    on('notification:updated', (p) => {
      handlersRef.current.onNotificationUpdated?.(p) // o evento de janela sai do ouvinte global (idem)
    })

    // AI profile generation lifecycle (triggered on conversation resolve).
    // Fan-out via window CustomEvent so any component (not just the one
    // holding this hook) can react — e.g. a contact drawer mounted far away.
    on('contact:ai-generating', (p) => {
      handlersRef.current.onContactAiGenerating?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-generating', { detail: p })) } catch { /* SSR */ }
    })
    on('contact:ai-generated', (p) => {
      handlersRef.current.onContactAiGenerated?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-generated', { detail: p })) } catch { /* SSR */ }
    })
    on('contact:ai-failed', (p) => {
      handlersRef.current.onContactAiFailed?.(p)
      try { window.dispatchEvent(new CustomEvent('contact:ai-failed', { detail: p })) } catch { /* SSR */ }
    })

    // Handle auth:expired from backend (token expired on active connection).
    // Renew the HTTP session first — the socket's own `auth` callback
    // (services/socket.ts) fetches a fresh ws-token on every `.connect()`,
    // but that call itself depends on the (now-expired) session cookie, so
    // reconnecting without refreshing first would just fail again. Reuses
    // `socket.disconnect()/.connect()` on the SAME instance (not
    // connectSocket()/disconnectSocket(), which tear down the module-level
    // singleton) so the listeners registered here stay attached (R39).
    on('auth:expired', () => {
      console.warn('[socket] Token expired — refreshing session and reconnecting')
      socket.disconnect()
      renovarSessao().then((ok) => {
        if (ok) socket.connect()
        else clearSessionAndRedirect()
      })
    })

    return () => {
      for (const [evento, fn] of meus) socket.off(evento, fn)
    }
  }, [])
}
