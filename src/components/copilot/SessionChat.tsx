import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type SetStateAction,
} from 'react'
import { CopilotBlockNotice } from './CopilotBlockNotice'

import { useCopilot } from '@/hooks/useCopilot'
import { generateSessionTitle } from '@/services/copilotService'
import { CopilotMessageBubble } from '@/components/copilot/CopilotMessage'
import { revokeAttachmentUrls } from '@/lib/attachmentUtils'
import { Banner } from '@/components/ui/Banner'
import type { CopilotAttachment, CopilotMessage } from '@/contexts/CopilotContext'
import { GlassChatInput } from './GlassChatInput'
import { expirarLotesOrfaos } from './bancada/lotes'

// ─── Session chat ─────────────────────────────────────────────────────────────

export interface SessionChatProps {
  sessionId: string
  initialMessages: CopilotMessage[]
  onMessagesChange: (id: string, msgs: CopilotMessage[]) => void
  onTitleChange: (id: string, title: string) => void
  tools?: unknown[]
  autoSendMessage?: { text: string; attachments?: CopilotAttachment[] }
  onAutoSendConsumed?: () => void
  /** Desenha a bancada ao lado da conversa (aprovações, resultados, artefatos). */
  renderBancada: (ctx: ContextoDaBancada) => React.ReactNode
  /** Leva da conversa ao item na bancada (aba + id do item). */
  onIrParaBancada?: (aba: AbaDaBancada, alvoId?: string) => void
}

export type AbaDaBancada = 'aprovacoes' | 'resultados' | 'artefatos'
export interface ContextoDaBancada {
  messages: CopilotMessage[]
  resolveBatch: (batchTcId: string, approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
  enviar: (texto: string) => void
  ocupado: boolean
}

export function SessionChat({
  sessionId,
  initialMessages,
  onMessagesChange,
  onTitleChange,
  tools,
  autoSendMessage,
  onAutoSendConsumed,
  renderBancada,
  onIrParaBancada,
}: SessionChatProps) {
  // Lote pendente que chega pelo histórico não tem turno vivo (o turno fica
  // na memória da conversa aberta): entra como expirado, não aprovável.
  const [messages, setMessagesLocal] = useState<CopilotMessage[]>(() => expirarLotesOrfaos(initialMessages))
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)

  // Revisão 11/10: trocar de conversa com uma aprovação "Enviando…" deixava o
  // lote preso — a resposta do servidor chegava com esta conversa já
  // desmontada e se perdia. Depois de desmontar, as atualizações seguem para
  // a lista de conversas (onMessagesChange) em vez do estado local.
  const montadoRef = useRef(true)
  const ultimasRef = useRef(messages)
  ultimasRef.current = messages
  useEffect(() => {
    montadoRef.current = true
    return () => { montadoRef.current = false }
  }, [])
  const setMessages = useCallback((upd: SetStateAction<CopilotMessage[]>) => {
    if (montadoRef.current) { setMessagesLocal(upd); return }
    const prox = typeof upd === 'function' ? upd(ultimasRef.current) : upd
    if (prox === ultimasRef.current) return
    ultimasRef.current = prox
    onMessagesChange(sessionId, prox)
  }, [onMessagesChange, sessionId])

  const { status, error, blocked, sendMessage, rerunFromMessage, abort, resolveBatch } = useCopilot(messages, setMessages, tools as Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>, sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const titleGeneratedRef = useRef(false)

  // Sync messages when loaded from DB (initialMessages goes from [] to loaded)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessagesLocal((prev) => prev.length === 0 ? expirarLotesOrfaos(initialMessages) : prev)
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

  // "Conversa + bancada" (SCRUM-1253): a conversa é uma coluna de leitura e o
  // que ela produz (plano, resultados, aprovações) vai para a bancada ao lado,
  // desenhada por quem chama.
const ctx: ContextoDaBancada = { messages, resolveBatch, enviar: (t) => { void sendMessage(t) }, ocupado: isBusy }
  return (
    <div className="flex h-full min-h-0">
      <section aria-label="Conversa" className="chat-shell-bg relative flex flex-col flex-1 min-w-0 h-full">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 pt-5 pb-3"
          onScroll={handleScroll}
        >
          <div className="space-y-5">
            {messages.map((msg) => (
              <CopilotMessageBubble
                key={msg.id}
                message={msg}
                onResolveBatch={resolveBatch}
                naBancada={onIrParaBancada}
                onSendFollowup={(t) => sendMessage(t)}
                onEdit={msg.role === 'user' ? (newText) => handleEditMessage(msg.id, newText) : undefined}
                onSwitchBranch={msg.role === 'user' && msg.branchGroup ? (dir) => handleSwitchBranch(msg.id, dir) : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* Bloqueio de cobrança (SCRUM-1210) — antes do erro: é condição da conta, não falha do turno */}
        {blocked && (
          <div className="px-4 pb-2">
            <CopilotBlockNotice notice={blocked} />
          </div>
        )}
        {error && (
          <div className="px-4 pb-2">
            <Banner variant="danger">{error}</Banner>
          </div>
        )}
        <div className="px-3 pb-3 pt-1">
          <GlassChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onAbort={abort}
            isBusy={isBusy}
            placeholder="Pergunte ou peça uma ação…"
            attachments={attachments}
            onAttachmentsChange={handleAttachmentsChange}
            attachError={attachError}
            onAttachError={setAttachError}
          />
        </div>
      </section>
      {renderBancada(ctx)}
    </div>
  )
}
