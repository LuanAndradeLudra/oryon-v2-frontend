import { useMemo, useState } from 'react'
import {
  X, CalendarDays, Calendar as CalendarIcon, CalendarRange, CalendarSearch,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { DayPicker, type DateRange, useDayPicker, type MonthCaptionProps } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { resolveActivePreset, resolveRange, type DateRangePreset } from '@/lib/dateRange'
import { resolveHandlingValue } from '@/lib/conversationFilterState'
import type { ConversationFilters, Tag, User } from '@/types'
import 'react-day-picker/style.css'

// ── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'Todas',     value: 'all'      },
  { label: 'Abertas',   value: 'open'     },
  { label: 'Pendentes', value: 'pending'  },
  { label: 'Resolvidas',value: 'resolved' },
] as const

// Period filter chips — restored inline from production (SCRUM-561/562). Preset
// shortcuts resolve to BRT-aligned ranges via `resolveRange()`; "Personalizado"
// opens a calendar popover for an arbitrary range. Clicking the ACTIVE chip
// clears the period filter — no chip lit means no period narrowing, which is
// also the state the `?id=` restore path leaves behind.
const PERIOD_CHIPS: Array<{
  value: DateRangePreset
  label: string
  icon: typeof CalendarDays
}> = [
  { value: 'today',     label: 'Hoje',            icon: CalendarDays },
  { value: 'yesterday', label: 'Ontem',           icon: CalendarIcon },
  { value: 'last7',     label: 'Últimos 7 dias',  icon: CalendarRange },
  { value: 'custom',    label: 'Personalizado',   icon: CalendarSearch },
]

