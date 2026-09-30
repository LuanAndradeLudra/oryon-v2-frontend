import { useEffect, useState, type ReactNode } from 'react'
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { contactsApi } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
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
  /** Ocupa 100% da largura — usado dentro do painel "Filtro". */
  fullWidth?: boolean
}) {
  const active = !!value
  return (
    <div className={cn('relative flex items-center', fullWidth && 'w-full')}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none h-7 pl-3 pr-7 rounded-sm text-xs font-semibold border transition-all cursor-pointer',
          fullWidth ? 'w-full' : 'flex-shrink-0',
          active
            ? 'border-brand-500 bg-accent-soft text-accent-dark'
            : 'border-[var(--bd2)] bg-surface-800 text-surface-100 hover:border-surface-500',
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className={cn('w-3 h-3 absolute right-2 pointer-events-none flex-shrink-0', active ? 'text-accent-dark' : 'text-surface-500')} />
    </div>
  )
}

// ─── Chip alternável (multi-seleção dentro do painel Filtro) ──────────────────

function ToggleChip({ active, onClick, children, title }: {
  active: boolean
  onClick: () => void
  children: ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-medium transition-colors max-w-full',
        active
          ? 'border-brand-500 bg-accent-soft text-accent-dark font-semibold'
          : 'border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]',
      )}
    >
      {children}
    </button>
  )
}

// ─── Grupo de filtros dentro do painel "Filtro" ───────────────────────────────

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold">{label}</p>
      {children}
    </div>
  )
}

// ─── Situação (multi-seleção) ─────────────────────────────────────────────────

/** Antes um chip na barra ("Situação · Qualificado"); a direção A tirou os chips
 *  da barra e a situação passa a morar no painel Filtro — com a MESMA contagem
 *  por situação de antes (pedido do usuário 22/09): o backend não tem endpoint
 *  de agregação, mas a listagem devolve `total` respeitando os filtros, então,
 *  ao abrir o painel, uma consulta leve (limit=1) por situação com os DEMAIS
 *  filtros ativos. Falha → sem número (nunca inventa). */
