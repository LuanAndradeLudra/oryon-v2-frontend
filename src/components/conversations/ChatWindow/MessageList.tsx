import { useEffect, useRef, useCallback, useState, useLayoutEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  loading: boolean
  hasMore: boolean
  isTyping?: boolean
  onLoadMore: () => void
  /** Start an outbound quoted reply to this message (button/swipe in the bubble). */
  onReply?: (message: Message) => void
}

/** Identity key for grouping consecutive messages by the SAME sender, so the
 *  sender avatar is drawn once at the top of each run (and again whenever the
 *  author changes — e.g. AI → human operator, both outbound). */
function senderKey(m: Message): string {
  if (m.direction === 'inbound') return 'in'
  if (m.senderKind === 'campaign') return 'out:campaign'
  if (m.senderKind === 'rule') return 'out:rule'
  // Human operator — keyed by user id when known, else a shared operator key.
  // Must mirror SenderAvatar's branching so grouping and the drawn avatar
  // never disagree (operators often have senderKind='operator' but no id).
  if (m.senderKind === 'operator' || m.sentByUser || m.sentByUserId) {
    return m.sentByUserId ? `op:${m.sentByUserId}` : 'out:operator'
  }
  return 'out:ai'
}

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date)
  let label: string
  if (isToday(d)) label = 'Hoje'
  else if (isYesterday(d)) label = 'Ontem'
  else label = format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-surface-800" />
      <span className="text-[11px] text-surface-500 font-medium px-2 py-0.5 bg-surface-900 rounded-full border border-surface-800">
        {label}
      </span>
      <div className="flex-1 h-px bg-surface-800" />
    </div>
  )
}

export function MessageList({ messages, loading, hasMore, isTyping, onLoadMore, onReply }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)
  const isInitialLoadRef = useRef(true)
  const prevFirstIdRef = useRef<string | null>(null)
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())

  // Index by wamid so a reply bubble can resolve its quoted message from the
  // already-loaded window (no extra fetch). Degrades gracefully when the
  // original is outside the loaded page.
  const byWamid = useMemo(() => {
    const map = new Map<string, Message>()
    for (const m of messages) if (m.wamid) map.set(m.wamid, m)
    return map
  }, [messages])

  // Instant jump to bottom (no animation) — used on initial load / conversation switch
  const jumpToBottom = useCallback(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // Smooth scroll to bottom — used when new messages arrive in real-time
  const smoothScrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // On initial load or conversation switch: instantly position at bottom (no scroll animation)
  useLayoutEffect(() => {
    if (messages.length === 0) return
    const firstId = messages[0]?.id ?? null
    if (prevFirstIdRef.current !== firstId) {
      prevFirstIdRef.current = firstId
      isInitialLoadRef.current = true
      prevLengthRef.current = messages.length
      // useLayoutEffect runs before paint — set scrollTop immediately
      jumpToBottom()
    }
  }, [messages, jumpToBottom])

  // When new messages are appended (real-time): smooth scroll
  useEffect(() => {
    const prevLen = prevLengthRef.current
    // Skip if this is the initial load (handled by useLayoutEffect above)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return
    }
    if (messages.length > prevLen && prevLen > 0) {
      // Mark newly appended messages for entrance animation
      const appended = messages.slice(prevLen)
      const ids = new Set(appended.map((m) => m.id))
      setNewMsgIds(ids)
      const timer = setTimeout(() => setNewMsgIds(new Set()), 400)

      // Outbound (user sent): always scroll. Inbound: scroll if near bottom.
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.direction === 'outbound') {
        smoothScrollToBottom()
      } else {
        const el = containerRef.current
        if (el) {
          const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
          if (fromBottom < 300) smoothScrollToBottom()
        }
      }

      prevLengthRef.current = messages.length
      return () => clearTimeout(timer)
    }
    prevLengthRef.current = messages.length
  }, [messages, smoothScrollToBottom])

  // Lazy load older messages when scrolling to top
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || loading || !hasMore) return
    if (el.scrollTop < 80) onLoadMore()
  }, [loading, hasMore, onLoadMore])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      onScroll={handleScroll}
      style={{ contain: 'layout style', willChange: 'transform' }}
    >
      {/* Load more trigger at top */}
      {hasMore && (
        <div className="flex justify-center py-3">
          {loading ? (
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Carregar mensagens anteriores
            </button>
          )}
        </div>
      )}

      {/* Messages grouped by date */}
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1]
        const showDate =
          !prev || !isSameDay(new Date(msg.sentAt), new Date(prev.sentAt))
        const isNew = newMsgIds.has(msg.id)
        // Show the sender avatar only at the start of a same-author run — i.e.
        // the first of a set of broken/sequential messages from the same
        // sender. A date separator in the middle of a run does NOT repeat the
        // avatar (grouping is purely by author identity, not by day).
        const showAvatar = !prev || senderKey(prev) !== senderKey(msg)

        return (
          <div
            key={msg.id}
            className={isNew ? (msg.direction === 'outbound' ? 'animate-msg-in-right' : 'animate-msg-in-left') : undefined}
          >
            {showDate && <DateSeparator date={msg.sentAt} />}
            <MessageBubble
              message={msg}
              prevMessage={prev}
              showAvatar={showAvatar}
              quotedMessage={msg.contextWamid ? byWamid.get(msg.contextWamid) ?? null : null}
              onReply={onReply}
            />
          </div>
        )
      })}

      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} className="h-2" />
    </div>
  )
}