// Month caption with inline prev/next chevrons (compact single-row header).
function MonthCaptionWithInlineNav({ calendarMonth }: MonthCaptionProps) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker()
  return (
    <div className="flex items-center gap-1.5 px-1 pb-2">
      <span className="text-sm font-semibold text-surface-100 capitalize">
        {format(calendarMonth.date, 'MMMM yyyy', { locale: ptBR })}
      </span>
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className="p-0.5 rounded hover:bg-surface-700 disabled:opacity-30 transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-surface-300" />
      </button>
      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className="p-0.5 rounded hover:bg-surface-700 disabled:opacity-30 transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
//
// Inline filters that live in the list: Status (tabs), the Período chip strip,
// and Etiquetas. Atendimento lives in the "Filtros rápidos" menu
// (QuickFiltersMenu); this bar keeps a compact "active filters" summary so the
// operator can still see (and clear) a handling filter applied from that menu.

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
  const handlingActive = handlingValue !== 'all'
  const totalActiveFilters = [handlingActive, filters.tagId].filter(Boolean).length

  // ── Period filter state ────────────────────────────────────────────────────
  // The active preset is derived from `filters.startDate` so the chips stay in
  // sync even when a parent swaps the filters object. `null` = no period
  // narrowing applied, in which case NO chip lights up (see resolveActivePreset).
  const activePeriod = useMemo(() => resolveActivePreset(filters.startDate), [filters.startDate])

  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    if (activePeriod === 'custom' && filters.startDate && filters.endDate) {
      return { from: new Date(filters.startDate), to: new Date(new Date(filters.endDate).getTime() - 1) }
    }
    return undefined
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const applyPeriod = (preset: DateRangePreset) => {
    // Clicking the chip that is ALREADY active turns the period filter off,
    // preserving every other filter (SCRUM-562). Same gesture for all chips.
    if (activePeriod === preset) {
      setCustomRange(undefined)
      setCalendarOpen(false)
      onFiltersChange({ ...filters, startDate: undefined, endDate: undefined })
      return
    }
    if (preset === 'custom') {
      // Open the calendar; don't change the active filter until the operator
      // picks both endpoints.
      setCalendarOpen(true)
      return
    }
    const range = resolveRange(preset)
    setCustomRange(undefined)
    onFiltersChange({ ...filters, startDate: range.startDate, endDate: range.endDate })
  }

  const handleApplyCustomRange = () => {
    if (!customRange?.from || !customRange?.to) return
    const resolved = resolveRange('custom', customRange.from, customRange.to)
    onFiltersChange({ ...filters, startDate: resolved.startDate, endDate: resolved.endDate })
    setCalendarOpen(false)
  }

  const handlingLabel = useMemo(() => {
    if (handlingValue === 'ai') return 'IA'
    if (handlingValue === 'me') return 'Minhas'
    if (handlingValue === 'team') {
      if (filters.assignedTo === 'unassigned') return 'Sem atribuição'
      const u = allUsers.find((x) => x.id === filters.assignedTo)
      return u ? `Equipe: ${`${u.firstName} ${u.lastName ?? ''}`.trim()}` : 'Equipe'
    }
    return ''
  }, [handlingValue, filters.assignedTo, allUsers])

  const clearHandling = () => set({ assignedTo: 'all', aiHandling: 'all' })
  const removeTag = (id: string) => {
    const ids = (filters.tagId ?? '').split(',').filter(Boolean).filter((x) => x !== id)
    set({ tagId: ids.length ? ids.join(',') : undefined })
  }
  const clearAll = () => {
    onFiltersChange({
      ...filters,
      assignedTo: 'all',
      aiHandling: 'all',
      tagId: undefined,
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

      {/* ── Período — faixa inline de chips (restaurada de produção) ────────────
          Estado ativo derivado de filters.startDate; clicar no chip ativo limpa
          o período preservando os demais filtros. "Personalizado" abre o
          calendário. Estética do design-system (tokens surface-*). */}
      <div className="relative">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-1.5">
          Período
        </p>
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {PERIOD_CHIPS.map(({ value, label, icon: Icon }) => {
            const isActive = activePeriod === value
            return (
              <button
                key={value}
                onClick={() => applyPeriod(value)}
                aria-pressed={isActive}
                title={isActive ? `${label} — clique para remover o filtro de período` : label}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all border',
                  isActive
                    ? 'bg-surface-700 text-surface-100 border-surface-600'
                    : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
                {value === 'custom' && activePeriod === 'custom' && customRange?.from && customRange?.to && (
                  <span className="text-[9px] opacity-80">
                    {format(customRange.from, 'dd/MM', { locale: ptBR })}–{format(customRange.to, 'dd/MM', { locale: ptBR })}
                  </span>
                )}
              </button>
            )
          })}
          <span className="flex-shrink-0 w-3 block" />
        </div>

        {calendarOpen && (
          <>
            {/* Backdrop — captures clicks outside the calendar to close it. */}
            <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
            <div
              className="absolute top-full left-0 z-50 mt-1 w-[280px] overlay-surface border rounded-xl overflow-hidden p-2"
              style={{
                ['--rdp-cell-size' as string]: '26px',
                ['--rdp-day-width' as string]: '26px',
                ['--rdp-day-height' as string]: '26px',
              } as React.CSSProperties}
            >
              <DayPicker
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                locale={ptBR}
                numberOfMonths={1}
                showOutsideDays
                hideNavigation
                components={{ MonthCaption: MonthCaptionWithInlineNav }}
                className="text-surface-200"
                classNames={{
                  month_grid: 'w-full table-fixed',
                  weekday: 'text-[10px] text-surface-500 font-normal pb-0.5',
                  day: 'text-center',
                  day_button: 'text-[13px] font-medium w-full h-7 mx-auto',
                  today: 'text-surface-50 font-bold underline underline-offset-2',
                  selected: 'bg-surface-600 text-surface-50 rounded-md',
                  range_start: 'bg-surface-600 text-surface-50 rounded-l-md',
                  range_end: 'bg-surface-600 text-surface-50 rounded-r-md',
                  range_middle: 'bg-surface-700/50 text-surface-100',
                }}
              />
              <div className="flex justify-between items-center gap-1.5 mt-2 pt-2 border-t border-surface-700">
                <span className="text-[11px] text-surface-400 px-0.5 whitespace-nowrap">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'dd/MM', { locale: ptBR })} – ${format(customRange.to, 'dd/MM', { locale: ptBR })}`
                    : customRange?.from
                      ? `${format(customRange.from, 'dd/MM', { locale: ptBR })} – ?`
                      : 'Selecione 2 datas'}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setCustomRange(undefined); setCalendarOpen(false) }}
                    className="text-xs text-surface-300 hover:text-surface-100 px-2 py-0.5 rounded-md hover:bg-surface-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    disabled={!customRange?.from || !customRange?.to}
                    className={cn(
                      'text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all',
                      customRange?.from && customRange?.to
                        ? 'bg-surface-700 text-surface-50 hover:bg-surface-600'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed',
                    )}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Active filter summary — handling moved to the quick-filters menu,
          but stays visible (and clearable) here so the operator always sees
          what's narrowing the list. ─────────────────────────────────────────── */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
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
