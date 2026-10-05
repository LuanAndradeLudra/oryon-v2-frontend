import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { HandoffStripe } from './AiHandoffBanner'
import { useMessages } from '@/hooks/useMessages'
import { getSocket } from '@/services/socket'
import type { Conversation, Message, Tag, User, SocketAiPauseUpdated, SocketMessageNew, DealOutcomeInput, SocketAnomalyReviewed, SocketMediaReady, SocketMessageStatus } from '@/types'
import { msRestantesDaJanela } from '@/lib/whatsappWindow'
import { useAuth } from '@/contexts/AuthContext'
import { useEventosDaConversa } from '@/hooks/useEventosDaConversa'
import { useEstadoNaUrl, lerBool, escreverBool } from '@/hooks/useEstadoNaUrl'

interface ChatWindowProps {
  conversation: Conversation | null
  allTags: Tag[]
  allUsers: User[]
  /** F10 (SCRUM-882): `dealOutcome` chega junto com `resolved` quando o atendente registrou o desfecho. */
  onStatusChange: (id: string, status: 'open' | 'pending' | 'resolved', dealOutcome?: DealOutcomeInput) => void | boolean | Promise<void | boolean>
  onToggleInfo: () => void
  infoOpen: boolean
  onAddTag: (convId: string, tag: Tag) => void
  onRemoveTag: (convId: string, tagId: string) => void
  onCreateTag?: (name: string, color: string) => Promise<Tag>
  onDeleteTag?: (tagId: string) => Promise<void>
  onAssign: (convId: string, user: User | null) => void
  onTransfer: (convId: string, user: User) => void
  onArchive: (convId: string) => void
  /** Phase 27 — manually pause/resume the WhatsApp AI for this conversation. */
  onSetAiPause: (convId: string, pauseUntil: string | null) => Promise<void> | void
  /** Phase 34 — "Intervir agora": pause using the agent's configured handoff
   *  window (duration resolved server-side). */
  onInterveneAi?: (convId: string) => Promise<void> | void
  /** 28/09 — "Assumir" único (botão e tecla R), vindo da página. */
  onAssumir?: () => void
  /** Phase 27 — invoked when the backend emits 'conversation:ai-pause-updated'. */
  onAiPauseSocketEvent?: (payload: SocketAiPauseUpdated) => void
  /**
   * Phase 29 — page-level handler for send failures. Receives the error
   * (typically an axios error with `response.data.message` populated by
   * `TenantExceptionFilter`). Used to surface a toast at the page; the
   * MessageInput restores the typed text on its side.
   */
  onSendError?: (err: unknown) => void
  /**
   * Phase 29 — pre-detected blocker shown above the input (no department,
   * no WhatsApp line, etc.). Surfaces preconditions BEFORE the operator
   * types and clicks send.
   */
  sendBlockedReason?: { message: string; ctaHref?: string; ctaLabel?: string } | null
  /** When provided, ChatHeader renders a mobile-only back button. */
  onBack?: () => void
}

