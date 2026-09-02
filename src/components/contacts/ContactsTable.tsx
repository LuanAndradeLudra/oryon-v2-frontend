import { Loader2, UserX, Check, Minus } from 'lucide-react'
import { ContactRow } from './ContactRow'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { cn } from '@/lib/utils'
import type { Contact, ContactStage } from '@/types'

interface ContactsTableProps {
  contacts: Contact[]
  loading: boolean
  onOpenPanel: (contact: Contact) => void
  onOpenConversation?: (contact: Contact) => void
  onMoveStage?: (contact: Contact, stage: ContactStage) => void
  onOpenDeals?: (contact: Contact) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  onBulkDelete?: () => void
  /** Scroll infinito — dispara ao chegar perto do fim da tabela. */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function ContactsTable({
  contacts,
  loading,
  onOpenPanel,
  onOpenConversation,
  onMoveStage,
  onOpenDeals,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
  hasMore,
  loadingMore,
  onLoadMore,
}: ContactsTableProps) {
  // Gate de múltiplos funis (SCRUM-498): a coluna "Negócios" (chips por
  // funil) só existe com o flag — `ContactRow` omite a célula em paralelo.
  const multiPipeline = useMultiPipeline()
  const columns = [
    'Contato', 'Estágio', 'Score', 'Intenção', 'Sentimento', 'Tags',
    ...(multiPipeline ? ['Negócios'] : []),
    'Fonte', 'Último contato', 'Opt-in', '',
  ]
  // +1 = coluna do checkbox de seleção.
  const colSpan = columns.length + 1
  const hasSelection = (selectedIds?.size ?? 0) > 0
  const allSelected =
    contacts.length > 0 && contacts.every((c) => selectedIds?.has(c.id))
  const someSelected = hasSelection && !allSelected

  const handleHeaderCheck = () => {
    if (!onSelectAll) return
    if (allSelected) {
      onSelectAll([]) // clear all
    } else {
      onSelectAll(contacts.map((c) => c.id))
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onLoadMore) return
    const el = e.currentTarget
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 320) onLoadMore()
  }

  return (
    <div className="flex-1 overflow-auto" onScroll={handleScroll}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-900 border-b border-surface-800">
          <tr>
            <th className="px-4 py-2.5 w-10">
              {onSelectAll ? (
                <button
                  type="button"
                  onClick={handleHeaderCheck}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    allSelected || someSelected
                      ? 'bg-brand-500 border-brand-400 text-surface-950'
                      : 'bg-surface-900 border-surface-600 text-transparent hover:border-brand-400',
                  )}
                  aria-label={allSelected ? 'Deselecionar todos' : 'Selecionar todos'}
                >
                  {allSelected ? <Check className="w-3 h-3" /> : someSelected ? <Minus className="w-3 h-3" /> : null}
                </button>
              ) : null}
            </th>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && contacts.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                  <span className="text-sm text-surface-500">Carregando contatos...</span>
                </div>
              </td>
            </tr>
          ) : contacts.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="py-24 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-surface-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-300">Nenhum contato encontrado</p>
                    <p className="text-xs text-surface-500 mt-1">Tente ajustar os filtros ou adicione um novo contato</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                onOpenPanel={onOpenPanel}
                onOpenConversation={onOpenConversation}
                onMoveStage={onMoveStage}
                onOpenDeals={onOpenDeals}
                isSelected={selectedIds?.has(contact.id) ?? false}
                onToggleSelect={onToggleSelect}
                hasSelection={hasSelection}
                selectionCount={selectedIds?.size ?? 0}
                onDeleteSelected={onBulkDelete}
              />
            ))
          )}
          {loadingMore && contacts.length > 0 && (
            <tr>
              <td colSpan={colSpan} className="py-4 text-center">
                <Loader2 className="w-4 h-4 text-surface-500 animate-spin inline-block" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
