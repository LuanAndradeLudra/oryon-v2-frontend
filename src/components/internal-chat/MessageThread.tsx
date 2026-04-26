import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, ArrowDown, MessageSquare } from 'lucide-react'
import { useInternalChat } from '@/contexts/InternalChatContext'
import { MessageBubble } from './MessageBubble'
import type { InternalMessage } from '@/types'

// ─── Date separators ──────────────────────────────────────────────────────────

function formatSeparatorDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 86_400_000 && date.getDate() === now.getDate()) return 'Hoje'
  if (diff < 2 * 86_400_000) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a); const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

// ─── Group threshold: messages from same user within 3 minutes are grouped ───

function shouldShowHeader(msgs: InternalMessage[], idx: number): boolean {
  if (idx === 0) return true
  const prev = msgs[idx - 1]
  const curr = msgs[idx]
  if (prev.senderId !== curr.senderId) return true
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return diff > 3 * 60_000
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MessageThreadProps {
  channelId: string
  currentUserId: string
  onReply: (msg: InternalMessage) => void
  searchQuery?: string
}

export function MessageThread({ channelId, currentUserId, onReply, searchQuery }: MessageThreadProps) {
  const { messages, loadingMessages } = useInternalChat()
  const allMsgs = messages[channelId] ?? []
  const msgs = searchQuery?.trim()
    ? allMsgs.filter((m) => m.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : allMsgs
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const lastCountRef = useRef(0)

  // scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if (isNearBottom || allMsgs.length !== lastCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: allMsgs.length === lastCountRef.current ? 'smooth' : 'instant' })
    }
    lastCountRef.current = allMsgs.length
  }, [allMsgs])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollBtn(distanceFromBottom > 200)
  }, [])

  if (loadingMessages && allMsgs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
      </div>
    )
  }

  if (allMsgs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <MessageSquare className="w-5 h-5 text-surface-500" />
          <p className="text-sm text-surface-600">Nenhuma mensagem ainda. Diga olá!</p>
        </div>
      </div>
    )
  }

  if (msgs.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-surface-500">Nenhuma mensagem encontrada para "<span className="text-surface-300">{searchQuery}</span>"</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto py-4"
        style={{ contain: 'layout style' }}
      >
        {msgs.map((msg, idx) => {
          const prevMsg = msgs[idx - 1]
          const showDateSep = idx === 0 || !isSameDay(prevMsg.createdAt, msg.createdAt)

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 px-4 my-4">
                  <div className="flex-1 h-px bg-surface-700" />
                  <span className="text-[11px] text-surface-500 font-medium px-3 py-0.5 rounded-full border border-surface-700">
                    {formatSeparatorDate(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-surface-700" />
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={msg.senderId === currentUserId}
                showHeader={shouldShowHeader(msgs, idx)}
                onReply={onReply}
                searchQuery={searchQuery}
              />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-surface-300 hover:bg-surface-600 transition-all shadow-lg"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
