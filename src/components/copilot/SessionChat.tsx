import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { Square, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useCopilot } from '@/hooks/useCopilot'
import { generateSessionTitle } from '@/services/copilotService'
import { CopilotMessageBubble } from '@/components/copilot/CopilotMessage'
import { revokeAttachmentUrls } from '@/lib/attachmentUtils'
import type { CopilotAttachment, CopilotMessage } from '@/contexts/CopilotContext'
import { GlassChatInput } from './GlassChatInput'
import { PendingApprovalBar } from './PendingApprovalBar'

// ─── Session chat ─────────────────────────────────────────────────────────────

export interface SessionChatProps {
  sessionId: string
  sessionTitle: string
  initialMessages: CopilotMessage[]
  onMessagesChange: (id: string, msgs: CopilotMessage[]) => void
  onTitleChange: (id: string, title: string) => void
  tools?: unknown[]
  autoSendMessage?: { text: string; attachments?: CopilotAttachment[] }
  onAutoSendConsumed?: () => void
}

export function SessionChat({
  sessionId,
  sessionTitle,
  initialMessages,
  onMessagesChange,
  onTitleChange,
  tools,
  autoSendMessage,
  onAutoSendConsumed,
}: SessionChatProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const { status, error, sendMessage, rerunFromMessage, abort, resolveBatch } = useCopilot(messages, setMessages, tools as Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>, sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const titleGeneratedRef = useRef(false)

  // Sync messages when loaded from DB (initialMessages goes from [] to loaded)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages((prev) => prev.length === 0 ? initialMessages : prev)
    }
  }, [initialMessages])
  // Branch state: saved tails per branchGroup
  const branchMapRef = useRef<Record<string, CopilotMessage[][]>>({})
  const activeBranchRef = useRef<Record<string, number>>({})

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => { revokeAttachmentUrls(attachments) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isBusy = status === 'streaming' || status === 'tool_running'

  // Auto-send pending message from WelcomeArea.
  // Uses setTimeout(0) so the send survives React 18 strict-mode's
  // mount → cleanup → remount cycle (useCopilot's cleanup aborts in-flight requests).
  useEffect(() => {
    if (!autoSendMessage?.text) return
    const timer = setTimeout(() => {
      onAutoSendConsumed?.()
      sendMessage(autoSendMessage.text!, autoSendMessage.attachments)
    }, 0)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync messages to parent
  useEffect(() => {
    onMessagesChange(sessionId, messages)
  }, [messages, sessionId, onMessagesChange])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollRAFRef = useRef<number | null>(null)

  // Auto-scroll — RAF-batched so multiple tokens per frame produce one scroll op
  useEffect(() => {
    if (!isNearBottomRef.current) return
    if (scrollRAFRef.current !== null) return // already scheduled this frame
    scrollRAFRef.current = requestAnimationFrame(() => {
      scrollRAFRef.current = null
      const el = scrollContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [messages])

  // Auto-title: generate as soon as first user message is sent
  useEffect(() => {
    if (titleGeneratedRef.current) return
    const firstUser = messages.find((m) => m.role === 'user')
    if (firstUser) {
      titleGeneratedRef.current = true
      generateSessionTitle(firstUser.content).then((title) => {
        onTitleChange(sessionId, title)
      })
    }
  }, [messages, sessionId, onTitleChange])


  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && attachments.length === 0) || isBusy) return
    const snapshot = attachments
    setInput('')
    setAttachments([])
    setAttachError(null)
    await sendMessage(text, snapshot)
  }

  const handleAttachmentsChange = async (newAtts: CopilotAttachment[]) => {
    setAttachError(null)
    setAttachments(newAtts)
  }

  const handleEditMessage = (msgId: string, newText: string) => {
    if (isBusy) return
    const msgIndex = messages.findIndex((m) => m.id === msgId)
    if (msgIndex === -1) return

    const original = messages[msgIndex]
    const branchGroup = original.branchGroup ?? crypto.randomUUID()

    if (!branchMapRef.current[branchGroup]) {
      // First edit: save original tail as branch 0
      const savedTail = messages.slice(msgIndex).map((m, i) =>
        i === 0 ? { ...m, branchGroup, branchIndex: 0, totalBranches: 2 } : m
      )
      branchMapRef.current[branchGroup] = [savedTail]
      activeBranchRef.current[branchGroup] = 0
    } else {
      // Subsequent edit: save current tail to current active branch
      const activeBranch = activeBranchRef.current[branchGroup] ?? 0
      branchMapRef.current[branchGroup][activeBranch] = messages.slice(msgIndex)
    }

    const newBranchIndex = branchMapRef.current[branchGroup].length
    const totalBranches = newBranchIndex + 1

    // Update totalBranches in all saved tails
    branchMapRef.current[branchGroup] = branchMapRef.current[branchGroup].map((tail, idx) =>
      tail.length > 0 && tail[0].role === 'user'
        ? [{ ...tail[0], branchGroup, branchIndex: idx, totalBranches }, ...tail.slice(1)]
        : tail
    )
    // Placeholder for new branch (will be filled by rerun)
    branchMapRef.current[branchGroup].push([])
    activeBranchRef.current[branchGroup] = newBranchIndex

    const newUserMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: newText,
      attachments: original.attachments,
      timestamp: new Date(),
      branchGroup,
      branchIndex: newBranchIndex,
      totalBranches,
    }

    rerunFromMessage(newUserMsg, messages.slice(0, msgIndex))
  }

  const handleSwitchBranch = (msgId: string, direction: 'prev' | 'next') => {
    if (isBusy) return
    const msgIndex = messages.findIndex((m) => m.id === msgId)
    if (msgIndex === -1) return

    const msg = messages[msgIndex]
    const branchGroup = msg.branchGroup
    if (!branchGroup || !branchMapRef.current[branchGroup]) return

    const activeBranch = activeBranchRef.current[branchGroup] ?? 0
    const totalBranches = branchMapRef.current[branchGroup].length
    if (totalBranches < 2) return

    const targetBranch =
      direction === 'prev'
        ? (activeBranch - 1 + totalBranches) % totalBranches
        : (activeBranch + 1) % totalBranches

    // Save current tail to active branch
    branchMapRef.current[branchGroup][activeBranch] = messages.slice(msgIndex)

    const targetTail = branchMapRef.current[branchGroup][targetBranch]
    if (!targetTail || targetTail.length === 0) return

    activeBranchRef.current[branchGroup] = targetBranch
    setMessages([...messages.slice(0, msgIndex), ...targetTail])
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Chat header — session title */}
      <div className="relative z-10 flex-shrink-0 border-b border-surface-800/50 px-6 py-3 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.h2
            key={sessionTitle}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-surface-300 truncate max-w-xl"
          >
            {sessionTitle === 'Nova conversa' ? (
              <span className="text-surface-500 italic">Nova conversa</span>
            ) : (
              sessionTitle
            )}
          </motion.h2>
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto py-6 px-4"
        onScroll={handleScroll}
        style={{ contain: 'layout style', willChange: 'transform' }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <CopilotMessageBubble
              key={msg.id}
              message={msg}
              onResolveBatch={resolveBatch}
              onEdit={msg.role === 'user' ? (newText) => handleEditMessage(msg.id, newText) : undefined}
              onSwitchBranch={msg.role === 'user' && msg.branchGroup ? (dir) => handleSwitchBranch(msg.id, dir) : undefined}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 px-4 mb-3"
          >
            <div className="max-w-4xl mx-auto px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending approval bar (Claude Code-style sticky above composer) */}
      <div className="relative z-10 px-4 pt-3">
        <div className="mx-auto max-w-4xl">
          <PendingApprovalBar messages={messages} onResolveBatch={resolveBatch} />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 py-4 border-t border-surface-800/60">
        <div className="max-w-4xl mx-auto">
          <GlassChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onAbort={abort}
            isBusy={isBusy}
            attachments={attachments}
            onAttachmentsChange={handleAttachmentsChange}
            attachError={attachError}
          />
        </div>
      </div>
    </div>
  )
}
