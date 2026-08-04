import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Search, UserCircle2, Bot, BotOff, UserCheck, Users, ChevronDown, UserX,
  CalendarDays, Calendar as CalendarIcon, CalendarRange, CalendarSearch,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { DayPicker, type DateRange, useDayPicker, type MonthCaptionProps } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { resolveRange, type DateRangePreset } from '@/lib/dateRange'
import type { Contact, ConversationFilters, Tag, User } from '@/types'
import 'react-day-picker/style.css'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Custom month caption: renders the month label and the prev/next chevrons
// in the SAME flex row. By default react-day-picker v10 renders `nav` as a
// sibling of `months` (separate row), which left a vertical gap and pushed
// the chevrons to the right edge — operators wanted both compact and tucked
// to the left. With `hideNavigation` on DayPicker and this custom caption,
// the layout becomes "maio 2026  ◀ ▶" on a single row at the top.
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

// ── Team picker (Atendimento → "Equipe ▾") ──────────────────────────────────
//
// Chip-shaped dropdown that lists every active operator plus a "Sem
// atribuição" shortcut. Single-select. Closes on outside click. Built
// inline (not reusing ContactPicker above) because:
//   • Different data shape — User instead of Contact.
//   • Different "no selection" semantics — when the picker closes without a
//     choice the filter should clear rather than fall back to "all team".
//   • The chip visual matches the other handling chips, with a chevron tail
//     to signal "this opens a list".

function TeamPicker({
  allUsers,
  value,
  isActive,
  onChange,
}: {
  allUsers: User[]
  value: string | undefined
  isActive: boolean
  onChange: (v: 'unassigned' | string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // Anchored to the trigger button's viewport rect at open time so the
  // popover sits right under the chip even though it renders in a portal.
  // Recomputed on resize / scroll while open to stay glued to the trigger
  // (avoids the dropdown floating off when the operator scrolls the list).
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null)

  const updateAnchor = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setAnchor({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) })
  }

  useLayoutEffect(() => {
    if (!open) { setAnchor(null); return }
    updateAnchor()
    const onScroll = () => updateAnchor()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)  // capture: catch inner scrollers
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      // Outside-click closes — but clicks INSIDE the portal popover count
      // as inside (the popover lives in document.body, not under
      // triggerRef, so we need an explicit check on both refs).
      if (triggerRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false); setSearch('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // What the chip body shows when the picker is in an active state. Defaults
  // to the literal "Equipe" so the chip is recognisable even before the
  // operator picks anyone.
  const chipLabel = useMemo(() => {
    if (!isActive) return 'Equipe'
    if (value === 'unassigned') return 'Sem atribuição'
    const u = allUsers.find((x) => x.id === value)
    if (!u) return 'Equipe'
    const full = `${u.firstName} ${u.lastName ?? ''}`.trim()
    return full || 'Equipe'
  }, [isActive, value, allUsers])

  const filtered = useMemo(() => {
    if (!search) return allUsers
    const q = search.toLowerCase()
    return allUsers.filter((u) => {
      const full = `${u.firstName} ${u.lastName ?? ''}`.toLowerCase()
      return full.includes(q) || u.email.toLowerCase().includes(q)
    })
  }, [allUsers, search])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all',
          isActive
            ? 'bg-brand-600 text-surface-950 border border-brand-500/30'
            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200',
        )}
      >
        <Users className="w-3 h-3" />
        <span className="truncate max-w-[120px]">{chipLabel}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Popover renders into document.body via Portal so the parent's
          `overflow-x-auto` can't clip it. Position is `fixed` and tracked
          against the trigger's viewport rect (updated on scroll/resize). */}
      {open && anchor && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: anchor.width }}
          className="z-[9999] bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search — only shows when the team has enough members to justify it. */}
          {allUsers.length > 5 && (
            <div className="p-2 border-b border-surface-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar atendente..."
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-surface-700 border border-surface-600 rounded-lg text-surface-100 placeholder-surface-500 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            {/* "Sem atribuição" — always at the top so the most-used shortcut
                stays one click away (replaces the old standalone chip). */}
            <button
              type="button"
              onClick={() => { onChange('unassigned'); setOpen(false); setSearch('') }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all',
                value === 'unassigned'
                  ? 'bg-brand-600/15 text-brand-300 font-medium'
                  : 'text-surface-300 hover:bg-surface-700 hover:text-surface-100',
              )}
            >
              <UserX className="w-3.5 h-3.5 flex-shrink-0" />
              Sem atribuição
            </button>

            {filtered.length > 0 && (
              <div className="border-t border-surface-700/60" />
            )}

            {filtered.map((u) => {
              const full = `${u.firstName} ${u.lastName ?? ''}`.trim()
              const isPicked = value === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setSearch('') }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all',
                    isPicked
                      ? 'bg-brand-600/15 text-brand-300'
                      : 'text-surface-200 hover:bg-surface-700',
                  )}
                >
                  <Avatar name={full || u.email} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{full || u.email}</p>
                    <p className="text-[10px] text-surface-500 truncate">{u.email}</p>
                  </div>
                  {isPicked && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
                </button>
              )
            })}

            {filtered.length === 0 && search && (
              <p className="px-3 py-4 text-xs text-surface-500 text-center">
                Nenhum atendente encontrado
              </p>
            )}
          </div>

          {/* Clear footer — only shows when the filter is currently applied,
              so it doesn't add visual noise on a fresh open. */}
          {isActive && (
            <div className="border-t border-surface-700 p-1">
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setSearch('') }}
                className="w-full text-[11px] text-surface-400 hover:text-surface-200 px-2 py-1 rounded-md hover:bg-surface-700 transition-colors flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar filtro
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface ConversationFiltersBarProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  counts?: Partial<Record<string, number>>
  allTags?: Tag[]
  allContacts?: Contact[]
  /** Team roster — populates the "Equipe" dropdown. Required for the
   *  picker to render its list; if omitted, the dropdown only offers
   *  "Sem atribuição" (operators can't pick a specific colleague). */
  allUsers?: User[]
}

