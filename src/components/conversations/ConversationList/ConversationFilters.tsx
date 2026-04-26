import { useState, useRef, useEffect } from 'react'
import { X, Search, UserCircle2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Contact, ConversationFilters, Tag } from '@/types'

// ── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'Todas',     value: 'all'      },
  { label: 'Abertas',   value: 'open'     },
  { label: 'Pendentes', value: 'pending'  },
  { label: 'Resolvidas',value: 'resolved' },
] as const

// ── Contact picker ───────────────────────────────────────────────────────────

function ContactPicker({
  contacts,
  selectedContactId,
  onSelect,
}: {
  contacts: Contact[]
  selectedContactId?: string
  onSelect: (id: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = contacts.find((c) => c.id === selectedContactId)
  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.waId.includes(search)
  )

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left',
          selectedContactId
            ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20'
            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
        )}
      >
        <UserCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 truncate">
          {selected ? selected.displayName : 'Todos os contatos'}
        </span>
        {selectedContactId ? (
          <X
            className="w-3 h-3 flex-shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onSelect(undefined) }}
          />
        ) : (
          <Search className="w-3 h-3 flex-shrink-0 opacity-40" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-surface-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-surface-700 border border-surface-600 rounded-lg text-surface-100 placeholder-surface-500 outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            <button
              onClick={() => { onSelect(undefined); setOpen(false); setSearch('') }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all',
                !selectedContactId
                  ? 'bg-brand-600/15 text-brand-300 font-medium'
                  : 'text-surface-400 hover:bg-surface-700 hover:text-surface-200'
              )}
            >
              <UserCircle2 className="w-4 h-4 flex-shrink-0" />
              Todos os contatos
            </button>

            {filtered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => { onSelect(contact.id); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all',
                  selectedContactId === contact.id
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-surface-200 hover:bg-surface-700'
                )}
              >
                <Avatar name={contact.displayName} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{contact.displayName}</p>
                  <p className="text-[10px] text-surface-500 truncate">{contact.waId}</p>
                </div>
                {selectedContactId === contact.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                )}
              </button>
            ))}

            {filtered.length === 0 && search && (
              <p className="px-3 py-4 text-xs text-surface-500 text-center">
                Nenhum contato encontrado
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface ConversationFiltersBarProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  counts?: Partial<Record<string, number>>
  allTags?: Tag[]
  allContacts?: Contact[]
}

export function ConversationFiltersBar({
  filters, onFiltersChange, counts = {}, allTags = [], allContacts = [],
}: ConversationFiltersBarProps) {
  const totalActiveFilters = [
    filters.assignedTo && filters.assignedTo !== 'all',
    filters.tagId,
  ].filter(Boolean).length

  const set = (patch: Partial<ConversationFilters>) =>
    onFiltersChange({ ...filters, ...patch })

  const clearAll = () =>
    onFiltersChange({ ...filters, assignedTo: 'all', tagId: undefined, contactId: undefined })

  return (
    <div className="pl-3 pr-4 pb-2 space-y-2">

      {/* ── Row 1: Status tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-0.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUS_TABS.map(({ label, value }) => {
          const isActive = filters.status === value
          const count = counts[value]
          const underlineColor = value === 'open' ? 'bg-status-open'
            : value === 'pending' ? 'bg-status-pending'
            : value === 'resolved' ? 'bg-status-active'
            : 'bg-white'
          return (
            <button
              key={value}
              onClick={() => set({ status: value })}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 py-1 pb-2 text-[12.5px] font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              {label}
              {(count ?? 0) > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none min-w-[19px] text-center',
                  isActive ? 'bg-white text-red-700' : 'bg-white text-red-700'
                )}>
                  {count}
                </span>
              )}
              <span className={cn(
                'absolute bottom-0 left-1 right-1 h-[2.5px] rounded-full transition-all',
                isActive ? underlineColor : 'bg-transparent'
              )} />
            </button>
          )
        })}
        {/* Spacer — garante padding direito no scroll */}
        <span className="flex-shrink-0 w-3 block" />
      </div>

      {/* ── Row 2: Tags ─────────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div>
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-1.5">
            Etiquetas
          </p>
          <div className="filter-scroll flex gap-1.5 overflow-x-auto pb-2">
            <button
              onClick={() => set({ tagId: undefined })}
              className={cn(
                'flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                !filters.tagId
                  ? 'bg-brand-600 text-surface-950 border border-brand-500/30'
                  : 'bg-surface-800 text-surface-500 hover:bg-surface-700 hover:text-surface-300'
              )}
            >
              Todas
            </button>
            {allTags.map((tag) => {
              const isActive = filters.tagId === tag.id
              return (
                <button
                  key={tag.id}
                  onClick={() => set({ tagId: isActive ? undefined : tag.id })}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                    isActive ? 'ring-2 ring-inset' : 'hover:opacity-90'
                  )}
                  style={{
                    backgroundColor: tag.color + (isActive ? '40' : '22'),
                    color: tag.color,
                    ...(isActive ? { ringColor: tag.color } : {}),
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              )
            })}
            {/* Spacer — garante padding direito no scroll */}
            <span className="flex-shrink-0 w-3 block" />
          </div>
        </div>
      )}

      {/* ── Active filter pills ──────────────────────────────────────────────── */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {filters.assignedTo && filters.assignedTo !== 'all' && (
            <span className="flex items-center gap-1 text-[11px] bg-brand-600/15 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/20">
              {filters.assignedTo === 'me' ? 'Minhas' : 'Sem atribuição'}
              <button onClick={() => set({ assignedTo: 'all' })}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.tagId && (() => {
            const tag = allTags.find((t) => t.id === filters.tagId)
            return tag ? (
              <span
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium"
                style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
              >
                {tag.name}
                <button onClick={() => set({ tagId: undefined })}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ) : null
          })()}

          <button
            onClick={clearAll}
            className="ml-auto text-[10px] text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1"
          >
            <X className="w-2.5 h-2.5" />
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
