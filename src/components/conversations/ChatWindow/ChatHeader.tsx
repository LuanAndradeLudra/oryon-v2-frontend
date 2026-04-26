import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, UserPlus, Info,
  Tag, Check, Archive,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { UserPicker } from '@/components/ui/UserPicker'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { cn } from '@/lib/utils'
import type { Conversation, Tag as TagType, User } from '@/types'

const STATUS_OPTIONS = [
  { value: 'open' as const, label: 'Abertas' },
  { value: 'pending' as const, label: 'Pendentes' },
  { value: 'resolved' as const, label: 'Resolvidas' },
]

function statusTriggerLabel(s: Conversation['status']) {
  if (s === 'open') return 'Aberta'
  if (s === 'pending') return 'Pendente'
  if (s === 'resolved') return 'Resolvida'
  return 'Status'
}

interface ChatHeaderProps {
  conversation: Conversation
  allTags: TagType[]
  allUsers: User[]
  onStatusChange: (status: 'open' | 'pending' | 'resolved') => void
  onToggleInfo: () => void
  infoOpen: boolean
  onAddTag: (tag: TagType) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag?: (name: string, color: string) => Promise<TagType>
  onDeleteTag?: (tagId: string) => Promise<void>
  onAssign: (user: User | null) => void
  onArchive: () => void
}

export function ChatHeader({
  conversation, allTags, allUsers,
  onStatusChange, onToggleInfo, infoOpen,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onArchive,
}: ChatHeaderProps) {
  const { contact, status, whatsappNumber, assignedUser, tags = [] } = conversation

  const [tagOpen,      setTagOpen]      = useState(false)
  const [userOpen,     setUserOpen]     = useState(false)
  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const closeAll = () => { setTagOpen(false); setUserOpen(false); setStatusOpen(false) }

  useEffect(() => {
    if (!statusOpen) return
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 bg-black flex-shrink-0 gap-3">

      {/* ── Left: contact info ────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-surface-50 truncate">{contact.displayName}</h2>
            <Badge variant={status === 'pending' ? 'pending' : status === 'open' ? 'open' : status === 'resolved' ? 'resolved' : 'abandoned'}>
              {status === 'pending' ? 'Pendente' : status === 'open' ? 'Aberta' : status === 'resolved' ? 'Resolvida' : 'Abandonada'}
            </Badge>
            {/* Inline tags (desktop) */}
            {tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="hidden md:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: t.color + '28', color: t.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </span>
            ))}
          </div>
          {/* WhatsApp number row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <WhatsAppIcon size={12} />
            <span className="text-xs text-surface-400 truncate">{contact.waId}</span>
            <span className="text-surface-600 text-xs">·</span>
            <span className="text-xs text-surface-500 truncate hidden sm:block">{whatsappNumber.displayPhoneNumber}</span>
            {assignedUser && (
              <>
                <span className="text-surface-600 text-xs hidden sm:block">·</span>
                <span className="text-xs text-brand-400 truncate hidden sm:block">
                  {assignedUser.firstName} {assignedUser.lastName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: actions ────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">

        {/* Tag manager — opens as a centered modal (same pattern as ContactPanel) */}
        <Tooltip content="Gerenciar etiquetas" side="bottom">
          <button
            onClick={() => { closeAll(); setTagOpen(true) }}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              tagOpen ? 'bg-brand-600/20 text-brand-400' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
            )}
          >
            <Tag className="w-4 h-4" />
          </button>
        </Tooltip>
        <Modal
          open={tagOpen}
          onClose={() => setTagOpen(false)}
          title="Gerenciar etiquetas"
          className="max-w-md"
        >
          <TagPickerContent
            allTags={allTags}
            selectedTags={tags}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
            onCreate={onCreateTag}
            onDelete={onDeleteTag}
          />
        </Modal>

        {/* Assign picker */}
        <UserPicker
          users={allUsers}
          selectedUserId={assignedUser?.id}
          onSelect={onAssign}
          open={userOpen}
          onClose={() => setUserOpen(false)}
          align="right"
          anchor={
            <Tooltip content="Atribuir usuário" side="bottom">
              <button
                onClick={() => { closeAll(); setUserOpen((v) => !v) }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  userOpen ? 'bg-brand-600/20 text-brand-400'
                    : assignedUser ? 'text-brand-400 hover:bg-surface-800'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                )}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </Tooltip>
          }
        />

        {/* Info panel */}
        <Tooltip content="Informações do contato" side="bottom">
          <button
            onClick={onToggleInfo}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              infoOpen ? 'bg-brand-600/20 text-brand-400' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
            )}
          >
            <div className="relative">
              <Info className="w-4 h-4" />
              {(contact.metaAdsReferral || contact.googleAdsAttribution) && !infoOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-500 border border-surface-900" />
              )}
            </div>
          </button>
        </Tooltip>

        {/* Status: Abertas / Pendentes / Resolvidas */}
        <div ref={statusRef} className="relative">
          <Tooltip content="Alterar status da conversa" side="bottom">
            <button
              type="button"
              onClick={() => { setTagOpen(false); setUserOpen(false); setStatusOpen((v) => !v) }}
              className={cn(
                'flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-all border',
                status === 'resolved'
                  ? 'bg-status-active-bg text-status-active border-status-active-border hover:bg-status-active-bg'
                  : status === 'pending'
                    ? 'bg-status-pending-bg text-status-pending border-status-pending-border hover:bg-status-pending-bg'
                    : 'bg-status-open-bg text-status-open border-status-open-border hover:bg-status-open-bg',
              )}
            >
              <span className="max-w-[7rem] truncate">{statusTriggerLabel(status)}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-80', statusOpen && 'rotate-180')} />
            </button>
          </Tooltip>

          {statusOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[11rem] py-1 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50">
              {STATUS_OPTIONS.map(({ value: v, label }) => {
                const active = status === v
                const statusBg = v === 'open'
                  ? 'bg-status-open/10 hover:bg-status-open/18'
                  : v === 'pending'
                    ? 'bg-status-pending/10 hover:bg-status-pending/18'
                    : 'bg-status-active/10 hover:bg-status-active/18'
                const statusText = v === 'open'
                  ? 'text-status-open'
                  : v === 'pending'
                    ? 'text-status-pending'
                    : 'text-status-active'
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      if (!active) onStatusChange(v)
                      setStatusOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-left transition-colors',
                      statusBg,
                      statusText,
                    )}
                  >
                    {label}
                    {active && <Check className={cn('w-3.5 h-3.5 flex-shrink-0', statusText)} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Archive */}
        <Tooltip content="Arquivar conversa" side="bottom">
          <button
            onClick={() => setArchiveOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-danger/10 hover:text-danger transition-all"
          >
            <Archive className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <ConfirmModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { onArchive(); setArchiveOpen(false) }}
        title="Arquivar conversa"
        description={`Tem certeza que deseja arquivar a conversa com ${contact.displayName}? Ela ficará como "Abandonada".`}
        confirmLabel="Arquivar"
        danger
      />
    </div>
  )
}