// Mutually-exclusive handling filter — collapses the (assignedTo × aiHandling)
// matrix into a single radio so the UI doesn't have to expose every combination.
// 'all' is the no-narrowing state; the others map to one server-side filter.
// 'team' is special: it covers BOTH "Sem atribuição" and "atribuído a algum
// usuário específico". The exact selection lives in `filters.assignedTo`
// (either the literal 'unassigned' or a UUID).
type HandlingFilterValue = 'all' | 'ai' | 'paused' | 'me' | 'team'

function resolveHandlingValue(f: ConversationFilters): HandlingFilterValue {
  if (f.aiHandling === 'active') return 'ai'
  if (f.aiHandling === 'paused') return 'paused'
  if (f.assignedTo === 'me') return 'me'
  if (f.assignedTo === 'unassigned') return 'team'
  if (f.assignedTo && f.assignedTo !== 'all' && UUID_REGEX.test(f.assignedTo)) return 'team'
  return 'all'
}

// Static handling chips. "Equipe" is rendered separately because it carries
// dropdown state (selected colleague / 'Sem atribuição').
const STATIC_HANDLING_CHIPS: Array<{
  value: 'all' | 'ai' | 'paused' | 'me'
  label: string
  icon: typeof Bot
}> = [
  { value: 'all',    label: 'Todas',      icon: Users     },
  { value: 'ai',     label: 'IA',         icon: Bot       },
  { value: 'paused', label: 'IA pausada', icon: BotOff    },
  { value: 'me',     label: 'Minhas',     icon: UserCheck },
]

// Period filter chips — sit between Status and Atendimento. Preset shortcuts
// resolve to BRT-aligned ranges via `resolveRange()`; "Personalizado" opens
// a calendar popover so the operator can pick an arbitrary range. The default
// (set in ConversationsPage) is 'today', and the operator can never end up
// with no range — clicking the currently-active chip re-applies it.
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

