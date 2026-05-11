import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Clock, MessageSquare, UserCheck, Search, Check, UserX,
  Tag as TagIcon, ExternalLink,
  Bot, UserCog,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ConversionAnalysisPanel } from '@/components/conversations/ConversionAnalysisPanel'
import { ConversationActivitySection } from './ConversationActivitySection'
import { isAdminTier, roleLabel } from '@/lib/roleHelpers'
import { isFeatureVisible } from '@/config/featureFlags'
import type { Conversation, Tag, User } from '@/types'

function UserPickerList({ users, selectedUserId, onSelect }: { users: User[]; selectedUserId?: string; onSelect: (user: User | null) => void }) {
  const [search, setSearch] = useState('')
  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-3 py-2 mb-3">
        <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="flex-1 bg-transparent text-sm text-surface-200 placeholder:text-surface-500 outline-none" />
      </div>
      <div className="max-h-64 overflow-y-auto -mx-1">
        {selectedUserId && (
          <button onClick={() => onSelect(null)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-700 rounded-lg transition-all">
            <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0"><UserX className="w-4 h-4 text-surface-400" /></div>
            <p className="text-sm text-surface-300">Remover atribuição</p>
          </button>
        )}
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-surface-500 py-4">Nenhum usuário encontrado</p>
        ) : filtered.map((user) => {
          const isSelected = user.id === selectedUserId
          return (
            <button key={user.id} onClick={() => onSelect(user)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all', isSelected ? 'bg-brand-600/10' : 'hover:bg-surface-700')}>
              <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" className="flex-shrink-0" />
              <div className="min-w-0 flex-1 text-left">
                <p className={cn('text-sm font-medium', isSelected ? 'text-brand-300' : 'text-surface-200')}>{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-surface-500 truncate">{roleLabel(user.role)} · {user.email}</p>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface ContactPanelProps {
  conversation: Conversation
  allTags: Tag[]
  allUsers: User[]
  onClose: () => void
  onAddTag: (tag: Tag) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag?: (name: string, color: string) => Promise<Tag>
  onDeleteTag?: (tagId: string) => Promise<void>
  onAssign: (user: User | null) => void
  onTransfer: (user: User) => void
  onArchive: () => void
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-800 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-surface-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-surface-200 truncate mt-0.5">{value}</p>
      </div>
    </div>
  )
}

/**
 * Phase 27 — "Atendimento" row with live countdown when AI is paused.
 * Mounts a 60s ticker only while paused; dormant when AI is active.
 * Uses the same 60s precision as the chat banner — sub-minute granularity
 * is overkill for this surface and would re-render the whole panel.
 */
function AiStatusInfoRow({ aiPausedUntil }: { aiPausedUntil: string | null | undefined }) {
  const pausedUntilMs = aiPausedUntil ? new Date(aiPausedUntil).getTime() : null
  const isPaused = pausedUntilMs !== null && pausedUntilMs > Date.now()
  // Indefinite is anything past the year 9999 sentinel (we use a small skew
  // in case the backend round-trip adjusted ms).
  const isIndefinite = isPaused && pausedUntilMs! > new Date('9999-01-01').getTime()

  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isPaused || isIndefinite) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [isPaused, isIndefinite])

  if (!isPaused) {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-surface-800">
        <div className="w-7 h-7 rounded-lg bg-emerald-700/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-medium">Atendimento</p>
          <p className="text-sm text-emerald-200 mt-0.5">Em atendimento por IA</p>
        </div>
      </div>
    )
  }

  const remaining = isIndefinite
    ? 'até reativar manualmente'
    : `IA volta em ${formatRemainingMin(pausedUntilMs!)}`
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-800">
      <div className="w-7 h-7 rounded-lg bg-amber-700/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <UserCog className="w-3.5 h-3.5 text-amber-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-medium">Atendimento</p>
        <p className="text-sm text-amber-200 mt-0.5">Atendimento humano</p>
        <p className="text-[11px] text-amber-300/80 mt-0.5">{remaining}</p>
      </div>
    </div>
  )
}

