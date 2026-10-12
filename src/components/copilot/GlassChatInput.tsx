import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react'
import {
  Send,
  Square,
  Slash,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Paperclip,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import {
  ACCEPTED_ATTACHMENT_TYPES,
  filesToAttachments,
} from '@/lib/attachmentUtils'
import type { CopilotAttachment } from '@/contexts/CopilotContext'

// ─── CRM Quick Commands ────────────────────────────────────────────────────────

interface CrmCommand {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
  prompt: string
}

const CRM_COMMANDS: CrmCommand[] = [
  {
    icon: <Users className="w-4 h-4" />,
    label: 'Leads',
    description: 'Filtrar e analisar leads',
    prefix: '/leads',
    prompt: 'Mostre os leads mais quentes do meu CRM agora',
  },
  {
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'Atendimento',
    description: 'Status da fila',
    prefix: '/atendimento',
    prompt: 'Como está a fila de atendimento agora?',
  },
  {
    icon: <Send className="w-4 h-4" />,
    label: 'Campanha',
    description: 'Gerenciar campanhas',
    prefix: '/campanha',
    prompt: 'Qual é o desempenho das minhas campanhas este mês?',
  },
  {
    icon: <BarChart3 className="w-4 h-4" />,
    label: 'Métricas',
    description: 'KPIs e análise do negócio',
    prefix: '/metricas',
    prompt: 'Me dê uma visão geral das métricas do meu negócio hoje',
  },
]

// ─── Glass chat input ─────────────────────────────────────────────────────────

export interface GlassChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onAbort: () => void
  isBusy: boolean
  placeholder?: string
  autoFocus?: boolean
  attachments?: CopilotAttachment[]
  onAttachmentsChange?: (atts: CopilotAttachment[]) => void
  attachError?: string | null
  /** Recebe o motivo quando um anexo é recusado (ex.: acima de 20 MB) — antes
   *  o erro era descartado e o arquivo simplesmente não aparecia. */
  onAttachError?: (erro: string | null) => void
}