export function ConversationFiltersBar({
  filters, onFiltersChange, counts = {}, allTags = [], allContacts = [], allUsers = [],
}: ConversationFiltersBarProps) {
  const handlingValue = resolveHandlingValue(filters)
  const totalActiveFilters = [
    handlingValue !== 'all',
    filters.tagId,
  ].filter(Boolean).length

  // ── Period filter state ──────────────────────────────────────────────────
  // The active preset is derived from the current filters.startDate so the
  // chips stay in sync even if a parent component swaps the filters object
  // (e.g. initial load with default = 'today'). We compare ISO strings of
  // the start boundary to detect which preset is currently applied.
  const activePeriod = useMemo<DateRangePreset>(() => {
    if (!filters.startDate) return 'today'
    if (filters.startDate === resolveRange('today').startDate) return 'today'
    if (filters.startDate === resolveRange('yesterday').startDate) return 'yesterday'
    if (filters.startDate === resolveRange('last7').startDate) return 'last7'
    return 'custom'
  }, [filters.startDate])

  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    if (activePeriod === 'custom' && filters.startDate && filters.endDate) {
      return { from: new Date(filters.startDate), to: new Date(new Date(filters.endDate).getTime() - 1) }
    }
    return undefined
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Outside-click is handled by a transparent backdrop element rendered next
  // to the calendar (see JSX below) instead of a document-level mousedown
  // listener. The listener approach was unreliable with react-day-picker:
  // when the operator clicked a date, the picker briefly detached the
  // clicked button during its re-render, so the saved `e.target` ended up
  // outside `calendarRef.contains()` and the popover closed after the first
  // click. A backdrop sidesteps the issue entirely — clicks on the calendar
  // never reach the backdrop because they're consumed by the calendar div
  // above it in the z-stack.

  const applyPeriod = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      // Open the calendar; don't change the active filter until the operator
      // picks both endpoints. If they previously had a custom range, keep it
      // selected so reopening doesn't wipe their pick.
      setCalendarOpen(true)
      return
    }
    const range = resolveRange(preset)
    setCustomRange(undefined)
    onFiltersChange({ ...filters, startDate: range.startDate, endDate: range.endDate })
  }

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    // Just track the pending range — don't auto-apply or close. react-day-picker
    // reports `{from: X, to: X}` on a single click when there's a previous
    // selection, which made the auto-close fire too eagerly. The explicit
    // "Aplicar" button below disambiguates between "I'm still picking" and
    // "I'm done".
    setCustomRange(range)
  }

  const handleApplyCustomRange = () => {
    if (!customRange?.from || !customRange?.to) return
    const resolved = resolveRange('custom', customRange.from, customRange.to)
    onFiltersChange({ ...filters, startDate: resolved.startDate, endDate: resolved.endDate })
    setCalendarOpen(false)
  }

  const set = (patch: Partial<ConversationFilters>) =>
    onFiltersChange({ ...filters, ...patch })

  const setHandling = (v: 'all' | 'ai' | 'paused' | 'me') => {
    // Reset both axes first, then apply the picked one. Keeps the radio
    // exclusive even if the previous filter touched a different field.
    if (v === 'all')         set({ assignedTo: 'all', aiHandling: 'all' })
    else if (v === 'ai')     set({ assignedTo: 'all', aiHandling: 'active' })
    else if (v === 'paused') set({ assignedTo: 'all', aiHandling: 'paused' })
    else if (v === 'me')     set({ assignedTo: 'me',  aiHandling: 'all' })
  }

  /**
   * Apply a "Equipe" picker selection. Two cases:
   *   • picked === 'unassigned' → filter to conversations with no assignee
   *   • picked === <userId>     → filter to that colleague's conversations
   *   • picked === null         → clear the team filter
   * In every case aiHandling is reset so the radio stays mutually-exclusive
   * with the IA chip.
   */
  const setTeamFilter = (picked: 'unassigned' | string | null) => {
    if (picked === null) set({ assignedTo: 'all', aiHandling: 'all' })
    else                 set({ assignedTo: picked, aiHandling: 'all' })
  }

  const clearAll = () =>
    onFiltersChange({
      ...filters,
      assignedTo: 'all',
      aiHandling: 'all',
      tagId: undefined,
      contactId: undefined,
    })

  return (
    <div className="pl-3 pr-4 pb-2 space-y-2">

      {/* ── Row 1: Status tabs ─────────────────────────────────────────────────
          Layout strategy:
          - Counts >= 1000 collapse to "999+" so a tenant with high volume
            doesn't blow the badge width past what 4 tabs can fit in 418px.
          - overflow-x-auto stays as a safety net for edge cases (long
            translations, larger system fonts) so a tab never gets clipped.
          - mask-image fades the right edge when content overflows, giving
            the user a visual hint to scroll — the scrollbar itself is
            hidden via scrollbarWidth: 'none' for a cleaner look. */}
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
            : value === 'pending' ? 'bg-status-pending'
            : value === 'resolved' ? 'bg-status-active'
            : 'bg-white'
          return (
            <button
              key={value}
              onClick={() => set({ status: value })}
              className={cn(
                'relative flex items-center gap-1 px-2 py-1 pb-2 text-[12.5px] font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              {label}
              {(count ?? 0) > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none min-w-[18px] text-center',
                  isActive ? 'bg-white text-red-700' : 'bg-white text-red-700'
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
        {/* Spacer — garante padding direito no scroll */}
        <span className="flex-shrink-0 w-3 block" />
      </div>

      {/* ── Row 1.25: Período ────────────────────────────────────────────────
          Horizontal chips with the same visual rhythm as "Atendimento"
          (matching pill style, active state, scroll-x with fade mask). The
          "Personalizado" chip opens a calendar popover; on a complete range
          pick the popover closes and the filter is applied. Backend status
          counts respect the same range automatically because applyListFilters
          is shared between the data and count queries.

          Scrollbar is hidden (scrollbarWidth: 'none') to match the Status row
          above — keeps the filter strip visually clean. */}
      <div className="relative">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-1.5">
          Período
        </p>
        <div
          className="flex gap-1 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {PERIOD_CHIPS.map(({ value, label, icon: Icon }) => {
            const isActive = activePeriod === value
            return (
              <button
                key={value}
                onClick={() => applyPeriod(value)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all',
                  isActive
                    ? 'bg-brand-600 text-surface-950 border border-brand-500/30'
                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200',
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
          {/* Spacer — garante padding direito no scroll */}
          <span className="flex-shrink-0 w-3 block" />
        </div>

        {calendarOpen && (
          <>
            {/* Backdrop — captures clicks outside the calendar to close it.
                Sits below the calendar in the z-stack so clicks on the
                calendar itself never reach this layer. Fixed inset-0 means
                ANY click anywhere on the page that isn't on the calendar
                closes it (sidebar, chat area, header, etc). */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCalendarOpen(false)}
            />
            <div
              className="absolute top-full left-0 z-50 mt-1 w-[280px] bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden p-2"
              style={{
                // Tight 26px cells — readable but compact. Day numbers below
                // are sized at 13px so they fill the cell without crowding.
                // Fixed wrapper width (240px) prevents the footer text from
                // dilating the popover; the grid is `w-full table-fixed`
                // (see classNames) so the 7 columns spread evenly inside.
                ['--rdp-cell-size' as string]: '26px',
                ['--rdp-day-width' as string]: '26px',
                ['--rdp-day-height' as string]: '26px',
              } as React.CSSProperties}
            >
              <DayPicker
                mode="range"
                selected={customRange}
                onSelect={handleCustomRangeChange}
                locale={ptBR}
                numberOfMonths={1}
                showOutsideDays
                hideNavigation
                components={{ MonthCaption: MonthCaptionWithInlineNav }}
                className="text-surface-200"
                classNames={{
                  // Force the grid to fill the wrapper width so the day
                  // numbers spread evenly across the popover instead of
                  // hugging the left edge with empty space on the right.
                  // table-fixed makes every column equal width.
                  month_grid: 'w-full table-fixed',
                  weekday: 'text-[10px] text-surface-500 font-normal pb-0.5',
                  day: 'text-center',
                  day_button: 'text-[13px] font-medium w-full h-7 mx-auto',
                  today: 'text-brand-400 font-bold',
                  selected: 'bg-brand-600 text-surface-950 rounded-md',
                  range_start: 'bg-brand-600 text-surface-950 rounded-l-md',
                  range_end: 'bg-brand-600 text-surface-950 rounded-r-md',
                  range_middle: 'bg-brand-600/30 text-surface-100',
                }}
              />
              <div className="flex justify-between items-center gap-1.5 mt-2 pt-2 border-t border-surface-700">
                {/* Live preview of the picked range — confirms the two dates
                    before applying. Empty state is just a dash so the footer
                    fits the 240px wrapper without truncation. */}
                <span className="text-[11px] text-surface-400 px-0.5 whitespace-nowrap">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'dd/MM', { locale: ptBR })} – ${format(customRange.to, 'dd/MM', { locale: ptBR })}`
                    : customRange?.from
                      ? `${format(customRange.from, 'dd/MM', { locale: ptBR })} – ?`
                      : 'Selecione 2 datas'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setCustomRange(undefined); setCalendarOpen(false) }}
                    className="text-xs text-surface-300 hover:text-surface-100 px-2 py-0.5 rounded-md hover:bg-surface-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyCustomRange}
                    disabled={!customRange?.from || !customRange?.to}
                    className={cn(
                      'text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all',
                      customRange?.from && customRange?.to
                        ? 'bg-brand-600 text-surface-950 hover:bg-brand-500'
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

      {/* ── Row 1.5: Atendimento (Todas / IA / Minhas / Equipe ▾) ─────────────
          Single radio over (assignedTo × aiHandling) so the operator can
          pivot the list by who's currently replying. The "Equipe" chip is
          a dropdown that lists every active operator + a "Sem atribuição"
          shortcut at the top — this is what lets one colleague pick up
          conversations another operator was handling when she logged off. */}
      <div>
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-1.5">
          Atendimento
        </p>
        <div className="filter-scroll flex gap-1.5 overflow-x-auto pb-2">
          {STATIC_HANDLING_CHIPS.map(({ value, label, icon: Icon }) => {
            const isActive = handlingValue === value
            return (
              <button
                key={value}
                onClick={() => setHandling(value)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all',
                  isActive
                    ? 'bg-brand-600 text-surface-950 border border-brand-500/30'
                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            )
          })}
          <TeamPicker
            allUsers={allUsers}
            value={filters.assignedTo}
            isActive={handlingValue === 'team'}
            onChange={setTeamFilter}
          />
          {/* Spacer — garante padding direito no scroll */}
          <span className="flex-shrink-0 w-3 block" />
        </div>
      </div>

      {/* ── Row 2: Tags ─────────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div>
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold mb-1.5">
            Etiquetas
          </p>
          <div className="filter-scroll flex gap-1 overflow-x-auto pb-2">
            <button
              onClick={() => set({ tagId: undefined })}
              className={cn(
                'flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all',
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
                    'flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium transition-all',
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
          {handlingValue !== 'all' && (
            <span className="flex items-center gap-1 text-[11px] bg-brand-600/15 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/20">
              {handlingValue === 'ai' && 'IA'}
              {handlingValue === 'paused' && 'IA pausada'}
              {handlingValue === 'me' && 'Minhas'}
              {handlingValue === 'team' && (() => {
                if (filters.assignedTo === 'unassigned') return 'Sem atribuição'
                const picked = allUsers.find((u) => u.id === filters.assignedTo)
                return picked ? `Equipe: ${picked.firstName} ${picked.lastName ?? ''}`.trim() : 'Equipe'
              })()}
              <button onClick={() => setHandling('all')}>
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
