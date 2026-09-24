import { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ListFilter, CalendarDays, Calendar as CalendarIcon, CalendarRange, CalendarSearch,
  Users, BotOff, UserX, Tag as TagIcon, AlertTriangle,
  ChevronRight, ChevronLeft, Check, X, Search,
} from 'lucide-react'
import { DayPicker, type DateRange, useDayPicker, type MonthCaptionProps } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { resolveHandlingValue } from '@/lib/conversationFilterState'
import { resolveActivePreset, resolveRange, type DateRangePreset } from '@/lib/dateRange'
import type { ConversationFilters, User } from '@/types'
import 'react-day-picker/style.css'

const MENU_W = 280

// R2-1D-FILT (RODADA-2.md): o segmentado Minhas/Fila/Todas e os chips Não lidas,
// Com IA, SLA e Etiqueta agora ficam na barra da lista (ConversationFilters).
// Este menu guarda o que o mock NÃO mostra na barra — status, período, IA
// pausada, Equipe, sem etiqueta e verificação. Nada foi removido, só movido.
const STATUS_ITEMS = [
  { label: 'Todas',      value: 'all'      },
  { label: 'Abertas',    value: 'open'     },
  { label: 'Pendentes',  value: 'pending'  },
  { label: 'Resolvidas', value: 'resolved' },
] as const

const PERIOD_ITEMS: Array<{ value: DateRangePreset; label: string; icon: typeof CalendarDays }> = [
  { value: 'today',     label: 'Hoje',           icon: CalendarDays },
  { value: 'yesterday', label: 'Ontem',          icon: CalendarIcon },
  { value: 'last7',     label: 'Últimos 7 dias', icon: CalendarRange },
  { value: 'custom',    label: 'Personalizado',  icon: CalendarSearch },
]

const QUICK_TOGGLES: Array<{ key: 'untagged' | 'needsReview'; label: string; icon: typeof TagIcon }> = [
  { key: 'untagged',    label: 'Sem etiqueta',            icon: TagIcon },
  { key: 'needsReview', label: 'Precisam de verificação', icon: AlertTriangle },
]

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

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-[.14em] text-surface-500 font-bold">
      {children}
    </p>
  )
}

function MenuRow({
  icon: Icon, active, chevron, pressed, onClick, children, trailing, leading, className,
}: {
  icon?: typeof Users
  active?: boolean
  chevron?: boolean
  pressed?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  trailing?: React.ReactNode
  /** Marca antes do rótulo (ex.: ponto colorido do status). */
  leading?: React.ReactNode
  /** Tinta própria da linha (status com sua cor) — vence o hover/ativo neutros. */
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
        active ? 'text-surface-50 bg-[var(--rowhover)]' : 'text-surface-200 hover:bg-[var(--rowhover)]',
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0 opacity-90" />}
      {leading}
      <span className="flex-1 truncate">{children}</span>
      {trailing}
      {active && !chevron && <Check className="w-4 h-4 flex-shrink-0 text-surface-200" />}
      {chevron && <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60" />}
    </button>
  )
}

interface QuickFiltersMenuProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  /** Team roster — drives the "Equipe" flyout. Omitted callers only get the
   *  "Sem atribuição" shortcut. */
  allUsers?: User[]
  /** Conversas que precisam de verificação (server-side, mesmo escopo da
   *  lista). Aparece como contador âmbar no item "Precisam de verificação";
   *  0 esconde o contador. */
  needsReviewCount?: number
  /** Contagem por status (backend) — mostrada ao lado de cada linha de Status. */
  counts?: Partial<Record<string, number>>
}

