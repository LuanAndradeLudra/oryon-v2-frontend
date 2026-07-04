import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, UserPlus, Info,
  Tag, Check, Archive, ArrowLeft, MoreVertical,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { UserPicker } from '@/components/ui/UserPicker'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import { HandoffChip } from './AiHandoffBanner'
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
  /** Phase 32 — replaces the standalone AiHandoffBanner. The chip lives
   *  inline in the header and the actions (intervir / reativar / estender)
   *  are reachable in 1 click from here. */
  onSetAiPause: (pauseUntil: string | null) => Promise<void> | void
  /** Phase 34 — "Intervir agora": pause using the agent's configured handoff
   *  window (duration resolved server-side; no client-computed timestamp). */
  onInterveneAi?: () => Promise<void> | void
  /** When provided, shows a mobile-only back button on the left of the header. */
  onBack?: () => void
}

export function ChatHeader({
  conversation, allTags, allUsers,
  onStatusChange, onToggleInfo, infoOpen,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onArchive,
  onSetAiPause, onInterveneAi,
  onBack,
}: ChatHeaderProps) {
  const isMobile = useIsMobile()
  const { contact, status, whatsappNumber, assignedUser, tags = [] } = conversation

  const [tagOpen,      setTagOpen]      = useState(false)
  const [userOpen,     setUserOpen]     = useState(false)
  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const closeAll = () => {
    setTagOpen(false); setUserOpen(false); setStatusOpen(false); setMoreOpen(false)
  }

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

  // Compartilhado entre mobile e desktop — Modals/Pickers
  const sharedOverlays = (
    <>
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

      <ConfirmModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { onArchive(); setArchiveOpen(false) }}
        title="Arquivar conversa"
        description={`Tem certeza que deseja arquivar a conversa com ${contact.displayName}? Ela ficará como "Abandonada".`}
        confirmLabel="Arquivar"
        danger
      />
    </>
  )

  // Status dropdown — usado em ambos os layouts (mobile e desktop)
  const statusDropdown = (
    <div ref={statusRef} className="relative">
      <button
        type="button"
        onClick={() => { setTagOpen(false); setUserOpen(false); setMoreOpen(false); setStatusOpen((v) => !v) }}
        title="Alterar status"
        style={statusOpen
          ? ({ ['--chip']: status === 'resolved'
                ? 'var(--color-cstatus-resolved)'
                : status === 'pending'
                  ? 'var(--color-cstatus-pending)'
                  : 'var(--color-status-open)' } as React.CSSProperties)
          : undefined}
        className={cn(
          'flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-all border',
          statusOpen
            ? 'color-chip'
            : 'bg-surface-800 text-surface-300 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
        )}
      >
        <span className="max-w-[7rem] truncate">{statusTriggerLabel(status)}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-80', statusOpen && 'rotate-180')} />
      </button>

      {statusOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[11rem] py-1 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50">
          {STATUS_OPTIONS.map(({ value: v, label }) => {
            const active = status === v
            const statusBg = v === 'open'
              ? 'bg-status-open/10 hover:bg-status-open/18'
              : v === 'pending'
                ? 'bg-cstatus-pending/10 hover:bg-cstatus-pending/18'
                : 'bg-cstatus-resolved/10 hover:bg-cstatus-resolved/18'
            const statusText = v === 'open'
              ? 'text-status-open'
              : v === 'pending'
                ? 'text-cstatus-pending'
                : 'text-cstatus-resolved'
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
  )

  // ─── Mobile compact layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="conv-surface flex items-center px-2 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] border-b border-surface-800 bg-surface-950 flex-shrink-0 gap-2">
        {/* Back */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para conversas"
            className="-ml-1 w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />

        {/* Stack: nome / telefone / tags */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-surface-50 truncate">
            {contact.displayName}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-surface-400">
            <WhatsAppIcon size={10} />
            <span className="truncate">{contact.waId}</span>
          </div>
          {/* Handoff chip — wraps below the phone row so the right-side
              buttons (status / more) stay reachable even on narrow phones. */}
          <div className="mt-1">
            <HandoffChip
              aiPausedUntil={conversation.aiPausedUntil}
              assignedUser={conversation.assignedUser}
              onPause={(until) => onSetAiPause(until)}
              onResume={() => onSetAiPause(null)}
              onIntervene={onInterveneAi}
            />
          </div>
        </div>

        {/* Status + 3-pontos */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {statusDropdown}

          <Dropdown
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            align="right"
            anchor={
              <button
                type="button"
                onClick={() => { closeAll(); setMoreOpen((v) => !v) }}
                aria-label="Mais ações"
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-lg transition-all',
                  moreOpen ? 'bg-surface-700 text-surface-100' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
                )}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            }
          >
            <DropdownItem
              icon={Tag}
              onClick={() => { setMoreOpen(false); setTagOpen(true) }}
            >
              Gerenciar etiquetas
            </DropdownItem>
            <DropdownItem
              icon={UserPlus}
              onClick={() => { setMoreOpen(false); setUserOpen(true) }}
            >
              {assignedUser ? 'Trocar atribuição' : 'Atribuir usuário'}
            </DropdownItem>
            <DropdownItem
              icon={Info}
              onClick={() => { setMoreOpen(false); onToggleInfo() }}
              active={infoOpen}
            >
              Detalhes do contato
            </DropdownItem>
            <DropdownItem
              icon={Archive}
              danger
              onClick={() => { setMoreOpen(false); setArchiveOpen(true) }}
            >
              Arquivar conversa
            </DropdownItem>
          </Dropdown>

          {/* UserPicker em mobile renderiza fora do dropdown — usa anchor invisivel
              para aproveitar posicionamento existente. Trigger e' o item do dropdown. */}
          <UserPicker
            users={allUsers}
            selectedUserId={assignedUser?.id}
            onSelect={onAssign}
            open={userOpen}
            onClose={() => setUserOpen(false)}
            align="right"
            anchor={<span className="absolute right-0 top-full" aria-hidden />}
          />
        </div>

        {sharedOverlays}
      </div>
    )
  }

  // ─── Desktop layout (original) ──────────────────────────────────────────
  return (
    <div className="conv-surface flex items-center justify-between px-4 py-3 border-b border-surface-800 bg-surface-950 flex-shrink-0 gap-3">

      {/* ── Left: contact info ────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-surface-50 truncate">{contact.displayName}</h2>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <WhatsAppIcon size={12} />
            <span className="text-xs text-surface-400 truncate">{contact.waId}</span>
            <span className="text-surface-600 text-xs">·</span>
            <span className="text-xs text-surface-500 truncate">{whatsappNumber.displayPhoneNumber}</span>
            {assignedUser && (
              <>
                <span className="text-surface-600 text-xs">·</span>
                <span className="text-xs text-surface-300 truncate">
                  {assignedUser.firstName} {assignedUser.lastName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: actions ────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Handoff chip lives at the leftmost position of the actions group
            so the colored pill (emerald/amber) catches the eye before the
            neutral-toned icon buttons. Replaces the full-width banner that
            used to sit below the header. */}
        <HandoffChip
          aiPausedUntil={conversation.aiPausedUntil}
          assignedUser={conversation.assignedUser}
          onPause={(until) => onSetAiPause(until)}
          onResume={() => onSetAiPause(null)}
          onIntervene={onInterveneAi}
        />
        <span className="w-px h-5 bg-surface-800 mx-1" />

        <Tooltip content="Gerenciar etiquetas" side="bottom">
          <button
            onClick={() => { closeAll(); setTagOpen(true) }}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              tagOpen ? 'bg-surface-700 text-surface-100' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
            )}
          >
            <Tag className="w-4 h-4" />
          </button>
        </Tooltip>

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
                  userOpen ? 'bg-surface-800 text-surface-200'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                )}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </Tooltip>
          }
        />

        <Tooltip content="Informações do contato" side="bottom">
          <button
            onClick={onToggleInfo}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              infoOpen ? 'bg-surface-700 text-surface-200' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
            )}
          >
            <div className="relative">
              <Info className="w-4 h-4" />
              {(contact.metaAdsReferral || contact.googleAdsAttribution) && !infoOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-surface-400 border border-surface-900" />
              )}
            </div>
          </button>
        </Tooltip>

        {statusDropdown}

        <Tooltip content="Arquivar conversa" side="bottom">
          <button
            onClick={() => setArchiveOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-danger/10 hover:text-danger transition-all"
          >
            <Archive className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {sharedOverlays}
    </div>
  )
}
