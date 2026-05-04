import { useCallback, useState, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  Send, Paperclip, AlertTriangle, Zap, Image, FileText, Video, ChevronDown,
  Scissors, Copy, Clipboard, CopyCheck,
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import type { CannedResponse, SendMessageDto, WhatsAppTemplate } from '@/types'
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton'
import { templatesApi } from '@/services/api'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

interface MessageInputProps {
  onSend: (dto: SendMessageDto) => void
  sending: boolean
  windowOpen: boolean
  disabled?: boolean
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

export function MessageInput({ onSend, sending, windowOpen, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [templateSent, setTemplateSent] = useState(false)
  const [allResponses, setAllResponses] = useState<CannedResponse[]>([])
  const [pickerResponses, setPickerResponses] = useState<CannedResponse[]>([])
  const [pickerActive, setPickerActive] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  // Close attach menu when clicking outside
  useEffect(() => {
    if (!showAttachMenu) return
    const handler = (e: MouseEvent) => {
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

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || sending || disabled) return
    onSend({ body: trimmed })
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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

  const handleSelectTemplate = (tpl: WhatsAppTemplate) => {
    onSend({ body: tpl.body })
    setTemplateSent(true)
    setTemplatePickerOpen(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 16MB)
    const maxSize = 16 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Tamanho máximo: 16MB')
      e.target.value = ''
      return
    }

    onSend({
      file,
      mediaCaption: file.name,
      body: text.trim() || undefined,
    })

    setText('')
    e.target.value = ''
    setShowAttachMenu(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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

        <div
          className={cn(
            'flex items-center gap-2 bg-surface-800 rounded-2xl px-3 py-2.5 transition-all',
            'border border-surface-700 focus-within:border-brand-500/50 focus-within:shadow-sm focus-within:shadow-brand-500/10'
          )}
        >
          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachments menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu) }}
              className="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors flex-shrink-0"
              title="Anexar arquivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {showAttachMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50"
                onClick={(e) => e.stopPropagation()}
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
