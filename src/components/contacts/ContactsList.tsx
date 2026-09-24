import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Loader2, UserX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { ContactListRow } from './ContactListRow'
import type { Contact } from '@/types'

// Direção A (DECISOES-PENDENTES #33): a lista de pessoas. Mesmo contrato de
// dados da ContactsTable — quem manda no fetch, na seleção e no painel é a
// página; aqui só a apresentação, o scroll infinito e a memória de rolagem.

interface ContactsListProps {
  contacts: Contact[]
  loading: boolean
  /** Contato com o painel aberto. */
  activeId: string | null
  /** `touch` (mobile): linhas sem checkbox nem ações inline — ver ContactListRow. */
  variant?: 'default' | 'touch'
  selectedIds?: Set<string>
  onOpen: (contact: Contact, e: React.MouseEvent) => void
  onToggleSelect?: (id: string) => void
  onOpenConversation?: (contact: Contact) => void
  onSendTemplate?: (contact: Contact) => void
  onOpenProfile?: (contact: Contact) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** SCRUM-1068: guarda externa do scrollTop (useListScrollMemory). */
  scrollPositionRef?: MutableRefObject<number>
}

function SkeletonRows({ touch }: { touch: boolean }) {
  return (
    <div aria-hidden className="px-2 py-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[52px] flex items-center gap-3 pl-3 pr-2.5 animate-pulse">
          {!touch && <span className="w-[14px] flex-shrink-0" />}
          <span className="w-8 h-8 rounded-full bg-[var(--sf2)] flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className="h-3 w-40 rounded-2xs bg-[var(--sf2)]" />
            <span className="h-2.5 w-64 max-w-full rounded-2xs bg-[var(--sf2)]" />
          </div>
          <span className="h-5 w-20 rounded-xs bg-[var(--sf2)] flex-shrink-0" />
          <span className={touch ? 'h-3 w-10 rounded-2xs bg-[var(--sf2)] flex-shrink-0' : 'h-3 w-24 rounded-2xs bg-[var(--sf2)] flex-shrink-0'} />
        </div>
      ))}
    </div>
  )
}

export function ContactsList({
  contacts, loading, activeId, variant = 'default', selectedIds,
  onOpen, onToggleSelect, onOpenConversation, onSendTemplate, onOpenProfile,
  hasMore, loadingMore, onLoadMore, scrollPositionRef,
}: ContactsListProps) {
  const { stages } = useCRMConfig()
  const listRef = useRef<HTMLDivElement>(null)

  // Restaura a posição antes do 1º paint — a lista remonta ao voltar de
  // /contacts/:id, então a ref vem de um armazenamento que sobrevive ao unmount.
  useLayoutEffect(() => {
    if (!listRef.current || !scrollPositionRef) return
    listRef.current.scrollTop = scrollPositionRef.current
  }, [scrollPositionRef])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (scrollPositionRef) scrollPositionRef.current = el.scrollTop
    if (!hasMore || loadingMore || !onLoadMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 320) onLoadMore()
  }

  const selectionMode = (selectedIds?.size ?? 0) > 0

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
      aria-label="Lista de contatos"
      aria-busy={loading || undefined}
    >
      {loading && contacts.length === 0 ? (
        <SkeletonRows touch={variant === 'touch'} />
      ) : contacts.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            icon={UserX}
            title="Nenhum contato encontrado"
            hint="Tente ajustar os filtros ou adicione um novo contato"
          />
        </div>
      ) : (
        <div className="px-2 py-1">
          {contacts.map((c) => (
            <ContactListRow
              key={c.id}
              contact={c}
              stages={stages}
              active={activeId === c.id}
              variant={variant}
              checked={selectedIds?.has(c.id) ?? false}
              selectionMode={selectionMode}
              onOpen={onOpen}
              onToggleSelect={onToggleSelect}
              onOpenConversation={onOpenConversation}
              onSendTemplate={onSendTemplate}
              onOpenProfile={onOpenProfile}
            />
          ))}
          {loadingMore && (
            <div className="py-4 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-surface-500 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
