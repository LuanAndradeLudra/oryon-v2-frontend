import { useState } from 'react'
import { ChevronDown, Check, X, Tag as TagIcon } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import type { ConversationFilters, Tag } from '@/types'

interface TagFilterMenuProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  allTags: Tag[]
}

// Etiqueta filter as a header dropdown (multi-select), sitting next to the
// quick-filters (sliders) button. `filters.tagId` is a comma-separated list of
// tag IDs — the backend parses it (parseTagIds) and matches conversations
// carrying ANY of them (tagId IN (...)). Replaces the inline "Etiquetas" chip
// row that used to live in the list. Menu chrome is neutral; the dots carry the
// tag identity. The menu stays open while toggling so several can be picked.
export function TagFilterMenu({ filters, onFiltersChange, allTags }: TagFilterMenuProps) {
  const [open, setOpen] = useState(false)

  if (allTags.length === 0) return null

  const selectedIds = filters.tagId ? filters.tagId.split(',').filter(Boolean) : []
  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id))

  const apply = (ids: string[]) =>
    onFiltersChange({ ...filters, tagId: ids.length ? ids.join(',') : undefined })
  const toggle = (id: string) =>
    apply(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      align="left"
      className="w-56"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar por etiqueta"
          title={selectedTags.length ? `Etiquetas: ${selectedTags.map((t) => t.name).join(', ')}` : 'Filtrar por etiqueta'}
          className={cn(
            'inline-flex items-center gap-1 h-[22px] px-2 rounded-xs border text-[11px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
            selectedTags.length || open
              ? 'border-transparent bg-accent-soft text-accent-dark'
              : 'border-surface-700 text-surface-400 hover:text-surface-100',
          )}
        >
          {selectedTags.length === 1 && (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedTags[0].color }} />
          )}
          {/* PO, 23/09: na linha única (chips à esquerda, Minhas/Fila/Todas à
              direita) a palavra "Etiqueta" não cabe em 335px; em repouso vira
              só o ícone (aria-label/title continuam), e com seleção mostra o
              nome ou a contagem. */}
          {selectedTags.length === 0
            ? <TagIcon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} aria-hidden />
            : selectedTags.length === 1 ? selectedTags[0].name : `Etiqueta · ${selectedTags.length}`}
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </button>
      }
    >
      <div className="py-1 max-h-72 overflow-y-auto">
        <button
          type="button"
          onClick={() => apply([])}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
            selectedIds.length === 0 ? 'text-surface-50 bg-surface-700' : 'text-surface-200 hover:bg-surface-700/60',
          )}
        >
          <span className="w-2 h-2 rounded-full bg-surface-500 flex-shrink-0" />
          <span className="flex-1">Todas</span>
          {selectedIds.length === 0 && <Check className="w-4 h-4 flex-shrink-0 text-surface-200" />}
        </button>

        {allTags.map((tag) => {
          const active = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
                active ? 'text-surface-50 bg-surface-700' : 'text-surface-200 hover:bg-surface-700/60',
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 truncate">{tag.name}</span>
              {active && <Check className="w-4 h-4 flex-shrink-0 text-surface-200" />}
            </button>
          )
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="border-t border-surface-700 p-1">
          <button
            type="button"
            onClick={() => apply([])}
            className="w-full text-[11px] text-surface-400 hover:text-surface-200 px-2 py-1 rounded-md hover:bg-surface-700 transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      )}
    </Dropdown>
  )
}
