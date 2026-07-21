import { ChevronRight, Phone, Building2, Mail, TrendingUp, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { CardListView } from '@/components/common/CardListView'
import { DealsSummaryChips } from './ContactRow'
import { hexToRgba, relativeDate } from '@/lib/utils'
import type { Contact } from '@/types'

interface ContactsMobileListProps {
  contacts: Contact[]
  loading: boolean
  onOpenPanel: (contact: Contact) => void
  /** Abre o painel do contato direto na aba Negócios — toque num chip de negócio. */
  onOpenDeals?: (contact: Contact) => void
  /** Scroll infinito — dispara ao chegar perto do fim da lista. */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

const MAX_TAGS_VISIBLE = 3

function ContactCard({
  contact,
  stageColor,
  stageLabel,
  onClick,
  onOpenDeals,
}: {
  contact: Contact
  stageColor?: string
  stageLabel?: string
  onClick: () => void
  onOpenDeals?: (contact: Contact) => void
}) {
  const lastContactLabel = relativeDate(contact.lastContactedAt)
  const tags = contact.tags ?? []
  const visibleTags = tags.slice(0, MAX_TAGS_VISIBLE)
  const extraTags = tags.length - visibleTags.length
  const companyLine = [contact.jobTitle, contact.company].filter(Boolean).join(' · ')

  return (
    // `div role="button"` em vez de `<button>` — o chip de negócio (linha
    // abaixo) precisa ser um `<button>` real clicável por conta própria
    // (`DealsSummaryChips`), e `<button>` dentro de `<button>` é HTML inválido.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="w-full flex items-stretch gap-3 px-4 py-3.5 bg-surface-900/40 border border-surface-800 rounded-xl hover:bg-surface-900 active:bg-surface-800 transition-colors text-left cursor-pointer"
    >
      <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Linha 1: nome + estágio */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-surface-50 truncate flex-1">
            {contact.displayName}
          </p>
          {stageLabel && stageColor && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: hexToRgba(stageColor, 0.18),
                color: stageColor,
              }}
            >
              {stageLabel}
            </span>
          )}
        </div>

        {/* Linha 2: telefone + último contato */}
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

        {/* Linha 3: empresa / cargo (se houver) */}
        {companyLine && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{companyLine}</span>
          </div>
        )}

        {/* Linha 4: email (se houver e nao tiver empresa pra evitar 4 linhas) */}
        {contact.email && !companyLine && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}

        {/* Linha 5: lead score + intenção (compacto) */}
        {(contact.leadScore != null && contact.leadScore > 0) && (
          <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            <span className="text-surface-400 font-medium">Lead score:</span>
            <span className="text-surface-200 font-semibold tabular-nums">{contact.leadScore}</span>
          </div>
        )}

        {/* Linha 6: tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                style={{
                  backgroundColor: hexToRgba(tag.color, 0.18),
                  color: tag.color,
                }}
              >
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="text-[10px] text-surface-500 font-medium">+{extraTags}</span>
            )}
          </div>
        )}

        {/* Linha 7: negócios por funil — paridade com ContactRow (desktop) */}
        <DealsSummaryChips contact={contact} onOpenDeals={onOpenDeals} />
      </div>
      <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0 self-center" />
    </div>
  )
}

export function ContactsMobileList({ contacts, loading, onOpenPanel, onOpenDeals, hasMore, loadingMore, onLoadMore }: ContactsMobileListProps) {
  const { stages } = useCRMConfig()

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onLoadMore) return
    const el = e.currentTarget
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200) onLoadMore()
  }

  return (
    <div className="flex-1 overflow-auto" onScroll={handleScroll}>
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
              onOpenDeals={onOpenDeals}
            />
          )
        }}
      />
      {loadingMore && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 text-surface-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
