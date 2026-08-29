import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, UserCheck, Search, Check, UserX,
  Tag as TagIcon, ExternalLink, ArrowRightLeft,
  KanbanSquare, MapPin, Phone, Plus, Filter,
  Bot, UserCog,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { cn, formatRelativeTime } from '@/lib/utils'
import { isAiActive } from '@/lib/conversationSignals'
import { ConversionAnalysisPanel } from '@/components/conversations/ConversionAnalysisPanel'
import { ConversationActivitySection } from './ConversationActivitySection'
import { ContactPanelDeals } from './ContactPanelDeals'
import { isAdminTier, roleLabel } from '@/lib/roleHelpers'
import { isFeatureVisible } from '@/config/featureFlags'
import { MoveStageModal } from '@/components/contacts/MoveStageModal'
import { StageBadge } from '@/components/contacts/StageBadge'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import type { Conversation, Tag, User } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAbsDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoje ${time}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${time}`
}

// ─── UserPickerList ───────────────────────────────────────────────────────────

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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel-divider px-4 pt-4 pb-3 border-t border-surface-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Informações section ──────────────────────────────────────────────────────

function InfoTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="divide-y divide-surface-800/60">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0">
          <span className="text-[11px] text-surface-500 flex-shrink-0">{label}</span>
          <span className="text-[12px] text-surface-200 text-right">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Notas section ────────────────────────────────────────────────────────────

function NotasSection() {
  const [notes, setNotes] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed) setNotes(prev => [...prev, trimmed])
    setDraft('')
    setAdding(false)
  }

  return (
    <Section
      title="Notas"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      }
    >
      {notes.length === 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full text-left text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Adicionar uma nota…
        </button>
      )}
      {notes.map((note, i) => (
        <div key={i} className="text-xs text-surface-300 bg-surface-800/50 rounded-lg px-3 py-2 mb-2 last:mb-0">
          {note}
        </div>
      ))}
      {adding && (
        <div className="mt-1">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
            placeholder="Escreva uma nota…"
            rows={3}
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-200 placeholder:text-surface-500 resize-none outline-none focus:border-brand-500 transition-colors"
          />
          <div className="flex gap-2 mt-1.5">
            <button type="button" onClick={handleSave} className="text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors">Salvar</button>
            <button type="button" onClick={() => { setAdding(false); setDraft('') }} className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── ContactPanelProps ────────────────────────────────────────────────────────

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

// ─── ContactPanel ─────────────────────────────────────────────────────────────

export function ContactPanel({
  conversation, allTags, allUsers, onClose,
  onAddTag, onRemoveTag, onCreateTag, onDeleteTag,
  onAssign, onTransfer, onArchive,
}: ContactPanelProps) {
  const { contact, tags = [], assignedUser, createdAt, lastMessageAt } = conversation

  const navigate = useNavigate()
  const { stages } = useCRMConfig()

  const [tagOpen,     setTagOpen]     = useState(false)
  const [assignOpen,  setAssignOpen]  = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [stageOpen,   setStageOpen]   = useState(false)
  const [xferModal,   setXferModal]   = useState(false)
  const [localStage, setLocalStage] = useState<string | undefined | null>(contact.stage)
  useEffect(() => { setLocalStage(contact.stage) }, [contact.id, contact.stage])

  // Build Informações rows
  const location = [contact.city, contact.state].filter(Boolean).join(', ')
  const infoRows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Origem',
      value: (
        <span className="flex items-center gap-1 justify-end">
          <WhatsAppIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          WhatsApp
        </span>
      ),
    },
    {
      label: 'Primeiro contato',
      value: formatAbsDate(contact.firstContactedAt ?? contact.createdAt ?? createdAt),
    },
    {
      label: 'Último contato',
      value: formatAbsDate(contact.lastContactedAt ?? lastMessageAt),
    },
    {
      label: 'IA',
      value: (
        <span className="flex items-center gap-1 justify-end">
          {isAiActive(conversation) ? (
            <><Bot className="w-3 h-3 text-brand-400 flex-shrink-0" /> Ativa</>
          ) : (
            <><UserCog className="w-3 h-3 text-amber-400 flex-shrink-0" /> Pausada</>
          )}
        </span>
      ),
    },
    ...(location ? [{ label: 'Localização', value: (
      <span className="flex items-center gap-1 justify-end">
        <MapPin className="w-3 h-3 flex-shrink-0 text-surface-500" />
        {location}
      </span>
    ) }] : []),
    ...(contact.email ? [{ label: 'E-mail', value: contact.email }] : []),
    ...(contact.company ? [{ label: 'Empresa', value: contact.company }] : []),
    ...(contact.waId ? [{ label: 'WhatsApp', value: (
      <span className="flex items-center gap-1 justify-end">
        <Phone className="w-3 h-3 flex-shrink-0 text-surface-500" />
        +{contact.waId}
      </span>
    ) }] : []),
  ]

  // Largura do painel (desktop): 308px = 280px +10%. Reverter = voltar para md:w-[280px].
  return (
    <aside className="conv-surface w-full md:w-[308px] flex-shrink-0 flex flex-col h-full bg-surface-950 md:border-l md:border-surface-800">
      {/* Action bar */}
      <div className="conv-surface flex items-center justify-between gap-2 px-4 py-2 bg-surface-950">
        <div className="min-w-0 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" aria-label="Estágio do funil" />
          {localStage ? (
            <StageBadge stage={localStage} stages={stages} />
          ) : (
            <span className="text-[11px] text-surface-600">Sem estágio</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => setStageOpen(true)} title="Mover para estágio"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all">
            <KanbanSquare className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/contacts?contact=${contact.id}`)} title="Ver no CRM"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={onClose} title="Fechar"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MoveStageModal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        contactId={contact.id}
        contactName={contact.displayName}
        currentStage={localStage}
        onStageChanged={(next) => setLocalStage(next)}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Contact header */}
        <div className="flex items-center gap-3 py-4 px-4">
          <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold text-surface-50 truncate">{contact.displayName}</h4>
            {contact.waId && (
              <p className="flex items-center gap-1.5 text-xs text-surface-400 mt-0.5 truncate">
                <WhatsAppIcon className="w-3 h-3 flex-shrink-0 text-emerald-500" />
                +{contact.waId}
              </p>
            )}
            {contact.lastSeenAt && (
              <p className="text-[10px] text-surface-500 mt-0.5">Visto {formatRelativeTime(contact.lastSeenAt)}</p>
            )}
          </div>
        </div>

        {/* Etiquetas — logo abaixo do header (avatar + telefone) */}
        <Section
          title="Etiquetas"
          action={
            <button onClick={() => setTagOpen(true)} className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors">
              <TagIcon className="w-3 h-3" />
              Gerenciar
            </button>
          }
        >
          <Modal open={tagOpen} onClose={() => setTagOpen(false)} title="Gerenciar etiquetas" className="max-w-md">
            <TagPickerContent allTags={allTags} selectedTags={tags} onAdd={onAddTag} onRemove={onRemoveTag} onCreate={onCreateTag} onDelete={onDeleteTag} />
          </Modal>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag.id} className="color-chip flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                  style={{ ['--chip']: tag.color } as React.CSSProperties}>
                  <span className="w-1.5 h-1.5 rounded-full chip-dot" />
                  {tag.name}
                  <button onClick={() => onRemoveTag(tag.id)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-600">Nenhuma etiqueta. Clique em "Gerenciar" para adicionar.</p>
          )}
        </Section>

        {/* Agente responsável — ação mais frequente do atendente; vive logo
            após etiquetas, acima da dobra (antes ficava depois da timeline). */}
        <Section
          title="Agente responsável"
          action={
            <div className="flex items-center gap-2">
              {assignedUser && (
                <button
                  onClick={() => setXferModal(true)}
                  title="Transferir conversa"
                  className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Transferir
                </button>
              )}
              <button
                onClick={() => setAssignOpen(true)}
                className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                {assignedUser ? 'Trocar' : 'Atribuir'}
              </button>
            </div>
          }
        >
          {assignedUser ? (
            <button
              onClick={() => setAssignOpen(true)}
              className={cn(
                'assigned-agent-tag w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all',
                'bg-brand-600/10 text-brand-300 hover:bg-brand-600/20',
              )}
            >
              <Avatar name={`${assignedUser.firstName} ${assignedUser.lastName}`} size="xs" />
              <span className="truncate">{assignedUser.firstName} {assignedUser.lastName}</span>
            </button>
          ) : (
            <button
              onClick={() => setAssignOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all bg-surface-800 text-surface-400 hover:bg-surface-700"
            >
              <UserCheck className="w-4 h-4" />
              <span>Ninguém atribuído</span>
            </button>
          )}
          <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Atribuir usuário" className="max-w-sm">
            <UserPickerList users={allUsers} selectedUserId={assignedUser?.id}
              onSelect={(user) => { onAssign(user); setAssignOpen(false) }} />
          </Modal>
        </Section>

        <ContactPanelDeals contactId={contact.id} contactName={contact.displayName} conversationId={conversation.id} />

        {/* Hidden when conversionAnalysisPanel is off — covers both the
            "Analisar conversa com IA" CTA and any previously-rendered
            results, so the contact panel doesn't show a half-disabled
            feature. */}
        {isFeatureVisible('conversionAnalysisPanel') && (
          <ConversionAnalysisPanel conversationId={conversation.id} contact={contact} />
        )}

        {/* Informações — referência estática, acima da timeline dinâmica */}
        <Section title="Informações">
          <InfoTable rows={infoRows} />
        </Section>

        {/* Timeline */}
        <ConversationActivitySection conversationId={conversation.id} />

        {/* Notas */}
        <NotasSection />
      </div>

      {/* Transfer modal */}
      <Modal open={xferModal} onClose={() => setXferModal(false)} title="Transferir conversa">
        <p className="text-xs text-surface-500 mb-3">
          Selecione o usuário que receberá esta conversa:
        </p>
        <div className="max-h-72 overflow-y-auto -mx-5 px-5">
          {allUsers.filter((u) => u.id !== assignedUser?.id).map((user) => {
            return (
              <button
                key={user.id}
                onClick={() => { onTransfer(user); setXferModal(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 hover:bg-surface-800"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-surface-200">
                    {user.firstName} {user.lastName}
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
