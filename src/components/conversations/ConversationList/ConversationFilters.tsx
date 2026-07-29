import { useMemo } from 'react'
import { X } from 'lucide-react'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { resolveRange } from '@/lib/dateRange'
import { resolveHandlingValue, resolveActivePeriod } from '@/lib/conversationFilterState'
import type { ConversationFilters, Tag, User } from '@/types'

// ── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'Todas',     value: 'all'      },
  { label: 'Abertas',   value: 'open'     },
  { label: 'Pendentes', value: 'pending'  },
  { label: 'Resolvidas',value: 'resolved' },
] as const

const PERIOD_LABELS: Record<string, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: 'Últimos 7 dias',
  custom: 'Personalizado',
}

// ── Main component ───────────────────────────────────────────────────────────
//
// Inline filters that live in the list: only Status (tabs) and Etiquetas.
// Período and Atendimento moved into the "Filtros rápidos" menu (QuickFiltersMenu);
// this bar keeps a compact "active filters" summary so the operator can still see
// (and clear) a period/handling filter applied from that menu.

interface ConversationFiltersBarProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  counts?: Partial<Record<string, number>>
  allTags?: Tag[]
  /** Team roster — only used to label an active "Equipe" filter pill. */
  allUsers?: User[]
}

export function ConversationFiltersBar({
  filters, onFiltersChange, counts = {}, allTags = [], allUsers = [],
}: ConversationFiltersBarProps) {
  const set = (patch: Partial<ConversationFilters>) => onFiltersChange({ ...filters, ...patch })

  const handlingValue = resolveHandlingValue(filters)
  const activePeriod = resolveActivePeriod(filters)
  const periodActive = activePeriod !== 'today'
  const handlingActive = handlingValue !== 'all'
  const totalActiveFilters = [periodActive, handlingActive, filters.tagId].filter(Boolean).length

  const periodLabel = useMemo(() => {
    if (activePeriod === 'custom' && filters.startDate && filters.endDate) {
      const from = format(new Date(filters.startDate), 'dd/MM', { locale: ptBR })
      const to = format(new Date(new Date(filters.endDate).getTime() - 1), 'dd/MM', { locale: ptBR })
      return `${from}–${to}`
    }
    return PERIOD_LABELS[activePeriod] ?? 'Período'
  }, [activePeriod, filters.startDate, filters.endDate])

  const handlingLabel = useMemo(() => {
    if (handlingValue === 'ai') return 'IA'
    if (handlingValue === 'paused') return 'IA pausada'
    if (handlingValue === 'me') return 'Minhas'
    if (handlingValue === 'team') {
      if (filters.assignedTo === 'unassigned') return 'Sem atribuição'
      const u = allUsers.find((x) => x.id === filters.assignedTo)
      return u ? `Equipe: ${`${u.firstName} ${u.lastName ?? ''}`.trim()}` : 'Equipe'
    }
    return ''
  }, [handlingValue, filters.assignedTo, allUsers])

  const clearPeriod = () => {
    const r = resolveRange('today')
    set({ startDate: r.startDate, endDate: r.endDate })
  }
  const clearHandling = () => set({ assignedTo: 'all', aiHandling: 'all' })
  const removeTag = (id: string) => {
    const ids = (filters.tagId ?? '').split(',').filter(Boolean).filter((x) => x !== id)
    set({ tagId: ids.length ? ids.join(',') : undefined })
  }
  const clearAll = () => {
    const r = resolveRange('today')
    onFiltersChange({
      ...filters,
      assignedTo: 'all',
      aiHandling: 'all',
      tagId: undefined,
      startDate: r.startDate,
      endDate: r.endDate,
    })
  }

  return (
    <div className="pl-3 pr-4 pb-2 space-y-2">

      {/* ── Status tabs ─────────────────────────────────────────────────────────
          Counts >= 1000 collapse to "999+" so a high-volume tenant doesn't blow
          the badge width. overflow-x-auto + mask-image keep it clean if a tab
          would otherwise clip. */}
      <div
        className="flex gap-0.5 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)',
        }}
      >
        {STATUS_TABS.map(({ label, value }) => {
          const isActive = filters.status === value
          const count = counts[value]
          const displayCount = (count ?? 0) > 999 ? '999+' : count
          const underlineColor = value === 'open' ? 'bg-status-open'
            : value === 'pending' ? 'bg-cstatus-pending'
            : value === 'resolved' ? 'bg-cstatus-resolved'
            : 'bg-surface-400'
          return (
            <button
              key={value}
              onClick={() => set({ status: value })}
              className={cn(
                'relative flex items-center gap-1 px-2 py-1 pb-2 text-[12.5px] font-medium transition-all whitespace-nowrap',
                isActive ? 'text-surface-100' : 'text-surface-400 hover:text-surface-200'
              )}
            >
              {label}
              {(count ?? 0) > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none min-w-[18px] text-center',
                  // [A2] Aba ativa: badge neutralizado (era vermelho 'bg-danger/80 text-white').
                  //      Reverter = trocar 'bg-surface-200 text-surface-950' por 'bg-danger/80 text-white'.
                  isActive ? 'bg-surface-200 text-surface-950' : 'conv-tab-badge bg-surface-500 text-white'
                )}>
                  {displayCount}
                </span>
              )}
              <span className={cn(
                'absolute bottom-0 left-1 right-1 h-[2.5px] rounded-full transition-all',
                isActive ? underlineColor : 'bg-transparent'
              )} />
            </button>
          )
        })}
        <span className="flex-shrink-0 w-3 block" />
      </div>

      {/* ── Active filter summary — period / handling moved to the quick-filters
          menu, but stay visible (and clearable) here so the operator always
          sees what's narrowing the list. ───────────────────────────────────── */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {periodActive && (
            <span className="flex items-center gap-1 text-[11px] bg-surface-700 text-surface-100 px-2 py-0.5 rounded-full border border-surface-600">
              {periodLabel}
              <button onClick={clearPeriod} aria-label="Limpar período">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {handlingActive && (
            <span className="flex items-center gap-1 text-[11px] bg-surface-700 text-surface-100 px-2 py-0.5 rounded-full border border-surface-600">
              {handlingLabel}
              <button onClick={clearHandling} aria-label="Limpar atendimento">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {filters.tagId && allTags
            .filter((t) => (filters.tagId ?? '').split(',').includes(t.id))
            .map((tag) => (
              <span
                key={tag.id}
                className="color-chip flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium"
                style={{ ['--chip']: tag.color } as React.CSSProperties}
              >
                {tag.name}
                <button onClick={() => removeTag(tag.id)} aria-label={`Remover etiqueta ${tag.name}`}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

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
