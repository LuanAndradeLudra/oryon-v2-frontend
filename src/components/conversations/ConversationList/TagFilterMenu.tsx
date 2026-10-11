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
      wrapperClassName="min-w-0"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar por etiqueta"
          title={selectedTags.length ? `Etiquetas: ${selectedTags.map((t) => t.name).join(', ')}` : 'Filtrar por etiqueta'}
          className={cn(
            // Mesmo vocabulário dos chips (Opção A, PO 23/09): tinta invertida
            // quando há etiqueta selecionada ou o menu está aberto; fundo neutro no resto.
            // SCRUM-1253: encolhe (min-w-0) e trunca o nome — antes um nome longo
            // vazava da coluna da lista e ficava cortado pela borda.
            'inline-flex items-center gap-1 h-6 px-2 rounded-[6px] border text-[11px] font-semibold whitespace-nowrap transition-colors min-w-0 max-w-full cursor-pointer',
            selectedTags.length || open
              ? 'border-[color:var(--ink-bd)] bg-[var(--ink-bg)] bg-(image:--ink-grad) text-[var(--ink-fg)] hover:bg-[var(--ink-bg-hover)] hover:bg-(image:--ink-grad-hover)'
              : 'border-surface-700 bg-surface-800 text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100',
          )}
        >

          {/* PO, 23/09: na linha única (chips à esquerda, Minhas/Fila/Todas à
              direita) a palavra "Etiqueta" não cabe em 335px; em repouso vira
              só o ícone (aria-label/title continuam), e com seleção mostra o
              nome ou a contagem. */}
          {/* SCRUM-1253: compacto sempre — ícone e, com seleção, a contagem. Os
              nomes ficam nas pílulas logo abaixo (com × para remover cada um). */}
          <TagIcon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} aria-hidden />
          {selectedTags.length > 0 && <span className="tabular-nums">{selectedTags.length}</span>}
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
            className="w-full text-[11px] text-surface-400 hover:text-surface-200 px-2 py-1 rounded-[6px] hover:bg-surface-700 transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      )}
    </Dropdown>
  )
}