export function GlassChatInput({
  value,
  onChange,
  onSend,
  onAbort,
  isBusy,
  placeholder = 'Pergunte sobre seus dados ou peça uma ação...',
  autoFocus,
  attachments = [],
  onAttachmentsChange,
  attachError,
  onAttachError,
}: GlassChatInputProps) {
  const [focused, setFocused] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [activeCmd, setActiveCmd] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const { attachments: newAtts, error } = await filesToAttachments(files)
    if (error) { onAttachError?.(`${error}. Envie imagens ou PDF de até 20 MB.`); return }
    if (!onAttachmentsChange) return
    onAttachError?.(null)
    onAttachmentsChange([...attachments, ...newAtts])
  }

  const removeAttachment = (id: string) => {
    if (!onAttachmentsChange) return
    const att = attachments.find((a) => a.id === id)
    if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl)
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
  }

  // Show command palette when typing /
  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowCommands(true)
      const idx = CRM_COMMANDS.findIndex((c) => c.prefix.startsWith(value))
      setActiveCmd(idx >= 0 ? idx : -1)
    } else {
      setShowCommands(false)
    }
  }, [value])

  // Close command palette on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        commandsRef.current &&
        !commandsRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-cmd-toggle]')
      ) {
        setShowCommands(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  // Reset height when value is cleared externally (e.g. after sending)
  useEffect(() => {
    adjustHeight()
  }, [value])

  const selectCommand = (idx: number) => {
    onChange(CRM_COMMANDS[idx].prompt)
    setShowCommands(false)
    setActiveCmd(-1)
    setTimeout(() => {
      textareaRef.current?.focus()
      adjustHeight()
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveCmd((p) => (p < CRM_COMMANDS.length - 1 ? p + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveCmd((p) => (p > 0 ? p - 1 : CRM_COMMANDS.length - 1))
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        if (activeCmd >= 0) selectCommand(activeCmd)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowCommands(false)
      }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isBusy) onSend()
    }
  }

  return (
    <div className="relative">
      {/* Command palette */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            ref={commandsRef}
            className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-[10px] overflow-hidden overlay-frame border bg-surface-800 shadow-lg"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            {CRM_COMMANDS.map((cmd, i) => (
              <motion.div
                key={cmd.prefix}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                  activeCmd === i
                    ? 'bg-[var(--rowhover)] text-surface-50' : 'text-surface-200 hover:bg-[var(--rowhover)]')}
                onClick={() => selectCommand(i)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <span className="text-surface-400">{cmd.icon}</span>
                <span className="text-sm font-medium">{cmd.label}</span>
                <span className="text-xs text-surface-400 font-mono">{cmd.prefix}</span>
                <span className="ml-auto text-xs text-surface-400">{cmd.description}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input — only rendered when attachment handler is provided */}
      {onAttachmentsChange && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Glass card */}
      <div
        className={cn(
          'relative rounded-[10px] border transition-all duration-200',
          // Proposta: o campo é um OBJETO (branco no claro, cartão no escuro)
          // com borda e sombra leve — o vidro a 50% sumia no palco (borda 1,16:1).
          'bg-surface-800 shadow-[0_1px_2px_rgba(15,23,42,.06),0_4px_16px_-8px_rgba(15,23,42,.12)]',
          focused
            ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-surface-700')}
      >
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
              <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] border border-surface-600/50 bg-surface-800/60 max-w-[200px] group"
                  >
                    {att.kind === 'image' ? (
                      <img src={att.previewUrl} alt={att.name} className="w-7 h-7 rounded-[6px] object-cover flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-accent-rose flex-shrink-0" />
                    )}
                    <span className="text-xs text-surface-300 truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="flex-shrink-0 w-4 h-4 rounded-full bg-surface-600 hover:bg-surface-500 flex items-center justify-center transition-colors ml-0.5"
                    >
                      <X className="w-2.5 h-2.5 text-surface-300" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach error */}
        {attachError && (
          <p role="alert" className="px-4 pt-2 text-xs text-danger">{attachError}</p>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { onChange(e.target.value); adjustHeight() }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isBusy}
            placeholder={isBusy ? 'Aguardando a resposta do Copilot…' : placeholder}
            autoFocus={autoFocus}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-surface-100 placeholder:text-surface-500 outline-none leading-relaxed disabled:cursor-wait"
            style={{ minHeight: 52, maxHeight: 160 }}
          />

        </div>

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-surface-700/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-cmd-toggle
              onClick={() => {
                if (!showCommands) { onChange('/'); setShowCommands(true) }
                else setShowCommands(false)
              }}
              className={cn(
                'p-1.5 rounded-[6px] transition-colors text-surface-500 hover:text-surface-200 hover:bg-surface-800/60',
                showCommands && 'bg-surface-800 text-surface-200'
              )}
              title="Comandos rápidos (digite /)"
              aria-label="Comandos rápidos"
            >
              <Slash className="w-3.5 h-3.5" />
            </button>

            {onAttachmentsChange && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className={cn(
                  'p-1.5 rounded-[6px] transition-colors disabled:opacity-40',
                  attachments.length > 0
                    ? 'text-brand-400 bg-brand-600/10 hover:bg-brand-600/20'
                    : 'text-surface-500 hover:text-surface-200 hover:bg-surface-800/60',
                )}
                title="Anexar imagem ou PDF"
                aria-label="Anexar imagem ou PDF"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isBusy ? (
            <motion.button
              type="button"
              onClick={onAbort}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-[6px] text-sm font-medium bg-[var(--sf2)] hover:bg-surface-600 text-surface-200 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Parar</span>
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={() => (value.trim() || attachments.length > 0) && onSend()}
              disabled={!value.trim() && attachments.length === 0}
              whileHover={(value.trim() || attachments.length > 0) ? { scale: 1.02 } : {}}
              whileTap={(value.trim() || attachments.length > 0) ? { scale: 0.97 } : {}}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-[6px] text-sm font-medium transition-all',
                (value.trim() || attachments.length > 0)
                  ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                  : 'bg-[var(--sf2)] border border-surface-700 text-surface-400 cursor-not-allowed')}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
