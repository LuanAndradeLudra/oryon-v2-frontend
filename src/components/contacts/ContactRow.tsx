import { useCallback, useState, type MouseEvent } from 'react'
import {
  MoreHorizontal, MessageSquare, ExternalLink, Smile, Meh, Frown, HelpCircle, Check, X,
  Phone, Copy, CheckSquare, Square, ArrowRightLeft, Trash2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { StageBadge } from './StageBadge'
import { LeadScorePill } from './LeadScorePill'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn, relativeDate } from '@/lib/utils'
import type { Contact, ContactStage } from '@/types'

const SENTIMENT_ICON = {
  positive: <Smile className="w-4 h-4 text-status-active" />,
  neutral:  <Meh className="w-4 h-4 text-surface-400" />,
  negative: <Frown className="w-4 h-4 text-red-400" />,
  unknown:  <HelpCircle className="w-4 h-4 text-surface-600" />,
}

const INTENT_CONFIG = {
  high:    { label: 'Alta',    chip: 'var(--color-status-active)' },
  medium:  { label: 'Média',   chip: 'var(--color-status-pending)' },
  low:     { label: 'Baixa',   chip: 'var(--color-status-muted)' },
  unknown: { label: '—',       chip: 'var(--color-status-muted)' },
}


interface ContactRowProps {
  contact: Contact
  onOpenPanel: (contact: Contact) => void
  onOpenConversation?: (contact: Contact) => void
  onMoveStage?: (contact: Contact, stage: ContactStage) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  hasSelection?: boolean
  selectionCount?: number
  onDeleteSelected?: () => void
}

export function ContactRow({
  contact,
  onOpenPanel,
  onOpenConversation,
  onMoveStage,
  isSelected = false,
  onToggleSelect,
  hasSelection = false,
  selectionCount = 0,
  onDeleteSelected,
}: ContactRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { stages } = useCRMConfig()
  const otherStages = stages.filter((s) => s.key !== contact.stage)

  const intent = contact.intent ?? 'unknown'
  const intentCfg = INTENT_CONFIG[intent]
  const sentimentIcon = SENTIMENT_ICON[contact.aiSentiment ?? 'unknown']

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
    if (onMoveStage && otherStages.length > 0) {
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

  const handleRowClick = (e: MouseEvent) => {
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
    <tr
      onClick={handleRowClick}
      onContextMenu={onContextMenu}
      className={cn(
        'border-b border-surface-800 cursor-pointer transition-colors group',
        isSelected ? 'bg-brand-500/5 hover:bg-brand-500/10' : 'hover:bg-surface-800/50',
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleSelect?.(contact.id)}
          disabled={!onToggleSelect}
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center transition-all',
            isSelected
              ? 'bg-brand-500 border-brand-400 text-surface-950'
              : 'bg-surface-900 border-surface-600 text-transparent',
            !isSelected && 'opacity-0 group-hover:opacity-100',
            !onToggleSelect && 'cursor-default',
          )}
          aria-label={isSelected ? 'Deselecionar' : 'Selecionar'}
        >
          <Check className="w-3 h-3" />
        </button>
      </td>

      {/* Contato */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-100 truncate">{contact.displayName}</p>
            <p className="text-[11px] text-surface-500 truncate">{contact.waId}</p>
          </div>
        </div>
      </td>

      {/* Estágio */}
      <td className="px-4 py-3">
        {contact.stage
          ? <StageBadge stage={contact.stage} stages={stages} />
          : <span className="text-surface-600 text-xs">—</span>}
      </td>

      {/* Score */}
      <td className="px-4 py-3">
        {contact.leadScore != null
          ? <LeadScorePill score={contact.leadScore} showIcon={false} className="text-xs" />
          : <span className="text-surface-600 text-sm font-semibold tabular-nums">—</span>}
      </td>

      {/* Intenção */}
      <td className="px-4 py-3">
        <span
          className="color-chip inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border"
          style={{ ['--chip']: intentCfg.chip } as React.CSSProperties}
        >
          {intentCfg.label}
        </span>
      </td>

      {/* Sentimento */}
      <td className="px-4 py-3">{sentimentIcon}</td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          {(contact.tags ?? []).slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="color-chip text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
              style={{ ['--chip']: tag.color } as React.CSSProperties}
            >
              {tag.name}
            </span>
          ))}
          {(contact.tags ?? []).length > 2 && (
            <span className="text-[10px] text-surface-500">+{(contact.tags ?? []).length - 2}</span>
          )}
        </div>
      </td>

      {/* Fonte */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-400 capitalize">
            {contact.source === 'meta_ads' ? 'Meta Ads' : contact.source ?? '—'}
          </span>
          {contact.source === 'meta_ads' && (
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: '#1877f2', opacity: 0.9 }} title="Meta Ads" />
          )}
        </div>
      </td>

      {/* Último contato */}
      <td className="px-4 py-3">
        <span className="text-xs text-surface-400 whitespace-nowrap">
          {relativeDate(contact.lastContactedAt)}
        </span>
      </td>

      {/* Opt-in */}
      <td className="px-4 py-3">
        {contact.optIn
          ? <Check className="w-4 h-4 text-status-active" />
          : <X className="w-4 h-4 text-surface-600" />
        }
      </td>

      {/* Ações */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="right"
          className="w-48"
          anchor={
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            <DropdownItem onClick={() => { onOpenPanel(contact); setMenuOpen(false) }}>
              <ExternalLink className="w-3.5 h-3.5" /> Abrir CRM
            </DropdownItem>
            {onOpenConversation && (
              <DropdownItem onClick={() => { onOpenConversation(contact); setMenuOpen(false) }}>
                <MessageSquare className="w-3.5 h-3.5" /> Ver conversa
              </DropdownItem>
            )}
          </div>
        </Dropdown>
      </td>
    </tr>
  )
}
