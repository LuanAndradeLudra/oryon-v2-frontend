// ─── LibraryRail ───────────────────────────────────────────────────────────
// O rail de 232px da Biblioteca (D4/SCRUM-1023): busca no topo e os grupos de
// faceta com contagem à direita. Puramente apresentacional — quem decide
// quais grupos existem e quanto cada opção conta é `buildRail` em
// `libraryFilters.ts`, que é puro e testado sozinho.
//
// Os ícones ficam aqui, e não no modelo, de propósito: `libraryFilters.ts`
// não importa React nem lucide, e é isso que o mantém testável sem DOM.
import { Search, Layers, Megaphone, Info, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateStatus } from '@/types'
import type { LibraryFilters, RailGroup } from './libraryFilters'
import { STATUS_CHROME, type ChromeIcon } from './statusChrome'

type Axis = RailGroup['axis']

const CATEGORY_ICONS: Record<string, ChromeIcon> = {
  MARKETING:      Megaphone,
  UTILITY:        Info,
  AUTHENTICATION: KeyRound,
}

/** Idioma, uso e linha não têm ícone no mockup — só situação e categoria. */
function iconFor(axis: Axis, value: string): { icon: ChromeIcon; color?: string } | null {
  if (axis === 'status') {
    if (value === 'all') return { icon: Layers }
    const chrome = STATUS_CHROME[value as TemplateStatus]
    return chrome ? { icon: chrome.icon, color: chrome.color } : null
  }
  if (axis === 'category') {
    const icon = CATEGORY_ICONS[value]
    return icon ? { icon } : null
  }
  return null
}

interface LibraryRailProps {
  groups: RailGroup[]
  filters: LibraryFilters
  search: string
  onSearchChange: (value: string) => void
  onFilterChange: (axis: Axis, value: string) => void
}

export function LibraryRail({ groups, filters, search, onSearchChange, onFilterChange }: LibraryRailProps) {
  return (
    <nav
      aria-label="Filtros da biblioteca"
      className="flex flex-col gap-0.5 py-5 px-3.5 border-r border-surface-800 bg-surface-900/40 overflow-auto"
    >
      <div className="flex items-center gap-2 w-full mb-1.5 px-2.5 py-1.5 rounded-[8px] bg-surface-800 border border-surface-700 focus-within:border-brand-500">
        <Search className="w-3.5 h-3.5 text-surface-500 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar"
          aria-label="Buscar template por nome ou texto"
          className="w-full bg-transparent border-0 outline-none text-sm text-surface-100 placeholder:text-surface-400"
        />
      </div>

      {groups.map((group) => (
        <div key={group.axis} className="contents">
          <p className="mt-3 mb-1.5 flex items-center gap-2 text-3xs font-bold uppercase tracking-[0.14em] text-surface-500 after:content-[''] after:flex-1 after:h-px after:bg-surface-800">
            {group.title}
          </p>
          {group.options.map((option) => {
            const active = filters[group.axis] === option.value
            const decoration = iconFor(group.axis, option.value)
            const Icon = decoration?.icon
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(group.axis, option.value)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-[7px] rounded-[9px] text-xs text-left cursor-pointer transition-colors',
                  active ? 'bg-surface-800 text-surface-50' : 'text-surface-300 hover:bg-surface-800/50',
                )}
              >
                <span className="flex items-center min-w-0">
                  {Icon && (
                    <Icon
                      className="w-[13px] h-[13px] mr-2 shrink-0 text-surface-500"
                      style={decoration?.color ? { color: decoration.color } : undefined}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="text-[10.5px] text-surface-500 tabular-nums ml-2">{option.count}</span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
