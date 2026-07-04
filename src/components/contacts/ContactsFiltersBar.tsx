import { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronDown, Tag, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tagsApi } from '@/services/api'
import type { ContactFilters, ContactSource, ContactSentiment, ContactIntent, Tag as TagType } from '@/types'

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

const INTENTS: { value: ContactIntent; label: string }[] = [
  { value: 'high',   label: 'Intenção alta' },
  { value: 'medium', label: 'Intenção média' },
  { value: 'low',    label: 'Intenção baixa' },
]

const SENTIMENTS: { value: ContactSentiment; label: string }[] = [
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral',  label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
]

const OPT_INS: { value: string; label: string }[] = [
  { value: 'true',  label: 'Com opt-in' },
  { value: 'false', label: 'Sem opt-in' },
]

const LEAD_BANDS: { value: NonNullable<ContactFilters['leadScoreBand']>; label: string }[] = [
  { value: 'high',   label: 'Score alto (80+)' },
  { value: 'medium', label: 'Score médio (50-79)' },
  { value: 'low',    label: 'Score baixo (<50)' },
]

const LAST_CONTACTS: { value: NonNullable<ContactFilters['lastContact']>; label: string }[] = [
  { value: '24h',  label: 'Contato < 24h' },
  { value: '7d',   label: 'Contato < 7 dias' },
  { value: '30d',  label: 'Contato < 30 dias' },
  { value: 'none', label: 'Sem contato' },
]

const labelOf = (arr: { value: string; label: string }[], v?: string) =>
  arr.find((o) => o.value === v)?.label

// ─── Custom select wrapper ────────────────────────────────────────────────────

function FilterSelect({ value, onChange, children, placeholder, fullWidth }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  placeholder?: string
  /** Ocupa 100% da largura — usado dentro do painel "Filtros". */
  fullWidth?: boolean
}) {
  return (
    <div className={cn('relative flex items-center', fullWidth && 'w-full')}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none pl-3 pr-8 py-2 rounded-lg text-sm bg-surface-800 border border-surface-700 text-surface-300 focus:outline-none focus:border-brand-500 transition-all cursor-pointer',
          fullWidth && 'w-full',
        )}
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
                        className="color-chip w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ ['--chip']: t.color } as React.CSSProperties}
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

// ─── Grupo de filtros dentro do painel "Filtros" ──────────────────────────────

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold">{label}</p>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
//
// Cabeçalho enxuto: busca + os 2 filtros mais usados inline (Fonte, Etiquetas) +
// um botão "Filtros" que agrupa o resto (IA, Atividade, Ordenar). Os filtros
// avançados ativos viram chips removíveis para não ficarem escondidos.

interface ContactsFiltersBarProps {
  filters: ContactFilters
  onFiltersChange: (f: ContactFilters) => void
}

