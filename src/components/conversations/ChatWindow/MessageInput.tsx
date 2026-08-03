import { useCallback, useState, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  Send, Paperclip, AlertTriangle, Zap, Image, FileText, Video, ChevronDown,
  Scissors, Copy, Clipboard, CopyCheck, CornerUpLeft, X, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CannedResponse, Message, SendMessageDto, WhatsAppTemplate } from '@/types'
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton'
import { cannedResponsesApi, contactsApi, templatesApi } from '@/services/api'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16MB — mesmo limite do backend

/** Um anexo "em espera" no input: fica no preview até o operador clicar em
 *  Enviar (UX estilo Claude/ChatGPT). `id` serve de key de render/remoção;
 *  `previewUrl` é uma objectURL só para imagens, revogada ao remover/desmontar. */
type StagedAttachment = { id: string; file: File; previewUrl?: string }

/** Tamanho legível para o preview do anexo (B / KB / MB). */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Ícone por tipo de arquivo (fallback documento) para o card de preview. */
function fileIcon(file: File) {
  if (file.type.startsWith('video/')) return Video
  if (file.type.startsWith('image/')) return Image
  return FileText
}

interface MessageInputProps {
  /**
   * Returns a promise that rejects on send failure (e.g. backend rejected
   * with 403 because the user has no department configured). The input
   * preserves the typed text on rejection so the operator can retry or
   * copy it elsewhere.
   */
  onSend: (dto: SendMessageDto) => Promise<unknown> | void
  /** Used only by the "Escolher template" flow (24h window closed) to call
   *  contactsApi.sendTemplate — a real WhatsApp template, not a text message. */
  contactId: string
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

export function MessageInput({ onSend, contactId, sending, windowOpen, disabled, blockedReason, replyTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('')
  const [templateSent, setTemplateSent] = useState(false)
  const [allResponses, setAllResponses] = useState<CannedResponse[]>([])
  const [pickerResponses, setPickerResponses] = useState<CannedResponse[]>([])
  const [pickerActive, setPickerActive] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [attachments, setAttachments] = useState<StagedAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  // id do anexo cujo POST está em voo (envio sequencial) — dirige o spinner.
  const [uploadingId, setUploadingId] = useState<string | null>(null)
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
    cannedResponsesApi.fetchAll().then(setAllResponses).catch(() => {})
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
    // Envia com texto E/OU anexos. Só bloqueia quando não há nada dos dois.
    if ((!trimmed && attachments.length === 0) || sending || disabled) return

    // Snapshot para restaurar em caso de falha total.
    const previousText = text
    const staged = attachments

    // Limpa o texto de forma otimista (vira legenda do 1º anexo, se houver).
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Caminho texto puro (sem anexos) — comportamento original.
    if (staged.length === 0) {
      try {
        await onSend({ body: trimmed, replyToWamid: replyTo?.wamid ?? undefined })
        onCancelReply?.()
      } catch {
        // Falha (ex.: 403 sem setor) — restaura o texto para retry/cópia; o
        // toast é exibido pelo handler no nível da página.
        setText(previousText)
      }
      return
    }

    // Com anexos: 1 POST por arquivo, em sequência (cada um vira seu balão/
    // status e evita burst na Meta API). O texto vira legenda só do 1º arquivo
    // (decisão SCRUM-269); idem o reply. Cada card fica visível com um spinner
    // enquanto seu upload está em voo (uploadingId) e some ao concluir; os que
    // falham permanecem no preview para nova tentativa.
    const failed: StagedAttachment[] = []
    for (let i = 0; i < staged.length; i++) {
      const item = staged[i]
      setUploadingId(item.id)
      try {
        await onSend({
          file: item.file,
          mediaCaption: item.file.name,
          body: i === 0 ? trimmed || undefined : undefined,
          replyToWamid: i === 0 ? replyTo?.wamid ?? undefined : undefined,
        })
        setAttachments((prev) => prev.filter((a) => a.id !== item.id))
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      } catch {
        failed.push(item)
      }
    }
    setUploadingId(null)

    if (failed.length < staged.length) onCancelReply?.()
    // Se TUDO falhou, devolve o texto (era a legenda do 1º). Os anexos que
    // falharam seguem no preview (nunca removidos do estado).
    if (failed.length === staged.length) setText(previousText)
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
      // R10: must go through the real WhatsApp template flow — sending
      // `tpl.body` as a plain text message (the old behavior) fails outside
      // the 24h window, which is exactly when this picker is shown.
      await contactsApi.sendTemplate(contactId, tpl.name, tpl.language)
      onCancelReply?.()
      setTemplateSent(true)
    } catch {
      // Page-level toast already surfaced the error.
    }
  }

