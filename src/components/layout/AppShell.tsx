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
    <div className="flex h-screen w-screen overflow-hidden bg-surface-950">
      {/* Navegação por teclado: pula os 15+ itens da sidebar direto ao conteúdo */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-brand-500 focus:text-surface-950 focus:text-sm focus:font-semibold"
      >
        Ir para o conteúdo principal
      </a>
      <NavSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        {/* div (não <main>) — as páginas declaram seu próprio <main> interno */}
        <div id="main-content" className="flex flex-1 min-w-0 overflow-hidden">{children}</div>
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
