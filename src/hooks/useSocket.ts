import { useEffect, useRef } from 'react'
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

export function useSocket(handlers: SocketHandlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const socket = connectSocket()

    // Cada handler é uma função própria para o cleanup tirar SÓ o que este
    // hook registrou (`off(evento)` sem a função tirava também os listeners
    // do NavSidebar/BottomTabBar e das outras telas no mesmo socket).
    // Fan-out por CustomEvent: stores que montam longe daqui (notificações,
    // gaveta de contato) reagem sem acoplamento direto; ambos são idempotentes.
    const fanOut = (name: string) => (p: unknown) => {
      try { window.dispatchEvent(new CustomEvent(name, { detail: p })) } catch { /* SSR */ }
    }
    const notifyNew = fanOut('notification:new')
    const notifyUpdated = fanOut('notification:updated')
    const aiGenerating = fanOut('contact:ai-generating')
    const aiGenerated = fanOut('contact:ai-generated')
    const aiFailed = fanOut('contact:ai-failed')

    const listeners: Array<[string, (p: never) => void]> = [
      ['message:new', (p: SocketMessageNew) => handlersRef.current.onMessageNew?.(p)],
      ['message:status', (p: SocketMessageStatus) => handlersRef.current.onMessageStatus?.(p)],
      ['conversation:new', (p: unknown) => handlersRef.current.onConversationNew?.(p)],
      ['conversation:assigned', (p: SocketConversationAssigned) => handlersRef.current.onConversationAssigned?.(p)],
      ['conversation:resolved', (p: { conversationId: string }) => handlersRef.current.onConversationResolved?.(p)],
      ['conversation:updated', (p: SocketMessageNew) => handlersRef.current.onConversationUpdated?.(p)],
      ['conversation:ai-pause-updated', (p: SocketAiPauseUpdated) => handlersRef.current.onConversationAiPauseUpdated?.(p)],
      ['conversation:status-updated', (p: SocketConversationStatusUpdated) => handlersRef.current.onConversationStatusUpdated?.(p)],
      ['unread:update', (p: SocketUnreadUpdate) => handlersRef.current.onUnreadUpdate?.(p)],
      ['notification:new', (p: unknown) => { handlersRef.current.onNotificationNew?.(p); notifyNew(p) }],
      // Phase 17: notificação agrupada ganha contato novo → atualiza no lugar.
      ['notification:updated', (p: unknown) => { handlersRef.current.onNotificationUpdated?.(p); notifyUpdated(p) }],
      // Geração do perfil por IA (disparada ao resolver a conversa).
      ['contact:ai-generating', (p: { contactId: string }) => { handlersRef.current.onContactAiGenerating?.(p); aiGenerating(p) }],
      ['contact:ai-generated', (p: { contactId: string }) => { handlersRef.current.onContactAiGenerated?.(p); aiGenerated(p) }],
      ['contact:ai-failed', (p: { contactId: string; error?: string }) => { handlersRef.current.onContactAiFailed?.(p); aiFailed(p) }],
    ]
    // Sinais de cobrança (billing:*) e auth:expired moram na ponte do app
    // (useAppSocketBridge): precisam valer fora da tela de conversas.
    for (const [event, fn] of listeners) socket.on(event, fn as (...args: unknown[]) => void)

    return () => {
      for (const [event, fn] of listeners) socket.off(event, fn as (...args: unknown[]) => void)
      // O socket é compartilhado com o resto do app — não desconecta aqui
      // (antes, sair das conversas derrubava o singleton e, com ele, os
      // listeners do menu e a ponte de cobrança). Quem desconecta é o logout.
    }
  }, [])
}