  // Mantém uma referência viva dos anexos para revogar as objectURLs no
  // unmount sem re-registrar o efeito a cada mudança da lista.
  const attachmentsRef = useRef(attachments)
  useEffect(() => { attachmentsRef.current = attachments }, [attachments])
  useEffect(() => () => {
    attachmentsRef.current.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
  }, [])

  // Filtra arquivos acima de 16MB (o backend rejeitaria de qualquer forma) e
  // empilha os válidos no preview. Reaproveitado por seleção, drag-and-drop e
  // colar (SCRUM-275), então concentra aqui a regra de validação/oversize.
  const stageFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const oversize = files.filter((f) => f.size > MAX_FILE_SIZE)
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (oversize.length > 0) {
      alert(
        `Arquivo${oversize.length > 1 ? 's' : ''} muito grande${oversize.length > 1 ? 's' : ''} (máx 16MB):\n` +
        oversize.map((f) => `• ${f.name}`).join('\n'),
      )
    }
    if (valid.length === 0) return
    setAttachments((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      })),
    ])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  // Drag-and-drop de arquivos sobre a caixa do input (SCRUM-275).
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    // Ignora a saída para elementos-filhos (evita flicker do highlight).
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragOver(false)
    stageFiles(Array.from(e.dataTransfer.files))
  }

  // Colar imagem do clipboard (ex.: print de tela) direto no input (SCRUM-275).
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(e.clipboardData.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    e.preventDefault() // não colar o binário como texto
    stageFiles(images)
  }

  // Selecionar arquivo(s) NÃO envia mais na hora — só empilha no preview
  // (staging). O envio de fato acontece no handleSend, ao clicar em Enviar.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    stageFiles(Array.from(e.target.files ?? []))
    e.target.value = '' // permite re-selecionar o mesmo arquivo
    setShowAttachMenu(false)
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative bg-surface-800 rounded-2xl px-3 py-2.5 transition-all',
            'border border-surface-700 focus-within:border-brand-500/50 focus-within:shadow-sm focus-within:shadow-brand-500/10',
            dragOver && 'border-brand-500 ring-1 ring-brand-500/40'
          )}
        >
          {/* Dropzone: feedback "solte aqui" durante o arraste (SCRUM-275) */}
          {dragOver && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-brand-950/50 border-2 border-dashed border-brand-500 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-brand-200">Solte para anexar</span>
            </div>
          )}

          {/* Preview dos anexos em espera (staging). Fica dentro da caixa, acima
              da textarea — o operador confere/remove antes de enviar. */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5 pb-2.5 border-b border-surface-700/60">
              {attachments.map((att) => {
                const Icon = fileIcon(att.file)
                const isUploading = att.id === uploadingId
                return (
                  <div
                    key={att.id}
                    className={cn(
                      'flex items-center gap-2 bg-surface-700/60 border border-surface-600 rounded-lg pl-2 pr-1.5 py-1.5 max-w-[220px]',
                      isUploading && 'opacity-80'
                    )}
                  >
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {att.previewUrl ? (
                        <img
                          src={att.previewUrl}
                          alt={att.file.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-surface-800 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-surface-300" />
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 rounded bg-black/55 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-surface-200 truncate">{att.file.name}</p>
                      <p className="text-[10px] text-surface-500">{formatFileSize(att.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      disabled={uploadingId !== null}
                      title="Remover anexo"
                      aria-label={`Remover ${att.file.name}`}
                      className="w-5 h-5 flex items-center justify-center rounded text-surface-400 hover:text-surface-100 hover:bg-surface-600 transition-colors flex-shrink-0 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Linha de composição (anexar · textarea · emoji · enviar) */}
          <div className="flex items-center gap-2">
          {/* Hidden file inputs — `multiple` lets the operator pick a whole
              batch in one go; handleFileSelect stages them (preview) and
              handleSend dispatches one POST per file, so each gets its own
              message bubble and the Meta API isn't hit by a burst. */}
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
            onPaste={handlePaste}
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

          {/* Send — aparece com texto E/OU anexos em espera */}
          {(text.trim() || attachments.length > 0) && (
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
      </div>
      <p className="text-[10px] text-surface-600 mt-1.5 text-center">
        Enter para enviar · Shift+Enter para nova linha · <span className="text-surface-500">/ para respostas rápidas</span>
      </p>
    </div>
  )
}
