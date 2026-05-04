import { useState, useEffect, useCallback, useRef } from 'react'
import { messagesApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import type { Message, SendMessageDto, SocketMessageStatus } from '@/types'

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const pageRef = useRef(1)

  const fetchMessages = useCallback(async (reset = true) => {
    if (!conversationId) return
    setLoading(true)
    try {
      const page = reset ? 1 : pageRef.current
      const { data } = await withRetry(() => messagesApi.list(conversationId, page, 50))
      if (reset) {
        setMessages(data.data.reverse())
        pageRef.current = 2
      } else {
        setMessages((prev) => [...data.data.reverse(), ...prev])
        pageRef.current = page + 1
      }
      setHasMore(data.data.length === 50)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (conversationId) {
      setMessages([])
      fetchMessages(true)
    }
  }, [conversationId, fetchMessages])

  const addIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Deduplicate by id to prevent double-rendering from overlapping socket events
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  const updateMessageStatus = useCallback((payload: SocketMessageStatus) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId
          ? {
              ...m,
              status: payload.status,
              deliveredAt: payload.status === 'delivered' ? payload.timestamp : m.deliveredAt,
              readAt: payload.status === 'read' ? payload.timestamp : m.readAt,
            }
          : m
      )
    )
  }, [])

  const sendMessage = useCallback(
    async (dto: SendMessageDto) => {
      if (!conversationId) return
      setSending(true)
      try {
        const { data } = await messagesApi.send(conversationId, dto)
        addIncomingMessage(data)
      } catch (err) {
        // Re-throw so the caller (MessageInput / ChatWindow) can show a
        // toast and decide whether to keep the typed text. The previous
        // try/finally swallowed the error silently — user typed, message
        // disappeared, no feedback.
        throw err
      } finally {
        setSending(false)
      }
    },
    [conversationId, addIncomingMessage]
  )

  return {
    messages,
    loading,
    sending,
    hasMore,
    fetchMore: () => fetchMessages(false),
    addIncomingMessage,
    updateMessageStatus,
    sendMessage,
  }
}
