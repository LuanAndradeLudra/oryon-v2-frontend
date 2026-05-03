import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'
import { TopBar } from './TopBar'
import { TopBarActionsProvider } from '@/contexts/TopBarActionsContext'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'
import { MobileNavProvider, useMobileNav } from '@/contexts/MobileNavContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Drawer } from '@/components/ui/Drawer'

function MobileNavDrawer() {
  const { open, setOpen, close } = useMobileNav()
  const location = useLocation()

  // Auto-close the drawer on route change so navigation feels native — the
  // user taps a nav item, sees the route transition, drawer slides away.
  useEffect(() => {
    close()
  }, [location.pathname, close])

  return (
    <Drawer open={open} onClose={() => setOpen(false)} side="left" ariaLabel="Menu de navegação" className="w-[260px] p-0">
      <NavSidebar forceExpanded />
    </Drawer>
  )
}

function ShellLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black">
      {!isMobile && <NavSidebar />}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-w-0 overflow-hidden">{children}</div>
      </div>
      {isMobile && <MobileNavDrawer />}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceNumberProvider>
      <TopBarActionsProvider>
        <MobileNavProvider>
          <ShellLayout>{children}</ShellLayout>
        </MobileNavProvider>
      </TopBarActionsProvider>
    </WorkspaceNumberProvider>
  )
}
