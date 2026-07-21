import { cn } from '@/lib/utils'
import React, { useState, createContext, useContext, memo, useCallback } from 'react'
import { Link } from 'react-router-dom'

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)
  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<'div'>) => {
  return <DesktopSidebar {...props} />
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen, animate } = useSidebar()
  const onEnter = useCallback(() => setOpen(true), [setOpen])
  const onLeave = useCallback(() => setOpen(false), [setOpen])

  return (
    <div
      className={cn(
        // Sem bg/borda própria: a sidebar vive sobre o SHELL (fundo profundo) e
        // faz parte da moldura do workspace — o canvas de conteúdo é quem se
        // destaca. (bg via token local .nav-sidebar continua p/ hovers/chips.)
        'nav-sidebar h-full py-4 flex flex-col bg-transparent flex-shrink-0 overflow-hidden',
        'transition-[width] duration-200 ease-out will-change-[width]',
        className
      )}
      style={{ width: animate ? (open ? 228 : 62) : 228 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Section label — reserves the same vertical space whether the sidebar is
 * expanded or collapsed, so menu icons never shift position when the user
 * hovers in. When collapsed, the text cross-fades into a thin horizontal
 * divider that signals the group boundary.
 */
export const SidebarSectionLabel = memo(function SidebarSectionLabel({ label }: { label: string }) {
  const { open, animate } = useSidebar()
  const collapsed = animate && !open

  return (
    <div className="relative px-3 pt-5 pb-1 select-none" aria-label={label}>
      <div className="relative h-[15px]">
        <p
          className={cn(
            'absolute inset-0 flex items-center text-[10px] font-bold uppercase tracking-widest text-surface-600 whitespace-nowrap',
            'transition-opacity duration-200',
            collapsed ? 'opacity-0' : 'opacity-100',
          )}
        >
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            'absolute left-2 right-2 top-1/2 -translate-y-1/2 h-px bg-surface-700/60',
            'transition-opacity duration-200',
            collapsed ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </div>
  )
})

export const SidebarLink = memo(function SidebarLink({
  href,
  icon,
  label,
  className,
  active,
  badge,
  nudge,
  onClick,
}: {
  href?: string
  icon: React.ReactNode
  label: string
  className?: string
  active?: boolean
  badge?: number
  nudge?: string
  onClick?: () => void
}) {
  const { open, animate } = useSidebar()

  const inner = (
    <span
      className={cn(
        'flex items-center w-full transition-colors duration-100',
        active
          ? 'gap-2 px-2 py-1 rounded-lg bg-white/85 backdrop-blur-sm text-black'
          : 'gap-3 px-3 py-2 rounded-xl text-white hover:bg-white/10',
      )}
    >
      {/* Icon wrapper — fixed size so it doesn't shift */}
      <span className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
        {badge !== undefined && badge > 0 && (
          // Dot-only indicator: shows there's unread activity without putting
          // a number that could be confused with the status-tab counters
          // inside the Conversas page. The `badge: number` prop still flows
          // from NavSidebar (so the trigger is unchanged) — only the render
          // is now a fixed-size circle. Keep aria-label for screen readers.
          <span
            aria-label="Atividade não lida"
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full"
          />
        )}
        {/* Nudge dot — visible only when sidebar is collapsed */}
        {nudge && animate && !open && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-pending rounded-full" />
        )}
      </span>

      {/* Label — CSS transition instead of AnimatePresence */}
      <span
        className={cn(
          'flex items-center gap-2 text-sm font-medium whitespace-pre overflow-hidden flex-1',
          'transition-opacity duration-150',
          animate && !open ? 'opacity-0 w-0' : 'opacity-100',
        )}
      >
        {label}
        {nudge && (
          <span className="text-[10px] font-semibold text-status-pending bg-status-pending-bg border border-status-pending-border px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
            {nudge}
          </span>
        )}
      </span>
    </span>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={cn('w-full text-left', className)}>
        {inner}
      </button>
    )
  }

  if (href) {
    return (
      <Link to={href} className={cn('block', className)}>
        {inner}
      </Link>
    )
  }

  return null
})