export function QuickFiltersMenu({ filters, onFiltersChange, allUsers = [], needsReviewCount = 0, counts = {} }: QuickFiltersMenuProps) {
  const [open, setOpen] = useState(false)
  const [flyout, setFlyout] = useState<null | 'team'>(null)
  const [teamSearch, setTeamSearch] = useState('')

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const flyoutItemRef = useRef<HTMLButtonElement | null>(null)

  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null)

  const handlingValue = resolveHandlingValue(filters)
  const set = (patch: Partial<ConversationFilters>) => onFiltersChange({ ...filters, ...patch })

  // ── Período: estado ativo derivado de filters.startDate; clicar na linha
  //    ativa limpa o período preservando os demais filtros. ────────────────────
  const activePeriod = useMemo(() => resolveActivePreset(filters.startDate), [filters.startDate])
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    if (activePeriod === 'custom' && filters.startDate && filters.endDate) {
      return { from: new Date(filters.startDate), to: new Date(new Date(filters.endDate).getTime() - 1) }
    }
    return undefined
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const applyPeriod = (preset: DateRangePreset) => {
    if (activePeriod === preset) {
      setCustomRange(undefined)
      setCalendarOpen(false)
      set({ startDate: undefined, endDate: undefined })
      return
    }
    if (preset === 'custom') {
      setCalendarOpen((v) => !v)
      return
    }
    const range = resolveRange(preset)
    setCustomRange(undefined)
    setCalendarOpen(false)
    set({ startDate: range.startDate, endDate: range.endDate })
    // Período é escolha única: fecha (híbrido, PO 23/09). Limpar (clique no
    // ativo) e "Personalizado" (abre o calendário) mantêm o menu.
    setOpen(false); setFlyout(null)
  }

  const applyCustomRange = () => {
    if (!customRange?.from || !customRange?.to) return
    const resolved = resolveRange('custom', customRange.from, customRange.to)
    set({ startDate: resolved.startDate, endDate: resolved.endDate })
    setCalendarOpen(false)
    setOpen(false); setFlyout(null)
  }

  const anyActive =
    (!!filters.status && filters.status !== 'all') ||
    activePeriod !== null ||
    handlingValue === 'paused' || (handlingValue === 'team' && filters.assignedTo !== 'unassigned') ||
    !!filters.untagged || !!filters.needsReview

  // ── Positioning: menu hangs below the trigger (right-aligned); the flyout
  //    sits to the right of the menu, vertically aligned with the item that
  //    opened it. Recomputed on scroll/resize so it stays glued. ───────────────
  const updatePositions = () => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const left = Math.max(8, r.right - MENU_W)
    setMenuPos({ top: r.bottom + 6, left })
    if (flyout) {
      const itemTop = flyoutItemRef.current?.getBoundingClientRect().top ?? r.bottom + 6
      setFlyoutPos({ top: itemTop, left: left + MENU_W + 6 })
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePositions()
    const onMove = () => updatePositions()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flyout])

  // Outside-click / Escape closes everything. Clicks inside the trigger, the
  // menu, or the active flyout all count as "inside".
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      if (flyoutRef.current?.contains(t)) return
      setOpen(false); setFlyout(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (flyout) setFlyout(null)
      else setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, flyout])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const togglePaused = () => {
    set({ assignedTo: 'all', aiHandling: handlingValue === 'paused' ? 'all' : 'paused' })
    setFlyout(null)
  }

  const setTeam = (picked: 'unassigned' | string | null) => {
    if (picked === null) set({ assignedTo: 'all', aiHandling: 'all' })
    else                 set({ assignedTo: picked, aiHandling: 'all' })
    setFlyout(null); setTeamSearch('')
  }

  const openFlyout = (kind: 'team', e: React.MouseEvent<HTMLButtonElement>) => {
    flyoutItemRef.current = e.currentTarget
    setFlyout((prev) => (prev === kind ? null : kind))
  }

  const teamLabel = useMemo(() => {
    if (handlingValue !== 'team') return 'Equipe'
    if (filters.assignedTo === 'unassigned') return 'Sem atribuição'
    const u = allUsers.find((x) => x.id === filters.assignedTo)
    if (!u) return 'Equipe'
    return `${u.firstName} ${u.lastName ?? ''}`.trim() || 'Equipe'
  }, [handlingValue, filters.assignedTo, allUsers])

  const filteredUsers = useMemo(() => {
    if (!teamSearch) return allUsers
    const q = teamSearch.toLowerCase()
    return allUsers.filter((u) =>
      `${u.firstName} ${u.lastName ?? ''}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [allUsers, teamSearch])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtros rápidos"
        title="Filtros rápidos"
        className={cn(
          'relative flex items-center justify-center w-7 h-7 rounded-sm transition-all border flex-shrink-0',
          anyActive || open
            ? 'bg-accent-soft text-accent-dark border-brand-500'
            : 'bg-surface-800 text-surface-400 border-[var(--bd2)] hover:text-surface-100',
        )}
      >
        <ListFilter className="w-[15px] h-[15px]" />
      </button>

      {/* ── Menu ─────────────────────────────────────────────────────────────── */}
      {open && menuPos && createPortal(
        <div className="overlay-scrim z-[9998]" aria-hidden />, document.body)}
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: MENU_W, maxHeight: `calc(100vh - ${menuPos.top + 12}px)` }}
          className="z-[9999] overlay-surface border rounded-lg py-1.5 overflow-y-auto"
        >
          <GroupLabel>Status</GroupLabel>
          {STATUS_ITEMS.map(({ label, value }) => {
            const count = counts[value]
            const active = (filters.status ?? 'all') === value
            // PO, 23/09: mesmo padrão do menu do cabeçalho do chat — ponto na
            // cor do status e tinta translúcida só no ativo/hover do item.
            const tone = value === 'open'
              ? { dot: 'bg-status-open', on: 'bg-status-open/[.16] text-status-open hover:bg-status-open/[.22]', off: 'hover:bg-status-open/[.10]' }
              : value === 'pending'
                ? { dot: 'bg-cstatus-pending', on: 'bg-cstatus-pending/[.16] text-cstatus-pending hover:bg-cstatus-pending/[.22]', off: 'hover:bg-cstatus-pending/[.10]' }
                : value === 'resolved'
                  ? { dot: 'bg-cstatus-resolved', on: 'bg-cstatus-resolved/[.16] text-cstatus-resolved hover:bg-cstatus-resolved/[.22]', off: 'hover:bg-cstatus-resolved/[.10]' }
                  : null
            return (
              <MenuRow
                key={value}
                active={active}
                pressed={active}
                leading={tone ? <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', tone.dot)} aria-hidden /> : undefined}
                className={tone ? (active ? cn(tone.on, 'font-medium') : tone.off) : undefined}
                // Híbrido (PO, 23/09): escolha ÚNICA que redefine a lista
                // (status, período) fecha o menu; toggles combináveis (Não
                // lidas, Com IA, SLA, Equipe, etiquetas) ficam abertos.
                onClick={() => { set({ status: value }); setOpen(false); setFlyout(null) }}
                trailing={(count ?? 0) > 0 ? (
                  <span className="text-[11px] text-surface-500 tabular-nums">{(count ?? 0) > 999 ? '999+' : count}</span>
                ) : undefined}
              >
                {label}
              </MenuRow>
            )
          })}

          <GroupLabel>Período</GroupLabel>
          {PERIOD_ITEMS.map(({ value, label, icon }) => {
            const active = activePeriod === value
            return (
              <MenuRow
                key={value}
                icon={icon}
                active={active}
                pressed={active}
                onClick={() => applyPeriod(value)}
                trailing={value === 'custom' && active && customRange?.from && customRange?.to ? (
                  <span className="text-[11px] text-surface-500">
                    {format(customRange.from, 'dd/MM', { locale: ptBR })}–{format(customRange.to, 'dd/MM', { locale: ptBR })}
                  </span>
                ) : undefined}
              >
                {label}
              </MenuRow>
            )
          })}

          {calendarOpen && (
            <div
              className="mx-2 mb-1 mt-1 p-2 border border-surface-700 rounded-lg"
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
                    onClick={applyCustomRange}
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
          )}

          <GroupLabel>Atendimento</GroupLabel>
          <MenuRow icon={BotOff} active={handlingValue === 'paused'} pressed={handlingValue === 'paused'} onClick={togglePaused}>
            IA pausada
          </MenuRow>
          <MenuRow icon={Users} active={handlingValue === 'team'} chevron onClick={(e) => openFlyout('team', e)}>
            {teamLabel}
          </MenuRow>

          <GroupLabel>Rápidos</GroupLabel>
          {QUICK_TOGGLES.map(({ key, label, icon }) => {
            const active = !!filters[key]
            return (
              <MenuRow
                key={key}
                icon={icon}
                active={active}
                pressed={active}
                onClick={() => set({ [key]: !filters[key] })}
                trailing={key === 'needsReview' && needsReviewCount > 0 ? (
                  <span
                    className="color-chip min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
                    aria-label={`${needsReviewCount} ${needsReviewCount === 1 ? 'conversa precisa' : 'conversas precisam'} de verificação`}
                  >
                    {needsReviewCount > 99 ? '99+' : needsReviewCount}
                  </span>
                ) : undefined}
              >
                {label}
              </MenuRow>
            )
          })}
        </div>,
        document.body,
      )}

      {/* ── Flyout: Equipe (team roster) ─────────────────────────────────────── */}
      {open && flyout === 'team' && flyoutPos && createPortal(
        <div
          ref={flyoutRef}
          style={{ position: 'fixed', top: flyoutPos.top, left: flyoutPos.left, width: 232 }}
          className="z-[9999] overlay-surface border rounded-lg overflow-hidden"
        >
          {allUsers.length > 5 && (
            <div className="p-2 border-b border-surface-700">
              {/* PL-C2-CAR-16 (Eixo10/P4): mesma peça (busca) do header da
                  lista, medida diferente — `ConversationSearch.tsx` é a
                  referência da tela (h-7/rounded-sm/bg-surface-800/--bd2). */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                <input
                  autoFocus
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Buscar atendente..."
                  className="w-full h-7 pl-8 pr-2.5 text-xs bg-surface-800 border border-[var(--bd2)] rounded-sm text-surface-100 placeholder-surface-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => setTeam('unassigned')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all',
                filters.assignedTo === 'unassigned'
                  ? 'bg-surface-700 text-surface-100 font-medium'
                  : 'text-surface-300 hover:bg-surface-700 hover:text-surface-100',
              )}
            >
              <UserX className="w-3.5 h-3.5 flex-shrink-0" />
              Sem atribuição
            </button>

            {filteredUsers.length > 0 && <div className="border-t border-surface-700" />}

            {filteredUsers.map((u) => {
              const full = `${u.firstName} ${u.lastName ?? ''}`.trim()
              const isPicked = filters.assignedTo === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setTeam(u.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all',
                    isPicked ? 'bg-surface-700 text-surface-100' : 'text-surface-200 hover:bg-surface-700/60',
                  )}
                >
                  <Avatar name={full || u.email} size="xs" kind="operator" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{full || u.email}</p>
                    <p className="text-[10px] text-surface-500 truncate">{u.email}</p>
                  </div>
                  {isPicked && <span className="w-1.5 h-1.5 rounded-full bg-surface-400 flex-shrink-0" />}
                </button>
              )
            })}

            {filteredUsers.length === 0 && teamSearch && (
              <p className="px-3 py-4 text-xs text-surface-500 text-center">Nenhum atendente encontrado</p>
            )}
          </div>

          {handlingValue === 'team' && (
            <div className="border-t border-surface-700 p-1">
              <button
                type="button"
                onClick={() => setTeam(null)}
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
