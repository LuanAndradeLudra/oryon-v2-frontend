import { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronDown, Tag } from 'lucide-react'
import { cn, hexToRgba } from '@/lib/utils'
import { tagsApi } from '@/services/api'
import type { ContactFilters, ContactSource, Tag as TagType } from '@/types'

const SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'website',   label: 'Website' },
  { value: 'referral',  label: 'Indicação' },
  { value: 'campaign',  label: 'Campanha' },
  { value: 'manual',    label: 'Manual' },
]

const SORTS = [
  { value: 'lastContactedAt', label: 'Último contato' },
  { value: 'leadScore',       label: 'Lead score' },
  { value: 'displayName',     label: 'Nome (A-Z)' },
  { value: 'createdAt',       label: 'Mais recente' },
]

// ─── Custom select wrapper ────────────────────────────────────────────────────

function FilterSelect({ value, onChange, children, placeholder }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  placeholder?: string
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm bg-surface-800 border border-surface-700 text-surface-300 focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-surface-500 absolute right-2.5 pointer-events-none flex-shrink-0" />
    </div>
  )
}

// ─── Tag multiselect dropdown ─────────────────────────────────────────────────

function TagFilter({ selected, onChange }: {
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<TagType[]>([])
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tagsApi.list().then((res) => setTags(res.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-lg text-sm border transition-all',
          selected.length > 0
            ? 'bg-brand-600/15 border-brand-500/40 text-brand-300'
            : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600',
        )}
      >
        <Tag className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{selected.length > 0 ? `${selected.length} etiqueta${selected.length > 1 ? 's' : ''}` : 'Etiquetas'}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-surface-800 border border-surface-700 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
          <div className="p-2 border-b border-surface-700">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta..."
              className="w-full px-2.5 py-1.5 text-xs bg-surface-900/60 border border-surface-700 rounded-lg text-surface-100 placeholder:text-surface-500 outline-none focus:border-brand-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-3">Nenhuma etiqueta</p>
            ) : (
              filtered.map((t) => {
                const active = selected.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-surface-700/50 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs text-surface-200 flex-1 truncate">{t.name}</span>
                    {active && (
                      <span
                        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: hexToRgba(t.color, 0.25), color: t.color }}
                      >✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-surface-700">
              <button
                onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-xs text-surface-400 hover:text-surface-200 py-1 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ContactsFiltersBarProps {
  filters: ContactFilters
  onFiltersChange: (f: ContactFilters) => void
}

export function ContactsFiltersBar({ filters, onFiltersChange }: ContactsFiltersBarProps) {
  const hasFilters = !!filters.source || (filters.tagId?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 border-b border-surface-800">
      {/* Search + selects */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
          <input
            type="text"
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            placeholder="Buscar por nome, telefone, empresa ou etiqueta..."
            className="w-full pl-9 pr-9 py-2 rounded-lg text-sm bg-surface-800 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: undefined })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Source */}
        <FilterSelect
          value={filters.source ?? ''}
          onChange={(v) => onFiltersChange({ ...filters, source: (v || undefined) as ContactSource | undefined })}
          placeholder="Fonte"
        >
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </FilterSelect>

        {/* Tags */}
        <TagFilter
          selected={filters.tagId ?? []}
          onChange={(ids) => onFiltersChange({ ...filters, tagId: ids.length > 0 ? ids : undefined })}
        />

        {/* Sort */}
        <FilterSelect
          value={filters.sortBy ?? 'lastContactedAt'}
          onChange={(v) => onFiltersChange({ ...filters, sortBy: v as ContactFilters['sortBy'] })}
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </FilterSelect>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => onFiltersChange({ search: filters.search, sortBy: filters.sortBy })}
            className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1.5 rounded-lg hover:bg-brand-500/10 transition-all"
          >
            Limpar filtros
          </button>
        )}
      </div>

    </div>
  )
}
