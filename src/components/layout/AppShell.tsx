import type { ReactNode } from 'react'
import { NavSidebar } from './NavSidebar'
import { TopBar } from './TopBar'
import { TopBarActionsProvider } from '@/contexts/TopBarActionsContext'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceNumberProvider>
      <TopBarActionsProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-black">
          <NavSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar />
            <div className="flex flex-1 min-w-0 overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </TopBarActionsProvider>
    </WorkspaceNumberProvider>
  )
}
