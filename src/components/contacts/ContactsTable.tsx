import { Loader2, UserX, Check, Minus } from 'lucide-react'
import { ContactRow } from './ContactRow'
import { cn } from '@/lib/utils'
import type { Contact, ContactStage } from '@/types'

interface ContactsTableProps {
  contacts: Contact[]
  loading: boolean
  onOpenPanel: (contact: Contact) => void
  onOpenConversation?: (contact: Contact) => void
  onMoveStage?: (contact: Contact, stage: ContactStage) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  onBulkDelete?: () => void
}

export function ContactsTable({
  contacts,
  loading,
  onOpenPanel,
  onOpenConversation,
  onMoveStage,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
}: ContactsTableProps) {
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

  return (
    <div className="flex-1 overflow-auto">
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
            {['Contato', 'Estágio', 'Score', 'Intenção', 'Sentimento', 'Tags', 'Fonte', 'Último contato', 'Opt-in', ''].map((col) => (
              <th key={col} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && contacts.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                  <span className="text-sm text-surface-500">Carregando contatos...</span>
                </div>
              </td>
            </tr>
          ) : contacts.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-24 text-center">
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
                isSelected={selectedIds?.has(contact.id) ?? false}
                onToggleSelect={onToggleSelect}
                hasSelection={hasSelection}
                selectionCount={selectedIds?.size ?? 0}
                onDeleteSelected={onBulkDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
