import { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { AiHandoffBanner } from './AiHandoffBanner'
import { useMessages } from '@/hooks/useMessages'
import { getSocket } from '@/services/socket'
import { WorkspaceReadinessBanner } from '@/components/common/WorkspaceReadinessBanner'
import type { Conversation, Tag, User, SocketAiPauseUpdated, SocketMessageNew } from '@/types'

interface ChatWindowProps {
  conversation: Conversation | null
  allTags: Tag[]
  allUsers: User[]
  onStatusChange: (id: string, status: 'open' | 'pending' | 'resolved') => void
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
  onSetAiPause, onAiPauseSocketEvent,
  onSendError, sendBlockedReason,
  onBack,
}: ChatWindowProps) {
  const { messages, loading, sending, hasMore, fetchMore, sendMessage, addIncomingMessage, updateMessageStatus } =
    useMessages(conversation?.id ?? null)

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
        // Temporary: log incoming message type to aid debugging (can be removed after reaction support is validated)
        console.debug('[socket:message:new]', { type: payload.message.type, wamid: payload.message.wamid, payload })
        addIncomingMessage(payload.message)
      }
    }
    const handleStatus = (payload: { messageId: string; status: string; timestamp: string }) => {
      updateMessageStatus(payload as any)
    }
    const handleAiPause = (payload: SocketAiPauseUpdated) => {
      if (payload.conversationId === conversation.id) {
        onAiPauseSocketEvent?.(payload)
      }
    }
    socket.on('message:new', handleNew)
    socket.on('conversation:updated', handleNew)
    socket.on('message:status', handleStatus)
    socket.on('conversation:ai-pause-updated', handleAiPause)
    return () => {
      socket.off('message:new', handleNew)
      socket.off('conversation:updated', handleNew)
      socket.off('message:status', handleStatus)
      socket.off('conversation:ai-pause-updated', handleAiPause)
    }
  }, [conversation?.id, addIncomingMessage, updateMessageStatus, onAiPauseSocketEvent])

  const handleStatusChange = (status: 'open' | 'pending' | 'resolved') => {
    if (!conversation) return
    if (conversation.status === status) return
    onStatusChange(conversation.id, status)
  }

  const windowOpen = conversation
    ? Date.now() - new Date(conversation.lastMessageAt).getTime() < 86_400_000
    : false

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-surface-600" />
        </div>
        <div className="text-center">
          <p className="text-surface-300 font-medium">Selecione uma conversa</p>
          <p className="text-surface-500 text-sm mt-1">
            Escolha uma conversa na lista para começar a atender
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-black relative overflow-hidden">
      {/* Phase 29 — surfaces tenant-wide blockers (no WhatsApp number, no
          department) above the chat. Auto-hides when nothing is unmet, so
          well-configured tenants see no extra chrome. The user_in_department
          blocker shows up in the MessageInput's blockedReason prop instead
          (same data, more contextual placement near the action). */}
      <WorkspaceReadinessBanner mode="inline" flows={['send_message']} />
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
        onBack={onBack}
      />
      <AiHandoffBanner
        aiPausedUntil={conversation.aiPausedUntil}
        onPause={(until) => onSetAiPause(conversation.id, until)}
        onResume={() => onSetAiPause(conversation.id, null)}
      />
      <MessageList messages={messages} loading={loading} hasMore={hasMore} onLoadMore={fetchMore} />
      <MessageInput
        onSend={handleSendWithErrorReporting}
        sending={sending}
        windowOpen={windowOpen}
        blockedReason={sendBlockedReason}
      />
    </div>
  )
}
