import { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  SlidersHorizontal,
  Users, Bot, UserCheck, UserX, Mail, Hourglass, Tag as TagIcon, AlertTriangle,
  ChevronRight, Check, X, Search,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { resolveHandlingValue } from '@/lib/conversationFilterState'
import type { ConversationFilters, User } from '@/types'

const MENU_W = 250

const HANDLING_ITEMS: Array<{ value: 'all' | 'ai' | 'me'; label: string; icon: typeof Bot }> = [
  { value: 'all', label: 'Todas',  icon: Users },
  { value: 'ai',  label: 'IA',     icon: Bot },
  { value: 'me',  label: 'Minhas', icon: UserCheck },
]

const QUICK_TOGGLES: Array<{ key: 'unreadOnly' | 'awaitingReply' | 'untagged' | 'needsReview'; label: string; icon: typeof Mail }> = [
  { key: 'unreadOnly',    label: 'Apenas não lidas',        icon: Mail },
  { key: 'awaitingReply', label: 'Aguardando resposta',     icon: Hourglass },
  { key: 'untagged',      label: 'Sem etiqueta',            icon: TagIcon },
  { key: 'needsReview',   label: 'Precisam de verificação', icon: AlertTriangle },
]

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wide text-surface-500 font-semibold">
      {children}
    </p>
  )
}

function MenuRow({
  icon: Icon, active, chevron, onClick, children,
}: {
  icon: typeof Bot
  active?: boolean
  chevron?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
        active ? 'text-surface-50 bg-surface-700' : 'text-surface-200 hover:bg-surface-700/60',
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0 opacity-90" />
      <span className="flex-1 truncate">{children}</span>
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
}

export function QuickFiltersMenu({ filters, onFiltersChange, allUsers = [] }: QuickFiltersMenuProps) {
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
  const anyActive =
    handlingValue !== 'all' ||
    !!filters.unreadOnly || !!filters.awaitingReply || !!filters.untagged || !!filters.needsReview

  const set = (patch: Partial<ConversationFilters>) => onFiltersChange({ ...filters, ...patch })

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
  const setHandling = (v: 'all' | 'ai' | 'me') => {
    if (v === 'all')     set({ assignedTo: 'all', aiHandling: 'all' })
    else if (v === 'ai') set({ assignedTo: 'all', aiHandling: 'active' })
    else                 set({ assignedTo: 'me',  aiHandling: 'all' })
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
          'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all border flex-shrink-0',
          anyActive || open
            ? 'bg-surface-700 text-surface-100 border-surface-600'
            : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {anyActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-surface-400 ring-2 ring-black" />
        )}
      </button>

      {/* ── Menu ─────────────────────────────────────────────────────────────── */}
      {open && menuPos && createPortal(
        <div className="overlay-scrim z-[9998]" aria-hidden />, document.body)}
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: MENU_W }}
          className="z-[9999] overlay-surface border rounded-xl py-1.5"
        >
          <GroupLabel>Atendimento</GroupLabel>
          {HANDLING_ITEMS.map(({ value, label, icon }) => (
            <MenuRow key={value} icon={icon} active={handlingValue === value} onClick={() => setHandling(value)}>
              {label}
            </MenuRow>
          ))}
          <MenuRow icon={Users} active={handlingValue === 'team'} chevron onClick={(e) => openFlyout('team', e)}>
            {teamLabel}
          </MenuRow>

          <GroupLabel>Rápidos</GroupLabel>
          {QUICK_TOGGLES.map(({ key, label, icon: Icon }) => {
            const active = !!filters[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => set({ [key]: !filters[key] })}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
                  active ? 'text-surface-50 bg-surface-700' : 'text-surface-200 hover:bg-surface-700/60',
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-90" />
                <span className="flex-1 truncate">{label}</span>
                {active && <Check className="w-4 h-4 flex-shrink-0 text-surface-200" />}
              </button>
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
          className="z-[9999] overlay-surface border rounded-xl overflow-hidden"
        >
          {allUsers.length > 5 && (
            <div className="p-2 border-b border-surface-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                <input
                  autoFocus
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Buscar atendente..."
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-surface-700 border border-surface-600 rounded-lg text-surface-100 placeholder-surface-500 outline-none focus:border-surface-500 transition-colors"
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

            {filteredUsers.length > 0 && <div className="border-t border-surface-700/60" />}

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
                  <Avatar name={full || u.email} size="xs" />
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