export function ContactsFiltersBar({ filters, onFiltersChange }: ContactsFiltersBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (patch: Partial<ContactFilters>) => onFiltersChange({ ...filters, ...patch })

  // Filtros "avançados" — os que moram dentro do botão. Contam pro badge.
  const advancedCount = [
    filters.intent,
    filters.sentiment,
    filters.leadScoreBand,
    filters.lastContact,
    filters.optIn !== undefined ? 'x' : undefined,
  ].filter(Boolean).length

  const clearAll = () => onFiltersChange({ search: filters.search, sortBy: filters.sortBy })

  // Chips dos filtros avançados ativos — mantêm visível o que está aplicado sem
  // precisar reabrir o painel.
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (filters.intent)        chips.push({ key: 'intent',    label: labelOf(INTENTS, filters.intent) ?? 'Intenção',       onRemove: () => set({ intent: undefined }) })
  if (filters.sentiment)     chips.push({ key: 'sentiment', label: labelOf(SENTIMENTS, filters.sentiment) ?? 'Sentimento', onRemove: () => set({ sentiment: undefined }) })
  if (filters.leadScoreBand) chips.push({ key: 'lead',      label: labelOf(LEAD_BANDS, filters.leadScoreBand) ?? 'Lead score', onRemove: () => set({ leadScoreBand: undefined }) })
  if (filters.lastContact)   chips.push({ key: 'last',      label: labelOf(LAST_CONTACTS, filters.lastContact) ?? 'Atividade', onRemove: () => set({ lastContact: undefined }) })
  if (filters.optIn !== undefined) chips.push({ key: 'optin', label: filters.optIn ? 'Com opt-in' : 'Sem opt-in', onRemove: () => set({ optIn: undefined }) })

  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 border-b border-surface-800">
      <div className="flex items-center gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
          <input
            type="text"
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
            placeholder="Buscar por nome, telefone, empresa ou etiqueta..."
            className="w-full pl-9 pr-9 py-2 rounded-lg text-sm bg-surface-800 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => set({ search: undefined })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Inline: Fonte + Etiquetas + botão Filtros (só desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <FilterSelect
            value={filters.source ?? ''}
            onChange={(v) => set({ source: (v || undefined) as ContactSource | undefined })}
            placeholder="Fonte"
          >
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </FilterSelect>

          <TagFilter
            selected={filters.tagId ?? []}
            onChange={(ids) => set({ tagId: ids.length > 0 ? ids : undefined })}
          />

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-lg text-sm border transition-all',
                advancedCount > 0
                  ? 'bg-brand-600/15 border-brand-500/40 text-brand-300'
                  : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600',
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Filtros</span>
              {advancedCount > 0 && (
                <span
                  className="color-chip inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold border"
                  style={{ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties}
                >
                  {advancedCount}
                </span>
              )}
              <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform', menuOpen && 'rotate-180')} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-surface-800 border border-surface-700 rounded-xl shadow-xl shadow-black/40 p-3 flex flex-col gap-3">
                <FilterGroup label="IA">
                  <FilterSelect fullWidth value={filters.intent ?? ''} onChange={(v) => set({ intent: (v || undefined) as ContactIntent | undefined })} placeholder="Intenção">
                    {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </FilterSelect>
                  <FilterSelect fullWidth value={filters.sentiment ?? ''} onChange={(v) => set({ sentiment: (v || undefined) as ContactSentiment | undefined })} placeholder="Sentimento">
                    {SENTIMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </FilterSelect>
                  <FilterSelect fullWidth value={filters.leadScoreBand ?? ''} onChange={(v) => set({ leadScoreBand: (v || undefined) as ContactFilters['leadScoreBand'] })} placeholder="Lead score">
                    {LEAD_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </FilterSelect>
                </FilterGroup>

                <FilterGroup label="Atividade">
                  <FilterSelect fullWidth value={filters.lastContact ?? ''} onChange={(v) => set({ lastContact: (v || undefined) as ContactFilters['lastContact'] })} placeholder="Atividade">
                    {LAST_CONTACTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </FilterSelect>
                  <FilterSelect fullWidth value={filters.optIn === undefined ? '' : String(filters.optIn)} onChange={(v) => set({ optIn: v === '' ? undefined : v === 'true' })} placeholder="Opt-in">
                    {OPT_INS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </FilterSelect>
                </FilterGroup>

                <FilterGroup label="Ordenar por">
                  <FilterSelect fullWidth value={filters.sortBy ?? 'lastContactedAt'} onChange={(v) => set({ sortBy: v as ContactFilters['sortBy'] })}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </FilterSelect>
                </FilterGroup>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chips dos filtros avançados ativos */}
      {chips.length > 0 && (
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 text-[11px] bg-surface-700 text-surface-100 pl-2.5 pr-1.5 py-0.5 rounded-full border border-surface-600"
            >
              {c.label}
              <button onClick={c.onRemove} aria-label={`Remover ${c.label}`} className="text-surface-400 hover:text-surface-100">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="ml-auto text-[10px] text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1"
          >
            <X className="w-2.5 h-2.5" />
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  )
}
