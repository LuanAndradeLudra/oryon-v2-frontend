import type { ReactNode } from 'react'
import { NavSidebar } from './NavSidebar'
import { TopBar } from './TopBar'
import { AppShellMobile } from './AppShellMobile'
import { TopBarActionsProvider } from '@/contexts/TopBarActionsContext'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'
import { useIsMobile } from '@/hooks/useIsMobile'

function ShellLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <AppShellMobile>{children}</AppShellMobile>
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black">
      <NavSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-w-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceNumberProvider>
      <TopBarActionsProvider>
        <ShellLayout>{children}</ShellLayout>
      </TopBarActionsProvider>
    </WorkspaceNumberProvider>
  )
}
