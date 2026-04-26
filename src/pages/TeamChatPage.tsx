import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Hash, MessageSquareDot, Users, Info,
  ChevronRight, Building2, Plus, Phone, Video, Pin,
  ExternalLink, Copy, Trash2, UserMinus, LogOut, AlertTriangle,
} from 'lucide-react'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'

import { useInternalChat } from '@/contexts/InternalChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { PresenceDot } from '@/components/internal-chat/PresenceDot'
import { MessageThread } from '@/components/internal-chat/MessageThread'
import { MessageInput } from '@/components/internal-chat/MessageInput'
import { NewChatModal } from '@/components/internal-chat/NewChatModal'
import { CreateChannelDrawer } from '@/components/internal-chat/CreateChannelDrawer'
import { cn, avatarColor, chatRelTime } from '@/lib/utils'
import type { InternalChannel, InternalMessage } from '@/types'
import { Emoji } from '@/lib/emojiText'
import { WhatsAppText } from '@/lib/whatsappFormatter'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PRESENCE_LABEL: Record<string, string> = {
  online: 'Online', away: 'Ausente', busy: 'Ocupado', offline: 'Offline',
}
const PRESENCE_COLOR: Record<string, string> = {
  online: 'text-status-active', away: 'text-status-pending', busy: 'text-red-500', offline: 'text-surface-500',
}

// ─── Channel row (sidebar list item) ─────────────────────────────────────────