function formatRemainingMin(untilMs: number): string {
  const ms = untilMs - Date.now()
  if (ms < 60_000) return '<1min'
  const totalMin = Math.floor(ms / 60_000)
  if (totalMin < 60) return `${totalMin}min`
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

export function ContactPanel({
  conversation, allTags, allUsers, onClose,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onTransfer, onArchive,
}: ContactPanelProps) {
  const { contact, tags = [], assignedUser, createdAt, lastMessageAt } = conversation

  const navigate = useNavigate()

  const [tagOpen,     setTagOpen]     = useState(false)
  const [assignOpen,  setAssignOpen]  = useState(false)
  const [xferModal,   setXferModal]   = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <aside className="w-full md:w-[280px] flex-shrink-0 flex flex-col h-full bg-black md:border-l md:border-surface-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-100">Informações</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact card */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-surface-800">
          <div className="relative mb-3">
            <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="lg" />
          </div>
          <h4 className="text-base font-semibold text-surface-50">{contact.displayName}</h4>
          {contact.lastSeenAt && (
            <p className="text-[11px] text-surface-500 mt-1">
              Visto {formatRelativeTime(contact.lastSeenAt)}
            </p>
          )}
        </div>

        {/* Hidden when conversionAnalysisPanel is off — covers both the
            "Analisar conversa com IA" CTA and any previously-rendered
            results, so the contact panel doesn't show a half-disabled
            feature. */}
        {isFeatureVisible('conversionAnalysisPanel') && (
          <ConversionAnalysisPanel
            conversationId={conversation.id}
            contact={contact}
          />
        )}

        <ConversationActivitySection conversationId={conversation.id} />

        {/* Details */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-2">Conversa</p>
          <AiStatusInfoRow aiPausedUntil={conversation.aiPausedUntil} />
          <InfoRow icon={WhatsAppIcon as React.ElementType} label="Número de contato" value={contact.waId ? `+${contact.waId}` : contact.displayName} />
          <InfoRow icon={Clock}         label="Iniciada"        value={formatRelativeTime(createdAt)} />
          <InfoRow icon={MessageSquare} label="Última mensagem" value={formatRelativeTime(lastMessageAt)} />
          {assignedUser && (
            <InfoRow
              icon={UserCheck}
              label="Responsável"
              value={`${assignedUser.firstName} ${assignedUser.lastName}`}
            />
          )}
        </div>

        {/* Assign agent */}
        <div className="px-4 py-3 border-t border-surface-800">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-2">Agente responsável</p>
          <button
            onClick={() => setAssignOpen(true)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all',
              assignedUser
                ? 'bg-brand-600/10 text-brand-300 hover:bg-brand-600/20'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            )}
          >
            {assignedUser ? (
              <>
                <Avatar name={`${assignedUser.firstName} ${assignedUser.lastName}`} size="xs" />
                <span className="truncate">{assignedUser.firstName} {assignedUser.lastName}</span>
              </>
            ) : (
              <><UserCheck className="w-4 h-4" /><span>Atribuir usuário</span></>
            )}
          </button>
          <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Atribuir usuário" className="max-w-sm">
            <UserPickerList
              users={allUsers}
              selectedUserId={assignedUser?.id}
              onSelect={(user) => { onAssign(user); setAssignOpen(false) }}
            />
          </Modal>
        </div>

        {/* Tags */}
        <div className="px-4 py-3 border-t border-surface-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold">Etiquetas</p>
            <button
              onClick={() => setTagOpen(true)}
              className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              <TagIcon className="w-3 h-3" />
              Gerenciar
            </button>
          </div>
          {/* Tag manager opens as a centered modal so its content isn't clipped
              by the narrow contact panel. */}
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
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                  style={{ backgroundColor: tag.color + '28', color: tag.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  <button
                    onClick={() => onRemoveTag(tag.id)}
                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-600">Nenhuma etiqueta. Clique em "Gerenciar" para adicionar.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-surface-800">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-2">Ações</p>
          <div className="flex flex-col gap-1">

            {/* Ver no CRM */}
            <button
              onClick={() => navigate(`/contacts?contact=${contact.id}`)}
              className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg text-surface-300 hover:bg-surface-800 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-surface-500" />
              Ver no CRM
            </button>

          </div>
        </div>
      </div>

      {/* Transfer modal */}
      <Modal open={xferModal} onClose={() => setXferModal(false)} title="Transferir conversa">
        <p className="text-xs text-surface-500 mb-3">
          Selecione o usuário que receberá esta conversa:
        </p>
        <div className="max-h-72 overflow-y-auto -mx-5 px-5">
          {allUsers.map((user) => {
            const isCurrent = user.id === assignedUser?.id
            return (
              <button
                key={user.id}
                onClick={() => { onTransfer(user); setXferModal(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1',
                  isCurrent ? 'bg-brand-600/10' : 'hover:bg-surface-800'
                )}
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className={cn('text-sm font-medium', isCurrent ? 'text-brand-300' : 'text-surface-200')}>
                    {user.firstName} {user.lastName}
                    {isCurrent && <span className="text-[10px] ml-2 text-brand-400/70">atual</span>}
                  </p>
                  <p className="text-[11px] text-surface-500 truncate">{user.email}</p>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  isAdminTier(user.role) ? 'bg-brand-600/20 text-brand-300' : 'bg-surface-700 text-surface-400'
                )}>
                  {roleLabel(user.role)}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Archive confirm modal */}
      <ConfirmModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { onArchive(); setArchiveOpen(false) }}
        title="Arquivar conversa"
        description={`Tem certeza que deseja arquivar a conversa com ${contact.displayName}? Ela ficará como "Abandonada".`}
        confirmLabel="Arquivar"
        danger
      />
    </aside>
  )
}
