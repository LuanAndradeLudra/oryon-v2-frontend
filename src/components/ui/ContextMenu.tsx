import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextMenuItemDef {
  label: string
  icon?: React.ElementType
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  children?: ContextMenuEntry[]
}
export interface ContextMenuSeparatorDef {
  separator: true
}
export type ContextMenuEntry = ContextMenuItemDef | ContextMenuSeparatorDef

function isSeparator(e: ContextMenuEntry): e is ContextMenuSeparatorDef {
  return (e as ContextMenuSeparatorDef).separator === true
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ContextMenuState {
  open: (x: number, y: number, items: ContextMenuEntry[]) => void
  close: () => void
}

const Ctx = createContext<ContextMenuState | null>(null)

export function useContextMenuCtx(): ContextMenuState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContextMenuCtx must be used within <ContextMenuProvider>')
  return c
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface InternalState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuEntry[]
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>({ visible: false, x: 0, y: 0, items: [] })

  const open = useCallback((x: number, y: number, items: ContextMenuEntry[]) => {
    setState({ visible: true, x, y, items })
  }, [])

  const close = useCallback(() => {
    setState((s) => (s.visible ? { ...s, visible: false } : s))
  }, [])

  // Note: no global contextmenu listener here. The portal's own mousedown
  // listener already handles outside clicks (including right-clicks, since
  // mousedown fires for the right button too). A capture-phase contextmenu
  // listener would fire BEFORE the element's onContextMenu that opens the
  // new menu, causing the freshly-opened menu to close on the same event.

  const value = useMemo<ContextMenuState>(() => ({ open, close }), [open, close])

  return (
    <Ctx.Provider value={value}>
      {children}
      {state.visible && (
        <ContextMenuPortal items={state.items} x={state.x} y={state.y} onClose={close} />
      )}
    </Ctx.Provider>
  )
}

// ── Portal menu ───────────────────────────────────────────────────────────────

interface ContextMenuPortalProps {
  items: ContextMenuEntry[]
  x: number
  y: number
  onClose: () => void
}

function ContextMenuPortal({ items, x, y, onClose }: ContextMenuPortalProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [focusedIndex, setFocusedIndex] = useState<number>(() => firstFocusable(items))

  // Flip in viewport edges after mount.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (nx + rect.width > window.innerWidth - 4) nx = Math.max(4, window.innerWidth - rect.width - 4)
    if (ny + rect.height > window.innerHeight - 4) ny = Math.max(4, window.innerHeight - rect.height - 4)
    if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y])

  // Dismiss on outside click / Escape / scroll / resize.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => nextFocusable(items, i, +1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => nextFocusable(items, i, -1))
        return
      }
      if (e.key === 'Enter') {
        const idx = focusedIndex
        const entry = items[idx]
        if (entry && !isSeparator(entry) && !entry.disabled && entry.onClick) {
          e.preventDefault()
          entry.onClick()
          onClose()
        }
      }
    }
    const onScrollOrResize = () => onClose()
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [items, focusedIndex, onClose])

  return createPortal(
    <div
      ref={rootRef}
      role="menu"
      tabIndex={-1}
      className={cn(
        'fixed z-[100]',
        'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl',
        'min-w-[200px] max-w-[280px] overflow-visible py-1',
      )}
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuList
        items={items}
        onClose={onClose}
        focusedIndex={focusedIndex}
        onFocusIndex={setFocusedIndex}
      />
    </div>,
    document.body,
  )
}

// ── Menu list (shared by root + submenus) ────────────────────────────────────

interface MenuListProps {
  items: ContextMenuEntry[]
  onClose: () => void
  focusedIndex?: number
  onFocusIndex?: (i: number) => void
}

