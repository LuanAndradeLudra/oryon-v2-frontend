import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerUpLeft, SmilePlus, MoreHorizontal, Copy, Trash2, AlertTriangle, Sparkles } from 'lucide-react'
import { cn, avatarColor } from '@/lib/utils'
import { useInternalChat } from '@/contexts/InternalChatContext'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { InternalMessage } from '@/types'
import { Emoji } from '@/lib/emojiText'
import { WhatsAppText } from '@/lib/whatsappFormatter'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '✅', '👀']

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface MessageBubbleProps {
  message: InternalMessage
  isOwn: boolean
  showHeader: boolean
  onReply: (msg: InternalMessage) => void
  searchQuery?: string
}

export function MessageBubble({ message, isOwn, showHeader, onReply, searchQuery }: MessageBubbleProps) {
  const { toggleReaction, deleteMessage } = useInternalChat()
  const [hovered, setHovered] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const senderType = message.senderType ?? 'user'
  const isCopilot = senderType === 'copilot'
  const isSystem = senderType === 'system'
  // Copilot messages are visually treated as a separate agent — they always
  // render on the LEFT regardless of who triggered them. The original user
  // (senderName) is credited in the footer as "solicitado por …".
  const displayAsOwn = isOwn && !isCopilot

  // System messages render as a centered note, not as a chat bubble — same
  // convention as WhatsApp's "You created this group" / "X joined" stubs.
  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1">
        <div className="px-3 py-1 rounded-full bg-surface-800/60 text-[11px] text-surface-400">
          {message.body}
        </div>
      </div>
    )
  }

  if (message.deletedAt) {
    return (
      <div className={cn('flex px-4 py-0.5', displayAsOwn ? 'justify-end' : 'justify-start')}>
        <p className="text-xs italic text-surface-600">Mensagem apagada.</p>
      </div>
    )
  }

  const senderInitial = isCopilot ? 'C' : message.senderName.charAt(0).toUpperCase()
  const avatarClass = isCopilot
    ? 'bg-gradient-to-br from-blue-500 to-blue-700'
    : avatarColor(message.senderName)

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = []
    if (message.body) {
      items.push({
        label: 'Copiar mensagem',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(message.body ?? '').catch(() => {}),
      })
    }
    items.push({ label: 'Responder', icon: CornerUpLeft, onClick: () => onReply(message) })
    if (isOwn) {
      items.push({ separator: true })
      items.push({
        label: 'Excluir',
        icon: Trash2,
        danger: true,
        onClick: () => {
          setShowMenu(true)
          setConfirmDelete(true)
        },
      })
    }
    return items
  }, [message, isOwn, onReply])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <div
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false) }}
      className={cn(
        'group flex items-end gap-2 px-4',
        displayAsOwn ? 'flex-row-reverse' : 'flex-row',
        showHeader ? 'mt-4' : 'mt-1',
      )}
    >
      {/* Avatar slot — only on first message of a group and only when not displayed as own */}
      <div className="w-8 flex-shrink-0">
        {!displayAsOwn && showHeader ? (
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white',
            avatarClass,
          )}>
            {isCopilot ? <Sparkles className="w-4 h-4" /> : senderInitial}
          </div>
        ) : null}
      </div>

      {/* Bubble column */}
      <div className={cn('relative max-w-[72%] flex flex-col', displayAsOwn ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative px-3 py-2 rounded-2xl shadow-sm',
            displayAsOwn
              ? 'bg-bubble-out text-bubble-out-fg rounded-br-sm'
              : 'bg-bubble-in text-surface-100 rounded-bl-sm',
            // WhatsApp-style tail: first bubble of a group has the tail at the
            // TOP corner (sharp top-right for own / top-left for incoming),
            // follow-ups have the tail at the bottom — done by overriding the
            // bottom-corner rounding back to 2xl on the first of a group.
            showHeader && displayAsOwn && 'rounded-br-2xl rounded-tr-sm',
            showHeader && !displayAsOwn && 'rounded-bl-2xl rounded-tl-sm',
          )}
        >
          {/* Sender label — first of a group, non-own */}
          {!displayAsOwn && showHeader && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-semibold text-blue-300">
                {isCopilot ? 'Copilot' : message.senderName}
              </span>
              {isCopilot && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/25 text-[9px] font-bold uppercase tracking-wide text-blue-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  Agente
                </span>
              )}
            </div>
          )}

          {/* Reply preview */}
          {message.replyToId && message.replyToPreview && (
            <div className={cn(
              'flex flex-col gap-0.5 mb-1.5 px-2 py-1 rounded-md border-l-2',
              displayAsOwn
                ? 'bg-black/10 border-bubble-out-time'
                : 'bg-black/20 border-blue-400/60',
            )}>
              <span className="text-[10px] font-semibold text-blue-300">{message.replyToSenderName}</span>
              <p className="text-[11px] text-surface-400 truncate">{message.replyToPreview}</p>
            </div>
          )}

          {/* Message body — WhatsApp-style formatting (bold/italic/strike/code) */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            <WhatsAppText text={message.body} />
          </p>

          {/* Footer: [solicitado por X] ... [edited] [time] */}
          <div className="flex items-center gap-1.5 mt-1 justify-end">
            {isCopilot && message.senderName && (
              <span
                className="inline-flex items-center gap-0.5 mr-auto text-[10px] font-medium text-blue-300/80"
                title={`Mensagem gerada pelo Copilot a pedido de ${message.senderName}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                solicitado por {message.senderName}
              </span>
            )}
            {message.editedAt && (
              <span className={cn(
                'text-[10px] italic',
                displayAsOwn ? 'text-bubble-out-time' : 'text-surface-500',
              )}>
                editado
              </span>
            )}
            <span className={cn(
              'text-[10px]',
              displayAsOwn ? 'text-bubble-out-time' : 'text-surface-400',
            )}>
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>

        {/* Reactions — outside bubble */}
        {message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', displayAsOwn ? 'justify-end' : 'justify-start')}>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(message.id, r.emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-surface-600 bg-surface-800 hover:bg-surface-700 text-xs transition-colors"
              >
                <Emoji native={r.emoji} size="1em" />
                <span className="text-surface-300 font-medium text-[11px]">{r.userIds.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Floating action bar */}
        {hovered && (
          <div className={cn(
            'absolute -top-4 flex items-center gap-0.5 bg-surface-900 border border-surface-700 rounded-xl shadow-md px-1 py-0.5 z-10',
            displayAsOwn ? 'right-0' : 'left-0',
          )}>
            <div className="relative">
              <button
                onClick={() => setShowEmoji((v) => !v)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-50 hover:bg-surface-700 transition-all"
                title="Reagir"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              {showEmoji && (
                <div className="absolute right-0 bottom-full mb-1 flex gap-0.5 p-2 rounded-xl border border-surface-700 bg-surface-900 shadow-xl z-20">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { toggleReaction(message.id, emoji); setShowEmoji(false) }}
                      className="w-8 h-8 rounded-lg hover:bg-surface-700 flex items-center justify-center text-lg transition-all hover:scale-110"
                    >
                      <Emoji native={emoji} size="1.25em" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-50 hover:bg-surface-700 transition-all"
              title="Responder"
            >
              <CornerUpLeft className="w-4 h-4" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-50 hover:bg-surface-700 transition-all"
                title="Mais ações"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-surface-700 bg-surface-900 shadow-xl z-20 overflow-hidden py-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.body)
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700 transition-colors text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-surface-400" />
                    Copiar texto
                  </button>
                  <button
                    onClick={() => { onReply(message); setShowMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700 transition-colors text-left"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5 text-surface-400" />
                    Responder
                  </button>
                  {isOwn && (
                    <>
                      <div className="h-px bg-surface-700 my-1" />
                      {confirmDelete ? (
                        <div className="px-3 py-2 space-y-1.5">
                          <p className="text-[11px] text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Apagar mensagem?
                          </p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { deleteMessage(message.id); setShowMenu(false); setConfirmDelete(false) }}
                              className="flex-1 px-2 py-1 text-xs font-medium bg-danger text-white rounded-md hover:bg-red-600 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="flex-1 px-2 py-1 text-xs text-surface-400 rounded-md hover:bg-surface-700 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-surface-700 transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Apagar mensagem
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
