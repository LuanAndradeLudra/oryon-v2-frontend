import { useCallback, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal, ChevronRight, Phone, Check, Clock, Star, Building2,
  ExternalLink, Copy, CheckSquare, Square, ArrowRightLeft, Trash2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { contactsApi } from '@/services/api'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn, hexToRgba, formatRelativeTime } from '@/lib/utils'
import type { Contact, ContactStage, TenantStage } from '@/types'


interface KanbanCardProps {
  contact: Contact
  stages: TenantStage[]
  onOpenPanel: (contact: Contact) => void
  onMoveStage: (contact: Contact, stage: ContactStage) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  hasSelection?: boolean
  selectionCount?: number
  onDeleteSelected?: () => void
}

export function KanbanCard({
  contact,
  stages,
  onOpenPanel,
  onMoveStage,
  isSelected = false,
  onToggleSelect,
  hasSelection = false,
  selectionCount = 0,
  onDeleteSelected,
}: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)
  const navigate = useNavigate()
  const otherStages = stages.filter((s) => s.key !== contact.stage)
  const stageColor = stages.find((s) => s.key === contact.stage)?.color

  // Abre a conversa do contato DENTRO da plataforma (página de Conversas),
  // não o link externo wa.me. Busca a conversa mais recente do contato e
  // navega via ?id=<convId> (mesmo padrão do ContactDetailHeader). Sem
  // conversa, cai na lista de conversas.
  const handleOpenChat = useCallback(async (e: MouseEvent) => {
    e.stopPropagation()
    if (openingChat) return
    setOpeningChat(true)
    try {
      const r = await contactsApi.getConversations(contact.id)
      const conv = r.data?.data?.[0]
      navigate(conv ? `/conversations?id=${conv.id}` : '/conversations')
    } catch {
      navigate('/conversations')
    } finally {
      setOpeningChat(false)
    }
  }, [contact.id, navigate, openingChat])

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: 'Abrir CRM', icon: ExternalLink, onClick: () => onOpenPanel(contact) },
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
    if (onToggleSelect) {
      items.push({ separator: true })
      items.push({
        label: isSelected ? 'Desselecionar' : 'Selecionar',
        icon: isSelected ? Square : CheckSquare,
        onClick: () => onToggleSelect(contact.id),
      })
    }
    if (otherStages.length > 0) {
      items.push({ separator: true })
      items.push({
        label: 'Mover para',
        icon: ArrowRightLeft,
        children: otherStages.map((s) => ({
          label: s.label,
          icon: () => (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          ),
          onClick: () => onMoveStage(contact, s.key),
        })),
      })
    }
    if (onDeleteSelected && hasSelection && isSelected && selectionCount > 0) {
      items.push({ separator: true })
      items.push({
        label: `Excluir selecionados (${selectionCount})`,
        icon: Trash2,
        danger: true,
        onClick: onDeleteSelected,
      })
    }
    return items
  }, [contact, onOpenPanel, onMoveStage, onToggleSelect, isSelected, otherStages, hasSelection, selectionCount, onDeleteSelected])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  const handleClick = (e: MouseEvent) => {
    // Ctrl/Cmd+Click starts selection; if already selecting, a plain click toggles.
    if (onToggleSelect && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onToggleSelect(contact.id)
      return
    }
    if (onToggleSelect && hasSelection) {
      e.preventDefault()
      onToggleSelect(contact.id)
      return
    }
    onOpenPanel(contact)
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative bg-surface-800 border rounded-xl p-3.5 cursor-pointer transition-all group',
        isSelected
          ? 'border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/20'
          : 'border-surface-700/40 hover:border-brand-500/40 hover:bg-surface-700',
      )}
    >
      {onToggleSelect && (hasSelection || isSelected) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(contact.id)
          }}
          className={cn(
            'absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md border flex items-center justify-center z-10 transition-colors',
            isSelected
              ? 'bg-brand-500 border-brand-400 text-surface-950'
              : 'bg-surface-900 border-surface-600 text-transparent hover:border-brand-400',
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="xs" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-100 truncate leading-tight">{contact.displayName}</p>
            {contact.company && (
              <p className="text-[10px] text-surface-500 truncate leading-tight mt-0.5 flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                {contact.company}
              </p>
            )}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            align="right"
            className="w-52"
            anchor={
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="px-1 py-1 flex flex-col gap-0.5">
              <DropdownItem onClick={() => { onOpenPanel(contact); setMenuOpen(false) }}>
                Abrir CRM
              </DropdownItem>
              {otherStages.length > 0 && (
                <>
                  <DropdownSeparator />
                  <div className="px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" /> Mover para
                    </p>
                    {otherStages.map((s) => (
                      <DropdownItem
                        key={s.key}
                        onClick={() => { onMoveStage(contact, s.key); setMenuOpen(false) }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </DropdownItem>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Dropdown>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1.5">
        {(contact.source || contact.lastContactedAt) && (
          <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
            {contact.source && (
              <span className="capitalize inline-flex items-center gap-1">
                {contact.source === 'meta_ads' ? 'Meta Ads' : contact.source}
                {contact.source === 'meta_ads' && (
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: '#1877f2' }} />
                )}
              </span>
            )}
            {contact.source && contact.lastContactedAt && <span className="text-surface-700">·</span>}
            {contact.lastContactedAt && (
              <span
                className="inline-flex items-center gap-1"
                title={new Date(contact.lastContactedAt).toLocaleString('pt-BR')}
              >
                <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                {formatRelativeTime(contact.lastContactedAt)}
              </span>
            )}
          </div>
        )}
        {contact.waId && (
          <button
            type="button"
            onClick={handleOpenChat}
            disabled={openingChat}
            title="Abrir conversa no WhatsApp"
            className="self-start inline-flex items-center gap-1.5 text-[11px] text-surface-400 font-mono hover:text-status-active transition-colors"
          >
            <WhatsAppIcon variant="mono" size={13} className="text-status-active" />
            {contact.waId}
          </button>
        )}
      </div>

      {((contact.tags ?? []).length > 0 || (contact.leadScore ?? 0) > 0) && (
        <div className="mt-2.5 flex gap-1.5 flex-wrap items-center">
          {(contact.leadScore ?? 0) > 0 && (
            <span
              title={`Lead score: ${contact.leadScore}`}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400 inline-flex items-center gap-0.5"
            >
              <Star className="w-2.5 h-2.5" />
              {contact.leadScore}
            </span>
          )}
          {(contact.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
              style={{ color: tag.color, borderColor: hexToRgba(tag.color, 0.3), backgroundColor: hexToRgba(tag.color, 0.12) }}
            >
              {tag.name}
            </span>
          ))}
          {(contact.tags ?? []).length > 3 && (
            <span className="text-[10px] text-surface-500">+{(contact.tags ?? []).length - 3}</span>
          )}
        </div>
      )}

      {/* Stage accent — sits flush with the bottom border, tapers to transparent
          at both ends to feel like the line is dissolving into the card edge. */}
      {stageColor && (
        <span
          aria-hidden
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[95%] h-[2.25px] pointer-events-none opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${stageColor} 25%, ${stageColor} 75%, transparent 100%)`,
          }}
        />
      )}
    </div>
  )
}