function MenuList({ items, onClose, focusedIndex, onFocusIndex }: MenuListProps) {
  return (
    <>
      {items.map((entry, i) => {
        if (isSeparator(entry)) {
          return <div key={`sep-${i}`} className="my-1 h-px bg-surface-700" />
        }
        if (entry.children && entry.children.length > 0) {
          return (
            <SubmenuItem
              key={`item-${i}-${entry.label}`}
              entry={entry}
              onClose={onClose}
              focused={focusedIndex === i}
              onFocus={() => onFocusIndex?.(i)}
            />
          )
        }
        return (
          <ContextMenuItem
            key={`item-${i}-${entry.label}`}
            entry={entry}
            onClose={onClose}
            focused={focusedIndex === i}
            onFocus={() => onFocusIndex?.(i)}
          />
        )
      })}
    </>
  )
}

// ── Item ──────────────────────────────────────────────────────────────────────

function ContextMenuItem({
  entry,
  onClose,
  focused,
  onFocus,
}: {
  entry: ContextMenuItemDef
  onClose: () => void
  focused?: boolean
  onFocus?: () => void
}) {
  const Icon = entry.icon
  return (
    <button
      type="button"
      role="menuitem"
      disabled={entry.disabled}
      onMouseEnter={onFocus}
      onClick={() => {
        if (entry.disabled) return
        entry.onClick?.()
        onClose()
      }}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
        entry.danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-surface-200 hover:bg-surface-700',
        focused && !entry.disabled && (entry.danger ? 'bg-danger/10' : 'bg-surface-700'),
        entry.disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1 truncate">{entry.label}</span>
      {entry.shortcut && (
        <span className="text-[11px] text-surface-500 font-mono flex-shrink-0">
          {entry.shortcut}
        </span>
      )}
    </button>
  )
}

// ── Submenu ───────────────────────────────────────────────────────────────────

function SubmenuItem({
  entry,
  onClose,
  focused,
  onFocus,
}: {
  entry: ContextMenuItemDef
  onClose: () => void
  focused?: boolean
  onFocus?: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const [openSub, setOpenSub] = useState(false)
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null)
  const closeTimer = useRef<number | null>(null)
  const Icon = entry.icon

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenSub(false), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  useLayoutEffect(() => {
    if (!openSub) return
    const btn = btnRef.current
    const sub = subRef.current
    if (!btn || !sub) return
    const btnRect = btn.getBoundingClientRect()
    const subRect = sub.getBoundingClientRect()
    let left = btnRect.right + 2
    let top = btnRect.top - 4
    if (left + subRect.width > window.innerWidth - 4) {
      left = Math.max(4, btnRect.left - subRect.width - 2)
    }
    if (top + subRect.height > window.innerHeight - 4) {
      top = Math.max(4, window.innerHeight - subRect.height - 4)
    }
    setSubPos({ left, top })
  }, [openSub])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        role="menuitem"
        disabled={entry.disabled}
        onMouseEnter={() => {
          cancelClose()
          setOpenSub(true)
          onFocus?.()
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          cancelClose()
          setOpenSub(true)
          onFocus?.()
        }}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
          'text-surface-200 hover:bg-surface-700',
          (focused || openSub) && !entry.disabled && 'bg-surface-700',
          entry.disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 truncate">{entry.label}</span>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-surface-500" />
      </button>
      {openSub && subPos &&
        createPortal(
          <div
            ref={subRef}
            role="menu"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              'fixed z-[101]',
              'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl',
              'min-w-[200px] max-w-[280px] overflow-visible py-1',
            )}
            style={{ left: subPos.left, top: subPos.top }}
          >
            <MenuList items={entry.children ?? []} onClose={onClose} />
          </div>,
          document.body,
        )}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function firstFocusable(items: ContextMenuEntry[]): number {
  for (let i = 0; i < items.length; i++) {
    const e = items[i]
    if (!isSeparator(e) && !e.disabled) return i
  }
  return -1
}

function nextFocusable(items: ContextMenuEntry[], from: number, dir: 1 | -1): number {
  const n = items.length
  if (n === 0) return -1
  let i = from
  for (let step = 0; step < n; step++) {
    i = (i + dir + n) % n
    const e = items[i]
    if (!isSeparator(e) && !e.disabled) return i
  }
  return from
}
