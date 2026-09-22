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
        // SHELL-SIDEBAR-01/05 (spec shell.md): container 10 10 12.
        // Linha de 1px na borda direita (pedido do usuário 22/09): a sidebar vira
        // moldura contínua e a hairline do TopBar nasce nela — sem degrau de cor.
        // Hex fixo porque o rail é escuro nos dois temas.
        'nav-sidebar h-full pt-2.5 pb-3 px-2.5 flex flex-col bg-transparent flex-shrink-0 overflow-hidden border-r border-[#243333]',
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
    // SHELL-SIDEBAR-08: eyebrow 14 6 10, .14em, #6B8080 (surface-500 no escuro).
    <div className="relative px-2.5 pt-3.5 pb-1.5 select-none" aria-label={label}>
      <div className="relative h-[15px]">
        <p
          className={cn(
            'absolute inset-0 flex items-center text-3xs font-bold uppercase tracking-[0.14em] text-surface-500 whitespace-nowrap',
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
        // SHELL-SIDEBAR-03 (spec shell.md): item 32px, raio 6, 13px; inativo
        // #8FA5A5 (surface-400 no escuro); ativo pílula clara + 600.
        'flex items-center w-full h-8 gap-2 px-2 rounded-[6px] transition-colors duration-100',
        // PL-5-3 (eixo 10): recolhida, a barra continuava com o `px-2` + o
        // `gap-2` do rótulo (que fica em `w-0`, mas o gap ainda ocupa) — os 13
        // ícones ficavam com centro em x=28 contra o centro real da barra em
        // x=30,5, enquanto o avatar do rodapé já era centrado. 3px de desvio
        // ótico numa coluna de ícones lê como barra torta. Medido ao vivo.
        animate && !open && 'justify-center px-0 gap-0',
        active
          ? 'bg-white/85 backdrop-blur-sm text-black font-semibold'
          : 'text-surface-400 hover:bg-white/10 hover:text-white',
      )}
    >
      {/* Icon wrapper — fixed size so it doesn't shift */}
      <span className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
        {/* SIDEBAR-03: contador "Conversas N" — número na pílula quando
            expandida (à direita, abaixo), disco com número sobre o ícone
            quando colapsada. */}
        {badge !== undefined && badge > 0 && animate && !open && (
          <span
            aria-label={`${badge} não lidas`}
            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] text-3xs font-bold flex items-center justify-center tabular-nums"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {/* Nudge dot — visible only when sidebar is collapsed */}
        {nudge && animate && !open && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-pending rounded-full" />
        )}
      </span>

      {/* Label — CSS transition instead of AnimatePresence */}
      <span
        className={cn(
          'flex items-center gap-2 text-[13px] font-medium whitespace-pre overflow-hidden',
          'transition-opacity duration-150',
          // PL-5-3: `flex-1` só quando expandida. Recolhido, o rótulo tem
          // largura 0 mas `flex: 1 1 0%` ainda o faz CRESCER e ocupar a sobra,
          // empurrando o ícone para a esquerda (medido: centro em 20 contra 30,5
          // da barra). Com o flex-grow fora, o `justify-center` acima centra.
          animate && !open ? 'opacity-0 w-0' : 'opacity-100 flex-1',
        )}
      >
        {label}
        {badge !== undefined && badge > 0 && (
          <span
            aria-label={`${badge} não lidas`}
            className="ml-auto min-w-[18px] h-[18px] px-[5px] rounded-full bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] text-[10.5px] font-bold flex items-center justify-center tabular-nums"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {nudge && (
          <span className="text-3xs font-semibold text-status-pending bg-status-pending-bg border border-status-pending-border px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
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
