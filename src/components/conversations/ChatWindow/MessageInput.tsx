import { useCallback, useState, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  Send, Paperclip, AlertTriangle, Zap, Image, FileText, Video, ChevronDown,
  Scissors, Copy, Clipboard, CopyCheck, CornerUpLeft, X,
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import type { CannedResponse, Message, SendMessageDto, WhatsAppTemplate } from '@/types'
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton'
import { templatesApi } from '@/services/api'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

interface MessageInputProps {
  /**
   * Returns a promise that rejects on send failure (e.g. backend rejected
   * with 403 because the user has no department configured). The input
   * preserves the typed text on rejection so the operator can retry or
   * copy it elsewhere.
   */
  onSend: (dto: SendMessageDto) => Promise<unknown> | void
  sending: boolean
  windowOpen: boolean
  disabled?: boolean
  /**
   * When set, the input is locked with a clear explanation instead of
   * showing the chat input area. Use to surface "you can't send messages
   * right now" preconditions (no WhatsApp number, no department, etc.)
   * BEFORE the operator types and clicks send.
   */
  blockedReason?: { message: string; ctaHref?: string; ctaLabel?: string } | null
  /** When set, shows a "replying to" bar and the next send quotes this message. */
  replyTo?: Message | null
  onCancelReply?: () => void
}

/** One-line preview of the message being replied to (for the compose bar). */
function replyPreview(m: Message): string {
  if (m.body && m.body.trim()) return m.body.trim()
  switch (m.type) {
    case 'image': return '📷 Imagem'
    case 'video': return '🎥 Vídeo'
    case 'audio': return '🎤 Áudio'
    case 'document': return '📄 Documento'
    case 'sticker': return 'Figurinha'
    case 'location': return '📍 Localização'
    case 'contacts': return '👤 Contato'
    default: return 'Mensagem'
  }
}

// ── Quick Reply Picker ─────────────────────────────────────────────────────────

function QuickReplyPicker({
  query,
  responses,
  activeIndex,
  onSelect,
}: {
  query: string
  responses: CannedResponse[]
  activeIndex: number
  onSelect: (r: CannedResponse) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (responses.length === 0) return null
  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
    >
      <div className="px-3 py-2 border-b border-surface-700/60 flex items-center gap-1.5 sticky top-0 bg-surface-800 z-10">
        <Zap className="w-3 h-3 text-brand-400" />
        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
          Respostas rápidas {query ? `— /${query}` : ''}
        </span>
      </div>
      {responses.map((r, i) => (
        <button
          key={r.id}
          ref={i === activeIndex ? activeRef : null}
          onClick={() => onSelect(r)}
          className={cn(
            'w-full text-left px-3 py-2.5 transition-colors border-b border-surface-700/40 last:border-0',
            i === activeIndex ? 'bg-brand-600/20' : 'hover:bg-surface-700/60'
          )}
        >
          <div className="flex items-baseline gap-2">
            <code className="text-[11px] font-mono text-brand-400 bg-brand-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
              /{r.shortcut}
            </code>
            <span className="text-xs font-medium text-surface-200 truncate">{r.title}</span>
          </div>
          <p className="text-[11px] text-surface-500 truncate mt-0.5 pl-0.5">{r.body}</p>
        </button>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MessageInput({ onSend, sending, windowOpen, disabled, blockedReason, replyTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('')
  const [templateSent, setTemplateSent] = useState(false)
  const [allResponses, setAllResponses] = useState<CannedResponse[]>([])
  const [pickerResponses, setPickerResponses] = useState<CannedResponse[]>([])
  const [pickerActive, setPickerActive] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  // Refs used by the outside-click handler below so a mousedown on the
  // menu itself (or on the clip toggle) doesn't pre-emptively close it.
  // Without these, mousedown on "Imagem"/"Documento"/"Vídeo" unmounts the
  // button before mouseup fires — and the browser then never dispatches
  // the click event, so the hidden file input is never .click()ed.
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const attachButtonRef = useRef<HTMLButtonElement>(null)

  const buildInputContextMenu = useCallback((): ContextMenuEntry[] => {
    const el = textareaRef.current
    const hasSelection = !!el && el.selectionStart !== el.selectionEnd
    return [
      {
        label: 'Cortar',
        icon: Scissors,
        shortcut: 'Ctrl+X',
        disabled: !hasSelection,
        onClick: () => {
          if (!el) return
          const selected = el.value.slice(el.selectionStart, el.selectionEnd)
          navigator.clipboard.writeText(selected).catch(() => {})
          const before = el.value.slice(0, el.selectionStart)
          const after = el.value.slice(el.selectionEnd)
          setText(before + after)
          requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(before.length, before.length)
          })
        },
      },
      {
        label: 'Copiar',
        icon: Copy,
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        onClick: () => {
          if (!el) return
          const selected = el.value.slice(el.selectionStart, el.selectionEnd)
          navigator.clipboard.writeText(selected).catch(() => {})
        },
      },
      {
        label: 'Colar',
        icon: Clipboard,
        shortcut: 'Ctrl+V',
        onClick: async () => {
          if (!el) return
          try {
            const clip = await navigator.clipboard.readText()
            const before = el.value.slice(0, el.selectionStart)
            const after = el.value.slice(el.selectionEnd)
            const next = before + clip + after
            setText(next)
            requestAnimationFrame(() => {
              el.focus()
              const pos = before.length + clip.length
              el.setSelectionRange(pos, pos)
            })
          } catch { /* clipboard denied */ }
        },
      },
      { separator: true },
      {
        label: 'Selecionar tudo',
        icon: CopyCheck,
        shortcut: 'Ctrl+A',
        onClick: () => {
          if (!el) return
          el.focus()
          el.setSelectionRange(0, el.value.length)
        },
      },
      { separator: true },
      {
        label: 'Respostas rápidas',
        icon: Zap,
        onClick: () => {
          setText('/')
          requestAnimationFrame(() => textareaRef.current?.focus())
        },
      },
    ]
  }, [])

  const { onContextMenu: onInputContextMenu } = useContextMenu(buildInputContextMenu)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Load canned responses once
  useEffect(() => {
    axios.get<{ data: CannedResponse[] } | CannedResponse[]>(`${API}/canned-responses`)
      .then((r) => setAllResponses(Array.isArray(r.data) ? r.data : r.data.data))
      .catch(() => {})
  }, [])

  // Close attach menu when clicking outside. We MUST check that the click
  // wasn't on the menu (or its toggle), otherwise a mousedown on one of the
  // type buttons closes the menu before mouseup fires — the browser then
  // doesn't dispatch a click event, so the hidden <input type="file">
  // .click() never runs and the file picker never opens.
  useEffect(() => {
    if (!showAttachMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        attachMenuRef.current?.contains(target) ||
        attachButtonRef.current?.contains(target)
      ) {
        return
      }
      setShowAttachMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAttachMenu])

  // Filter quick replies as user types /
  useEffect(() => {
    const slashMatch = text.match(/^\/(\S*)$/)
    if (slashMatch) {
      const query = slashMatch[1].toLowerCase()
      const filtered = allResponses.filter(
        (r) =>
          r.shortcut.toLowerCase().startsWith(query) ||
          r.title.toLowerCase().includes(query)
      )
      setPickerResponses(filtered)
      setPickerActive(filtered.length > 0)
      setActiveIndex(0)
    } else {
      setPickerActive(false)
      setPickerResponses([])
    }
  }, [text, allResponses])

  const handleSelectResponse = (r: CannedResponse) => {
    setText(r.body)
    setPickerActive(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending || disabled) return
    // Snapshot before clearing so we can restore on failure.
    const previousText = text
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      await onSend({ body: trimmed, replyToWamid: replyTo?.wamid ?? undefined })
      onCancelReply?.()
    } catch {
      // Send failed (e.g. backend rejected with 403 because user has no
      // department). Restore the typed text so the operator can retry or
      // copy it elsewhere — the toast is shown by the page-level handler.
      setText(previousText)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerActive) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, pickerResponses.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (pickerResponses[activeIndex]) handleSelectResponse(pickerResponses[activeIndex])
        return
      }
      if (e.key === 'Escape') {
        setPickerActive(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const toggleTemplatePicker = () => {
    if (!templatePickerOpen && templates.length === 0 && !loadingTemplates) {
      setLoadingTemplates(true)
      templatesApi.list('APPROVED')
        .then((r) => setTemplates(r.data))
        .catch(() => {})
        .finally(() => setLoadingTemplates(false))
    }
    setTemplatePickerOpen((v) => !v)
  }

  const handleSelectTemplate = async (tpl: WhatsAppTemplate) => {
    setTemplatePickerOpen(false)
    try {
      await onSend({ body: tpl.body, replyToWamid: replyTo?.wamid ?? undefined })
      onCancelReply?.()
      setTemplateSent(true)
    } catch {
      // Page-level toast already surfaced the error.
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Filter out anything over 16MB before sending — the backend will reject
    // it anyway, and surfacing the oversize names up-front beats a partial
    // batch that succeeds for some files and fails silently for others.
    const maxSize = 16 * 1024 * 1024
    const oversize = files.filter((f) => f.size > maxSize)
    const valid = files.filter((f) => f.size <= maxSize)
    if (oversize.length > 0) {
      alert(
        `Arquivo${oversize.length > 1 ? 's' : ''} muito grande${oversize.length > 1 ? 's' : ''} (máx 16MB):\n` +
        oversize.map((f) => `• ${f.name}`).join('\n'),
      )
    }
    if (valid.length === 0) {
      e.target.value = ''
      return
    }

    // Caption: only attach the typed text to the FIRST file in the batch.
    // For the rest we leave body undefined so the bubbles don't all share
    // the same caption — the operator usually writes the caption to
    // describe the first/leading attachment, not every single one.
    const previousText = text
    setText('')
    e.target.value = ''

    // Sequential dispatch: each file gets its own POST so each message has
    // its own bubble + status icon, and we avoid bursting the Meta API.
    // If one fails, we keep going (don't abort the batch) but collect the
    // failures so the user can see which ones didn't go through.
    const failed: string[] = []
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]
      try {
        await onSend({
          file,
          mediaCaption: file.name,
          body: i === 0 ? previousText.trim() || undefined : undefined,
          // Only the first attachment quotes the message being replied to.
          replyToWamid: i === 0 ? replyTo?.wamid ?? undefined : undefined,
        })
      } catch {
        failed.push(file.name)
      }
    }

    // Clear the reply context if at least one file went through.
    if (failed.length < valid.length) onCancelReply?.()

    if (failed.length > 0) {
      // Page-level toast already fires per-failure; this restores the
      // caption text only if every file failed, so a partial-batch
      // success doesn't dump the user back into the textarea.
      if (failed.length === valid.length) setText(previousText)
    }

    setShowAttachMenu(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  // Phase 29 — pre-detected blocker (no department, no WA line, etc.).
  // Shown before the operator types so the silent failure path is gone.
  if (blockedReason) {
    return (
      <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-surface-800 bg-black flex-shrink-0">
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-200 font-semibold">Não é possível enviar mensagens agora</p>
            <p className="text-[11px] text-amber-300/90 mt-0.5">{blockedReason.message}</p>
          </div>
          {blockedReason.ctaHref && blockedReason.ctaLabel && (
            <a
              href={blockedReason.ctaHref}
              className="flex-shrink-0 text-xs font-semibold text-amber-200 hover:text-white bg-amber-700/30 hover:bg-amber-700/50 border border-amber-600/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              {blockedReason.ctaLabel}
            </a>
          )}
        </div>
      </div>
    )
  }

  if (!windowOpen) {
    return (
      <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-surface-800 bg-black flex-shrink-0">
        <div className="card-24h bg-brand-800/20 border border-brand-600/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-brand-300 font-semibold">Janela de 24h encerrada</p>
              <p className="text-[11px] text-brand-400/90 mt-0.5">
                {templateSent ? 'Template enviado — aguardando resposta do contato.' : 'Selecione um template aprovado para reabrir a conversa'}
              </p>
            </div>
            {!templateSent && (
              <button
                onClick={toggleTemplatePicker}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                Escolher template
                <ChevronDown className={cn('w-3 h-3', templatePickerOpen && 'rotate-180')} />
              </button>
            )}
          </div>

          {/* Template picker */}
          {templatePickerOpen && !templateSent && (
            <div className="mt-3 border-t border-brand-600/20 pt-3">
              {loadingTemplates ? (
                <p className="text-[11px] text-surface-500 text-center py-2">Carregando templates…</p>
              ) : templates.length === 0 ? (
                <p className="text-[11px] text-surface-500 text-center py-2">
                  Nenhum template aprovado. Crie em Disparos → Templates.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="w-full text-left p-2.5 rounded-lg border border-surface-700/50 bg-surface-800/40 hover:bg-surface-800 hover:border-surface-600 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-surface-200 truncate">{tpl.name}</span>
                        <span className="text-[9px] font-medium text-surface-500 bg-surface-700/50 px-1.5 py-0.5 rounded flex-shrink-0">
                          {tpl.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-400 line-clamp-2 leading-relaxed">{tpl.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const slashQuery = text.match(/^\/(\S*)$/)?.[1] ?? ''

  return (
    <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-surface-800 bg-black flex-shrink-0">
      <div className="relative">
        {pickerActive && (
          <QuickReplyPicker
            query={slashQuery}
            responses={pickerResponses}
            activeIndex={activeIndex}
            onSelect={handleSelectResponse}
          />
        )}

        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-800/70 border-l-2 border-brand-500 px-3 py-2">
            <CornerUpLeft className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-brand-300">
                Respondendo {replyTo.direction === 'outbound' ? '· sua mensagem' : '· cliente'}
              </p>
              <p className="text-xs text-surface-400 truncate">{replyPreview(replyTo)}</p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              title="Cancelar resposta"
              aria-label="Cancelar resposta"
              className="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-2 bg-surface-800 rounded-2xl px-3 py-2.5 transition-all',
            'border border-surface-700 focus-within:border-brand-500/50 focus-within:shadow-sm focus-within:shadow-brand-500/10'
          )}
        >
          {/* Hidden file inputs — `multiple` lets the operator pick a whole
              batch in one go; handleFileSelect dispatches them sequentially
              so each gets its own message bubble and the Meta API isn't hit
              by a burst that would trip rate limits. */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachments menu */}
          <div className="relative">
            <button
              ref={attachButtonRef}
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors flex-shrink-0"
              title="Anexar arquivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {showAttachMenu && (
              <div
                ref={attachMenuRef}
                className="absolute bottom-full left-0 mb-2 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <button
                  onClick={() => {
                    imageInputRef.current?.click()
                    setShowAttachMenu(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-700 transition-colors w-full text-left"
                >
                  <Image className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-surface-200">Imagem</span>
                </button>
                <button
                  onClick={() => {
                    documentInputRef.current?.click()
                    setShowAttachMenu(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-700 transition-colors w-full text-left"
                >
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-surface-200">Documento</span>
                </button>
                <button
                  onClick={() => {
                    videoInputRef.current?.click()
                    setShowAttachMenu(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-700 transition-colors w-full text-left"
                >
                  <Video className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-surface-200">Vídeo</span>
                </button>
              </div>
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onContextMenu={onInputContextMenu}
            placeholder="Digite uma mensagem ou / para respostas rápidas..."
            rows={1}
            disabled={disabled || sending}
            className={cn(
              'flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500',
              'resize-none outline-none leading-relaxed',
              'min-h-[24px] max-h-[120px]'
            )}
          />

          {/* Emoji */}
          <EmojiPickerButton
            textareaRef={textareaRef}
            onEmojiInsert={(newValue) => setText(newValue)}
            className="w-8 h-8"
          />

          {/* Send */}
          {text.trim() && (
            <button
              onClick={handleSend}
              disabled={sending || disabled}
              className="w-8 h-8 rounded-xl bg-brand-600 text-surface-950 hover:bg-brand-500 shadow-sm flex items-center justify-center flex-shrink-0 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-surface-600 mt-1.5 text-center">
        Enter para enviar · Shift+Enter para nova linha · <span className="text-surface-500">/ para respostas rápidas</span>
      </p>
    </div>
  )
}
