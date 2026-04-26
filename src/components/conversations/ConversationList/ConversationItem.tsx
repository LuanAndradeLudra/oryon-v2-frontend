import { memo, useCallback } from 'react'
import { Camera, Mic, FileText, Video, MapPin, Sticker, ExternalLink, Phone, Copy } from 'lucide-react'
import { cn, formatMessageTime, truncate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Conversation } from '@/types'

const MEDIA_PREVIEW: Record<string, { icon: typeof Camera; label: string }> = {
  '[image]':    { icon: Camera,   label: 'Imagem' },
  '[imagen]':   { icon: Camera,   label: 'Imagem' },
  '[imagem]':   { icon: Camera,   label: 'Imagem' },
  '[photo]':    { icon: Camera,   label: 'Foto' },
  '[audio]':    { icon: Mic,      label: 'Áudio' },
  '[document]': { icon: FileText, label: 'Documento' },
  '[video]':    { icon: Video,    label: 'Vídeo' },
  '[location]': { icon: MapPin,   label: 'Localização' },
  '[sticker]':  { icon: Sticker,  label: 'Figurinha' },
}

function MessagePreview({ text }: { text: string }) {
  const key = text.trim().toLowerCase()
  const media = MEDIA_PREVIEW[key]
  if (media) {
    const Icon = media.icon
    return (
      <span className="inline-flex items-center gap-1">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span>{media.label}</span>
      </span>
    )
  }
  return <>{truncate(text || '…', 52)}</>
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: (conv: Conversation) => void
}

const statusVariantMap = {
  pending: 'pending',
  open: 'open',
  resolved: 'resolved',
  abandoned: 'abandoned',
} as const

const statusLabel = {
  pending: 'Pendente',
  open: 'Aberta',
  resolved: 'Resolvida',
  abandoned: 'Abandonada',
}

export const ConversationItem = memo(function ConversationItem({ conversation, isActive, onSelect }: ConversationItemProps) {
  const { contact, lastMessagePreview, lastMessageAt, unreadCount, status, assignedUser, tags } =
    conversation

  const hasUnread = unreadCount > 0 && !isActive

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: 'Abrir conversa', icon: ExternalLink, onClick: () => onSelect(conversation) },
    ]
    if (contact.waId) {
      items.push({
        label: 'Copiar telefone',
        icon: Phone,
        onClick: () => navigator.clipboard.writeText(contact.waId ?? '').catch(() => {}),
      })
    }
    items.push({
      label: 'Copiar nome',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(contact.displayName).catch(() => {}),
    })
    return items
  }, [conversation, contact, onSelect])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <button
      onClick={() => onSelect(conversation)}
      onContextMenu={onContextMenu}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-3 text-left transition-all duration-100 border-b border-surface-800/60',
        isActive
          ? 'bg-brand-600/10 border-l-2 border-l-brand-500'
          : 'hover:bg-surface-800/50 border-l-2 border-l-transparent',
        hasUnread && !isActive && 'bg-brand-600/5'
      )}
    >
      {/* Avatar with WhatsApp badge */}
      <div className="relative mt-0.5 flex-shrink-0">
        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
        <WhatsAppIcon
          size={14}
          className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface-900"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'text-sm truncate',
            hasUnread ? 'font-semibold text-surface-50' : 'font-medium text-surface-200'
          )}>
            {contact.displayName}
          </span>
          <span className="text-[11px] text-surface-500 flex-shrink-0">
            {formatMessageTime(lastMessageAt)}
          </span>
        </div>

        {/* Row 2: WhatsApp number */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] text-surface-500 truncate">{contact.waId}</span>
        </div>

        {/* Row 3: message preview + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-xs truncate',
            hasUnread ? 'text-surface-300' : 'text-surface-500'
          )}>
            <MessagePreview text={lastMessagePreview || '…'} />
          </p>
          {hasUnread && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-brand-500 text-surface-950 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* Row 4: status badge + tags + agent */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge variant={statusVariantMap[status]}>{statusLabel[status]}</Badge>

          {tags?.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: tag.color + '28', color: tag.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
          ))}

          {tags && tags.length > 2 && (
            <span className="text-[10px] text-surface-500">+{tags.length - 2}</span>
          )}

          {assignedUser && (
            <span className="text-[10px] text-surface-500 ml-auto truncate max-w-[60px]">
              {assignedUser.firstName}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})
