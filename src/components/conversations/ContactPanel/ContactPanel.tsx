import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Search, Check, UserX,
  ArrowRightLeft,
  MapPin, Phone,
  Bot, UserCog,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { cn, formatRelativeTime } from '@/lib/utils'
import { isAiActive } from '@/lib/conversationSignals'
import { ConversionAnalysisPanel } from '@/components/conversations/ConversionAnalysisPanel'
import { ConversationActivitySection } from './ConversationActivitySection'
import { ContactPanelDeals } from './ContactPanelDeals'
import { roleLabel } from '@/lib/roleHelpers'
import { isFeatureVisible } from '@/config/featureFlags'
import { MoveStageModal } from '@/components/contacts/MoveStageModal'
import { StageBadge } from '@/components/contacts/StageBadge'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
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
              <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" kind="operator" className="flex-shrink-0" />
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

// ─── Informações section ──────────────────────────────────────────────────────

function InfoTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-[82px_1fr] gap-x-2 gap-y-1.5">
      {rows.map(({ label, value }) => (
        <Fragment key={label}>
          <span className="text-xs text-surface-400">{label}</span>
          <span className="text-xs font-medium text-surface-100 min-w-0">{value}</span>
        </Fragment>
      ))}
    </div>
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
  const { stages, pipelines } = useCRMConfig()
  const addToPipeline = useAddToPipeline()
  const salesPipeline = defaultSalesPipeline(pipelines)

  const [tagOpen,     setTagOpen]     = useState(false)
  const [assignOpen,  setAssignOpen]  = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [stageOpen,   setStageOpen]   = useState(false)
  const [localStage, setLocalStage] = useState<string | undefined | null>(contact.stage)
  useEffect(() => { setLocalStage(contact.stage) }, [contact.id, contact.stage])

  // R2-1D-PANEL (RODADA-2.md): ordem e campos do mock — identidade, DADOS
  // (Situação · Responsável · Origem · E-mail), ETIQUETAS · N, NEGÓCIOS · N,
  // RESUMO DA IA. O que o mock não lista (datas, IA, localização, empresa,
  // WhatsApp, timeline) continua acessível em "Mais dados" e na timeline.
  const location = [contact.city, contact.state].filter(Boolean).join(', ')
  const subtitle = [contact.company, contact.city].filter(Boolean).join(' · ')
  const SOURCE_LABEL: Record<string, string> = { meta_ads: 'Meta Ads', whatsapp: 'WhatsApp' }
  const originLabel = contact.source ? (SOURCE_LABEL[contact.source] ?? contact.source) : 'WhatsApp'
  const assignedName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName ?? ''}`.trim() : null

  const dadosRows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Situação',
      value: (
        <span className="flex items-center gap-1.5">
          {localStage ? <StageBadge stage={localStage} stages={stages} /> : <span className="text-surface-500 font-normal">Sem situação</span>}
          {/* SCRUM-929 (F-FICHA-08): "Mudar situação" é do CONTATO (ciclo de
              vida), não da etapa do negócio. */}
          <button onClick={() => setStageOpen(true)} title="Mudar situação" aria-label="Mudar situação"
            className="text-[11px] font-semibold text-accent-dark hover:underline">
            Mudar
          </button>
        </span>
      ),
    },
    { label: 'Responsável', value: assignedName ?? <span className="text-surface-500 font-normal">Sem responsável</span> },
    { label: 'Origem', value: originLabel },
    ...(contact.email ? [{ label: 'E-mail', value: <span className="truncate block">{contact.email}</span> }] : []),
  ]

  const extraRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Primeiro contato', value: formatAbsDate(contact.firstContactedAt ?? contact.createdAt ?? createdAt) },
    { label: 'Último contato', value: formatAbsDate(contact.lastContactedAt ?? lastMessageAt) },
    {
      label: 'IA',
      value: (
        <span className="flex items-center gap-1">
          {isAiActive(conversation) ? (
            <><Bot className="w-3 h-3 text-brand-400 flex-shrink-0" /> Ativa</>
          ) : (
            <><UserCog className="w-3 h-3 text-amber-400 flex-shrink-0" /> Pausada</>
          )}
        </span>
      ),
    },
    ...(location ? [{ label: 'Localização', value: (
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3 flex-shrink-0 text-surface-500" />
        {location}
      </span>
    ) }] : []),
    ...(contact.company ? [{ label: 'Empresa', value: contact.company }] : []),
    ...(contact.waId ? [{ label: 'WhatsApp', value: (
      <span className="flex items-center gap-1">
        <Phone className="w-3 h-3 flex-shrink-0 text-surface-500" />
        +{contact.waId}
      </span>
    ) }] : []),
  ]

  // Largura do painel (desktop): 308px = 280px +10%. Reverter = voltar para md:w-[280px].
  return (
    <aside className="conv-surface relative w-full md:w-[308px] flex-shrink-0 flex flex-col h-full bg-surface-800 md:border-l md:border-surface-700">
      {/* CONV-PANEL-05: o mock não tem ícone de fechar — só no drawer MOBILE. */}
      <button onClick={onClose} title="Fechar" aria-label="Fechar"
        className="md:hidden absolute top-2 right-2 z-10 w-7 h-7 rounded-sm flex items-center justify-center text-surface-400 hover:bg-surface-700 hover:text-surface-100 transition-all">
        <X className="w-4 h-4" />
      </button>

      <MoveStageModal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        contactId={contact.id}
        contactName={contact.displayName}
        currentStage={localStage}
        onStageChanged={(next) => setLocalStage(next)}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Identidade */}
        <div className="px-4 pt-4 pb-3.5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="44" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold tracking-[-0.01em] text-surface-50 truncate">{contact.displayName}</h4>
              {subtitle && <p className="text-xs text-surface-400 mt-0.5 truncate">{subtitle}</p>}
              {contact.lastSeenAt && (
                <p className="text-[10px] text-surface-500 mt-0.5">Visto {formatRelativeTime(contact.lastSeenAt)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="neutral" onClick={() => navigate(`/contacts?contact=${contact.id}`)}>
              Ver contato
            </Button>
            {salesPipeline && (
              <Button
                size="sm"
                variant="neutral"
                onClick={() => addToPipeline.requestAdd({ contactId: contact.id, contactName: contact.displayName || contact.waId, pipeline: salesPipeline, conversationId: conversation.id })}
              >
                Novo negócio
              </Button>
            )}
          </div>
        </div>

        {/* DADOS */}
        <CollapsibleSection
          title="Dados"
          storageKey="conv-panel.info"
          className="border-t border-surface-700"
          actions={
            <div className="flex items-center gap-2">
              {assignedUser && (
                <button onClick={() => setTransferOpen(true)} title="Transferir conversa"
                  className="flex items-center gap-1 text-[11.5px] font-semibold text-accent-dark hover:underline">
                  <ArrowRightLeft className="w-3 h-3" />
                  Transferir
                </button>
              )}
              <button onClick={() => setAssignOpen(true)} className="text-[11.5px] font-semibold text-accent-dark hover:underline">
                {assignedUser ? 'Trocar' : 'Atribuir'}
              </button>
            </div>
          }
        >
          <InfoTable rows={dadosRows} />
          <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Atribuir usuário" className="max-w-sm">
            <UserPickerList users={allUsers} selectedUserId={assignedUser?.id}
              onSelect={(user) => { onAssign(user); setAssignOpen(false) }} />
          </Modal>
          {/* Transferir — endpoint/handler distinto de "Atribuir" (R13): já
              existia no hook (useConversations.transferUser → PATCH .../transfer). */}
          <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir conversa" className="max-w-sm">
            <UserPickerList users={allUsers.filter((u) => u.id !== assignedUser?.id)}
              onSelect={(user) => { if (user) onTransfer(user); setTransferOpen(false) }} />
          </Modal>
        </CollapsibleSection>

        {/* ETIQUETAS · N */}
        <CollapsibleSection
          title={`Etiquetas · ${tags.length}`}
          storageKey="conv-panel.tags"
          className="border-t border-surface-700"
          actions={
            <button onClick={() => setTagOpen(true)} className="text-[11.5px] font-semibold text-accent-dark hover:underline">
              Editar
            </button>
          }
        >
          <Modal open={tagOpen} onClose={() => setTagOpen(false)} title="Gerenciar etiquetas" className="max-w-md">
            <TagPickerContent allTags={allTags} selectedTags={tags} onAdd={onAddTag} onRemove={onRemoveTag} onCreate={onCreateTag} onDelete={onDeleteTag} />
          </Modal>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag.id} className="color-chip flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-[11px] h-5 px-2 rounded-xs font-semibold"
                  style={{ ['--chip']: tag.color } as React.CSSProperties}
                  title={tag.name}>
                  <span>{tag.name}</span>
                  <button onClick={() => onRemoveTag(tag.id)} title={`Remover etiqueta ${tag.name}`} aria-label={`Remover etiqueta ${tag.name}`} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-500">Nenhuma etiqueta. Clique em "Editar" para adicionar.</p>
          )}
        </CollapsibleSection>

        {/* NEGÓCIOS · N (só aparece quando há registro — ver ContactPanelDeals) */}
        {isFeatureVisible('contactPanelDeals') && (
          <ContactPanelDeals contactId={contact.id} contactName={contact.displayName} conversationId={conversation.id} />
        )}

        {/* RESUMO DA IA — feature real (ConversionAnalysisPanel) ocupa este lugar. */}
        {isFeatureVisible('conversionAnalysisPanel') && (
          <ConversionAnalysisPanel conversationId={conversation.id} contact={contact} />
        )}

        <CollapsibleSection title="Mais dados" storageKey="conv-panel.more" defaultOpen={false} className="border-t border-surface-700">
          <InfoTable rows={extraRows} />
        </CollapsibleSection>

        {/* Timeline */}
        <ConversationActivitySection conversationId={conversation.id} />

      </div>

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
      {addToPipeline.dialogs}
    </aside>
  )
}
