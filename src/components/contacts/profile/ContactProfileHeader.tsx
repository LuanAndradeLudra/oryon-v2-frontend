import { useState } from 'react'
import {
  ArrowLeft, Copy, Check, MessageSquare, StickyNote, CalendarClock,
  MoreHorizontal, Send, Trash2, UserCheck, MessageCircle, Handshake,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { StageBadge } from '@/components/contacts/StageBadge'
import { LeadScorePill } from '@/components/contacts/LeadScorePill'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
import { isAdminTier } from '@/lib/roleHelpers'
import { relativeDate, cn } from '@/lib/utils'
import { computeWhatsAppWindow, type WhatsAppWindowState } from '@/lib/whatsappWindow'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import type { Contact } from '@/types'

interface ContactProfileHeaderProps {
  contact: Contact
  /** Última atividade (timestamp da última mensagem da conversa mais recente). */
  lastActivityAt?: string | null
  /** Preview da última mensagem, para a linha de contexto. */
  lastMessagePreview?: string | null
  /** Remetente da última mensagem — precisa da janela de 24h. */
  lastMessageSenderKind?: 'client' | 'operator' | 'ai' | 'campaign' | 'rule' | null
  /** Nome do último atendente atribuído (de getStats). */
  assignedTo?: string | null
  onBack: () => void
  onOpenChat: () => void
  onSendTemplate: () => void
  onAddNote: () => void
  /** Criar tarefa — opcional (só quando o módulo de tarefas está ativo). */
  onAddTask?: () => void
  onDelete: () => Promise<void> | void
  /** Compacto (mobile): esconde ações secundárias e tags. */
  compact?: boolean
}

const MAX_TAGS = 3

// Cor do chip da janela por estado (token semântico, theme-aware).
const WINDOW_CHIP: Record<WhatsAppWindowState, string> = {
  open:    'var(--color-status-active)',
  closing: 'var(--color-warning)',
  active:  'var(--color-status-info)',
  closed:  'var(--color-status-muted)',
}

/**
 * Header/hero persistente do perfil (padrão Salesforce "highlights panel"):
 * identidade + qualificação + estado operacional (janela de 24h, última
 * atividade, responsável) + ações primárias sobrevivem ao scroll.
 */
export function ContactProfileHeader({
  contact, lastActivityAt, lastMessagePreview, lastMessageSenderKind, assignedTo,
  onBack, onOpenChat, onSendTemplate, onAddNote, onAddTask, onDelete, compact = false,
}: ContactProfileHeaderProps) {
  const addToPipeline = useAddToPipeline()
  const { stages, pipelines } = useCRMConfig()
  const { vocab } = useTenantVocab()
  const salesPipeline = defaultSalesPipeline(pipelines)
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const canDelete = isAdminTier(user?.role)

  const handleCopyWa = () => {
    navigator.clipboard.writeText(contact.waId).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tags = contact.tags ?? []
  const shownTags = tags.slice(0, MAX_TAGS)
  const window24h = computeWhatsAppWindow({ lastMessageAt: lastActivityAt, lastMessageSenderKind })

  return (
    <div className={cn(compact ? 'px-3 pt-4 pb-3' : 'px-4 pt-5 pb-3.5')}>
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          title="Voltar para contatos"
          aria-label="Voltar para contatos"
          className="mt-0.5 p-2 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size={compact ? 'sm' : 'lg'} online={!!contact.lastSeenAt} />

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Linha 1 — identidade */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1 className={cn('font-display font-semibold text-surface-50 truncate', compact ? 'text-base' : 'text-xl')}>
              {contact.displayName || contact.waId}
            </h1>
            {contact.stage && <StageBadge stage={contact.stage} stages={stages} size={compact ? 'sm' : 'md'} />}
            {typeof contact.leadScore === 'number' && contact.leadScore > 0 && (
              <LeadScorePill score={contact.leadScore} />
            )}
            {!compact && shownTags.length > 0 && (
              <span className="hidden 2xl:flex items-center gap-1 min-w-0">
                {shownTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="color-chip inline-flex items-center rounded-md border px-1.5 py-px text-[11px] font-medium truncate max-w-[110px]"
                    style={{ ['--chip']: tag.color } as React.CSSProperties}
                  >
                    {tag.name}
                  </span>
                ))}
                {tags.length > MAX_TAGS && (
                  <span className="text-[11px] text-surface-400">+{tags.length - MAX_TAGS}</span>
                )}
              </span>
            )}
          </div>

          {/* Linha 2 — contexto operacional: número, empresa, última atividade, responsável */}
          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-xs text-surface-400 min-w-0">
            <button
              onClick={handleCopyWa}
              title="Copiar número"
              className="inline-flex items-center gap-1 hover:text-surface-200 transition-colors cursor-pointer"
            >
              {contact.waId}
              {copied ? <Check className="w-3 h-3 text-brand-400" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>

            {!compact && contact.company && (
              <span className="text-surface-400 truncate max-w-[220px]">
                <span className="text-surface-600">·</span> {contact.jobTitle ? `${contact.jobTitle}, ` : ''}{contact.company}
              </span>
            )}

            {!compact && lastActivityAt && (
              <span className="inline-flex items-center gap-1 text-surface-400 min-w-0">
                <span className="text-surface-600">·</span>
                <MessageCircle className="w-3 h-3 text-surface-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Última {relativeDate(lastActivityAt)}</span>
                {lastMessagePreview && (
                  <span className="text-surface-500 truncate max-w-[200px]">— {lastMessagePreview}</span>
                )}
              </span>
            )}

            {!compact && assignedTo && (
              <span className="inline-flex items-center gap-1 text-surface-400">
                <span className="text-surface-600">·</span>
                <UserCheck className="w-3 h-3 text-surface-500" />
                <span className="whitespace-nowrap">{assignedTo}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {window24h && (
            <span
              title={window24h.detail}
              className="color-chip hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{ ['--chip']: WINDOW_CHIP[window24h.state] } as React.CSSProperties}
            >
              <MessageCircle className="w-3 h-3" />
              {window24h.label}
            </span>
          )}
          {/* P2/A3 (SCRUM-965): "Novo negócio" é o único primary da ficha —
              "Conversar" virou secondary, como nas outras superfícies. */}
          <Button size="sm" variant="secondary" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={onOpenChat}>
            Conversar
          </Button>
          {/* A3 (SCRUM-925): ação primária da ficha — criar negócio deixa de
              depender de abrir o menu de funis (P2). O menu continua ao lado,
              para funil de processo e como atalho. */}
          {salesPipeline && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Handshake className="w-3.5 h-3.5" />}
              onClick={() => addToPipeline.requestAdd({
                contactId: contact.id,
                contactName: contact.displayName || contact.waId,
                pipeline: salesPipeline,
              })}
            >
              Novo {vocab.deal.toLowerCase()}
            </Button>
          )}
          {/* F9 (SCRUM-875): mesma ação da conversa, aqui sem conversa de origem. */}
          <AddToPipelineMenu
            contactId={contact.id}
            contactName={contact.displayName || contact.waId}
            size="sm"
            onPick={(pipeline) => addToPipeline.requestAdd({ contactId: contact.id, contactName: contact.displayName || contact.waId, pipeline })}
          />
          {addToPipeline.dialogs}
          {!compact && (
            <>
              <Button size="sm" variant="secondary" leftIcon={<StickyNote className="w-3.5 h-3.5" />} onClick={onAddNote}>
                Nota
              </Button>
              {onAddTask && (
                <Button size="sm" variant="secondary" leftIcon={<CalendarClock className="w-3.5 h-3.5" />} onClick={onAddTask}>
                  Tarefa
                </Button>
              )}
            </>
          )}
          <Dropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            align="right"
            anchor={
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Mais ações"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="p-2 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem icon={Send} onClick={() => { setMenuOpen(false); onSendTemplate() }}>
              Enviar template
            </DropdownItem>
            {compact && (
              <DropdownItem icon={StickyNote} onClick={() => { setMenuOpen(false); onAddNote() }}>
                Adicionar nota
              </DropdownItem>
            )}
            {canDelete && (
              <>
                <DropdownSeparator />
                <DropdownItem danger icon={Trash2} onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}>
                  Excluir contato
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); void onDelete() }}
        title="Excluir contato"
        description={`Esta ação é irreversível. O contato "${contact.displayName || contact.waId}" e todo o seu histórico serão excluídos permanentemente.`}
        confirmLabel="Excluir contato"
        danger
      />
    </div>
  )
}