export function ChatWindow({
  conversation, allTags, allUsers,
  onStatusChange, onToggleInfo, infoOpen,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onTransfer, onArchive,
  onSetAiPause, onInterveneAi, onAiPauseSocketEvent, onAssumir,
  onSendError, sendBlockedReason,
  onBack,
}: ChatWindowProps) {
  const { messages, loading, hasMore, fetchMore, sendMessage, addIncomingMessage, updateMessageStatus, updateMediaThumbnail, markAnomaliesReviewed } =
    useMessages(conversation?.id ?? null)

  // T4 fase 1 — eventos da IA e da equipe entre as mensagens. A rotina fica
  // atrás de "Mostrar eventos", com o estado na URL (D10: `eventos=1`).
  const { user } = useAuth()
  const meuNome = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null : null
  const eventos = useEventosDaConversa(conversation?.id ?? null, messages.length, meuNome)
  const [mostrarEventos, setMostrarEventos] = useEstadoNaUrl<boolean>('eventos', { padrao: false, ler: lerBool, escrever: escreverBool })

  // Outbound quoted reply: which message the operator is replying to. Cleared
  // when the conversation changes or after a successful send.
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  useEffect(() => { setReplyTo(null) }, [conversation?.id])

  // Wrap sendMessage so the page-level handler hears about failures.
  // Re-throws so the MessageInput's restore-text-on-failure path still runs.
  const handleSendWithErrorReporting = async (dto: Parameters<typeof sendMessage>[0]) => {
    try {
      await sendMessage(dto)
    } catch (err) {
      onSendError?.(err)
      throw err
    }
  }

  // Listen to socket events for real-time message updates in the active chat
  useEffect(() => {
    if (!conversation) return
    const socket = getSocket()
    const handleNew = (payload: SocketMessageNew) => {
      if (payload.conversationId === conversation.id && payload.message) {
        addIncomingMessage(payload.message)
      }
    }
    const handleStatus = (payload: SocketMessageStatus) => {
      if (payload.conversationId && payload.conversationId !== conversation.id) return
      updateMessageStatus(payload)
    }
    const handleAiPause = (payload: SocketAiPauseUpdated) => {
      if (payload.conversationId === conversation.id) {
        onAiPauseSocketEvent?.(payload)
      }
    }
    // SCRUM-806 — "marcar como verificada" vira o check nas bolhas pendentes.
    const handleAnomalyReviewed = (payload: SocketAnomalyReviewed) => {
      if (payload.conversationId === conversation.id) markAnomaliesReviewed(payload)
    }
    // Preview estilo WhatsApp — miniatura de PDF chega depois, via fila
    // assíncrona (media-thumbnail.processor.ts no backend).
    const handleMediaReady = (payload: SocketMediaReady) => {
      if (payload.conversationId === conversation.id) updateMediaThumbnail(payload)
    }
    socket.on('message:new', handleNew)
    socket.on('conversation:updated', handleNew)
    socket.on('message:status', handleStatus)
    socket.on('conversation:ai-pause-updated', handleAiPause)
    socket.on('conversation:anomaly-reviewed', handleAnomalyReviewed)
    socket.on('message:media-ready', handleMediaReady)
    return () => {
      socket.off('message:new', handleNew)
      socket.off('conversation:updated', handleNew)
      socket.off('message:status', handleStatus)
      socket.off('conversation:ai-pause-updated', handleAiPause)
      socket.off('conversation:anomaly-reviewed', handleAnomalyReviewed)
      socket.off('message:media-ready', handleMediaReady)
    }
  }, [conversation?.id, addIncomingMessage, updateMessageStatus, updateMediaThumbnail, markAnomaliesReviewed, onAiPauseSocketEvent])

  const handleStatusChange = async (status: 'open' | 'pending' | 'resolved', dealOutcome?: DealOutcomeInput) => {
    if (!conversation) return
    if (conversation.status === status) return
    return onStatusChange(conversation.id, status, dealOutcome)
  }

  // Janela de 24h do WhatsApp contada da última mensagem DO CLIENTE (28/09 —
  // antes era de `lastMessageAt`, de qualquer remetente: prazo inflado quando a
  // IA falava depois do cliente, e texto livre liberado logo após um modelo,
  // que a Meta recusa). O relógio anda a cada minuto: a janela fecha sozinha
  // com o chat aberto.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const windowLeftMs = conversation
    ? msRestantesDaJanela({
        conversationId: conversation.id,
        mensagens: messages,
        carregando: loading,
        temMais: hasMore,
        lastMessageAt: conversation.lastMessageAt,
        lastMessageSenderKind: conversation.lastMessageSenderKind,
        now: agora,
      })
    : 0
  const windowOpen = windowLeftMs > 0

  if (!conversation) {
    // Estado vazio como CENTRO DE COMANDO — o espaço morto vira onboarding
    // dos atalhos de triagem. Quem aprende J/K/E/R atende sem tirar a mão
    // do teclado; quem já sabe, ignora.
    const shortcuts = [
      { keys: ['J', 'K'], label: 'navegar na fila' },
      { keys: ['E'],      label: 'resolver e pular p/ a próxima' },
      { keys: ['R'],      label: 'assumir (atribui a você e pausa a IA)' },
      { keys: ['/'],      label: 'respostas rápidas ao digitar' },
    ]
    return (
      <div className="chat-shell-bg flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-accent-dark" />
        </div>
        <div className="text-center">
          <p className="text-surface-100 font-display font-bold text-[15px] tracking-[-0.01em]">Pronto para atender</p>
          <p className="text-surface-400 text-xs leading-[1.5] mt-1">
            Escolha uma conversa na lista — ou triage direto pelo teclado
          </p>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-x-8 gap-y-2.5">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 text-xs text-surface-400">
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-[22px] px-1.5 py-1 rounded-xs bg-[var(--sf2)] border border-[var(--bd2)] text-surface-300 font-mono text-[11px] text-center leading-none">
                    {k}
                  </kbd>
                ))}
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-shell-bg flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
      {/* Phase 32 — the tenant-wide setup blockers banner moved into the
          topbar (TopBarReadinessIndicator). The user_in_department blocker
          still surfaces inline above the message input via
          MessageInput.blockedReason, since that's a per-flow gate that the
          operator needs to see right next to the send action. */}
      <ChatHeader
        conversation={conversation}
        allTags={allTags}
        allUsers={allUsers}
        onStatusChange={handleStatusChange}
        onToggleInfo={onToggleInfo}
        infoOpen={infoOpen}
        onAddTag={(tag) => onAddTag(conversation.id, tag)}
        onRemoveTag={(tagId) => onRemoveTag(conversation.id, tagId)}
        onCreateTag={onCreateTag}
        onDeleteTag={onDeleteTag}
        onAssign={(user) => onAssign(conversation.id, user)}
        onArchive={() => onArchive(conversation.id)}
        onSetAiPause={(until) => onSetAiPause(conversation.id, until)}
        onInterveneAi={onInterveneAi ? () => onInterveneAi(conversation.id) : undefined}
        onAssumir={onAssumir}
        onBack={onBack}
      />
      {/* 2px peripheral status strip — emerald when AI is responding, amber
          when a human took over. Replaces the 52px banner that used to live
          here. The chip in the header carries the actions; the strip is just
          the "where am I?" sticky signal. */}
      <HandoffStripe aiPausedUntil={conversation.aiPausedUntil} />
      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchMore}
        onReply={setReplyTo}
        contact={conversation.contact}
        eventos={eventos}
        mostrarEventos={mostrarEventos}
        onAlternarEventos={() => setMostrarEventos((v) => !v)}
      />
      {/* key por conversa (28/09): sem ela o rascunho, os anexos e o
          "modelo enviado" sobreviviam à troca de conversa — digitar em A,
          apertar J e Enviar mandava o texto para B. */}
      <MessageInput
        key={conversation.id}
        onSend={handleSendWithErrorReporting}
        contactId={conversation.contact.id}
        windowOpen={windowOpen}
        windowHoursLeft={Math.max(1, Math.ceil(windowLeftMs / 3_600_000))}
        blockedReason={sendBlockedReason}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  )
}
