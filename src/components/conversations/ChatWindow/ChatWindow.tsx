import { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { getSocket } from '@/services/socket'
import type { Conversation, Tag, User, SocketMessageNew } from '@/types'

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
}

export function ChatWindow({
  conversation, allTags, allUsers,
  onStatusChange, onToggleInfo, infoOpen,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onTransfer, onArchive,
}: ChatWindowProps) {
  const { messages, loading, sending, hasMore, fetchMore, sendMessage, addIncomingMessage, updateMessageStatus } =
    useMessages(conversation?.id ?? null)

  // Listen to socket events for real-time message updates in the active chat
  useEffect(() => {
    if (!conversation) return
    const socket = getSocket()
    const handleNew = (payload: SocketMessageNew) => {
      if (payload.conversationId === conversation.id && payload.message) {
        addIncomingMessage(payload.message)
      }
    }
    const handleStatus = (payload: { messageId: string; status: string; timestamp: string }) => {
      updateMessageStatus(payload as any)
    }
    socket.on('message:new', handleNew)
    socket.on('conversation:updated', handleNew)
    socket.on('message:status', handleStatus)
    return () => {
      socket.off('message:new', handleNew)
      socket.off('conversation:updated', handleNew)
      socket.off('message:status', handleStatus)
    }
  }, [conversation?.id, addIncomingMessage, updateMessageStatus])

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
      />
      <MessageList messages={messages} loading={loading} hasMore={hasMore} onLoadMore={fetchMore} />
      <MessageInput onSend={sendMessage} sending={sending} windowOpen={windowOpen} />
    </div>
  )
}
