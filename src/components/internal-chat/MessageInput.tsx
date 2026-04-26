import { useRef, useState, type KeyboardEvent } from 'react'
import { Send, Paperclip, X, CornerUpLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton'
import { useInternalChat } from '@/contexts/InternalChatContext'
import type { InternalMessage } from '@/types'

interface MessageInputProps {
  channelId: string
  replyTo: InternalMessage | null
  onClearReply: () => void
  placeholder?: string
}

export function MessageInput({ channelId, replyTo, onClearReply, placeholder }: MessageInputProps) {
  const { sendMessage } = useInternalChat()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    onClearReply()
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    try {
      await sendMessage(channelId, trimmed, replyTo?.id)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const canSend = text.trim().length > 0 && !sending

  return (
    <div className="flex-shrink-0 px-4 py-3">
      {/* Reply banner */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-t-xl bg-surface-700 border-b border-surface-600">
          <CornerUpLeft className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-blue-400">{replyTo.senderName}</span>
            <p className="text-[11px] text-surface-400 truncate">{replyTo.body}</p>
          </div>
          <button
            onClick={onClearReply}
            className="p-0.5 rounded text-surface-500 hover:text-surface-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input card — Google Chat style */}
      <div className={cn(
        'rounded-2xl border bg-surface-700 transition-colors',
        replyTo ? 'rounded-t-none border-t-0' : '',
        text ? 'border-blue-500/40' : 'border-surface-500',
      )}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder ?? 'Enviar mensagem para o espaço'}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none leading-relaxed"
          style={{ maxHeight: '140px' }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-0.5">
            <EmojiPickerButton
              textareaRef={textareaRef}
              onEmojiInsert={(newValue) => setText(newValue)}
              className="p-1.5 rounded-full hover:bg-surface-600"
            />
            <button
              className="p-1.5 rounded-full text-surface-500 hover:text-surface-200 hover:bg-surface-600 transition-all"
              title="Anexar arquivo"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              canSend
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'text-surface-600 cursor-not-allowed',
            )}
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </div>

      <p className="text-[10px] text-surface-700 mt-1 px-1">Enter para enviar · Shift+Enter para nova linha</p>
    </div>
  )
}
