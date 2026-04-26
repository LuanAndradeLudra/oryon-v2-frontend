import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Sparkles, Send, Square, Loader2, Paperclip, FileText, Palette } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useCopilotContext } from '@/contexts/CopilotContext'
import type { CopilotAttachment } from '@/contexts/CopilotContext'
import { useCopilot } from '@/hooks/useCopilot'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  fileToAttachment,
  revokeAttachmentUrls,
} from '@/lib/attachmentUtils'
import { CopilotMessageBubble } from './CopilotMessage'
import { SLIDE_PRESETS } from '@/config/slidePresets'

// ─── Animations ───────────────────────────────────────────────────────────────

const windowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transformOrigin: 'bottom right',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
}

// ─── Attachment chip ───────────────────────────────────────────────────────────

function AttachmentChip({
  att,
  onRemove,
}: {
  att: CopilotAttachment
  onRemove: () => void
}) {
  return (
    <div className="relative flex items-center gap-1.5 pr-1 pl-1.5 py-1 rounded-lg border border-surface-600/50 bg-surface-800/70 max-w-[160px] group">
      {att.kind === 'image' ? (
        <img
          src={att.previewUrl}
          alt={att.name}
          className="w-6 h-6 rounded object-cover flex-shrink-0"
        />
      ) : (
        <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
      )}
      <span className="text-[10px] text-surface-300 truncate leading-none">{att.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 w-4 h-4 rounded-full bg-surface-600 hover:bg-surface-500 flex items-center justify-center transition-colors"
        title="Remover"
      >
        <X className="w-2.5 h-2.5 text-surface-300" />
      </button>
    </div>
  )
}

// ─── Welcome state (sidebar) ─────────────────────────────────────────────────

function WelcomeState() {
  return (
    <motion.div
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full px-5 text-center gap-5"
    >
      <motion.div variants={messageVariants}>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-900/40">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
      </motion.div>
      <motion.div variants={messageVariants}>
        <p className="text-sm font-semibold text-surface-50">Olá, sou a Oryon AI</p>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed max-w-[220px]">
          Analiso seus leads, verifico métricas e ajo no CRM por você.
        </p>
      </motion.div>
    </motion.div>
  )
}

// ─── Slide Preset Picker ───────────────────────────────────────────────────────

function PresetPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 mx-3"
    >
      <div className="rounded-2xl border border-surface-700/60 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/60">
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-surface-200">Design Preset para Slides</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-surface-500 hover:text-surface-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Preset grid */}
        <div className="p-3 grid grid-cols-2 gap-2">
          {SLIDE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => { onSelect(selected === preset.id ? null : preset.id); onClose() }}
              className={cn(
                'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                selected === preset.id
                  ? 'bg-brand-600/15 border-brand-500/40 ring-1 ring-brand-500/20'
                  : 'border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/60',
              )}
            >
              <span className="text-xl leading-none flex-shrink-0 mt-0.5">{preset.emoji}</span>
              <div className="min-w-0">
                <p className={cn(
                  'text-[12px] font-semibold leading-tight',
                  selected === preset.id ? 'text-brand-300' : 'text-surface-200',
                )}>
                  {preset.name}
                </p>
                <p className="text-[10px] text-surface-500 mt-0.5 leading-snug">{preset.description}</p>
              </div>
              {selected === preset.id && (
                <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400 mt-1" />
              )}
            </button>
          ))}
        </div>

        {/* Clear */}
        {selected && (
          <div className="px-3 pb-3">
            <button
              onClick={() => { onSelect(null); onClose() }}
              className="w-full text-center text-[11px] text-surface-500 hover:text-surface-300 py-1.5 rounded-lg hover:bg-surface-800/40 transition-colors"
            >
              Remover preset
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Chat window ──────────────────────────────────────────────────────────────

function ChatWindow() {
  const { close, messages, setMessages, preloadedMessage, clearPreload } = useCopilotContext()
  const { status, activeToolName, activeAgentLabel, error, sendMessage, abort, resolveBatch } = useCopilot(messages, setMessages)
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [slidePreset, setSlidePreset] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isNearBottomRef = useRef(true)

  const activePreset = SLIDE_PRESETS.find((p) => p.id === slidePreset) ?? null

  const isBusy = status === 'streaming' || status === 'tool_running'

  // Apply preloaded message
  useEffect(() => {
    if (preloadedMessage) {
      setInput(preloadedMessage)
      clearPreload()
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [preloadedMessage, clearPreload])

  // Auto-scroll: use 'instant' during streaming to avoid animation jank per token
  useEffect(() => {
    if (isNearBottomRef.current) {
      const isStreaming = messages.some((m) => m.isStreaming)
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' })
    }
  }, [messages])

  // Revoke image preview URLs when attachments change or component unmounts
  useEffect(() => {
    return () => { revokeAttachmentUrls(attachments) }
  }, [attachments])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setAttachError(null)
    const { attachments: newAtts, error } = await import('@/lib/attachmentUtils').then(m =>
      m.filesToAttachments(files)
    )
    if (error) { setAttachError(error); return }
    setAttachments((prev) => [...prev, ...newAtts])
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id)
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && attachments.length === 0) || isBusy) return
    const snapshot = attachments
    setInput('')
    setAttachments([])
    setAttachError(null)
    await sendMessage(text, snapshot, slidePreset ? { slidePreset } : undefined)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }


  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-950/80 shadow-2xl backdrop-blur-xl ring-1 ring-white/5" style={{ width: 400, maxHeight: '88vh' }}>

      {/* Header */}
      <div className="relative border-b border-surface-800/60 bg-surface-900/60 px-4 py-3.5 overflow-hidden flex-shrink-0">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/15 to-violet-600/15 pointer-events-none" />
        <div className="relative flex items-center gap-3 z-10">
          {/* Avatar with status dot */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-md shadow-brand-900/40">
              <Sparkles className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-950 bg-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-50 leading-none">Oryon AI</p>
            <p className="text-[10px] text-surface-400 mt-0.5">
              {isBusy ? 'Processando...' : 'Online · Copiloto de negócios'}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-full text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-surface-950/30 to-surface-950/60"
        onScroll={handleScroll}
        style={{ minHeight: 340, maxHeight: 520 }}
      >
        {messages.length === 0 ? (
          <WelcomeState />
        ) : (
          messages.map((msg) => (
            <CopilotMessageBubble
              key={msg.id}
              message={msg}
              onResolveBatch={resolveBatch}
              onSendFollowup={sendMessage}
              activeAgentLabel={msg.isStreaming ? activeAgentLabel : null}
              activeToolName={msg.isStreaming ? activeToolName : null}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent & tool activity bar */}
      <AnimatePresence>
        {(activeToolName || activeAgentLabel) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-surface-800/50 flex items-center gap-2 flex-shrink-0 bg-surface-900/40"
          >
            <Loader2 className="w-3 h-3 text-status-pending animate-spin flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              {activeAgentLabel && (
                <span className="text-[11px] text-status-pending/70">{activeAgentLabel}</span>
              )}
              {activeToolName && (
                <span className="text-[11px] text-status-pending">{activeToolName}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-2 px-3 py-1.5 bg-danger/10 border border-danger/20 rounded-lg text-[11px] text-danger flex-shrink-0"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-surface-800/60 bg-surface-900/60 backdrop-blur-md flex-shrink-0">

        {/* Attachment chips */}
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
                {attachments.map((att) => (
                  <AttachmentChip key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach size error */}
        <AnimatePresence>
          {attachError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 pt-1.5 text-[10px] text-danger"
            >
              {attachError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Active preset badge */}
        <AnimatePresence initial={false}>
          {activePreset && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
                <span className="text-sm leading-none">{activePreset.emoji}</span>
                <span className="text-[11px] text-brand-300 font-medium">{activePreset.name}</span>
                <span className="text-[11px] text-surface-500">ativo</span>
                <button
                  type="button"
                  onClick={() => setSlidePreset(null)}
                  className="ml-auto text-surface-600 hover:text-surface-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {/* Preset picker popover */}
          <AnimatePresence>
            {showPresets && (
              <PresetPicker
                selected={slidePreset}
                onSelect={setSlidePreset}
                onClose={() => setShowPresets(false)}
              />
            )}
          </AnimatePresence>

        <form
          className="flex items-center gap-2 p-3"
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_ATTACHMENT_TYPES}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
              attachments.length > 0
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/60',
              isBusy && 'opacity-40 cursor-not-allowed',
            )}
            title="Anexar imagem ou PDF"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Preset button */}
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            disabled={isBusy}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
              slidePreset
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/60',
              isBusy && 'opacity-40 cursor-not-allowed',
            )}
            title="Design preset para slides"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            placeholder={attachments.length > 0 ? 'Adicione uma instrução...' : 'Pergunte sobre seus dados...'}
            className="flex-1 rounded-full border border-surface-700/60 bg-surface-800/50 px-4 py-2 text-sm text-surface-100 placeholder:text-surface-500 outline-none transition-all focus:border-brand-500/50 focus:bg-surface-800 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-50"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={abort}
              className="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors flex items-center justify-center flex-shrink-0"
              title="Interromper"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && attachments.length === 0}
              className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950 transition-all hover:scale-105 hover:shadow-lg hover:shadow-brand-600/30 flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
        </div>
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function CopilotPanel() {
  const { isOpen, close } = useCopilotContext()
  const { user } = useAuth()
  const location = useLocation()

  // Copilot is exclusive to admin-level roles (tenant owner + promoted admins)
  if (user?.role !== 'admin' && user?.role !== 'business_admin') return null

  // Hide floating panel on the dedicated Copilot page
  if (location.pathname.startsWith('/copilot')) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50" style={{ pointerEvents: 'auto' }}>
          <motion.div
            key="chat-window"
            variants={windowVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <ChatWindow />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
