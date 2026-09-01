import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, Info,
  Check, Archive, ArrowLeft, MoreVertical, Handshake,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { ConfirmModal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, hexToRgba } from '@/lib/utils'
import { HandoffChip } from './AiHandoffBanner'
import { ConversationDealIndicator } from './ConversationDealIndicator'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { getActivePipelines } from '@/lib/utils'
import { useResolveWithOutcome } from '@/hooks/useResolveWithOutcome'
import { ResolveOutcomePopover } from './ResolveOutcomePopover'
import type { Conversation, DealOutcomeInput, Tag as TagType, User } from '@/types'

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
  /** F10 (SCRUM-882): ao resolver com desfecho, `dealOutcome` vai junto (fecha o registro-alvo antes de resolver). */
  onStatusChange: (status: 'open' | 'pending' | 'resolved', dealOutcome?: DealOutcomeInput) => void | Promise<void>
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
  conversation,
  onStatusChange, onToggleInfo, infoOpen,
  onArchive,
  onSetAiPause, onInterveneAi,
  onBack,
}: ChatHeaderProps) {
  const isMobile = useIsMobile()
  const { contact, status, whatsappNumber, assignedUser, tags = [] } = conversation
  // F9 (SCRUM-874): "Adicionar ao funil" a partir da conversa — o registro
  // nasce ligado a ela (`originConversationId`). O chip do cabeçalho
  // (`ConversationDealIndicator`) atualiza pelo socket `deal:changed`.
  const addToPipeline = useAddToPipeline()
  const { pipelines } = useCRMConfig()
  const { vocab } = useTenantVocab()
  /**
   * A3 (SCRUM-925): no mobile o cabeçalho não comporta o "Adicionar ao funil ▾",
   * então a ação vive no menu ⋯ e aponta direto para o funil de venda padrão —
   * o diálogo de 2 passos deixa trocar o funil no passo 1. Sem funil de venda
   * configurado, o item não aparece (nada a criar).
   */
  const salesPipeline =
    getActivePipelines(pipelines).find((p) => pipelineKindOf(p) === 'sales' && p.isDefault) ??
    getActivePipelines(pipelines).find((p) => pipelineKindOf(p) === 'sales') ??
    null
  // F10 (SCRUM-880): "Resolvida" com registro-alvo aberto → popover de desfecho
  // (prancheta 5); sem alvo, resolve como sempre.
  const resolve = useResolveWithOutcome({
    conversationId: conversation.id,
    contactId: contact.id,
    onResolve: (dealOutcome) => onStatusChange('resolved', dealOutcome),
  })

  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const closeAll = () => {
    setStatusOpen(false); setMoreOpen(false)
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
        onClick={() => { setMoreOpen(false); setStatusOpen((v) => !v) }}
        title="Alterar status"
        disabled={resolve.loading}
        aria-busy={resolve.loading || undefined}
        style={{ ['--chip']: status === 'resolved'
              ? 'var(--color-cstatus-resolved)'
              : status === 'pending'
                ? 'var(--color-cstatus-pending)'
                : 'var(--color-status-open)' } as React.CSSProperties}
        className={cn(
          'flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-all border',
          statusOpen
            ? 'color-chip'
            : 'status-trigger bg-surface-800 text-surface-300 border-surface-700',
        )}
      >
        <span className="max-w-[7rem] truncate">{statusTriggerLabel(status)}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-80', statusOpen && 'rotate-180')} />
      </button>

      {statusOpen && (
        <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setStatusOpen(false)} />
      )}
      {statusOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[11rem] py-1 overlay-surface border rounded-xl z-50 overflow-hidden">
          {STATUS_OPTIONS.map(({ value: v, label }) => {
            const active = status === v
            const statusBg = v === 'open'
              ? 'bg-status-open/20 hover:bg-status-open/32'
              : v === 'pending'
                ? 'bg-cstatus-pending/20 hover:bg-cstatus-pending/32'
                : 'bg-cstatus-resolved/20 hover:bg-cstatus-resolved/32'
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
                  if (!active) {
                    if (v === 'resolved') void resolve.requestResolve()
                    else void onStatusChange(v)
                  }
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
      <ResolveOutcomePopover
        open={!!resolve.target}
        mobile={isMobile}
        target={resolve.target}
        contactName={contact.displayName || contact.waId}
        currentAmountCents={resolve.currentAmountCents}
        busy={resolve.busy}
        onConfirm={resolve.confirm}
        onCancel={resolve.close}
      />
    </div>
  )

  // ─── Mobile compact layout ──────────────────────────────────────────────
  if (isMobile) {
    const visibleTags = tags.slice(0, 2)
    const extraTags = tags.length - visibleTags.length

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
          <div className="mt-0.5"><ConversationDealIndicator contactId={contact.id} whatsappNumberId={whatsappNumber.id} conversationId={conversation.id} /></div>
          {tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mt-0.5">
              {visibleTags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: hexToRgba(t.color, 0.18),
                    color: t.color,
                  }}
                >
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
              ))}
              {extraTags > 0 && (
                <span className="text-[10px] text-surface-500 font-medium">+{extraTags}</span>
              )}
            </div>
          )}
          {/* Handoff chip — wraps below the phone/tags row so the right-side
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
              icon={Info}
              onClick={() => { setMoreOpen(false); onToggleInfo() }}
              active={infoOpen}
            >
              Detalhes do contato
            </DropdownItem>
            {salesPipeline && (
              <DropdownItem
                icon={Handshake}
                onClick={() => {
                  setMoreOpen(false)
                  addToPipeline.requestAdd({
                    contactId: contact.id,
                    contactName: contact.displayName || contact.waId,
                    pipeline: salesPipeline,
                    conversationId: conversation.id,
                  })
                }}
              >
                Novo {vocab.deal.toLowerCase()}
              </DropdownItem>
            )}
            <DropdownItem
              icon={Archive}
              danger
              onClick={() => { setMoreOpen(false); setArchiveOpen(true) }}
            >
              Arquivar conversa
            </DropdownItem>
          </Dropdown>
        </div>

        {sharedOverlays}
        {/* A3: os diálogos do "Adicionar ao funil" (novo negócio, conflito I1,
            motivo do fechamento) só eram montados no layout desktop. */}
        {addToPipeline.dialogs}
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
          <div className="mt-1"><ConversationDealIndicator contactId={contact.id} whatsappNumberId={whatsappNumber.id} conversationId={conversation.id} /></div>
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
        <span className="w-px h-5 bg-surface-800" />

        {!isMobile && (
          <AddToPipelineMenu
            contactId={contact.id}
            contactName={contact.displayName || contact.waId}
            size="sm"
            onPick={(pipeline) => addToPipeline.requestAdd({ contactId: contact.id, contactName: contact.displayName || contact.waId, pipeline, conversationId: conversation.id })}
          />
        )}
        {addToPipeline.dialogs}

        {statusDropdown}

        <Tooltip content="Informações do contato" side="bottom">
          <button
            onClick={onToggleInfo}
            aria-label="Informações do contato"
            aria-expanded={infoOpen}
            className={cn(
              'ml-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
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

        <Tooltip content="Arquivar conversa" side="bottom">
          <button
            onClick={() => setArchiveOpen(true)}
            aria-label="Arquivar conversa"
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
