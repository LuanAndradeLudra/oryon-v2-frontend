import { useState } from 'react'
import { Tag as TagIcon, Check, X } from 'lucide-react'
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
      align="right"
      className="w-56"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar por etiqueta"
          title={selectedTags.length ? `Etiquetas: ${selectedTags.map((t) => t.name).join(', ')}` : 'Filtrar por etiqueta'}
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all border flex-shrink-0',
            selectedTags.length || open
              ? 'bg-surface-700 text-surface-100 border-surface-600'
              : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
          )}
        >
          <TagIcon className="w-4 h-4" />
          {selectedTags.length === 1 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-surface-950"
              style={{ backgroundColor: selectedTags[0].color }}
            />
          )}
          {selectedTags.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-surface-600 text-surface-50 text-[10px] font-semibold flex items-center justify-center ring-2 ring-surface-950">
              {selectedTags.length}
            </span>
          )}
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
