import { ChevronRight, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { CardListView } from '@/components/common/CardListView'
import { hexToRgba, relativeDate } from '@/lib/utils'
import type { Contact } from '@/types'

interface ContactsMobileListProps {
  contacts: Contact[]
  loading: boolean
  onOpenPanel: (contact: Contact) => void
}

function ContactCard({
  contact,
  stageColor,
  stageLabel,
  onClick,
}: {
  contact: Contact
  stageColor?: string
  stageLabel?: string
  onClick: () => void
}) {
  const lastContactLabel = relativeDate(contact.lastContactedAt)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-surface-900/40 border border-surface-800 rounded-xl hover:bg-surface-900 active:bg-surface-800 transition-colors text-left"
    >
      <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-surface-50 truncate flex-1">
            {contact.displayName}
          </p>
          {stageLabel && stageColor && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{
                backgroundColor: hexToRgba(stageColor, 0.18),
                color: stageColor,
              }}
            >
              {stageLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          {contact.waId && (
            <>
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{contact.waId}</span>
            </>
          )}
          {lastContactLabel !== '—' && (
            <>
              <span className="text-surface-600">·</span>
              <span className="truncate">{lastContactLabel}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0" />
    </button>
  )
}

export function ContactsMobileList({ contacts, loading, onOpenPanel }: ContactsMobileListProps) {
  const { stages } = useCRMConfig()

  return (
    <CardListView
      items={contacts}
      getKey={(c) => c.id}
      isLoading={loading}
      className="gap-2 p-3"
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-sm font-medium text-surface-300 mb-1">Nenhum contato</p>
          <p className="text-xs text-surface-500">
            Use o + no canto para criar um contato.
          </p>
        </div>
      }
      renderCard={(contact) => {
        const stage = stages.find((s) => s.key === contact.stage)
        return (
          <ContactCard
            contact={contact}
            stageColor={stage?.color}
            stageLabel={stage?.label}
            onClick={() => onOpenPanel(contact)}
          />
        )
      }}
    />
  )
}