function ChannelRow({ channel, currentUserId, isActive, onClick }: {
  channel: InternalChannel
  currentUserId: string
  isActive: boolean
  onClick: () => void
}) {
  const { presence, deleteChannel } = useInternalChat()
  const isDM = channel.type === 'dm'
  const otherIdx = isDM ? channel.memberIds.findIndex((id) => id !== currentUserId) : -1
  const displayName = isDM ? (channel.memberNames?.[otherIdx] ?? 'Usuário') : (channel.name ?? 'Canal')
  const otherId = isDM ? (channel.memberIds[otherIdx] ?? '') : ''
  const status = isDM ? (presence[otherId] ?? 'offline') : undefined
  const canDelete = isDM
    ? channel.memberIds.includes(currentUserId)
    : channel.createdByUserId === currentUserId

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: isDM ? 'Abrir conversa' : 'Abrir canal', icon: ExternalLink, onClick },
      {
        label: 'Copiar nome',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(displayName).catch(() => {}),
      },
    ]
    if (canDelete) {
      items.push({ separator: true })
      items.push({
        label: isDM ? 'Excluir conversa' : 'Excluir canal',
        icon: Trash2,
        danger: true,
        onClick: () => {
          const confirmText = isDM
            ? `Excluir a conversa com ${displayName}? Todas as mensagens serão removidas.`
            : `Excluir o canal #${displayName}? Todas as mensagens e membros serão removidos.`
          if (window.confirm(confirmText)) deleteChannel(channel.id).catch(() => {})
        },
      })
    }
    return items
  }, [isDM, displayName, onClick, canDelete, channel.id, deleteChannel])
  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        isActive
          ? 'bg-surface-800 border-r-2 border-brand-500'
          : 'hover:bg-surface-800/60',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {isDM ? (
          <>
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white', avatarColor(displayName))}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            {status && <PresenceDot status={status} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-surface-900" />}
          </>
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center">
            {channel.emoji ? <Emoji native={channel.emoji} size="1.25rem" /> : <Hash className="w-4 h-4 text-surface-400" />}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={cn(
            'text-sm truncate',
            channel.unreadCount > 0 ? 'font-semibold text-surface-50' : 'font-medium text-surface-200',
          )}>
            {displayName}
          </span>
          <span className="text-[11px] text-surface-500 flex-shrink-0">{chatRelTime(channel.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <ChannelPreview channel={channel} isDM={isDM} />
          {channel.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-brand-500 text-surface-950 text-[10px] font-bold flex items-center justify-center px-1">
              {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Sidebar preview line: "{prefix}: {body}" with markdown rendered. The prefix
// is omitted for DMs (other party is implicit) and for messages without
// stored sender info (legacy rows). Copilot-via-user prefixes as "Copilot".
function ChannelPreview({ channel, isDM }: { channel: InternalChannel; isDM: boolean }) {
  const body = channel.lastMessagePreview
  if (!body) {
    return <p className="text-xs text-surface-500 truncate">{isDM ? 'Iniciar conversa' : 'Nenhuma mensagem'}</p>
  }
  let prefix: string | null = null
  if (!isDM && channel.lastMessageSenderName) {
    if (channel.lastMessageSenderType === 'copilot') prefix = 'Copilot'
    else if (channel.lastMessageSenderType === 'system') prefix = null
    else prefix = channel.lastMessageSenderName.split(' ')[0] ?? channel.lastMessageSenderName
  }
  return (
    <p className="text-xs text-surface-500 truncate">
      {prefix && <span className="text-surface-400">{prefix}: </span>}
      <WhatsAppText text={body} />
    </p>
  )
}

// ─── Sector card ─────────────────────────────────────────────────────────────

function SectorCard({ channel, onClick }: {
  channel: InternalChannel
  onClick: () => void
}) {
  const { presence } = useInternalChat()
  const onlineCount = channel.memberIds.filter((id) => presence[id] === 'online').length

  return (
    <div className="mx-3 rounded-xl border border-surface-700 bg-surface-900 overflow-hidden hover:border-surface-600 transition-colors">
      <div className="h-1" style={{ background: channel.departmentColor ?? '#6366f1' }} />
      <div className="p-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
            {channel.emoji ? <Emoji native={channel.emoji} size="1.25rem" /> : <Building2 className="w-4 h-4 text-surface-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-100 truncate">{channel.name}</p>
            {channel.topic && <p className="text-[11px] text-surface-500 truncate">{channel.topic}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-surface-500 flex items-center gap-1">
              <Users className="w-3 h-3" /> {channel.memberIds.length}
            </span>
            <span className="text-[11px] text-status-active flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-active" />
              {onlineCount} online
            </span>
          </div>
          <button
            onClick={onClick}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            Abrir <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat sidebar ─────────────────────────────────────────────────────────────

type SidebarTab = 'todos' | 'setores' | 'pessoas'

function TeamSidebar({ currentUserId, onNewChat, isAdmin, onCreateChannel }: {
  currentUserId: string
  onNewChat: () => void
  isAdmin: boolean
  onCreateChannel: () => void
}) {
  const { channels, activeChannelId, setActiveChannel, markAsRead, presence } = useInternalChat()
  const [tab, setTab] = useState<SidebarTab>('todos')
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  function matchName(ch: InternalChannel) {
    const name = ch.type === 'dm'
      ? (ch.memberNames?.find((_, i) => ch.memberIds[i] !== currentUserId) ?? '')
      : (ch.name ?? '')
    return !q || name.toLowerCase().includes(q)
  }

  function open(ch: InternalChannel) {
    setActiveChannel(ch.id)
    if (ch.unreadCount > 0) markAsRead(ch.id)
  }

  const deptChannels = channels.filter((c) => c.type === 'department_room' && matchName(c))
  const groupChannels = channels.filter((c) => c.type === 'group' && matchName(c))
  const dmChannels    = channels.filter((c) => c.type === 'dm' && matchName(c))
  const allSorted     = [...channels].filter(matchName).sort((a, b) =>
    (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))

  const dmsByPresence = {
    active: dmChannels.filter((c) => {
      const idx = c.memberIds.findIndex((id) => id !== currentUserId)
      const uid = c.memberIds[idx]
      return ['online', 'away', 'busy'].includes(presence[uid] ?? '')
    }),
    offline: dmChannels.filter((c) => {
      const idx = c.memberIds.findIndex((id) => id !== currentUserId)
      const uid = c.memberIds[idx]
      return !presence[uid] || presence[uid] === 'offline'
    }),
  }

  const TABS: Array<{ id: SidebarTab; label: string }> = [
    { id: 'todos', label: 'Todos' },
    { id: 'setores', label: 'Setores' },
    { id: 'pessoas', label: 'Pessoas' },
  ]

  return (
    <div className="flex flex-col h-full w-full sm:w-[380px] bg-black border-r border-surface-800 flex-shrink-0">
      {/* Search */}
      <div className="px-3 pt-3 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 focus-within:border-blue-500/50 transition-colors">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-surface-500 hover:text-surface-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pb-2 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              tab === t.id
                ? 'bg-blue-500/10 text-blue-500'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-surface-800 flex-shrink-0" />

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {/* ── TODOS ── */}
        {tab === 'todos' && (
          <>
            {allSorted.length === 0 && (
              <p className="text-xs text-surface-500 text-center py-8">Nenhum canal encontrado.</p>
            )}
            {allSorted.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} currentUserId={currentUserId}
                isActive={activeChannelId === ch.id} onClick={() => open(ch)} />
            ))}
          </>
        )}

        {/* ── SETORES ── */}
        {tab === 'setores' && (
          <div className="py-3 space-y-4">
            {groupChannels.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 px-4 flex items-center gap-1.5">
                  <Pin className="w-3 h-3" /> Grupos gerais
                </p>
                <div className="space-y-2">
                  {groupChannels.map((ch) => (
                    <SectorCard key={ch.id} channel={ch} onClick={() => open(ch)} />
                  ))}
                </div>
              </div>
            )}
            {deptChannels.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 px-4 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Setores
                </p>
                <div className="space-y-2">
                  {deptChannels.map((ch) => (
                    <SectorCard key={ch.id} channel={ch} onClick={() => open(ch)} />
                  ))}
                </div>
              </div>
            )}
            {deptChannels.length === 0 && groupChannels.length === 0 && (
              <div className="py-10 text-center px-4">
                <Building2 className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                <p className="text-xs text-surface-500">Nenhum setor configurado.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PESSOAS ── */}
        {tab === 'pessoas' && (
          <div className="py-2">
            {dmsByPresence.active.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider px-4 py-2">
                  Disponíveis
                </p>
                {dmsByPresence.active.map((ch) => (
                  <ChannelRow key={ch.id} channel={ch} currentUserId={currentUserId}
                    isActive={activeChannelId === ch.id} onClick={() => open(ch)} />
                ))}
              </div>
            )}
            {dmsByPresence.offline.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider px-4 py-2 mt-1">
                  Offline
                </p>
                {dmsByPresence.offline.map((ch) => (
                  <ChannelRow key={ch.id} channel={ch} currentUserId={currentUserId}
                    isActive={activeChannelId === ch.id} onClick={() => open(ch)} />
                ))}
              </div>
            )}
            {dmChannels.length === 0 && (
              <div className="py-10 text-center px-4">
                <MessageSquareDot className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                <p className="text-xs text-surface-500">Nenhuma conversa direta.</p>
                <button onClick={onNewChat} className="mt-2 text-xs text-blue-500 hover:underline">
                  Iniciar conversa
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({ channel, currentUserId, onClose }: {
  channel: InternalChannel
  currentUserId: string
  onClose: () => void
}) {
  const { presence, removeMember, deleteChannel } = useInternalChat()
  const isDM = channel.type === 'dm'
  const otherIdx = isDM ? channel.memberIds.findIndex((id) => id !== currentUserId) : -1
  const otherName = isDM ? (channel.memberNames?.[otherIdx] ?? 'Usuário') : null
  const otherId   = isDM ? (channel.memberIds[otherIdx] ?? '') : ''
  const otherStatus = isDM ? (presence[otherId] ?? 'offline') : undefined
  const isCreator = channel.createdByUserId === currentUserId
  const canDeleteChannel = isDM
    ? channel.memberIds.includes(currentUserId)
    : isCreator

  function handleRemoveMember(uid: string, name: string) {
    if (!window.confirm(`Remover ${name} do canal?`)) return
    removeMember(channel.id, uid).catch(() => {})
  }
  function handleLeave() {
    if (!window.confirm('Sair deste canal? Você deixará de receber mensagens.')) return
    removeMember(channel.id, currentUserId).catch(() => {})
  }
  function handleDelete() {
    const confirmText = isDM
      ? `Excluir a conversa com ${otherName}? Todas as mensagens serão removidas.`
      : `Excluir o canal #${channel.name}? Todas as mensagens e membros serão removidos.`
    if (!window.confirm(confirmText)) return
    deleteChannel(channel.id).catch(() => {})
  }

  return (
    <div className="w-72 h-full border-l border-surface-800 flex flex-col bg-black flex-shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 flex-shrink-0">
        <span className="text-sm font-semibold text-surface-100">
          {isDM ? 'Sobre esta pessoa' : 'Sobre o canal'}
        </span>
        <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Identity */}
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-surface-800 mb-4">
          {isDM ? (
            <>
              <div className="relative">
                <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white', avatarColor(otherName ?? ''))}>
                  {(otherName ?? '?').charAt(0).toUpperCase()}
                </div>
                {otherStatus && <PresenceDot status={otherStatus} size="lg" className="absolute -bottom-0.5 -right-0.5 ring-surface-900" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-surface-100">{otherName}</p>
                <p className={cn('text-xs mt-0.5', PRESENCE_COLOR[otherStatus ?? 'offline'])}>
                  {PRESENCE_LABEL[otherStatus ?? 'offline']}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs font-medium text-surface-200 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> Ligar
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs font-medium text-surface-200 transition-colors">
                  <Video className="w-3.5 h-3.5" /> Vídeo
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-xl bg-surface-800 flex items-center justify-center">
                {channel.emoji ? <Emoji native={channel.emoji} size="2.25rem" /> : <Hash className="w-6 h-6 text-surface-400" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-surface-100">{channel.name}</p>
                {channel.departmentName && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: (channel.departmentColor ?? '#6366f1') + '20', color: channel.departmentColor ?? '#6366f1' }}>
                    <Building2 className="w-2.5 h-2.5" /> Setor
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Topic */}
        {!isDM && channel.topic && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Tópico</p>
            <p className="text-xs text-surface-400 leading-relaxed">{channel.topic}</p>
          </div>
        )}

        {/* Members */}
        {!isDM && (
          <div>
            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Membros ({channel.memberIds.length})
            </p>
            <div className="space-y-1">
              {channel.memberIds.map((uid, i) => {
                const name = channel.memberNames?.[i] ?? 'Usuário'
                const status = presence[uid] ?? 'offline'
                const isSelf = uid === currentUserId
                const isMemberCreator = uid === channel.createdByUserId
                // Creator can remove anyone except themselves; everyone can leave themselves.
                const canKick = isCreator && !isSelf
                return (
                  <div key={uid} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white', avatarColor(name))}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <PresenceDot status={status} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-surface-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-surface-300 truncate">
                          {isSelf ? `${name} (você)` : name}
                        </p>
                        {isMemberCreator && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-blue-300/80">admin</span>
                        )}
                      </div>
                      <p className={cn('text-[10px]', PRESENCE_COLOR[status])}>{PRESENCE_LABEL[status]}</p>
                    </div>
                    {canKick && (
                      <button
                        onClick={() => handleRemoveMember(uid, name)}
                        title="Remover do canal"
                        className="p-1 rounded text-surface-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Danger zone: leave / delete */}
        {(canDeleteChannel || (!isDM && !isCreator && channel.memberIds.includes(currentUserId))) && (
          <div className="mt-6 pt-4 border-t border-surface-800 space-y-1.5">
            {!isDM && !isCreator && channel.memberIds.includes(currentUserId) && (
              <button
                onClick={handleLeave}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair do canal
              </button>
            )}
            {canDeleteChannel && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDM ? 'Excluir conversa' : 'Excluir canal'}
              </button>
            )}
            <p className="text-[10px] text-surface-600 px-2 pt-1 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>Esta ação não pode ser desfeita.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Channel view header ──────────────────────────────────────────────────────

function ChannelViewHeader({ channel, currentUserId, showInfo, onToggleInfo, searchQuery, onSearch }: {
  channel: InternalChannel
  currentUserId: string
  showInfo: boolean
  onToggleInfo: () => void
  searchQuery: string
  onSearch: (q: string) => void
}) {
  const { presence } = useInternalChat()
  const [showSearch, setShowSearch] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDM = channel.type === 'dm'
  const otherIdx = isDM ? channel.memberIds.findIndex((id) => id !== currentUserId) : -1
  const otherUserId = isDM ? (channel.memberIds[otherIdx] ?? '') : ''
  const displayName = isDM ? (channel.memberNames?.[otherIdx] ?? 'Usuário') : (channel.name ?? 'Canal')
  const presenceStatus = isDM ? (presence[otherUserId] ?? 'offline') : undefined

  const subtitle = isDM && presenceStatus
    ? PRESENCE_LABEL[presenceStatus]
    : channel.topic
      ? channel.topic
      : (channel.memberNames?.slice(0, 3).join(', ') ?? '') +
        (channel.memberIds.length > 3 ? ` +${channel.memberIds.length - 3}` : '')

  function toggleSearch() {
    if (showSearch) { setShowSearch(false); onSearch('') }
    else { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50) }
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-surface-800 bg-black">
      {showSearch ? (
        <div className="flex-1 flex items-center gap-3">
          <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && toggleSearch()}
            placeholder="Pesquisar mensagens…"
            className="flex-1 bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none"
          />
          <button onClick={toggleSearch} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0">
            {isDM ? (
              <div className="relative flex-shrink-0">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white', avatarColor(displayName))}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                {presenceStatus && <PresenceDot status={presenceStatus} size="md" className="absolute -bottom-0.5 -right-0.5 ring-surface-900" />}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
                {channel.emoji ? <Emoji native={channel.emoji} size="1.25rem" /> : <Hash className="w-4 h-4 text-surface-400" />}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-100 truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-surface-500 truncate leading-tight mt-0.5 max-w-sm">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggleSearch} className="p-2 rounded-full text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors" title="Pesquisar">
              <Search className="w-4 h-4" />
            </button>
            {isDM && (
              <>
                <button className="p-2 rounded-full text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors" title="Ligar">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors" title="Vídeo">
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onToggleInfo}
              className={cn('p-2 rounded-full transition-colors', showInfo ? 'text-blue-500 bg-blue-500/15' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800')}
              title="Informações"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  const { channels } = useInternalChat()
  const deptCount = channels.filter((c) => c.type === 'department_room').length

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-12">
      <div className="w-20 h-20 rounded-2xl bg-surface-800 flex items-center justify-center">
        <MessageSquareDot className="w-10 h-10 text-surface-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-surface-100">Bate-papo da equipe</h2>
        <p className="text-sm text-surface-500 mt-2 leading-relaxed max-w-xs">
          Selecione um canal ou conversa direta na barra lateral para começar a se comunicar com sua equipe.
        </p>
      </div>
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nova mensagem
      </button>
      {deptCount > 0 && (
        <p className="text-xs text-surface-600">
          {deptCount} setor{deptCount > 1 ? 'es' : ''} disponível{deptCount > 1 ? 'is' : ''} • use a aba{' '}
          <strong className="text-surface-500">Setores</strong> para explorar
        </p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CURRENT_USER = { firstName: 'Admin', lastName: 'Oryon', avatarUrl: undefined }

export function TeamChatPage() {
  const { channels, activeChannelId } = useInternalChat()
  const { user } = useAuth()
  const [replyTo, setReplyTo]     = useState<InternalMessage | null>(null)
  const [showInfo, setShowInfo]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)

  const currentUserId = user?.id ?? ''
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  useEffect(() => {
    setSearchQuery('')
    setShowInfo(false)
    setReplyTo(null)
  }, [activeChannelId])

  const isAdmin = user?.role === 'admin' || user?.role === 'business_admin'

  useRegisterTopBarActions(
    <div className="flex items-center gap-2">
      {isAdmin && (
        <button
          onClick={() => setShowCreateChannel(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 text-xs font-semibold transition-all"
        >
          <Hash className="w-3.5 h-3.5" />
          Canal
        </button>
      )}
      <button
        onClick={() => setShowNewChat(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Nova
      </button>
    </div>,
    [isAdmin, showCreateChannel, showNewChat],
  )

  const inputPlaceholder = activeChannel
    ? activeChannel.type === 'dm'
      ? `Mensagem para ${activeChannel.memberNames?.find((_, i) => activeChannel.memberIds[i] !== currentUserId) ?? 'Usuário'}`
      : `Enviar mensagem em ${activeChannel.name}`
    : undefined

  return (
    <>
      {/* 1 — Chat channel sidebar */}
      <TeamSidebar
        currentUserId={currentUserId}
        onNewChat={() => setShowNewChat(true)}
        isAdmin={isAdmin}
        onCreateChannel={() => setShowCreateChannel(true)}
      />

      {/* 3 — Message area */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {activeChannel ? (
          <>
            <div className="flex-1 flex flex-col min-w-0 bg-black">
              <ChannelViewHeader
                channel={activeChannel}
                currentUserId={currentUserId}
                showInfo={showInfo}
                onToggleInfo={() => setShowInfo((v) => !v)}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
              />
              <MessageThread
                channelId={activeChannel.id}
                currentUserId={currentUserId}
                onReply={(msg) => setReplyTo(msg)}
                searchQuery={searchQuery}
              />
              <MessageInput
                channelId={activeChannel.id}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                placeholder={inputPlaceholder}
              />
            </div>

            {/* 4 — Info panel */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <InfoPanel
                    channel={activeChannel}
                    currentUserId={currentUserId}
                    onClose={() => setShowInfo(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <EmptyState onNewChat={() => setShowNewChat(true)} />
        )}
      </div>

      {showNewChat && (
        <NewChatModal currentUserId={currentUserId} onClose={() => setShowNewChat(false)} />
      )}

      {showCreateChannel && (
        <CreateChannelDrawer
          onClose={() => setShowCreateChannel(false)}
          onCreated={() => setShowCreateChannel(false)}
        />
      )}
    </>
  )
}
