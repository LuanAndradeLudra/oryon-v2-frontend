import { useEffect, useLayoutEffect, useRef } from 'react'
import { connectSocket } from '@/services/socket'
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
    // Cada handler daqui fica guardado e sai SÓ ele na limpeza. Antes, o
    // `off(evento)` sem a função tirava os ouvintes de todo o app e o
    // `disconnectSocket()` derrubava a conexão única. A conexão é da sessão:
    // o AuthContext a fecha no logout.
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
      // O evento de janela sai do ouvinte global (OuvinteDoTempoReal). Daqui
      // ele sairia em dobro quando Conversas está aberta.
      handlersRef.current.onNotificationNew?.(p)
    })
    on('notification:updated', (p) => {
      handlersRef.current.onNotificationUpdated?.(p)
    })

    // Geração do perfil por IA. Fan-out para a gaveta de contato montada longe.
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

    // billing:* e auth:expired ficam na ponte do app (useAppSocketBridge):
    // precisam valer fora da tela de conversas, e um segundo ouvinte de
    // auth:expired renovaria a sessão duas vezes.

    return () => {
      for (const [evento, fn] of meus) socket.off(evento, fn)
    }
  }, [])
}