function StageGroup({ selected, onChange, baseFilters }: { selected: string[]; onChange: (keys: string[]) => void; baseFilters: ContactFilters }) {
  const { stages } = useCRMConfig()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const baseKey = JSON.stringify(baseFilters)
  useEffect(() => {
    if (stages.length === 0) return
    let cancelled = false
    const base = JSON.parse(baseKey) as ContactFilters
    Promise.all(stages.map((st) =>
      contactsApi.list({ ...base, stage: [st.key] }, 1, 1)
        .then((r) => [st.key, r.data.total] as const)
        .catch(() => null),
    )).then((rows) => {
      if (cancelled) return
      const next: Record<string, number> = {}
      rows.forEach((row) => { if (row) next[row[0]] = row[1] })
      setCounts(next)
    })
    return () => { cancelled = true }
  }, [baseKey, stages])
  if (stages.length === 0) return null
  const ordered = [...stages].sort((a, b) => a.order - b.order)
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  return (
    <FilterGroup label="Situação">
      <div className="flex flex-wrap gap-1.5" data-testid="contacts-filter-stage">
        {ordered.map((st) => (
          <ToggleChip key={st.key} active={selected.includes(st.key)} onClick={() => toggle(st.key)}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} aria-hidden />
            <span className="truncate">{st.label}</span>
            {counts[st.key] !== undefined && (
              <span className="text-2xs text-surface-500 tabular-nums">{counts[st.key].toLocaleString('pt-BR')}</span>
            )}
          </ToggleChip>
        ))}
      </div>
    </FilterGroup>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
//
// Direção A (DECISOES-PENDENTES #33): a barra é só busca (220) + botão "Filtro"
// + o que a página injetar à direita (`trailing`: Lista|Tabela, Colunas,
// Importar, Novo lead). Os chips Situação/Etiqueta saíram da barra e foram
// para dentro do painel Filtro — nenhum filtro se perde; o que está aplicado
// continua visível como chips removíveis ao lado do botão.

interface ContactsFiltersBarProps {
  filters: ContactFilters
  onFiltersChange: (f: ContactFilters) => void
  /** Etiquetas do tenant (a página já as busca para a barra de ação em massa). */
  tags: TagType[]
  /** Faceta "Situação comercial" (só multi-funil) — vive no painel Filtro. */
  commercial?: { value: string; options: { key: string; label: string }[]; onChange: (key: string) => void }
  /** Controles à direita da barra. Só desktop. */
  trailing?: ReactNode
}

export function ContactsFiltersBar({ filters, onFiltersChange, tags, commercial, trailing }: ContactsFiltersBarProps) {
  const { stages } = useCRMConfig()
  const [menuOpen, setMenuOpen] = useState(false)

  const set = (patch: Partial<ContactFilters>) => onFiltersChange({ ...filters, ...patch })

  const clearAll = () => onFiltersChange({ search: filters.search, sortBy: filters.sortBy })

  // Chips dos filtros aplicados — mantêm visível o que está ativo sem reabrir o painel.
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  const stageSel = filters.stage ?? []
  if (stageSel.length > 0) {
    const first = stages.find((s) => s.key === stageSel[0])
    chips.push({ key: 'stage', label: stageSel.length === 1 ? `Situação · ${first?.label ?? stageSel[0]}` : `Situação · ${stageSel.length}`, onRemove: () => set({ stage: undefined }) })
  }
  const tagSel = filters.tagId ?? []
  if (tagSel.length > 0) {
    const first = tags.find((t) => t.id === tagSel[0])
    chips.push({ key: 'tags', label: tagSel.length === 1 ? `Etiqueta · ${first?.name ?? '1'}` : `Etiquetas · ${tagSel.length}`, onRemove: () => set({ tagId: undefined }) })
  }
  if (filters.source)        chips.push({ key: 'source',    label: labelOf(SOURCES, filters.source) ?? 'Fonte',             onRemove: () => set({ source: undefined }) })
  if (commercial && commercial.value !== 'all') chips.push({ key: 'commercial', label: commercial.options.find((o) => o.key === commercial.value)?.label ?? 'Situação comercial', onRemove: () => commercial.onChange('all') })
  if (filters.intent)        chips.push({ key: 'intent',    label: labelOf(INTENTS, filters.intent) ?? 'Intenção',       onRemove: () => set({ intent: undefined }) })
  if (filters.sentiment)     chips.push({ key: 'sentiment', label: labelOf(SENTIMENTS, filters.sentiment) ?? 'Sentimento', onRemove: () => set({ sentiment: undefined }) })
  if (filters.leadScoreBand) chips.push({ key: 'lead',      label: labelOf(LEAD_BANDS, filters.leadScoreBand) ?? 'Lead score', onRemove: () => set({ leadScoreBand: undefined }) })
  if (filters.lastContact)   chips.push({ key: 'last',      label: labelOf(LAST_CONTACTS, filters.lastContact) ?? 'Atividade', onRemove: () => set({ lastContact: undefined }) })
  if (filters.optIn !== undefined) chips.push({ key: 'optin', label: filters.optIn ? 'Com opt-in' : 'Sem opt-in', onRemove: () => set({ optIn: undefined }) })

  return (
    // @container: os botões à direita (trailing) encolhem pela largura da
    // PRÓPRIA barra (muda com a barra lateral aberta ou recolhida).
    <div className="@container h-12 flex items-center gap-2 px-4 border-b border-surface-700 bg-surface-800">
      {/* Busca — 220px no desktop, largura total no mobile */}
      {/* 28/09: a busca pode encolher até 140 px quando falta espaço. */}
      <div className="relative flex-shrink-0 w-full md:w-[220px] md:min-w-[140px] md:flex-shrink">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
        <Input
          size="sm"
          type="search"
          inputMode="search"
          value={filters.search ?? ''}
          onChange={(e) => set({ search: e.target.value || undefined })}
          placeholder="Nome, telefone ou e-mail"
          aria-label="Buscar contatos"
          // [&::-webkit-search-cancel-button]:appearance-none: type="search"
          // já traz o teclado/label "Buscar" no mobile — sem isso o "x" nativo
          // do WebKit duplicaria o botão de limpar customizado logo abaixo.
          className="pl-8 pr-7 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {filters.search && (
          <button
            onClick={() => set({ search: undefined })}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Sem min-w-0: o grupo não encolhe abaixo do botão Filtro (antes
          encolhia a zero e o seletor Lista|Tabela passava por cima dele);
          quem encolhe é a faixa de chips, que já rola na horizontal. */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            data-testid="contacts-filter-button"
          >
            Filtro
            {chips.length > 0 && <span className="tabular-nums text-accent-dark">{chips.length}</span>}
          </Button>

          {menuOpen && (
            <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setMenuOpen(false)} />
          )}
          {menuOpen && (
            <div
              role="dialog"
              aria-label="Filtros de contatos"
              className="absolute left-0 top-full mt-1 z-50 w-80 max-h-[70vh] overflow-y-auto overlay-surface border rounded-lg p-3 flex flex-col gap-3"
            >
              <StageGroup
                selected={stageSel}
                onChange={(keys) => set({ stage: keys.length > 0 ? keys : undefined })}
                baseFilters={{ ...filters, stage: undefined, ...(commercial && commercial.value !== 'all' ? { commercial: commercial.value as ContactFilters['commercial'] } : {}) }}
              />

              {tags.length > 0 && (
                <FilterGroup label="Etiquetas">
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {tags.map((t) => (
                      <ToggleChip
                        key={t.id}
                        active={tagSel.includes(t.id)}
                        onClick={() => set({ tagId: tagSel.includes(t.id) ? (tagSel.length > 1 ? tagSel.filter((x) => x !== t.id) : undefined) : [...tagSel, t.id] })}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} aria-hidden />
                        <span className="truncate">{t.name}</span>
                      </ToggleChip>
                    ))}
                  </div>
                </FilterGroup>
              )}

              <FilterGroup label="Origem">
                <FilterSelect fullWidth value={filters.source ?? ''} onChange={(v) => set({ source: (v || undefined) as ContactSource | undefined })} placeholder="Fonte">
                  {SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FilterSelect>
              </FilterGroup>

              {commercial && (
                <FilterGroup label="Situação comercial">
                  <FilterSelect fullWidth value={commercial.value === 'all' ? '' : commercial.value} onChange={(v) => commercial.onChange(v || 'all')} placeholder="Todos">
                    {commercial.options.filter((o) => o.key !== 'all').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </FilterSelect>
                </FilterGroup>
              )}

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

        {/* Chips dos filtros aplicados — inline na mesma linha (README: nunca 2ª linha) */}
        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-[5px] h-7 pl-2.5 pr-1.5 rounded-sm text-xs font-semibold border border-brand-500 bg-accent-soft text-accent-dark whitespace-nowrap"
              >
                <span className="font-bold">{c.label}</span>
                <button onClick={c.onRemove} aria-label={`Remover ${c.label}`} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
            >
              <X className="w-2.5 h-2.5" />
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {trailing && (
        <div className="hidden md:flex items-center gap-1.5 ml-auto flex-shrink-0">{trailing}</div>
      )}
    </div>
  )
}
